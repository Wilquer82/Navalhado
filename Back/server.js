require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Appointment = require('./models/Appointment');
const Profissional = require('./models/Profissional');
const Servico = require('./models/Servico');
const ConfiguracaoGeral = require('./models/ConfiguracaoGeral');
const User = require('./models/User');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'navalhado-dev-secret';
const TIME_ZONE = 'America/Sao_Paulo';
const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    const permitidas = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,https://navalhado.onrender.com')
      .split(',').map(item => item.trim()).filter(Boolean);

    if (!origin || permitidas.includes(origin) || permitidas.includes('*')) {
      return callback(null, true);
    }

    const aceitaRender = permitidas.some(item => item.endsWith('.onrender.com') && origin.endsWith(item.replace('*', '')));
    if (aceitaRender) return callback(null, true);

    return callback(new Error('Origem não permitida pelo CORS'));
  }
}));

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

const autenticar = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return respostaErro(res, 401, 'Login obrigatório.');
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return respostaErro(res, 401, 'Token inválido ou expirado.');
  }
};

const autenticarOpcional = (req, res, next) => {
  const cabecalho = req.headers.authorization;
  const token = cabecalho?.startsWith('Bearer ') ? cabecalho.slice(7).trim() : '';
  if (token) {
    try { req.auth = jwt.verify(token, JWT_SECRET); } catch { delete req.auth; }
  }
  next();
};

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
      atualizacoes.servicos = servicos.map(servico => ({ servicoId: servico._id, preco: servico.preco, duracaoMinutos: servico.duracaoMinutos || servico.get('duracao') }));
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

app.get('/api/profissionais', autenticarOpcional, async (req, res) => {
  try {
    res.json(await Profissional.find({ ativo: true }).select('-usuario.senhaHash').sort({ nome: 1 }));
  } catch (error) { respostaErro(res, 500, error.message); }
});

app.get('/api/profissionais/:id/servicos', autenticarOpcional, async (req, res) => {
  try {
    const profissional = await Profissional.findOne({ _id: req.params.id, ativo: true }).populate('servicos.servicoId');
    if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');
    res.json(profissional.servicos.filter(item => item.servicoId?.ativo).map(item => ({
      ...item.servicoId.toObject(), preco: item.preco, duracaoMinutos: item.duracaoMinutos
    })));
  } catch (error) { respostaErro(res, 400, 'Profissional inválido.'); }
});

app.get('/api/profissionais/:id/horarios-disponiveis', autenticarOpcional, async (req, res) => {
  try {
    const { data, servicoId } = req.query;
    if (!dataValida(data)) return respostaErro(res, 400, 'Data inválida.');
    const profissional = await Profissional.findOne({ _id: req.params.id, ativo: true });
    if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');
    const config = await obterConfiguracao();
    const vinculo = servicoId ? await servicoDoProfissional(profissional, servicoId) : profissional.servicos[0] && await servicoDoProfissional(profissional, profissional.servicos[0].servicoId);
    if (!vinculo) return respostaErro(res, 400, 'Serviço não atendido por este profissional.');
    const expediente = horarioDoProfissional(profissional, data, config);
    if (folga(profissional, data) || !expediente) return res.json([]);
    const ocupados = await Appointment.find({ profissionalId: profissional._id, data: intervaloData(data), status: { $ne: 'cancelado' } });
    const duracao = vinculo.vinculo.duracaoMinutos;
    const intervalo = config.duracaoIntervaloEntre;
    const inicioExpediente = minutos(expediente.inicio);
    const fimExpediente = minutos(expediente.fim);
    const livres = [];
    for (let inicio = inicioExpediente; inicio + duracao <= fimExpediente; inicio += 15) {
      const fim = inicio + duracao;
      const conflita = ocupados.some(item => inicio < minutos(item.horarioFim) + intervalo && fim + intervalo > minutos(item.horarioInicio));
      if (!conflita) livres.push({ horarioInicio: horario(inicio), horarioFim: horario(fim) });
    }
    res.json(livres);
  } catch (error) { respostaErro(res, 400, error.message); }
});

app.post('/api/agendamentos', autenticarOpcional, async (req, res) => {
  try {
    const { profissionalId, servicoId, data, horarioInicio, nomeCliente, telefoneCliente } = req.body;
    if (!profissionalId || !servicoId || !data || !horarioInicio || !nomeCliente || !telefoneCliente) return respostaErro(res, 400, 'Preencha todos os campos obrigatórios.');
    if (nomeCliente.trim().length < 3) return respostaErro(res, 400, 'Nome deve ter pelo menos 3 caracteres.');
    if (!dataValida(data) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horarioInicio)) return respostaErro(res, 400, 'Data ou horário inválido.');
    if (String(telefoneCliente).replace(/\D/g, '').length < 10) return respostaErro(res, 400, 'Telefone inválido.');
    const profissional = await Profissional.findOne({ _id: profissionalId, ativo: true });
    if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');
    const vinculo = await servicoDoProfissional(profissional, servicoId);
    if (!vinculo) return respostaErro(res, 400, 'Serviço não atendido por este profissional.');
    const config = await obterConfiguracao();
    const expediente = horarioDoProfissional(profissional, data, config);
    const inicio = minutos(horarioInicio);
    const fim = inicio + vinculo.vinculo.duracaoMinutos;
    if (folga(profissional, data) || !expediente || inicio < minutos(expediente.inicio) || fim > minutos(expediente.fim)) return respostaErro(res, 400, 'Horário fora do expediente ou dia de folga.');
    const agendamentosDoDia = await Appointment.find({ profissionalId, data: intervaloData(data), status: { $ne: 'cancelado' } });
    const conflito = agendamentosDoDia.some(item => inicio < minutos(item.horarioFim) + config.duracaoIntervaloEntre && fim + config.duracaoIntervaloEntre > minutos(item.horarioInicio));
    if (conflito) return respostaErro(res, 409, 'Horário já reservado');
    const agendamento = await Appointment.create({ profissionalId, servicoId, data: dataBanco(data), horarioInicio, horarioFim: horario(fim), nomeCliente: nomeCliente.trim(), telefoneCliente, tokenConfirmacao: crypto.randomBytes(24).toString('hex') });
    const links = await linksNotificacao(agendamento, profissional, vinculo.servico);
    res.status(201).json({ ...agendamento.toObject(), ...links });
  } catch (error) { respostaErro(res, 400, error.message); }
});

