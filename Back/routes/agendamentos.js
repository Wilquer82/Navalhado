const express = require('express');
const Appointment = require('../models/Appointment');
const Profissional = require('../models/Profissional');
const { autenticar, autenticarOpcional, asyncHandler } = require('../middlewares/auth');
const {
  dataValida,
  horarioValido,
  normalizarTelefone,
  validarNome,
  dataBanco,
  minutos,
  horario,
  sanitizarObjectId
} = require('../services/validacoes');
const {
  servicoDoProfissional,
  validarAgendamento,
  linksNotificacao,
  serializarAgendamento
} = require('../services/agenda');

const router = express.Router();

const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

function assinaturaPushValida(assinatura) {
  if (!assinatura) return true;
  if (!assinatura.endpoint || !assinatura.keys?.p256dh || !assinatura.keys?.auth) return false;
  try {
    const url = new URL(assinatura.endpoint);
    const hostPermitido = url.hostname === 'fcm.googleapis.com'
      || url.hostname === 'web.push.apple.com'
      || url.hostname === 'push.services.mozilla.com'
      || url.hostname.endsWith('.push.services.mozilla.com')
      || url.hostname.endsWith('.notify.windows.com');
    return url.protocol === 'https:' && !url.port && !url.username && !url.password && hostPermitido;
  } catch {
    return false;
  }
}

router.post('/', autenticarOpcional, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const profissionalId = sanitizarObjectId(body.profissionalId);
  const servicoId = sanitizarObjectId(body.servicoId);
  const data = String(body.data || '').trim();
  const horarioInicio = String(body.horarioInicio || body.horario || '').trim();
  const cliente = body.cliente || {};
  const nomeCliente = String(body.nomeCliente || cliente.nome || '').trim();
  const telefoneCliente = String(body.telefoneCliente || cliente.telefone || body.telefone || '').trim();
  const pushSubscription = body.pushSubscription;
  const usarSinalPix = body.usarSinalPix === true;
  const aceiteSinal = body.aceiteSinal === true;
  if (!profissionalId || !servicoId || !data || !horarioInicio || !nomeCliente || !telefoneCliente) {
    return respostaErro(res, 400, 'Preencha todos os campos obrigatórios.');
  }
  if (!assinaturaPushValida(pushSubscription)) {
    return respostaErro(res, 400, 'Assinatura de notificações inválida.');
  }
  if (!validarNome(nomeCliente)) return respostaErro(res, 400, 'Nome deve ter pelo menos 3 caracteres.');
  if (!dataValida(data)) return respostaErro(res, 400, 'Data inválida.');
  if (!horarioValido(horarioInicio)) return respostaErro(res, 400, 'Horário inválido.');
  if (normalizarTelefone(telefoneCliente).length < 10) return respostaErro(res, 400, 'Telefone inválido.');
  const profissional = await Profissional.findOne({ _id: profissionalId, ativo: true });
  if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');
  const vinculo = await servicoDoProfissional(profissional, servicoId);
  if (!vinculo) return respostaErro(res, 400, 'Serviço não atendido por este profissional.');
  if (usarSinalPix && !String(profissional.chavePix || '').trim()) {
    return respostaErro(res, 400, 'Este profissional ainda não cadastrou uma chave PIX.');
  }
  if (usarSinalPix && !aceiteSinal) {
    return respostaErro(res, 400, 'Confirme o compromisso de pagamento do sinal para continuar.');
  }
  const duracao = vinculo.vinculo.duracaoMinutos;
  const valorOriginalCentavos = Math.round(Number(vinculo.vinculo.preco) * 100);
  const valorSinalCentavos = usarSinalPix ? Math.round(valorOriginalCentavos / 2) : 0;
  const descontoCentavos = usarSinalPix ? Math.round(valorOriginalCentavos / 10) : 0;
  const pagamento = {
    tipo: usarSinalPix ? 'sinal_pix' : 'integral',
    valorOriginal: valorOriginalCentavos / 100,
    valorSinal: valorSinalCentavos / 100,
    desconto: descontoCentavos / 100,
    valorFinal: (valorOriginalCentavos - descontoCentavos) / 100,
    valorRestante: (valorOriginalCentavos - descontoCentavos - valorSinalCentavos) / 100,
    aceiteSinal
  };
  const validacao = await validarAgendamento({ profissionalId, servicoId, data, horarioInicio, duracaoMinutos: duracao });
  if (validacao.erro) return respostaErro(res, 400, validacao.erro);
  const agendamento = new Appointment({
    profissionalId,
    servicoId,
    data: dataBanco(data),
    horarioInicio,
    horarioFim: horario(minutos(horarioInicio) + duracao),
    inicioEm: new Date(`${data}T${horarioInicio}:00-03:00`),
    lembreteEm: new Date(new Date(`${data}T${horarioInicio}:00-03:00`).getTime() - 15 * 60 * 1000),
    pushSubscription,
    nomeCliente,
    telefoneCliente,
    pagamento,
    status: 'pendente',
    tokenConfirmacao: require('crypto').randomBytes(24).toString('hex')
  });
  try {
    await agendamento.save();
  } catch (error) {
    if (error.code === 11000) return respostaErro(res, 409, 'Horário já reservado.');
    throw error;
  }
  const links = await linksNotificacao(agendamento, profissional, vinculo.servico);
  res.status(201).json({
    ...serializarAgendamento(agendamento, profissional, vinculo.servico),
    ...(usarSinalPix ? { chavePix: profissional.chavePix } : {}),
    ...links
  });
}));

