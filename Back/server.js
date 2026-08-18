require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Appointment = require('./models/Appointment');
const User = require('./models/User');
const Profissional = require('./models/Profissional');
const Servico = require('./models/Servico');
const Bloqueio = require('./models/Bloqueio');

const app = express();
app.use(cors());
app.use(express.json());

// Horários de funcionamento
const HORARIOS = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'
];

// Conectar MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
    criarDadosPadrao();
  })
  .catch(e => console.error('❌ Erro DB:', e));

// Criar dados padrão
const criarDadosPadrao = async () => {
  const existeUser = await User.findOne({ usuario: 'admin' });
  if (!existeUser) {
    const hash = await bcrypt.hash('salao2026', 10);
    await User.create({ usuario: 'admin', senha: hash });
    console.log('🔑 Usuário criado: admin / salao2026');
  }

  const countProf = await Profissional.countDocuments();
  if (countProf === 0) {
    await Profissional.insertMany([
      { nome: 'Victor Gabriel', especialidade: 'Geral' },
      { nome: 'Paulo Vitor', especialidade: 'Geral' },
      { nome: 'Denis', especialidade: 'Geral' }
    ]);
    console.log('👤 Profissionais padrão criados');
  }

  const countServ = await Servico.countDocuments();
  if (countServ === 0) {
    await Servico.insertMany([
      { nome: 'Corte Feminino', duracao: 45, preco: 80 },
      { nome: 'Corte Masculino', duracao: 30, preco: 50 },
      { nome: 'Escova Modeladora', duracao: 40, preco: 60 },
      { nome: 'Hidratação', duracao: 50, preco: 90 },
      { nome: 'Coloração', duracao: 90, preco: 150 },
      { nome: 'Mechas/Luzes', duracao: 120, preco: 220 },
      { nome: 'Progressiva', duracao: 150, preco: 280 },
      { nome: 'Penteado', duracao: 60, preco: 120 }
    ]);
    console.log('💇 Serviços padrão criados');
  }
};

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ erro: 'Sem token' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch { res.status(401).json({ erro: 'Token inválido' }) }
};

// ===== FUNÇÃO AUXILIAR: Verificar se horário está bloqueado =====
const horarioEstaBloqueado = async (profissional, data, horario) => {
  const dataObj = new Date(data + 'T00:00:00');
  const diaSemana = dataObj.getDay(); // 0=domingo, 6=sábado

  const bloqueios = await Bloqueio.find({
    profissional,
    $or: [
      { tipo: 'data', data: data },
      { tipo: 'dia-semana', diaSemana: diaSemana }
    ]
  });

  for (const b of bloqueios) {
    // Se não tem horário definido, bloqueia o dia todo
    if (!b.horarioInicio || !b.horarioFim) {
      return true;
    }
    // Verifica se o horário está dentro do intervalo bloqueado
    if (horario >= b.horarioInicio && horario < b.horarioFim) {
      return true;
    }
  }
  return false;
};

// ==========================================
// ENVIO DE WHATSAPP VIA CALLMEBOT
// ==========================================
const enviarWhatsApp = async (agendamento) => {
  // Só envia se as variáveis estiverem configuradas
  if (!process.env.WHATSAPP_NUMERO || !process.env.WHATSAPP_APIKEY) {
    console.log('⚠️ WhatsApp não configurado - pulando notificação');
    return;
  }

  const dataFormatada = new Date(agendamento.data + 'T00:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric', month: 'numeric', year: 'numeric'
  });

  const mensagem = `*NOVO AGENDAMENTO!* 🎉\n\n` +
    `👤 *Cliente:* ${agendamento.nomeCliente}\n` +
    `📞 *Tel:* ${agendamento.telefone}\n` +
    `💈 *Serviço:* ${agendamento.servico}\n` +
    `👤 *Profissional:* ${agendamento.profissional}\n` +
    `📅 *Data:* ${dataFormatada}\n` +
    `⏰ *Horário:* ${agendamento.horario}\n` +
    `💰 *Valor:* R$ ${agendamento.preco}`;

  const url = `https://api.callmebot.com/whatsapp.php?phone=${process.env.WHATSAPP_NUMERO}&text=${encodeURIComponent(mensagem)}&apikey=${process.env.WHATSAPP_APIKEY}`;

  try {
    const resposta = await fetch(url);
    if (resposta.ok) {
      console.log('📱 WhatsApp enviado com sucesso!');
    } else {
      console.log('⚠️ Erro ao enviar WhatsApp:', await resposta.text());
    }
  } catch (e) {
    console.log('⚠️ Falha na conexão com CallMeBot:', e.message);
  }
};

// ===== ROTAS PÚBLICAS =====

// Dados do salão
app.get('/api/dados', async (req, res) => {
  const profissionais = await Profissional.find({ ativo: true });
  const servicos = await Servico.find({ ativo: true });
  res.json({ profissionais, servicos, horarios: HORARIOS });
});

