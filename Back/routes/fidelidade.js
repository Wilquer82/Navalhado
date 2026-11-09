const express = require('express');
const { autenticar, asyncHandler } = require('../middlewares/auth');
const ClienteFidelidade = require('../models/ClienteFidelidade');
const Appointment = require('../models/Appointment');
const { normalizarTelefoneBrasileiro } = require('../services/validacoes');

const router = express.Router();
const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

router.get('/', autenticar, asyncHandler(async (req, res) => {
  if (req.auth.role !== 'admin') return respostaErro(res, 403, 'Acesso negado.');
  const clientes = await ClienteFidelidade.find({ ativo: true })
    .select('telefoneNormalizado pontos createdAt')
    .sort({ pontos: -1, createdAt: -1 });
  res.json(clientes);
}));

router.get('/:telefone', asyncHandler(async (req, res) => {
  const telefone = req.params.telefone;
  const telefoneNormalizado = normalizarTelefoneBrasileiro(telefone);
  if (!telefoneNormalizado) return respostaErro(res, 400, 'Telefone inválido.');
  let cliente = await ClienteFidelidade.findOne({ telefoneNormalizado, ativo: true })
    .select('telefoneNormalizado pontos ajustes');
  if (!cliente) {
    cliente = new ClienteFidelidade({ telefoneNormalizado, pontos: 0 });
    await cliente.save();
  }
  res.json({ telefone: telefone, pontos: cliente.pontos });
}));

router.post('/ajuste', autenticar, asyncHandler(async (req, res) => {
  if (req.auth.role !== 'admin') return respostaErro(res, 403, 'Acesso negado.');
  const { telefone, tipo, pontos, motivo } = req.body;
  if (!telefone || !tipo || pontos === undefined || !motivo) {
    return respostaErro(res, 400, 'Campos obrigatórios faltando.');
  }
  if (!['adicionar', 'resgatar', 'zerar', 'corrigir'].includes(tipo)) {
    return respostaErro(res, 400, 'Tipo de ajuste inválido.');
  }
  const telefoneNormalizado = normalizarTelefoneBrasileiro(telefone);
  if (!telefoneNormalizado) return respostaErro(res, 400, 'Telefone inválido.');
  let cliente = await ClienteFidelidade.findOne({ telefoneNormalizado });
  if (!cliente) cliente = new ClienteFidelidade({ telefoneNormalizado, pontos: 0 });
  if (tipo === 'zerar' || tipo === 'corrigir') {
    cliente.pontos = 0;
   cliente.ajustes.push({ tipo: 'zerar', pontos: 0, motivo, criadoPor: req.auth.userId });
  } else if (tipo === 'adicionar') {
    cliente.pontos += pontos;
    cliente.ajustes.push({ tipo: 'adicionar', pontos, motivo, criadoPor: req.auth.userId });
  } else if (tipo === 'resgatar') {
    if (cliente.pontos < pontos) return respostaErro(res, 400, 'Saldo insuficiente de pontos.');
    cliente.pontos -= pontos;
    cliente.ajustes.push({ tipo: 'resgatar', pontos, motivo, criadoPor: req.auth.userId });
  }
  await cliente.save();
  res.json({ telefone: telefoneNormalizado, pontos: cliente.pontos });
}));

module.exports = router;