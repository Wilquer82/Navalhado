const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Profissional = require('../models/Profissional');
const User = require('../models/User');
const { asyncHandler } = require('../middlewares/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'navalhado-dev-secret';

const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

router.post('/login', asyncHandler(async (req, res) => {
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
  if (!profissional || !senhaHash || !await bcrypt.compare(req.body.senha || '', senhaHash)) {
    return respostaErro(res, 401, 'E-mail ou senha inválidos.');
  }
  res.json({
    token: jwt.sign({ profissionalId: profissional._id }, JWT_SECRET, { expiresIn: '8h' }),
    profissional: { id: profissional._id, nome: profissional.nome }
  });
}));

module.exports = router;