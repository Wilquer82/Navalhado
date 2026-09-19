const express = require('express');
const Profissional = require('../models/Profissional');
const Servico = require('../models/Servico');
const { autenticar, autenticarOpcional, asyncHandler } = require('../middlewares/auth');
const { validarNome, validarPreco, validarDuracao, normalizarTelefone } = require('../services/validacoes');
const { servicoDoProfissional, horariosDisponiveis, obterConfiguracao } = require('../services/agenda');

const router = express.Router();

const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

const serializarProfissional = (p) => ({
  _id: p._id,
  nome: p.nome,
  foto: p.foto,
  descricao: p.descricao,
  especialidade: p.descricao,
  telefone: p.telefone,
  servicos: p.servicos,
  horarioTrabalho: Object.fromEntries(p.horarioTrabalho || {}),
  folgas: p.folgas,
  ativo: p.ativo
});

router.get('/', asyncHandler(async (req, res) => {
  const profissionais = await Profissional.find({ ativo: true }).select('-usuario.senhaHash').sort({ nome: 1 });
  res.json(profissionais.map(serializarProfissional));
}));

router.get('/:id/servicos', autenticarOpcional, asyncHandler(async (req, res) => {
  const profissional = await Profissional.findOne({ _id: req.params.id, ativo: true }).populate('servicos.servicoId');
  if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');
  const servicos = profissional.servicos
    .filter(item => item.servicoId?.ativo)
    .map(item => ({
      ...item.servicoId.toObject(),
      preco: item.preco,
      duracaoMinutos: item.duracaoMinutos,
      duracao: item.duracaoMinutos
    }));
  res.json(servicos);
}));

router.get('/:id/horarios-disponiveis', autenticarOpcional, asyncHandler(async (req, res) => {
  const { data, servicoId } = req.query;
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return respostaErro(res, 400, 'Data inválida.');
  const profissional = await Profissional.findOne({ _id: req.params.id, ativo: true });
  if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');
  const config = await obterConfiguracao();
  const livres = await horariosDisponiveis(profissional, data, servicoId, config);
  res.json(livres);
}));

router.post('/', autenticar, asyncHandler(async (req, res) => {
  const { nome, foto, descricao, especialidade, telefone, servicos } = req.body;
  if (!validarNome(nome)) return respostaErro(res, 400, 'Nome deve ter pelo menos 3 caracteres.');
  const profissional = new Profissional({
    nome: String(nome).trim(),
    foto: String(foto || ''),
    descricao: String(descricao || especialidade || 'Geral'),
    telefone: String(telefone || ''),
    servicos: Array.isArray(servicos) ? servicos.map(s => ({
      servicoId: s.servicoId,
      preco: Number(s.preco),
      duracaoMinutos: Number(s.duracaoMinutos)
    })) : []
  });
  await profissional.save();
  res.status(201).json(serializarProfissional(profissional));
}));

router.put('/:id', autenticar, asyncHandler(async (req, res) => {
  const profissional = await Profissional.findById(req.params.id);
  if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');
  const { nome, foto, descricao, especialidade, telefone, servicos } = req.body;
  if (nome !== undefined) {
    if (!validarNome(nome)) return respostaErro(res, 400, 'Nome deve ter pelo menos 3 caracteres.');
    profissional.nome = String(nome).trim();
  }
  if (foto !== undefined) profissional.foto = String(foto);
  if (descricao !== undefined || especialidade !== undefined) {
    profissional.descricao = String(descricao || especialidade || 'Geral');
  }
  if (telefone !== undefined) profissional.telefone = String(telefone);
  if (Array.isArray(servicos)) {
    profissional.servicos = servicos.map(s => ({
      servicoId: s.servicoId,
      preco: Number(s.preco),
      duracaoMinutos: Number(s.duracaoMinutos)
    }));
  }
  await profissional.save();
  res.json(serializarProfissional(profissional));
}));

router.delete('/:id', autenticar, asyncHandler(async (req, res) => {
  const profissional = await Profissional.findByIdAndUpdate(req.params.id, { ativo: false }, { new: true });
  if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');
  res.json({ mensagem: 'Profissional desativado.' });
}));

module.exports = router;