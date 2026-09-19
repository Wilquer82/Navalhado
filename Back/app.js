require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('./models/Appointment');
require('./models/Profissional');
require('./models/Servico');
require('./models/ConfiguracaoGeral');
require('./models/User');
require('./models/Bloqueio');

const authRoutes = require('./routes/auth');
const profissionaisRoutes = require('./routes/profissionais');
const servicosRoutes = require('./routes/servicos');
const bloqueiosRoutes = require('./routes/bloqueios');
const agendamentosRoutes = require('./routes/agendamentos');
const profissionalRoutes = require('./routes/profissional');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use(cors({
  origin: (origin, callback) => {
    const permitidas = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,https://navalhado.onrender.com,https://navalhado-1.onrender.com,https://navalhadoback.onrender.com')
      .split(',').map(item => item.trim()).filter(Boolean);

    if (!origin || permitidas.includes(origin) || permitidas.includes('*')) {
      return callback(null, true);
    }

    const aceitaRender = permitidas.some(item => item.endsWith('.onrender.com') && origin.endsWith(item.replace('*', '')));
    if (aceitaRender) return callback(null, true);

    return callback(new Error('Origem não permitida pelo CORS'));
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/profissionais', profissionaisRoutes);
app.use('/api/servicos', servicosRoutes);
app.use('/api/bloqueios', bloqueiosRoutes);
app.use('/api/agendamentos', agendamentosRoutes);
app.use('/api/profissional', profissionalRoutes);

app.get('/api/dados', async (req, res) => {
  const Profissional = mongoose.model('Profissional');
  res.json({ profissionais: await Profissional.find({ ativo: true }).select('-usuario.senhaHash') });
});

app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

module.exports = { app, PORT };