app.get('/api/agendamentos/confirmar/:token', autenticarOpcional, async (req, res) => {
  const agendamento = await Appointment.findOneAndUpdate({ tokenConfirmacao: req.params.token, status: 'pendente' }, { status: 'confirmado' }, { new: true });
  if (!agendamento) return respostaErro(res, 404, 'Link inválido ou agendamento já confirmado.');
  res.json({ mensagem: 'Agendamento confirmado com sucesso.' });
});

app.post('/api/auth/login', async (req, res) => {
  const identificador = String(req.body.email || req.body.usuario || '').trim().toLowerCase();
  let profissional = await Profissional.findOne({ 'usuario.email': identificador, ativo: true });
  let senhaHash = profissional?.usuario?.senhaHash;
  if (!profissional) {
    const usuario = await User.findOne({ $or: [{ email: identificador }, { usuario: identificador }] });
    if (usuario) {
      profissional = await Profissional.findOne({ ativo: true }).sort({ nome: 1 });
      senhaHash = usuario.senha;
    }
  }
  if (!profissional || !senhaHash || !await bcrypt.compare(req.body.senha || '', senhaHash)) return respostaErro(res, 401, 'E-mail ou senha inválidos.');
  res.json({ token: jwt.sign({ profissionalId: profissional._id }, JWT_SECRET, { expiresIn: '8h' }), profissional: { id: profissional._id, nome: profissional.nome } });
});

app.get('/api/profissional/agenda', autenticar, async (req, res) => {
  const { data } = req.query;
  if (!dataValida(data)) return respostaErro(res, 400, 'Data inválida.');
  const agenda = await Appointment.find({ profissionalId: req.auth.profissionalId, data: intervaloData(data), status: { $ne: 'cancelado' } }).populate('servicoId', 'nome preco duracaoMinutos').sort({ horarioInicio: 1 });
  res.json(agenda);
});

app.put('/api/agendamentos/:id/status', autenticar, async (req, res) => {
  const permitidos = ['pendente', 'confirmado', 'concluido', 'cancelado'];
  if (!permitidos.includes(req.body.status)) return respostaErro(res, 400, 'Status inválido.');
  const agenda = await Appointment.findOneAndUpdate({ _id: req.params.id, profissionalId: req.auth.profissionalId }, { status: req.body.status }, { new: true });
  if (!agenda) return respostaErro(res, 404, 'Agendamento não encontrado.');
  res.json(agenda);
});

app.post('/api/profissional/folgas', autenticar, async (req, res) => {
  if (!dataValida(req.body.data)) return respostaErro(res, 400, 'Data inválida.');
  const profissional = await Profissional.findByIdAndUpdate(req.auth.profissionalId, { $addToSet: { folgas: dataBanco(req.body.data) } }, { new: true });
  res.json({ folgas: profissional.folgas });
});

app.get('/api/profissional/agenda/exportar', autenticar, async (req, res) => {
  if (!/^\d{4}-\d{2}$/.test(req.query.mes || '')) return respostaErro(res, 400, 'Mês inválido.');
  const inicio = `${req.query.mes}-01`;
  const fim = new Date(`${inicio}T12:00:00-03:00`); fim.setMonth(fim.getMonth() + 1);
  const agenda = await Appointment.find({ profissionalId: req.auth.profissionalId, data: { $gte: dataBanco(inicio), $lt: fim } }).populate('servicoId', 'nome').sort({ data: 1, horarioInicio: 1 });
  const linhas = ['data,horario,cliente,telefone,servico,status', ...agenda.map(item => [dataFormatada(item.data), item.horarioInicio, item.nomeCliente, item.telefoneCliente, item.servicoId?.nome || '', item.status].map(valor => `"${String(valor).replace(/"/g, '""')}"`).join(','))];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=agenda-${req.query.mes}.csv`);
  res.send(`\uFEFF${linhas.join('\n')}`);
});

app.get('/api/dados', async (req, res) => res.json({ profissionais: await Profissional.find({ ativo: true }).select('-usuario.senhaHash') }));

async function iniciar() {
  if (!process.env.MONGO_URI) console.warn('MONGO_URI não configurado.');
  else {
    await mongoose.connect(process.env.MONGO_URI);
    await migrarDadosLegados();
    let servicosPadrao = await Servico.find({ ativo: true });
    if (servicosPadrao.length === 0) {
      servicosPadrao = await Servico.insertMany([
        { nome: 'Corte', preco: 50, duracaoMinutos: 30 },
        { nome: 'Barba', preco: 35, duracaoMinutos: 30 },
        { nome: 'Corte + Barba', preco: 75, duracaoMinutos: 60 }
      ]);
      console.log('Serviços padrão criados.');
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
  app.listen(PORT, () => console.log(`API na porta ${PORT}`));
}

if (require.main === module) iniciar().catch(error => { console.error('Erro ao iniciar:', error); process.exit(1); });
module.exports = app;
