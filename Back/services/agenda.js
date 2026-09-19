const ConfiguracaoGeral = require('../models/ConfiguracaoGeral');
const Profissional = require('../models/Profissional');
const Servico = require('../models/Servico');
const Appointment = require('../models/Appointment');
const Bloqueio = require('../models/Bloqueio');
const {
  dataBanco,
  intervaloData,
  diaSemana,
  minutos,
  horario,
  horariosSobrepostos,
  formatarDataAPI
} = require('./validacoes');

const configPadrao = {
  domingo: null,
  segunda: { inicio: '08:00', fim: '18:00' },
  terca: { inicio: '08:00', fim: '18:00' },
  quarta: { inicio: '08:00', fim: '18:00' },
  quinta: { inicio: '08:00', fim: '18:00' },
  sexta: { inicio: '08:00', fim: '18:00' },
  sabado: { inicio: '08:00', fim: '14:00' }
};

async function obterConfiguracao() {
  let config = await ConfiguracaoGeral.findOne();
  if (!config) config = await ConfiguracaoGeral.create({ horarioFuncionamento: configPadrao, duracaoIntervaloEntre: 15 });
  return config;
}

function horarioDoProfissional(profissional, data, config) {
  const nomeDia = diasSemana[diaSemana(data)];
  return profissional.horarioTrabalho?.get(nomeDia) || config.horarioFuncionamento?.get(nomeDia) || configPadrao[nomeDia];
}

function folga(profissional, data) {
  const chave = dataBanco(data).toISOString().slice(0, 10);
  return (profissional.folgas || []).some(item => item.toISOString().slice(0, 10) === chave);
}

async function servicoDoProfissional(profissional, servicoId) {
  const vinculo = profissional.servicos.find(item => String(item.servicoId) === String(servicoId));
  if (!vinculo) return null;
  const servico = await Servico.findOne({ _id: servicoId, ativo: true });
  return servico ? { servico, vinculo } : null;
}

function linkWhatsApp(numero, mensagem) {
  const telefone = String(numero || '').replace(/\D/g, '');
  return telefone ? `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}` : null;
}

async function linksNotificacao(agendamento, profissional, servico) {
  const data = formatarDataAPI(agendamento.data);
  const cliente = `Olá! Agendamento solicitado: ${profissional.nome} — ${servico.nome} — ${data} às ${agendamento.horarioInicio}. Aguarde confirmação.`;
  const confirmar = `${process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`}/api/agendamentos/confirmar/${agendamento.tokenConfirmacao}`;
  const profissionalMensagem = `NOVO AGENDAMENTO: ${agendamento.nomeCliente} — ${servico.nome} — ${data} às ${agendamento.horarioInicio}. Para confirmar: ${confirmar}`;
  return {
    whatsappCliente: linkWhatsApp(agendamento.telefoneCliente, cliente),
    whatsappProfissional: linkWhatsApp(profissional.telefone, profissionalMensagem),
    linkConfirmacao: confirmar
  };
}

async function verificarBloqueios(profissionalId, data, horarioInicio, horarioFim) {
  const bloqueios = await Bloqueio.find({ profissionalId, ativo: true });
  const dia = diaSemana(data);
  for (const bloqueio of bloqueios) {
    let afeta = false;
    if (bloqueio.recorrente) {
      if (bloqueio.diaSemana === dia) afeta = true;
    } else if (bloqueio.data === data) {
      afeta = true;
    }
    if (!afeta) continue;
    if (!bloqueio.horarioInicio || !bloqueio.horarioFim) return true;
    if (horariosSobrepostos(horarioInicio, horarioFim, bloqueio.horarioInicio, bloqueio.horarioFim)) return true;
  }
  return false;
}

async function horariosDisponiveis(profissional, data, servicoId, config) {
  const vinculo = servicoId ? await servicoDoProfissional(profissional, servicoId) : profissional.servicos[0] && await servicoDoProfissional(profissional, profissional.servicos[0].servicoId);
  if (!vinculo) return [];
  const expediente = horarioDoProfissional(profissional, data, config);
  if (folga(profissional, data) || !expediente) return [];
  const ocupados = await Appointment.find({ profissionalId: profissional._id, data: intervaloData(data), status: { $ne: 'cancelado' } });
  const duracao = vinculo.vinculo.duracaoMinutos;
  const intervalo = config.duracaoIntervaloEntre;
  const inicioExpediente = minutos(expediente.inicio);
  const fimExpediente = minutos(expediente.fim);
  const livres = [];
  for (let inicio = inicioExpediente; inicio + duracao <= fimExpediente; inicio += 15) {
    const fim = inicio + duracao;
    const horarioInicio = horario(inicio);
    const horarioFim = horario(fim);
    const bloqueado = await verificarBloqueios(profissional._id, data, horarioInicio, horarioFim);
    if (bloqueado) continue;
    const conflita = ocupados.some(item => horariosSobrepostos(inicio, fim, minutos(item.horarioInicio), minutos(item.horarioFim) + intervalo));
    if (!conflita) livres.push({ horarioInicio, horarioFim });
  }
  return livres;
}

async function validarAgendamento({ profissionalId, servicoId, data, horarioInicio, duracaoMinutos, excluirId }) {
  const profissional = await Profissional.findOne({ _id: profissionalId, ativo: true });
  if (!profissional) return { erro: 'Profissional não encontrado.' };
  const config = await obterConfiguracao();
  const expediente = horarioDoProfissional(profissional, data, config);
  if (folga(profissional, data) || !expediente) return { erro: 'Dia de folga ou fora do expediente.' };
  const inicio = minutos(horarioInicio);
  const fim = inicio + duracaoMinutos;
  if (inicio < minutos(expediente.inicio) || fim > minutos(expediente.fim)) return { erro: 'Horário fora do expediente.' };
  const bloqueado = await verificarBloqueios(profissionalId, data, horarioInicio, horario(fim));
  if (bloqueado) return { erro: 'Horário bloqueado.' };
  const query = { profissionalId, data: intervaloData(data), status: { $ne: 'cancelado' } };
  if (excluirId) query._id = { $ne: excluirId };
  const ocupados = await Appointment.find(query);
  const conflito = ocupados.some(item => horariosSobrepostos(inicio, fim, minutos(item.horarioInicio), minutos(item.horarioFim) + config.duracaoIntervaloEntre));
  if (conflito) return { erro: 'Horário já reservado.' };
  return { profissional, config };
}

function serializarAgendamento(agendamento, profissional, servico) {
  const obj = agendamento.toObject ? agendamento.toObject() : agendamento;
  return {
    ...obj,
    data: formatarDataAPI(obj.data),
    horario: obj.horarioInicio,
    telefone: obj.telefoneCliente,
    cliente: { nome: obj.nomeCliente, telefone: obj.telefoneCliente },
    profissional: profissional ? { _id: profissional._id, nome: profissional.nome } : obj.profissionalId,
    servico: servico ? { _id: servico._id, nome: servico.nome, preco: servico.preco, duracaoMinutos: servico.duracaoMinutos, duracao: servico.duracaoMinutos } : obj.servicoId,
    observacoes: obj.observacoes || ''
  };
}

module.exports = {
  obterConfiguracao,
  horarioDoProfissional,
  folga,
  servicoDoProfissional,
  linksNotificacao,
  verificarBloqueios,
  horariosDisponiveis,
  validarAgendamento,
  serializarAgendamento,
  configPadrao
};