const express = require('express');
const Appointment = require('../models/Appointment');
const Profissional = require('../models/Profissional');
const { autenticar, asyncHandler } = require('../middlewares/auth');
const { dataValida, formatarDataAPI } = require('../services/validacoes');
const { obterConfiguracao } = require('../services/agenda');

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