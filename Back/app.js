require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Models
require('./models/Appointment');
require('./models/Profissional');
require('./models/Servico');
require('./models/ConfiguracaoGeral');
require('./models/User');
require('./models/Bloqueio');
require('./models/Produto');
require('./models/Venda');

// Rotas
const authRoutes = require('./routes/auth');
const profissionaisRoutes = require('./routes/profissionais');
const servicosRoutes = require('./routes/servicos');
const bloqueiosRoutes = require('./routes/bloqueios');
const agendamentosRoutes = require('./routes/agendamentos');
const profissionalRoutes = require('./routes/profissional');
const produtosRoutes = require('./routes/produtos');
const vendasRoutes = require('./routes/vendas');
const { configuracaoVapid } = require('./services/lembretes');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ LISTA COMPLETA — com TODOS os domínios
const origensPermitidas = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://navalhado-86ac.onrender.com', // ✅ Seu frontend que está chamando
  'https://navalhado.onrender.com', // Outro domínio do frontend
  'https://navalhadoback.onrender.com', // Outro backend
];

console.log('✅ Origens permitidas:', origensPermitidas);

// ✅ CORS configurado corretamente
app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origem (Postman, testes diretos)
      if (!origin) {
        console.log('ℹ️ Sem origem — permitido');
        return callback(null, true);
      }

      // Limpa barra final e compara
      const origemLimpa = origin.replace(/\/$/, '');
      const permitida = origensPermitidas.some(
        (orig) => orig.replace(/\/$/, '') === origemLimpa
      );

      if (permitida) {
        console.log('✅ ACEITA:', origem);
        return callback(null, true);
      }

      console.log('❌ BLOQUEADA:', origem, '(limpa:', origemLimpa, ')');
      // ⚠️ Não lance erro — apenas bloqueie silenciosamente
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 200,
  })
);

// Middlewares
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/profissionais', profissionaisRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/bloqueios', bloqueiosRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/profissional', profissionalRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/vendas', vendasRoutes);

// Chave pública VAPID
app.get('/api/push/vapid-public-key', (req, res) => {
  const config = configuracaoVapid();
  if (!config?.publicKey) {
    return res.json({ publicKey: null, disponivel: false });
  }
  res.json({ publicKey: config.publicKey, disponivel: true });
});

// Rota pública de dados
app.get('/api/dados', async (req, res) => {
  const Profissional = mongoose.model('Profissional');
  res.json({
    profissionais: await Profissional.find({ ativo: true }).select(
      '-usuario.senhaHash -chavePix'
    ),
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('⚠️ Erro:', err);
  res.status(err.status || 500).json({ erro: err.message || 'Erro interno.' });
});

module.exports = { app, PORT };
s;
