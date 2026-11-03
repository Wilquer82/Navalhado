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

  const profissional = await Profissional.findById(req.auth.profissionalId).select('nome');
  if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');

  const agendamentos = await Appointment.find({
    profissionalId: req.auth.profissionalId,
    data: { $gte: inicio, $lt: fim },
    status: { $ne: 'cancelado' }
  })
    .populate('servicoId', 'nome preco duracaoMinutos')
    .sort({ data: 1, horarioInicio: 1 });

  const vendas = await Venda.find({
    profissionalId: req.auth.profissionalId,
    data: { $gte: inicio, $lt: fim },
    status: { $ne: 'cancelada' }
  }).sort({ data: 1, createdAt: 1 });

  const porServico = {};
  let totalPrevistoServicos = 0;
  let totalConfirmadoServicos = 0;
  let totalSinalRecebido = 0;
  let totalSinalPendente = 0;
  let qtdServicos = 0;
  let qtdConfirmado = 0;

  const listaAgendamentos = agendamentos.map(a => {
    const pag = a.pagamento || {};
    const valor = Number(
      pag.valorFinal != null
        ? pag.valorFinal
        : (a.servicoId?.preco ?? 0)
    );
    const status = a.status;
    const confirmado = status === 'confirmado' || status === 'concluido';

    totalPrevistoServicos += valor;
    qtdServicos += 1;
    if (confirmado) {
      totalConfirmadoServicos += valor;
      qtdConfirmado += 1;
    }

    if (pag.tipo === 'sinal_pix') {
      const sinal = Number(pag.valorSinal || 0);
      if (pag.statusSinal === 'recebido') totalSinalRecebido += sinal;
      else totalSinalPendente += sinal;
    }

    const nomeServico = a.servicoId?.nome || 'Serviço';
    if (!porServico[nomeServico]) {
      porServico[nomeServico] = { servico: nomeServico, quantidade: 0, total: 0 };
    }
    porServico[nomeServico].quantidade += 1;
    porServico[nomeServico].total += valor;

    return {
      _id: a._id,
      data: formatarDataAPI(a.data),
      horario: a.horarioInicio,
      nomeCliente: a.nomeCliente,
      telefone: a.telefoneCliente,
      servico: nomeServico,
      status,
      valor,
      pagamento: {
        tipo: pag.tipo || 'integral',
        valorFinal: valor,
        valorSinal: Number(pag.valorSinal || 0),
        statusSinal: pag.statusSinal || null,
        valorRestante: Number(pag.valorRestante || 0)
      }
    };
  });

  const porProduto = {};
  let totalVendas = 0;
  let qtdVendas = 0;

  const listaVendas = vendas.map(v => {
    totalVendas += Number(v.total || 0);
    qtdVendas += 1;
    for (const item of v.itens || []) {
      const nome = item.nome || 'Produto';
      if (!porProduto[nome]) {
        porProduto[nome] = { produto: nome, quantidade: 0, total: 0 };
      }
      porProduto[nome].quantidade += Number(item.quantidade || 0);
      porProduto[nome].total += Number(item.subtotal || 0);
    }
    return {
      _id: v._id,
      data: formatarDataAPI(v.data),
      nomeCliente: v.nomeCliente || '',
      itens: v.itens,
      total: v.total,
      observacoes: v.observacoes || ''
    };
  });

  const arred = (n) => Math.round(Number(n || 0) * 100) / 100;

  res.json({
    profissional: { id: profissional._id, nome: profissional.nome },
    mes,
    resumo: {
      quantidadeServicos: qtdServicos,
      quantidadeConfirmada: qtdConfirmado,
      totalPrevistoServicos: arred(totalPrevistoServicos),
      totalConfirmadoServicos: arred(totalConfirmadoServicos),
      totalSinalRecebido: arred(totalSinalRecebido),
      totalSinalPendente: arred(totalSinalPendente),
      quantidadeVendas: qtdVendas,
      totalVendas: arred(totalVendas),
      totalGeral: arred(totalPrevistoServicos + totalVendas),
      totalGeralConfirmado: arred(totalConfirmadoServicos + totalVendas),
      ticketMedioServicos: qtdServicos ? arred(totalPrevistoServicos / qtdServicos) : 0,
      // compatibilidade com a tela anterior
      quantidade: qtdServicos,
      totalPrevisto: arred(totalPrevistoServicos),
      totalConfirmado: arred(totalConfirmadoServicos),
      ticketMedio: qtdServicos ? arred(totalPrevistoServicos / qtdServicos) : 0
    },
    porServico: Object.values(porServico).sort((a, b) => b.total - a.total),
    porProduto: Object.values(porProduto).sort((a, b) => b.total - a.total),
    agendamentos: listaAgendamentos,
    vendas: listaVendas
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
