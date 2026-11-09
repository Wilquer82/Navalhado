const express = require('express');
const { autenticar, asyncHandler } = require('../middlewares/auth');
const ListaEspera = require('../models/ListaEspera');
const Servico = require('../models/Servico');
const Profissional = require('../models/Profissional');
const { normalizarTelefoneBrasileiro, sanitizarObjectId } = require('../services/validacoes');

const router = express.Router();
const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

router.post('/', asyncHandler(async (req, res) => {
  const { nome, telefone, servicoId, profissionalId } = req.body;
  if (!nome || !telefone || !servicoId) {
    return respostaErro(res, 400, 'Campos obrigatórios faltando.');
  }
  const telefoneNormalizado = normalizarTelefoneBrasileiro(telefone);
  if (!telefoneNormalizado) return respostaErro(res, 400, 'Telefone inválido.');
  const servico = await Servico.findOne({ _id: sanitizarObjectId(servicoId), ativo: true });
  if (!servico) return respostaErro(res, 404, 'Serviço não encontrado.');
  const filtro = { telefoneNormalizado, servicoId };
  if (profissionalId) filtro.profissionalId = sanitizarObjectId(profissionalId);
  const existente = await ListaEspera.findOne(filtro);
  if (existente) return respostaErro(res, 409, 'Já inscrito na lista de espera.');
  const entrada = new ListaEspera({
    nome,
    telefoneNormalizado,
    servicoId,
    profissionalId: profissionalId || null
  });
  await entrada.save();
  res.status(201).json({ mensagem: 'Inscrito na lista de espera.', entrada });
}));

router.get('/', autenticar, asyncHandler(async (req, res) => {
  if (req.auth.role !== 'admin') return respostaErro(res, 403, 'Acesso negado.');
  const espera = await ListaEspera.find({})
    .populate('servicoId', 'nome')
    .populate('profissionalId', 'nome')
    .sort({ criadoEm: -1 });
  res.json(espera);
}));

router.get('/:id', autenticar, asyncHandler(async (req, res) => {
  if (req.auth.role !== 'admin') return respostaErro(res, 403, 'Acesso negado.');
  const entrada = await ListaEspera.findById(req.params.id)
    .populate('servicoId', 'nome')
    .populate('profissionalId', 'nome');
  if (!entrada) return respostaErro(res, 404, 'Entrada não encontrada.');
  res.json(entrada);
}));

router.delete('/:id', autenticar, asyncHandler(async (req, res) => {
  if (req.auth.role !== 'admin') return respostaErro(res, 403, 'Acesso negado.');
  const entrada = await ListaEspera.findByIdAndDelete(req.params.id);
  if (!entrada) return respostaErro(res, 404, 'Entrada não encontrada.');
  res.json({ mensagem: 'Removido da lista de espera.' });
}));

router.patch('/:id/notificar', autenticar, asyncHandler(async (req, res) => {
  if (req.auth.role !== 'admin') return respostaErro(res, 403, 'Acesso negado.');
  const entrada = await ListaEspera.findOneAndUpdate(
    { _id: req.params.id, status: 'pendente' },
    { status: 'notificado', notificadoEm: new Date() },
    { new: true }
  ).populate('servicoId', 'nome').populate('profissionalId', 'nome');
  if (!entrada) return respostaErro(res, 404, 'Entrada não encontrada ou já notificada.');
  res.json({ mensagem: 'Notificado.', entrada });
}));

module.exports = router;