const express = require('express');
const Produto = require('../models/Produto');
const Profissional = require('../models/Profissional');
const Venda = require('../models/Venda');
const { autenticar, asyncHandler } = require('../middlewares/auth');
const { dataValida, dataBanco, formatarDataAPI, sanitizarObjectId } = require('../services/validacoes');

const router = express.Router();
const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

const serializarVenda = (v) => ({
  _id: v._id,
  profissionalId: v.profissionalId,
  itens: v.itens,
  total: v.total,
  nomeCliente: v.nomeCliente || '',
  observacoes: v.observacoes || '',
  data: formatarDataAPI(v.data),
  status: v.status,
  criadoEm: v.createdAt
});

router.get('/', autenticar, asyncHandler(async (req, res) => {
  const mes = typeof req.query.mes === 'string' ? req.query.mes.trim() : '';
  const data = typeof req.query.data === 'string' ? req.query.data.trim() : '';
  const query = { status: { $ne: 'cancelada' } };
  if (req.auth.role !== 'admin') {
    if (!req.auth.profissionalId) return respostaErro(res, 403, 'Acesso negado.');
    query.profissionalId = req.auth.profissionalId;
  }

  if (data) {
    if (!dataValida(data)) return respostaErro(res, 400, 'Data inválida.');
    query.data = {
      $gte: new Date(`${data}T00:00:00-03:00`),
      $lt: new Date(new Date(`${data}T00:00:00-03:00`).getTime() + 24 * 60 * 60 * 1000)
    };
  } else if (mes) {
    if (!/^\d{4}-\d{2}$/.test(mes)) return respostaErro(res, 400, 'Mês inválido. Use YYYY-MM.');
    const inicio = new Date(`${mes}-01T00:00:00-03:00`);
    const fim = new Date(inicio);
    fim.setMonth(fim.getMonth() + 1);
    query.data = { $gte: inicio, $lt: fim };
  }

  const vendas = await Venda.find(query).sort({ data: -1, createdAt: -1 });
  res.json(vendas.map(serializarVenda));
}));

router.post('/', autenticar, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const data = String(body.data || '').trim();
  const itensEntrada = Array.isArray(body.itens) ? body.itens : [];
  const nomeCliente = String(body.nomeCliente || '').trim();
  const observacoes = String(body.observacoes || '').trim();
  const profissionalId = req.auth.role === 'admin'
    ? sanitizarObjectId(body.profissionalId)
    : req.auth.profissionalId;

  if (!dataValida(data)) return respostaErro(res, 400, 'Data inválida.');
  if (!itensEntrada.length) return respostaErro(res, 400, 'Adicione pelo menos um produto.');
  if (!profissionalId) {
    return respostaErro(
      res,
      req.auth.role === 'admin' ? 400 : 403,
      req.auth.role === 'admin' ? 'Profissional é obrigatório para registrar a venda.' : 'Acesso negado.'
    );
  }
  if (!await Profissional.exists({ _id: profissionalId })) {
    return respostaErro(res, 404, 'Profissional não encontrado.');
  }

  const itens = [];
  let total = 0;

  for (const item of itensEntrada) {
    const produtoId = sanitizarObjectId(item?.produtoId);
    const quantidade = Math.floor(Number(item?.quantidade) || 0);
    if (!produtoId || quantidade < 1) {
      return respostaErro(res, 400, 'Item de venda inválido.');
    }
    const produto = await Produto.findOne({ _id: produtoId, ativo: true });
    if (!produto) return respostaErro(res, 404, 'Produto não encontrado ou inativo.');

    if (produto.controlarEstoque && produto.estoque < quantidade) {
      return respostaErro(res, 400, `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.estoque}.`);
    }

    const precoUnitario = Number(produto.preco);
    const subtotal = Math.round(precoUnitario * quantidade * 100) / 100;
    itens.push({
      produtoId: produto._id,
      nome: produto.nome,
      precoUnitario,
      quantidade,
      subtotal
    });
    total += subtotal;

    if (produto.controlarEstoque) {
      produto.estoque -= quantidade;
      await produto.save();
    }
  }

  total = Math.round(total * 100) / 100;

  const venda = new Venda({
    profissionalId,
    itens,
    total,
    nomeCliente,
    observacoes,
    data: dataBanco(data),
    status: 'concluida'
  });
  await venda.save();
  res.status(201).json(serializarVenda(venda));
}));

router.delete('/:id', autenticar, asyncHandler(async (req, res) => {
  const id = sanitizarObjectId(req.params.id);
  if (!id) return respostaErro(res, 400, 'ID inválido.');
  const filtro = { _id: id, status: { $ne: 'cancelada' } };
  if (req.auth.role !== 'admin') {
    if (!req.auth.profissionalId) return respostaErro(res, 403, 'Acesso negado.');
    filtro.profissionalId = req.auth.profissionalId;
  }
  const venda = await Venda.findOne(filtro);
  if (!venda) return respostaErro(res, 404, 'Venda não encontrada.');

  for (const item of venda.itens) {
    const produto = await Produto.findById(item.produtoId);
    if (produto?.controlarEstoque) {
      produto.estoque += item.quantidade;
      await produto.save();
    }
  }

  venda.status = 'cancelada';
  await venda.save();
  res.json({ mensagem: 'Venda cancelada.', venda: serializarVenda(venda) });
}));

module.exports = router;
