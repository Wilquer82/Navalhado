require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { app, PORT } = require('./app');
const Profissional = require('./models/Profissional');
const Servico = require('./models/Servico');
const ConfiguracaoGeral = require('./models/ConfiguracaoGeral');
const User = require('./models/User');
const Appointment = require('./models/Appointment');

const TIME_ZONE = 'America/Sao_Paulo';
const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const configPadrao = {
  domingo: null,
  segunda: { inicio: '08:00', fim: '18:00' },
  terca: { inicio: '08:00', fim: '18:00' },
  quarta: { inicio: '08:00', fim: '18:00' },
  quinta: { inicio: '08:00', fim: '18:00' },
  sexta: { inicio: '08:00', fim: '18:00' },
  sabado: { inicio: '08:00', fim: '14:00' }
};

const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });
const minutos = horario => {
  const [hora, minuto] = horario.split(':').map(Number);
  return hora * 60 + minuto;
};
const horario = total => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
const dataValida = data => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const [ano, mes, dia] = data.split('-').map(Number);
  const valor = new Date(`${data}T12:00:00-03:00`);
  return valor.getFullYear() === ano && valor.getMonth() + 1 === mes && valor.getDate() === dia;
};
const dataBanco = data => new Date(`${data}T12:00:00-03:00`);
const intervaloData = data => ({
  $gte: new Date(`${data}T00:00:00-03:00`),
  $lt: new Date(new Date(`${data}T00:00:00-03:00`).getTime() + 24 * 60 * 60 * 1000)
});
const diaSemana = data => new Date(`${data}T12:00:00-03:00`).getDay();
const dataFormatada = data => new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE }).format(data);

async function migrarDadosLegados() {
  const config = await obterConfiguracao();
  const servicos = await Servico.find({ ativo: true });
  for (const servico of servicos) {
    if (!servico.duracaoMinutos && servico.get('duracao')) {
      servico.duracaoMinutos = servico.get('duracao');
      await servico.save();
    }
  }
  const profissionais = await Profissional.find();
  for (const profissional of profissionais) {
    const atualizacoes = {};
    if (!profissional.descricao || profissional.descricao === 'Geral') atualizacoes.descricao = profissional.get('especialidade') || 'Geral';
    if (!profissional.horarioTrabalho || profissional.horarioTrabalho.size === 0) atualizacoes.horarioTrabalho = configPadrao;
    if (!profissional.servicos?.length && servicos.length) {
      atualizacoes.servicos = servicos.map(servico => ({
        servicoId: servico._id,
        preco: servico.preco,
        duracaoMinutos: servico.duracaoMinutos || servico.get('duracao')
      }));
    }
    if (Object.keys(atualizacoes).length) await Profissional.updateOne({ _id: profissional._id }, { $set: atualizacoes });
  }
  const colecao = mongoose.connection.db.collection('appointments');
  const legados = await colecao.find({ profissionalId: { $exists: false } }).toArray();
  for (const item of legados) {
    const profissional = profissionais.find(registro => registro.nome === item.profissional);
    const servico = servicos.find(registro => registro.nome.trim() === String(item.servico || '').trim());
    if (!profissional || !servico || !/^\d{4}-\d{2}-\d{2}$/.test(item.data) || !/^\d{2}:\d{2}$/.test(item.horario)) continue;
    const duracao = Number(item.duracao || servico.duracaoMinutos || servico.get('duracao'));
    await colecao.updateOne({ _id: item._id }, { $set: {
      profissionalId: profissional._id,
      servicoId: servico._id,
      data: dataBanco(item.data),
      horarioInicio: item.horario,
      horarioFim: horario(minutos(item.horario) + duracao),
      telefoneCliente: item.telefone || '',
      status: item.status === 'cancelado' ? 'cancelado' : item.status === 'concluido' ? 'concluido' : 'pendente',
      criadoEm: item.createdAt || new Date()
    }, $unset: { profissional: '', servico: '', duracao: '', preco: '', horario: '', telefone: '' }});
  }
}

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
  const data = dataFormatada(agendamento.data);
  const cliente = `Olá! Agendamento solicitado: ${profissional.nome} — ${servico.nome} — ${data} às ${agendamento.horarioInicio}. Aguarde confirmação.`;
  const confirmar = `${process.env.PUBLIC_API_URL || `http://localhost:${PORT}`}/api/agendamentos/confirmar/${agendamento.tokenConfirmacao}`;
  const profissionalMensagem = `NOVO AGENDAMENTO: ${agendamento.nomeCliente} — ${servico.nome} — ${data} às ${agendamento.horarioInicio}. Para confirmar: ${confirmar}`;
  return {
    whatsappCliente: linkWhatsApp(agendamento.telefoneCliente, cliente),
    whatsappProfissional: linkWhatsApp(profissional.telefone, profissionalMensagem),
    linkConfirmacao: confirmar
  };
}

