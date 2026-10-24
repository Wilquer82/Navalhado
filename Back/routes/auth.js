const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Profissional = require('../models/Profissional');
const User = require('../models/User');
const { asyncHandler, JWT_SECRET } = require('../middlewares/auth');

const router = express.Router();

const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

router.post('/login', asyncHandler(async (req, res) => {
  const identificador = String(req.body.email || req.body.usuario || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');

  if (!identificador || !senha) {
    return respostaErro(res, 400, 'Informe e-mail e senha.');
  }

  // 1) Admin (coleção users)
  const admin = await User.findOne({
    $or: [{ email: identificador }, { usuario: identificador }]
  });
  if (admin && await bcrypt.compare(senha, admin.senha)) {
    const token = jwt.sign(
      { role: 'admin', userId: String(admin._id) },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    return res.json({
      token,
      role: 'admin',
      profissional: { id: null, nome: 'Administrador' }
    });
  }

  // 2) Profissional com login próprio
  const profissional = await Profissional.findOne({
    'usuario.email': identificador,
    ativo: true
  });
  if (!profissional?.usuario?.senhaHash) {
    return respostaErro(res, 401, 'E-mail ou senha inválidos.');
  }
  if (!await bcrypt.compare(senha, profissional.usuario.senhaHash)) {
    return respostaErro(res, 401, 'E-mail ou senha inválidos.');
  }

  const token = jwt.sign(
    { role: 'profissional', profissionalId: String(profissional._id) },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({
    token,
    role: 'profissional',
    profissional: { id: profissional._id, nome: profissional.nome }
  });
}));

module.exports = router;
