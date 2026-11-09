const crypto = require('crypto');
const bcrypt = require('bcryptjs');

async function validarSenhaPadrao(senha) {
  const hash1234 = await bcrypt.hash('1234', 10);
  return await bcrypt.compare('1234', senha);
}

async function detectarSenhaPadrao(senha) {
  if (senha === '1234') return true;
  return await bcrypt.compare('1234', senha);
}

async function enviarRecuperacao(telefone, token, email) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return { disponivel: false, mensagem: 'Serviço de e-mail não configurado.' };
  }
  
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch {
    return { disponivel: false, mensagem: 'Serviço de e-mail não configurado.' };
  }
  
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };
  
  const transporter = nodemailer.createTransport(config);
  const linkRecuperacao = `${process.env.PUBLIC_API_URL || 'http://localhost:5173'}/recuperar-senha/${token}`;
  
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@salaonavalhado.com',
    to: email,
    subject: 'Recuperação de senha - Salão Navalhado',
    html: `<p>Olá!</p><p>Clique no link para recuperar sua senha:</p><p><a href="${linkRecuperacao}">${linkRecuperacao}</a></p><p>Este link expira em 1 hora.</p>`
  });
  
  return { disponivel: true };
}

async function solicitarRecuperacao(identificador) {
  const User = require('../models/User');
  const usuario = await User.findOne({
    $or: [{ email: identificador.toLowerCase() }, { usuario: identificador.toLowerCase() }]
  });
  
  if (!usuario) {
    return { mensagem: 'Se o e-mail existir, um link de recuperação foi enviado.' };
  }
  
  const token = crypto.randomBytes(32).toString('hex');
  const hashToken = await bcrypt.hash(token, 10);
  
  usuario.tokenRecuperacao = hashToken;
  usuario.expiraTokenRecuperacao = new Date(Date.now() + 60 * 60 * 1000);
  await usuario.save();
  
  const resultado = await enviarRecuperacao(usuario.usuario, token, usuario.email);
  if (resultado.disponivel !== true) {
    usuario.tokenRecuperacao = undefined;
    usuario.expiraTokenRecuperacao = undefined;
    await usuario.save();
  }
  
  return { mensagem: 'Se o e-mail existir, um link de recuperação foi enviado.' };
}

async function validarToken(token) {
  const User = require('../models/User');
  const usuarios = await User.find({ tokenRecuperacao: { $exists: true } });
  for (const usuario of usuarios) {
    if (usuario.expiraTokenRecuperacao && usuario.expiraTokenRecuperacao > new Date()) {
      if (await bcrypt.compare(token, usuario.tokenRecuperacao)) {
        return usuario;
      }
    }
  }
  return null;
}

async function alterarSenha(userId, novaSenha) {
  if (!novaSenha || novaSenha.length < 8) {
    throw new Error('Senha deve ter pelo menos 8 caracteres.');
  }
  const User = require('../models/User');
  const usuario = await User.findById(userId);
  if (!usuario) {
    throw new Error('Usuário não encontrado.');
  }
  usuario.senha = novaSenha;
  usuario.senhaHash = await bcrypt.hash(novaSenha, 10);
  usuario.precisaAlterarSenha = false;
  usuario.tokenRecuperacao = undefined;
  usuario.expiraTokenRecuperacao = undefined;
  await usuario.save();
  return usuario;
}

module.exports = {
  detectarSenhaPadrao,
  solicitarRecuperacao,
  validarToken,
  alterarSenha,
  validarSenhaPadrao
};