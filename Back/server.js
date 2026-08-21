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
app.use(express.json());

const origensPermitidas = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://navalhado.netlify.app',
  'https://navalhado.onrender.com'
];

app.use(cors({
  origin: (origem, callback) => {
    if (!origem || origensPermitidas.includes(origem)) return callback(null, true);
    return callback(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true
}));

// Horários de funcionamento
const HORARIOS = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30'
];

const dataLocalISO = data => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const validarAgendamento = dados => {
  const camposObrigatorios = [
    'profissional', 'servico', 'duracao', 'preco', 'data',
    'horario', 'nomeCliente', 'telefone'
  ];
  if (camposObrigatorios.some(campo => dados[campo] === undefined || dados[campo] === null || dados[campo] === '')) {
    return 'Preencha todos os campos obrigatórios.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) return 'Data inválida.';
  if (!HORARIOS.includes(dados.horario)) return 'Horário inválido.';
  if (!Number.isFinite(Number(dados.duracao)) || Number(dados.duracao) <= 0) return 'Duração inválida.';
  if (!Number.isFinite(Number(dados.preco)) || Number(dados.preco) < 0) return 'Preço inválido.';
  return null;
};

// Conectar MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB conectado');
    criarDadosPadrao();
  })
  .catch(e => console.error('❌ Erro DB:', e));

// Criar dados padrão
const criarDadosPadrao = async () => {
  const adminUsuario = process.env.ADMIN_USER;
  const adminSenha = process.env.ADMIN_PASSWORD;
  if (adminUsuario && adminSenha) {
    const existeUser = await User.findOne({ usuario: adminUsuario });
    if (!existeUser) {
      const hash = await bcrypt.hash(adminSenha, 10);
      await User.create({ usuario: adminUsuario, senha: hash });
      console.log(`🔑 Usuário administrativo criado: ${adminUsuario}`);
    }
  } else {
    console.warn('⚠️ ADMIN_USER e ADMIN_PASSWORD não configurados; usuário padrão não será criado.');
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

const horarioForaDoFuncionamento = (data, horario) => {
  const diaSemana = new Date(data + 'T00:00:00').getDay();
  const fimDeSemana = diaSemana === 0 || diaSemana === 6;
  return fimDeSemana && horario > '14:00';
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
    const erroValidacao = validarAgendamento(req.body);
    if (erroValidacao) return res.status(400).json({ erro: erroValidacao });

    if (horarioForaDoFuncionamento(req.body.data, req.body.horario)) {
      return res.status(400).json({ erro: 'Aos sábados e domingos, os agendamentos são aceitos até 14:00.' });
    }

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
    const prof = await Profissional.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!prof) return res.status(404).json({ erro: 'Profissional não encontrado.' });
    res.json(prof);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

app.delete('/api/profissionais/:id', auth, async (req, res) => {
  const hoje = dataLocalISO(new Date());
  const profissional = await Profissional.findById(req.params.id);
  if (!profissional) return res.status(404).json({ erro: 'Profissional não encontrado.' });
  
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
    const serv = await Servico.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!serv) return res.status(404).json({ erro: 'Serviço não encontrado.' });
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

if (process.env.NODE_ENV === 'production') {
  const URL_API = process.env.PING_URL || 'https://navalhado-backend.onrender.com/api/profissionais';
  
  const pingar = async () => {
    try {
      await fetch(URL_API, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      console.log('🔄 Ping OK — servidor acordado');
    } catch (e) {
      console.log('⚠️ Ping:', e.message);
    }
  };

  // Pinga a cada 3 MINUTOS (mais eficaz que 4 min)
  setInterval(pingar, 3 * 60 * 1000);
  
  // Faz o PRIMEIRO ping logo ao iniciar
  setTimeout(pingar, 10000);
}

const PORTA = process.env.PORT || 5000;
app.listen(PORTA, () => console.log(`🚀 API na porta ${PORTA}`));