async function garantirDadosIniciais() {
  let servicosPadrao = await Servico.find({ ativo: true });
  if (servicosPadrao.length === 0) {
    servicosPadrao = await Servico.insertMany([
      { nome: 'Corte', preco: 50, duracaoMinutos: 30 },
      { nome: 'Barba', preco: 35, duracaoMinutos: 30 },
      { nome: 'Corte + Barba', preco: 75, duracaoMinutos: 60 }
    ]);
    console.log('Serviços padrão criados.');
  }

  const adminExistente = await User.findOne({ $or: [{ usuario: 'admin' }, { email: 'admin@navalhado.com' }] });
  if (!adminExistente) {
    await User.create({
      usuario: 'admin',
      email: 'admin@navalhado.com',
      senha: await bcrypt.hash('1234', 10)
    });
    console.log('Usuário admin padrão criado.');
  }

  const profissionaisPadrao = ['Victor Gabriel', 'Paulo Vitor', 'Denis'];
  for (const nome of profissionaisPadrao) {
    const profissionalExiste = await Profissional.findOne({ nome, ativo: true });
    if (!profissionalExiste) {
      await Profissional.create({
        nome,
        descricao: 'Geral',
        telefone: '',
        horarioTrabalho: configPadrao,
        servicos: servicosPadrao.map(servico => ({
          servicoId: servico._id,
          preco: servico.preco,
          duracaoMinutos: servico.duracaoMinutos
        }))
      });
      console.log(`Profissional padrão criado: ${nome}`);
    }
  }

  if (process.env.PROFISSIONAL_EMAIL && process.env.PROFISSIONAL_PASSWORD) {
    const existe = await Profissional.findOne({ 'usuario.email': process.env.PROFISSIONAL_EMAIL.toLowerCase() });
    if (!existe) {
      await Profissional.create({
        nome: process.env.PROFISSIONAL_NOME || 'Profissional Navalhado',
        telefone: process.env.PROFISSIONAL_TELEFONE || '',
        usuario: {
          email: process.env.PROFISSIONAL_EMAIL.toLowerCase(),
          senhaHash: await bcrypt.hash(process.env.PROFISSIONAL_PASSWORD, 10)
        },
        horarioTrabalho: configPadrao,
        servicos: servicosPadrao.map(servico => ({
          servicoId: servico._id,
          preco: servico.preco,
          duracaoMinutos: servico.duracaoMinutos
        }))
      });
      console.log('Usuário profissional inicial criado.');
    }
  }
}

async function iniciar() {
  if (!process.env.MONGO_URI) console.warn('MONGO_URI não configurado.');
  else {
    await mongoose.connect(process.env.MONGO_URI);
    await migrarDadosLegados();
    await garantirDadosIniciais();
  }
  app.listen(PORT, () => console.log(`API na porta ${PORT}`));
}

if (require.main === module) iniciar().catch(error => { console.error('Erro ao iniciar:', error); process.exit(1); });