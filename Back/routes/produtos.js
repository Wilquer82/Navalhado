const express = require('express');
const Produto = require('../models/Produto');
const { autenticar, asyncHandler } = require('../middlewares/auth');
const { validarNome, validarPreco, sanitizarObjectId } = require('../services/validacoes');

const router = express.Router();
const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

const serializar = (p) => ({
  _id: p._id,
  nome: p.nome,
  descricao: p.descricao || '',
  preco: p.preco,
  estoque: p.estoque,
  controlarEstoque: Boolean(p.controlarEstoque),
  ativo: p.ativo
});

router.get('/', autenticar, asyncHandler(async (req, res) => {
  const ativosParam = typeof req.query.ativos === 'string' ? req.query.ativos : '';
  const soAtivos = ativosParam === '1' || ativosParam === 'true';
  const filtro = soAtivos ? { ativo: true } : {};
  const produtos = await Produto.find(filtro).sort({ nome: 1 });
  res.json(produtos.map(serializar));
}));

router.post('/', autenticar, asyncHandler(async (req, res) => {
  const { nome, descricao, preco, estoque, controlarEstoque, ativo } = req.body || {};
  if (!validarNome(nome)) return respostaErro(res, 400, 'Nome deve ter pelo menos 3 caracteres.');
  if (!validarPreco(preco)) return respostaErro(res, 400, 'Preço inválido.');
  const produto = new Produto({
    nome: String(nome).trim(),
    descricao: String(descricao || '').trim(),
    preco: Number(preco),
    estoque: Math.max(0, Number(estoque) || 0),
    controlarEstoque: Boolean(controlarEstoque),
    ativo: ativo !== false
  });
  await produto.save();
  res.status(201).json(serializar(produto));
}));

router.put('/:id', autenticar, asyncHandler(async (req, res) => {
  const id = sanitizarObjectId(req.params.id);
  if (!id) return respostaErro(res, 400, 'ID inválido.');
  const produto = await Produto.findById(id);
  if (!produto) return respostaErro(res, 404, 'Produto não encontrado.');
  const { nome, descricao, preco, estoque, controlarEstoque, ativo } = req.body || {};
  if (nome !== undefined) {
    if (!validarNome(nome)) return respostaErro(res, 400, 'Nome deve ter pelo menos 3 caracteres.');
    produto.nome = String(nome).trim();
  }
  if (descricao !== undefined) produto.descricao = String(descricao).trim();
  if (preco !== undefined) {
    if (!validarPreco(preco)) return respostaErro(res, 400, 'Preço inválido.');
    produto.preco = Number(preco);
  }
  if (estoque !== undefined) produto.estoque = Math.max(0, Number(estoque) || 0);
  if (controlarEstoque !== undefined) produto.controlarEstoque = Boolean(controlarEstoque);
  if (ativo !== undefined) produto.ativo = Boolean(ativo);
  await produto.save();
  res.json(serializar(produto));
}));

router.delete('/:id', autenticar, asyncHandler(async (req, res) => {
  const id = sanitizarObjectId(req.params.id);
  if (!id) return respostaErro(res, 400, 'ID inválido.');
  const produto = await Produto.findByIdAndUpdate(id, { ativo: false }, { new: true });
  if (!produto) return respostaErro(res, 404, 'Produto não encontrado.');
  res.json({ mensagem: 'Produto desativado.', produto: serializar(produto) });
}));

module.exports = router;
