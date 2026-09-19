const express = require('express');
const Servico = require('../models/Servico');
const { autenticar, asyncHandler } = require('../middlewares/auth');
const { validarNome, validarPreco, validarDuracao } = require('../services/validacoes');

const router = express.Router();

const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

const serializarServico = (s) => ({
  _id: s._id,
  nome: s.nome,
  preco: s.preco,
  duracaoMinutos: s.duracaoMinutos,
  duracao: s.duracaoMinutos,
  ativo: s.ativo
});

router.get('/', autenticar, asyncHandler(async (req, res) => {
  const servicos = await Servico.find({}).sort({ nome: 1 });
  res.json(servicos.map(serializarServico));
}));

router.post('/', autenticar, asyncHandler(async (req, res) => {
  const { nome, preco, duracaoMinutos, duracao, ativo } = req.body;
  if (!validarNome(nome)) return respostaErro(res, 400, 'Nome deve ter pelo menos 3 caracteres.');
  if (!validarPreco(preco)) return respostaErro(res, 400, 'Preço inválido.');
  const duracaoFinal = Number(duracaoMinutos ?? duracao);
  if (!validarDuracao(duracaoFinal)) return respostaErro(res, 400, 'Duração inválida.');
  const servico = new Servico({
    nome: String(nome).trim(),
    preco: Number(preco),
    duracaoMinutos: duracaoFinal,
    ativo: ativo !== false
  });
  await servico.save();
  res.status(201).json(serializarServico(servico));
}));

router.put('/:id', autenticar, asyncHandler(async (req, res) => {
  const servico = await Servico.findById(req.params.id);
  if (!servico) return respostaErro(res, 404, 'Serviço não encontrado.');
  const { nome, preco, duracaoMinutos, duracao, ativo } = req.body;
  if (nome !== undefined) {
    if (!validarNome(nome)) return respostaErro(res, 400, 'Nome deve ter pelo menos 3 caracteres.');
    servico.nome = String(nome).trim();
  }
  if (preco !== undefined) {
    if (!validarPreco(preco)) return respostaErro(res, 400, 'Preço inválido.');
    servico.preco = Number(preco);
  }
  const duracaoFinal = duracaoMinutos !== undefined ? duracaoMinutos : duracao;
  if (duracaoFinal !== undefined) {
    if (!validarDuracao(duracaoFinal)) return respostaErro(res, 400, 'Duração inválida.');
    servico.duracaoMinutos = Number(duracaoFinal);
  }
  if (ativo !== undefined) servico.ativo = Boolean(ativo);
  await servico.save();
  res.json(serializarServico(servico));
}));

router.delete('/:id', autenticar, asyncHandler(async (req, res) => {
  const servico = await Servico.findByIdAndUpdate(req.params.id, { ativo: false }, { new: true });
  if (!servico) return respostaErro(res, 404, 'Serviço não encontrado.');
  res.json({ mensagem: 'Serviço desativado.' });
}));

module.exports = router;