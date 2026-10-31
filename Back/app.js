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

// ✅ CORREÇÃO: CORS configurado de forma definitiva
const origensPermitidas = (
  process.env.CORS_ORIGINS ||
  'http://localhost:5173,http://localhost:3000,https://navalhado-86ac.onrender.com, https://navalhado-86ac.onrender.com/'
)
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

console.log('✅ Origens permitidas pelo CORS:', origensPermitidas);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permite requisições sem origem (ex: Postman, testes diretos)
      if (!origin) {
        return callback(null, true);
      }

      // Verificação exata e também por começo/termo para evitar problemas com barras
      const permitida = origensPermitidas.some((orig) => {
        // Combina correspondência exata + se origem começa com o valor permitido
        return (
          origin === orig ||
          origin.startsWith(orig) ||
          orig.replace(/\/$/, '') === origin.replace(/\/$/, '')
        );
      });

      if (permitida) {
        console.log('✅ Origem aceita:', origin);
        return callback(null, true);
      }

      console.log('❌ Origem BLOQUEADA:', origin);
      return callback(null, false); // Retorna sem erro de lançamento, apenas bloqueia
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 200,
  })
);

// Middlewares — DEPOIS do CORS
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

// Tratamento 404
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error('⚠️ Erro na aplicação:', err);
  res
    .status(err.status || 500)
    .json({ erro: err.message || 'Erro interno do servidor.' });
});

module.exports = { app, PORT };
