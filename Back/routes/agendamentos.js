const express = require('express');
const Appointment = require('../models/Appointment');
const Profissional = require('../models/Profissional');
const { autenticar, autenticarOpcional, asyncHandler } = require('../middlewares/auth');
const { dataValida, horarioValido, normalizarTelefone, validarNome, dataBanco, minutos, horario } = require('../services/validacoes');
const { 
  servicoDoProfissional, 
  validarAgendamento, 
  linksNotificacao, 
  serializarAgendamento
} = require('../services/agenda');

const router = express.Router();

const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

router.post('/', autenticarOpcional, asyncHandler(async (req, res) => {
  const body = req.body || {};
  const profissionalId = body.profissionalId;
  const servicoId = body.servicoId;
  const data = String(body.data || '').trim();
  const horarioInicio = String(body.horarioInicio || body.horario || '').trim();
  const cliente = body.cliente || {};
  const nomeCliente = String(body.nomeCliente || cliente.nome || '').trim();
  const telefoneCliente = String(body.telefoneCliente || cliente.telefone || body.telefone || '').trim();
  if (!profissionalId || !servicoId || !data || !horarioInicio || !nomeCliente || !telefoneCliente) {
    return respostaErro(res, 400, 'Preencha todos os campos obrigatórios.');
  }
  if (!validarNome(nomeCliente)) return respostaErro(res, 400, 'Nome deve ter pelo menos 3 caracteres.');
  if (!dataValida(data)) return respostaErro(res, 400, 'Data inválida.');
  if (!horarioValido(horarioInicio)) return respostaErro(res, 400, 'Horário inválido.');
  if (normalizarTelefone(telefoneCliente).length < 10) return respostaErro(res, 400, 'Telefone inválido.');
  const profissional = await Profissional.findOne({ _id: profissionalId, ativo: true });
  if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');
  const vinculo = await servicoDoProfissional(profissional, servicoId);
  if (!vinculo) return respostaErro(res, 400, 'Serviço não atendido por este profissional.');
  const duracao = vinculo.vinculo.duracaoMinutos;
  const validacao = await validarAgendamento({ profissionalId, servicoId, data, horarioInicio, duracaoMinutos: duracao });
  if (validacao.erro) return respostaErro(res, 400, validacao.erro);
  const agendamento = new Appointment({
    profissionalId,
    servicoId,
    data: dataBanco(data),
    horarioInicio,
    horarioFim: horario(minutos(horarioInicio) + duracao),
    nomeCliente,
    telefoneCliente,
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
  res.status(201).json({ ...serializarAgendamento(agendamento, profissional, vinculo.servico), ...links });
}));

router.get('/confirmar/:token', autenticarOpcional, asyncHandler(async (req, res) => {
  const agendamento = await Appointment.findOneAndUpdate(
    { tokenConfirmacao: req.params.token, status: 'pendente' },
    { status: 'confirmado' },
    { new: true }
  ).populate('profissionalId', 'nome').populate('servicoId', 'nome preco duracaoMinutos');
  if (!agendamento) return respostaErro(res, 404, 'Link inválido ou agendamento já confirmado.');
  res.json({ mensagem: 'Agendamento confirmado com sucesso.' });
}));

router.get('/', autenticar, asyncHandler(async (req, res) => {
  const { data, profissionalId } = req.query;
  const query = { status: { $ne: 'cancelado' } };
  if (data) {
    if (!dataValida(data)) return respostaErro(res, 400, 'Data inválida.');
    query.data = { 
      $gte: new Date(`${data}T00:00:00-03:00`),
      $lt: new Date(new Date(`${data}T00:00:00-03:00`).getTime() + 24 * 60 * 60 * 1000)
    };
  }
  if (profissionalId) query.profissionalId = profissionalId;
  const agendamentos = await Appointment.find(query)
    .populate('profissionalId', 'nome')
    .populate('servicoId', 'nome preco duracaoMinutos')
    .sort({ data: 1, horarioInicio: 1 });
  res.json(agendamentos.map(a => serializarAgendamento(a, a.profissionalId, a.servicoId)));
}));

router.delete('/:id', autenticar, asyncHandler(async (req, res) => {
  const agendamento = await Appointment.findByIdAndDelete(req.params.id);
  if (!agendamento) return respostaErro(res, 404, 'Agendamento não encontrado.');
  res.json({ mensagem: 'Agendamento excluído.', agendamento: serializarAgendamento(agendamento) });
}));

router.put('/:id/status', autenticar, asyncHandler(async (req, res) => {
  const permitidos = ['pendente', 'confirmado', 'concluido', 'cancelado'];
  if (!permitidos.includes(req.body.status)) return respostaErro(res, 400, 'Status inválido.');
  const agendamento = await Appointment.findOneAndUpdate(
    { _id: req.params.id, profissionalId: req.auth.profissionalId },
    { status: req.body.status },
    { new: true }
  ).populate('profissionalId', 'nome').populate('servicoId', 'nome preco duracaoMinutos');
  if (!agendamento) return respostaErro(res, 404, 'Agendamento não encontrado.');
  res.json(serializarAgendamento(agendamento, agendamento.profissionalId, agendamento.servicoId));
}));

module.exports = router;