const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'navalhado-dev-secret';

const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

const autenticar = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return respostaErro(res, 401, 'Login obrigatório.');
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return respostaErro(res, 401, 'Token inválido ou expirado.');
  }
};

const autenticarOpcional = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (token) {
    try { req.auth = jwt.verify(token, JWT_SECRET); } catch { delete req.auth; }
  }
  next();
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { autenticar, autenticarOpcional, asyncHandler };