router.get('/confirmar/:token', autenticarOpcional, asyncHandler(async (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token || token.length < 16 || token.length > 128) {
    return respostaErro(res, 400, 'Token inválido.');
  }
  const agendamento = await Appointment.findOneAndUpdate(
    { tokenConfirmacao: token, status: 'pendente' },
    { status: 'confirmado' },
    { new: true }
  ).populate('profissionalId', 'nome').populate('servicoId', 'nome preco duracaoMinutos');
  if (!agendamento) return respostaErro(res, 404, 'Link inválido ou agendamento já confirmado.');
  res.json({ mensagem: 'Agendamento confirmado com sucesso.' });
}));

router.get('/', autenticar, asyncHandler(async (req, res) => {
  const data = typeof req.query.data === 'string' ? req.query.data.trim() : '';
  const query = {
    status: { $ne: 'cancelado' },
    profissionalId: req.auth.profissionalId
  };
  if (data) {
    if (!dataValida(data)) return respostaErro(res, 400, 'Data inválida.');
    query.data = {
      $gte: new Date(`${data}T00:00:00-03:00`),
      $lt: new Date(new Date(`${data}T00:00:00-03:00`).getTime() + 24 * 60 * 60 * 1000)
    };
  }
  const agendamentos = await Appointment.find(query)
    .populate('profissionalId', 'nome')
    .populate('servicoId', 'nome preco duracaoMinutos')
    .sort({ data: 1, horarioInicio: 1 });
  res.json(agendamentos.map(a => serializarAgendamento(a, a.profissionalId, a.servicoId)));
}));

router.put('/:id/sinal-pix', autenticar, asyncHandler(async (req, res) => {
  const id = sanitizarObjectId(req.params.id);
  if (!id) return respostaErro(res, 400, 'ID inválido.');
  const agendamento = await Appointment.findOneAndUpdate(
    {
      _id: id,
      profissionalId: req.auth.profissionalId,
      status: { $ne: 'cancelado' },
      'pagamento.tipo': 'sinal_pix',
      'pagamento.statusSinal': { $ne: 'recebido' }
    },
    { $set: { 'pagamento.statusSinal': 'recebido' } },
    { new: true }
  ).populate('profissionalId', 'nome').populate('servicoId', 'nome preco duracaoMinutos');
  if (!agendamento) return respostaErro(res, 404, 'Agendamento não encontrado ou sinal já confirmado.');
  res.json(serializarAgendamento(agendamento, agendamento.profissionalId, agendamento.servicoId));
}));

router.delete('/:id/sinal-pendente', autenticar, asyncHandler(async (req, res) => {
  const id = sanitizarObjectId(req.params.id);
  if (!id) return respostaErro(res, 400, 'ID inválido.');
  const agendamento = await Appointment.findOneAndUpdate(
    {
      _id: id,
      profissionalId: req.auth.profissionalId,
      status: { $ne: 'cancelado' },
      'pagamento.tipo': 'sinal_pix',
      'pagamento.statusSinal': { $ne: 'recebido' }
    },
    { $set: { status: 'cancelado' } },
    { new: true }
  );
  if (!agendamento) return respostaErro(res, 404, 'Agendamento não encontrado ou sinal já recebido.');
  res.json({ mensagem: 'Agendamento sem sinal recebido excluído.' });
}));

router.delete('/:id', autenticar, asyncHandler(async (req, res) => {
  const id = sanitizarObjectId(req.params.id);
  if (!id) return respostaErro(res, 400, 'ID inválido.');
  const agendamento = await Appointment.findOneAndDelete({
    _id: id,
    profissionalId: req.auth.profissionalId
  });
  if (!agendamento) return respostaErro(res, 404, 'Agendamento não encontrado.');
  res.json({ mensagem: 'Agendamento excluído.', agendamento: serializarAgendamento(agendamento) });
}));

router.put('/:id/status', autenticar, asyncHandler(async (req, res) => {
  const id = sanitizarObjectId(req.params.id);
  if (!id) return respostaErro(res, 400, 'ID inválido.');
  const permitidos = ['pendente', 'confirmado', 'concluido', 'cancelado'];
  const status = typeof req.body.status === 'string' ? req.body.status : '';
  if (!permitidos.includes(status)) return respostaErro(res, 400, 'Status inválido.');
  const agendamento = await Appointment.findOneAndUpdate(
    { _id: id, profissionalId: req.auth.profissionalId },
    { status },
    { new: true }
  ).populate('profissionalId', 'nome').populate('servicoId', 'nome preco duracaoMinutos');
  if (!agendamento) return respostaErro(res, 404, 'Agendamento não encontrado.');
  res.json(serializarAgendamento(agendamento, agendamento.profissionalId, agendamento.servicoId));
}));

module.exports = router;