// Horários ocupados (agendamentos + bloqueios)
app.get('/api/horarios-ocupados', async (req, res) => {
  const { data, profissional } = req.query;
  const filtro = { data, status: 'ativo' };
  if (profissional) filtro.profissional = profissional;

  const agendamentos = await Appointment.find(filtro);
  const horariosAgendados = agendamentos.map(a => ({ 
    horario: a.horario, 
    duracao: a.duracao,
    tipo: 'agendamento'
  }));

  // Adicionar horários bloqueados
  if (profissional) {
    const dataObj = new Date(data + 'T00:00:00');
    const diaSemana = dataObj.getDay();

    const bloqueios = await Bloqueio.find({
      profissional,
      $or: [
        { tipo: 'data', data: data },
        { tipo: 'dia-semana', diaSemana: diaSemana }
      ]
    });

    for (const b of bloqueios) {
      if (!b.horarioInicio || !b.horarioFim) {
        // Bloqueia todos os horários do dia
        for (const h of HORARIOS) {
          horariosAgendados.push({ horario: h, tipo: 'bloqueio', motivo: b.motivo });
        }
      } else {
        // Bloqueia horários dentro do intervalo
        for (const h of HORARIOS) {
          if (h >= b.horarioInicio && h < b.horarioFim) {
            horariosAgendados.push({ horario: h, tipo: 'bloqueio', motivo: b.motivo });
          }
        }
      }
    }
  }

  res.json(horariosAgendados);
});

// Criar agendamento
app.post('/api/agendamentos', async (req, res) => {
  try {
    // Verifica se o horário está bloqueado antes de agendar
    const bloqueado = await horarioEstaBloqueado(
      req.body.profissional, 
      req.body.data, 
      req.body.horario
    );
    if (bloqueado) {
      return res.status(400).json({ erro: 'Este horário está bloqueado na agenda do profissional.' });
    }

    const agendamento = await Appointment.create(req.body);

        // ===== ENVIA WHATSAPP AUTOMATICAMENTE =====
    enviarWhatsApp(agendamento);

    res.status(201).json(agendamento);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ erro: 'Horário já reservado' });
    res.status(400).json({ erro: e.message });
  }
});

// ===== ROTAS ADMIN =====

// Login
app.post('/api/login', async (req, res) => {
  const { usuario, senha } = req.body;
  const user = await User.findOne({ usuario });
  if (!user) return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
  if (!await bcrypt.compare(senha, user.senha))
    return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// Agendamentos
app.get('/api/agendamentos', auth, async (req, res) => {
  const { data } = req.query;
  const filtro = data ? { data, status: 'ativo' } : { status: 'ativo' };
  res.json(await Appointment.find(filtro).sort({ data: 1, horario: 1 }));
});

app.delete('/api/agendamentos/:id', auth, async (req, res) => {
  await Appointment.findByIdAndUpdate(req.params.id, { status: 'cancelado' });
  res.json({ ok: true });
});

// ===== CRUD PROFISSIONAIS =====
app.get('/api/profissionais', auth, async (req, res) => {
  res.json(await Profissional.find().sort({ nome: 1 }));
});

app.post('/api/profissionais', auth, async (req, res) => {
  try {
    const prof = await Profissional.create(req.body);
    res.status(201).json(prof);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.put('/api/profissionais/:id', auth, async (req, res) => {
  try {
    const prof = await Profissional.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(prof);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.delete('/api/profissionais/:id', auth, async (req, res) => {
  const hoje = new Date().toISOString().split('T')[0];
  const profissional = await Profissional.findById(req.params.id);
  
  const temAgendamentosFuturos = await Appointment.findOne({
    profissional: profissional.nome,
    data: { $gte: hoje },
    status: 'ativo'
  });

  if (temAgendamentosFuturos) {
    return res.status(400).json({ 
      erro: 'Não é possível excluir: este profissional possui agendamentos futuros.' 
    });
  }

  await Profissional.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ===== CRUD SERVIÇOS =====
app.get('/api/servicos', auth, async (req, res) => {
  res.json(await Servico.find().sort({ nome: 1 }));
});

app.post('/api/servicos', auth, async (req, res) => {
  try {
    const serv = await Servico.create(req.body);
    res.status(201).json(serv);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.put('/api/servicos/:id', auth, async (req, res) => {
  try {
    const serv = await Servico.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(serv);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.delete('/api/servicos/:id', auth, async (req, res) => {
  await Servico.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ===== CRUD BLOQUEIOS =====
app.get('/api/bloqueios', auth, async (req, res) => {
  res.json(await Bloqueio.find().sort({ createdAt: -1 }));
});

app.post('/api/bloqueios', auth, async (req, res) => {
  try {
    const bloqueio = await Bloqueio.create(req.body);
    res.status(201).json(bloqueio);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.delete('/api/bloqueios/:id', auth, async (req, res) => {
  await Bloqueio.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

const PORTA = process.env.PORT || 5000;
app.listen(PORTA, () => console.log(`🚀 API na porta ${PORTA}`));