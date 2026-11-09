const express = require('express');
const Appointment = require('../models/Appointment');
const Profissional = require('../models/Profissional');
const Venda = require('../models/Venda');
const { autenticar, asyncHandler } = require('../middlewares/auth');
const { dataValida, formatarDataAPI } = require('../services/validacoes');

const router = express.Router();

const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

router.get('/agenda', autenticar, asyncHandler(async (req, res) => {
  const { data } = req.query;
  if (!dataValida(data)) return respostaErro(res, 400, 'Data inválida.');
  const agenda = await Appointment.find({
    profissionalId: req.auth.profissionalId,
    data: {
      $gte: new Date(`${data}T00:00:00-03:00`),
      $lt: new Date(new Date(`${data}T00:00:00-03:00`).getTime() + 24 * 60 * 60 * 1000)
    },
    status: { $ne: 'cancelado' }
  }).populate('servicoId', 'nome preco duracaoMinutos').sort({ horarioInicio: 1 });
  res.json(agenda.map(a => ({
    _id: a._id,
    profissionalId: a.profissionalId,
    servicoId: a.servicoId,
    data: formatarDataAPI(a.data),
    horarioInicio: a.horarioInicio,
    horarioFim: a.horarioFim,
    horario: a.horarioInicio,
    nomeCliente: a.nomeCliente,
    telefoneCliente: a.telefoneCliente,
    telefone: a.telefoneCliente,
    cliente: { nome: a.nomeCliente, telefone: a.telefoneCliente },
    status: a.status,
    servico: a.servicoId?.nome,
    preco: a.servicoId?.preco,
    duracao: a.servicoId?.duracaoMinutos,
    observacoes: a.observacoes || ''
  })));
}));

router.get('/balanco', autenticar, asyncHandler(async (req, res) => {
  const mes = String(req.query.mes || '').trim();
  if (!/^\d{4}-\d{2}$/.test(mes)) return respostaErro(res, 400, 'Mês inválido. Use o formato YYYY-MM.');

  const inicio = new Date(`${mes}-01T00:00:00-03:00`);
  const fim = new Date(inicio);
  fim.setMonth(fim.getMonth() + 1);

  const profissional = await Profissional.findById(req.auth.profissionalId).select('nome comissaoPercentual');
  if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');

  const agendamentosFinalizados = await Appointment.find({
    profissionalId: req.auth.profissionalId,
    data: { $gte: inicio, $lt: fim },
    status: { $in: ['finalizado', 'concluido'] }
  }).sort({ data: 1, horarioInicio: 1 });

  const vendas = await Venda.find({
    profissionalId: req.auth.profissionalId,
    data: { $gte: inicio, $lt: fim },
    status: { $ne: 'cancelada' }
  }).sort({ data: 1, createdAt: 1 });

  let totalServicos = 0;
  let totalComissao = 0;

  for (const a of agendamentosFinalizados) {
    const valor = a.pagamento?.valorFinal || 0;
    totalServicos += valor;
    totalComissao += a.comissaoValor || (valor * (profissional.comissaoPercentual || 50) / 100);
  }

  let totalVendas = 0;
  let quantidadeServicos = 0;

  for (const v of vendas) {
    totalVendas += Number(v.total || 0);
  }
  quantidadeServicos = agendamentosFinalizados.length;

  const arred = (n) => Math.round(Number(n || 0) * 100) / 100;

  res.json({
    profissional: { id: profissional._id, nome: profissional.nome, comissaoPercentual: profissional.comissaoPercentual || 50 },
    mes,
    resumo: {
      quantidadeServicos: quantidadeServicos,
      totalServicos: arred(totalServicos),
      totalComissao: arred(totalComissao),
      totalSalao: arred(totalServicos - totalComissao),
      totalVendas: arred(totalVendas),
      totalGeral: arred(totalServicos + totalVendas),
      ticketMedioServicos: quantidadeServicos ? arred(totalServicos / quantidadeServicos) : 0
    }
  });
}));

router.post('/folgas', autenticar, asyncHandler(async (req, res) => {
  if (!dataValida(req.body.data)) return respostaErro(res, 400, 'Data inválida.');
  const profissional = await Profissional.findByIdAndUpdate(
    req.auth.profissionalId,
    { $addToSet: { folgas: new Date(`${req.body.data}T12:00:00-03:00`) } },
    { new: true }
  );
  res.json({ folgas: profissional.folgas });
}));

router.get('/agenda/exportar', autenticar, asyncHandler(async (req, res) => {
  if (!/^\d{4}-\d{2}$/.test(req.query.mes || '')) return respostaErro(res, 400, 'Mês inválido.');
  const inicio = `${req.query.mes}-01`;
  const fim = new Date(`${inicio}T12:00:00-03:00`);
  fim.setMonth(fim.getMonth() + 1);
  const agenda = await Appointment.find({
    profissionalId: req.auth.profissionalId,
    data: { $gte: new Date(`${inicio}T00:00:00-03:00`), $lt: fim }
  }).populate('servicoId', 'nome').sort({ data: 1, horarioInicio: 1 });
  const linhas = ['data,horario,cliente,telefone,servico,status', ...agenda.map(item =>
    [formatarDataAPI(item.data), item.horarioInicio, item.nomeCliente, item.telefoneCliente, item.servicoId?.nome || '', item.status]
      .map(valor => `"${String(valor).replace(/"/g, '""')}"`).join(',')
  )];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=agenda-${req.query.mes}.csv`);
  res.send(`\uFEFF${linhas.join('\n')}`);
}));

module.exports = router;
