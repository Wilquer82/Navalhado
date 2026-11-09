const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Profissional = require('../models/Profissional');
const User = require('../models/User');
const { asyncHandler, JWT_SECRET } = require('../middlewares/auth');
const {
  detectarSenhaPadrao,
  solicitarRecuperacao,
  validarToken,
  alterarSenha
} = require('../services/recuperacaoSenha');

const router = express.Router();

const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

const SENHA_1234_HASH = '$2a$10$eTQeZ8YQZ9N4KxW7vJmC1OaB2cD3eF4gH5iJ6kL7mN8oP9qR0sT1';

router.post('/login', asyncHandler(async (req, res) => {
  const identificador = String(req.body.email || req.body.usuario || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');

  if (!identificador || !senha) {
    return respostaErro(res, 400, 'Informe e-mail e senha.');
  }

  const admin = await User.findOne({
    $or: [{ email: identificador }, { usuario: identificador }]
  });
  if (admin && await bcrypt.compare(senha, admin.senha)) {
    const isPadrao1234 = await bcrypt.compare('1234', senha);
    const precisaAlterar = isPadrao1234 || admin.precisaAlterarSenha;
    if (precisaAlterar) {
      return res.json({
        precisaAlterarSenha: true,
        mensagem: 'Senha padrão detectada. Altere sua senha.',
        role: 'admin',
        profissional: { id: String(admin._id), nome: 'Administrador' }
      });
    }
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

  const isPadrao1234 = await bcrypt.compare('1234', senha);
  const precisaAlterar = isPadrao1234 || profissional.usuario.precisaAlterarSenha;
  if (precisaAlterar) {
    return res.json({
      precisaAlterarSenha: true,
      mensagem: 'Senha padrão detectada. Altere sua senha.',
      role: 'profissional',
      profissional: { id: profissional._id, nome: profissional.nome }
    });
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

router.post('/alterar-senha', asyncHandler(async (req, res) => {
  const { usuarioId, senhaAtual, novaSenha } = req.body;
  if (!usuarioId || !senhaAtual || !novaSenha) {
    return respostaErro(res, 400, 'Campos obrigatórios faltando.');
  }
  if (novaSenha.length < 8) {
    return respostaErro(res, 400, 'Nova senha deve ter pelo menos 8 caracteres.');
  }
  let usuario = await User.findById(usuarioId);
  if (!usuario && req.auth) {
    if (req.auth.role === 'profissional') {
      usuario = await Profissional.findById(req.auth.profissionalId);
    }
  }
  if (!usuario) return respostaErro(res, 404, 'Usuário não encontrado.');
  const senhaHash = usuario.senha || usuario.usuario?.senhaHash;
  if (!await bcrypt.compare(senhaAtual, senhaHash)) {
    return respostaErro(res, 401, 'Senha atual incorreta.');
  }
  if (usuario.senha) {
    usuario.senha = novaSenha;
  }
  if (usuario.usuario) {
    usuario.usuario.senhaHash = await bcrypt.hash(novaSenha, 10);
    usuario.usuario.precisaAlterarSenha = false;
  }
  await usuario.save();
  res.json({ mensagem: 'Senha alterada com sucesso.' });
}));

router.post('/recuperar-senha', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return respostaErro(res, 400, 'E-mail é obrigatório.');
  const resultado = await solicitarRecuperacao(email);
  res.json(resultado);
}));

router.post('/recuperar-senha/confirmar', asyncHandler(async (req, res) => {
  const { token, novaSenha } = req.body;
  if (!token || !novaSenha) {
    return respostaErro(res, 400, 'Token e nova senha são obrigatórios.');
  }
  if (novaSenha.length < 8) {
    return respostaErro(res, 400, 'Senha deve ter pelo menos 8 caracteres.');
  }
  const usuario = await validarToken(token);
  if (!usuario) {
    return respostaErro(res, 400, 'Token inválido ou expirado.');
  }
  await alterarSenha(String(usuario._id), novaSenha);
  res.json({ mensagem: 'Senha recuperada com sucesso.' });
}));

module.exports = router;
