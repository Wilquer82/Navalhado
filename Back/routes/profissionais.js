const express = require('express');
const bcrypt = require('bcryptjs');
const Profissional = require('../models/Profissional');
const Servico = require('../models/Servico');
const { autenticar, autenticarOpcional, exigirAdmin, asyncHandler } = require('../middlewares/auth');
const {
  validarNome,
  validarBioProfissional,
  validarFotoUrl,
  sanitizarObjectId
} = require('../services/validacoes');
const { horariosDisponiveis, obterConfiguracao } = require('../services/agenda');

const router = express.Router();

const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

const emailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const serializarProfissional = (p, { incluirPix = false, incluirAcesso = false } = {}) => ({
  _id: p._id,
  nome: p.nome,
  foto: p.foto,
  descricao: p.descricao,
  especialidade: p.especialidade || p.descricao,
  bio: p.bio || '',
  telefone: p.telefone,
  ...(incluirPix ? { chavePix: p.chavePix } : {}),
  servicos: p.servicos,
  horarioTrabalho: Object.fromEntries(p.horarioTrabalho || {}),
  folgas: p.folgas,
  ativo: p.ativo,
  ...(incluirAcesso
    ? {
        temAcesso: Boolean(p.usuario?.email && p.usuario?.senhaHash),
        emailAcesso: p.usuario?.email || ''
      }
    : {})
});

router.get('/', autenticarOpcional, asyncHandler(async (req, res) => {
  const isAdmin = req.auth?.role === 'admin';
  if (req.auth?.role === 'profissional' && !req.auth.profissionalId) {
    return respostaErro(res, 403, 'Acesso negado.');
  }
  const filtro = isAdmin ? {} : { ativo: true };
  if (req.auth?.role === 'profissional') filtro._id = req.auth.profissionalId;
  const profissionais = await Profissional.find(filtro)
    .select(isAdmin ? '-usuario.senhaHash' : '-usuario -chavePix')
    .sort({ nome: 1 });
  res.json(profissionais.map(p => serializarProfissional(p, {
    incluirPix: isAdmin,
    incluirAcesso: isAdmin
  })));
}));

router.get('/:id/servicos', autenticarOpcional, asyncHandler(async (req, res) => {
  const id = sanitizarObjectId(req.params.id);
  if (!id) return respostaErro(res, 400, 'ID inválido.');
  const profissional = await Profissional.findOne({ _id: id, ativo: true }).populate('servicos.servicoId');
  if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');
  const servicosVinculados = profissional.servicos
    .filter(item => item.servicoId?.ativo)
    .map(item => ({
      ...item.servicoId.toObject(),
      preco: item.preco,
      duracaoMinutos: item.duracaoMinutos,
      duracao: item.duracaoMinutos
    }));
  const idsVinculados = await Profissional.distinct('servicos.servicoId', {
    'servicos.servicoId': { $exists: true }
  });
  const servicosGlobais = await Servico.find({
    ativo: true,
    _id: { $nin: idsVinculados }
  }).sort({ nome: 1 });
  const servicos = [
    ...servicosVinculados,
    ...servicosGlobais.map(servico => ({
      ...servico.toObject(),
      duracao: servico.duracaoMinutos
    }))
  ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  res.json(servicos);
}));

router.get('/:id/horarios-disponiveis', autenticarOpcional, asyncHandler(async (req, res) => {
  const id = sanitizarObjectId(req.params.id);
  if (!id) return respostaErro(res, 400, 'ID inválido.');
  const data = typeof req.query.data === 'string' ? req.query.data.trim() : '';
  const servicoId = sanitizarObjectId(req.query.servicoId);
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) return respostaErro(res, 400, 'Data inválida.');
  const profissional = await Profissional.findOne({ _id: id, ativo: true });
  if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');
  const config = await obterConfiguracao();
  const livres = await horariosDisponiveis(profissional, data, servicoId, config);
  res.json(livres);
}));

router.post('/', autenticar, exigirAdmin, asyncHandler(async (req, res) => {
  const { nome, foto, descricao, especialidade, bio, telefone, chavePix, servicos } = req.body || {};
  if (!validarNome(nome)) return respostaErro(res, 400, 'Nome deve ter pelo menos 3 caracteres.');
  if (!validarFotoUrl(foto === undefined ? '' : foto)) return respostaErro(res, 400, 'Informe uma URL de foto HTTP ou HTTPS válida.');
  const bioFinal = bio === undefined || bio === null ? '' : typeof bio === 'string' ? bio.trim() : bio;
  if (!validarBioProfissional(bioFinal)) return respostaErro(res, 400, 'A bio deve ter no máximo 120 caracteres.');
  const especialidadeEntrada = especialidade || descricao || 'Geral';
  if (typeof especialidadeEntrada !== 'string') return respostaErro(res, 400, 'Especialidade inválida.');
  const especialidadeFinal = especialidadeEntrada.trim() || 'Geral';
  const profissional = new Profissional({
    nome: String(nome).trim(),
    foto: String(foto || '').trim(),
    descricao: String(descricao || especialidadeFinal).trim(),
    especialidade: especialidadeFinal,
    bio: bioFinal.trim(),
    telefone: String(telefone || ''),
    chavePix: String(chavePix || '').trim(),
    servicos: Array.isArray(servicos)
      ? servicos
        .map(s => ({
          servicoId: sanitizarObjectId(s.servicoId),
          preco: Number(s.preco),
          duracaoMinutos: Number(s.duracaoMinutos)
        }))
        .filter(s => s.servicoId)
      : []
  });
  await profissional.save();
  res.status(201).json(serializarProfissional(profissional, {
    incluirPix: true,
    incluirAcesso: req.auth?.role === 'admin'
  }));
}));

router.put('/:id', autenticar, asyncHandler(async (req, res) => {
  const id = sanitizarObjectId(req.params.id);
  if (!id) return respostaErro(res, 400, 'ID inválido.');
  if (req.auth.role !== 'admin') {
    if (!req.auth.profissionalId || String(req.auth.profissionalId) !== id) {
      return respostaErro(res, 403, 'Acesso negado.');
    }
  }
  const profissional = await Profissional.findById(id);
  if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');
  const { nome, foto, descricao, especialidade, bio, telefone, chavePix, servicos } = req.body || {};
  if (req.auth.role !== 'admin' && servicos !== undefined) {
    return respostaErro(res, 403, 'Apenas administradores podem alterar os serviços oferecidos.');
  }
  if (nome !== undefined) {
    if (!validarNome(nome)) return respostaErro(res, 400, 'Nome deve ter pelo menos 3 caracteres.');
    profissional.nome = String(nome).trim();
  }
  if (foto !== undefined) {
    if (!validarFotoUrl(foto)) return respostaErro(res, 400, 'Informe uma URL de foto HTTP ou HTTPS válida.');
    profissional.foto = String(foto).trim();
  }
  if (descricao !== undefined || especialidade !== undefined) {
    const especialidadeEntrada = especialidade || descricao || 'Geral';
    if (typeof especialidadeEntrada !== 'string') return respostaErro(res, 400, 'Especialidade inválida.');
    const valorEspecialidade = especialidadeEntrada.trim() || 'Geral';
    profissional.descricao = valorEspecialidade;
    profissional.especialidade = valorEspecialidade;
  }
  if (bio !== undefined) {
    const bioFinal = bio === null ? '' : typeof bio === 'string' ? bio.trim() : bio;
    if (!validarBioProfissional(bioFinal)) return respostaErro(res, 400, 'A bio deve ter no máximo 120 caracteres.');
    profissional.bio = bioFinal.trim();
  }
  if (telefone !== undefined) profissional.telefone = String(telefone);
  if (chavePix !== undefined) profissional.chavePix = String(chavePix).trim();
  if (Array.isArray(servicos)) {
    profissional.servicos = servicos
      .map(s => ({
        servicoId: sanitizarObjectId(s.servicoId),
        preco: Number(s.preco),
        duracaoMinutos: Number(s.duracaoMinutos)
      }))
      .filter(s => s.servicoId);
  }
  await profissional.save();
  res.json(serializarProfissional(profissional, {
    incluirPix: true,
    incluirAcesso: req.auth?.role === 'admin'
  }));
}));

/** Admin define e-mail e senha de login do profissional */
router.put('/:id/acesso', autenticar, exigirAdmin, asyncHandler(async (req, res) => {
  const id = sanitizarObjectId(req.params.id);
  if (!id) return respostaErro(res, 400, 'ID inválido.');

  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');

  if (!emailValido(email)) return respostaErro(res, 400, 'E-mail inválido.');
  if (senha.length < 4) return respostaErro(res, 400, 'Senha deve ter pelo menos 4 caracteres.');

  const outro = await Profissional.findOne({
    'usuario.email': email,
    _id: { $ne: id }
  });
  if (outro) return respostaErro(res, 409, 'Este e-mail já está em uso por outro profissional.');

  const profissional = await Profissional.findById(id);
  if (!profissional || !profissional.ativo) {
    return respostaErro(res, 404, 'Profissional não encontrado.');
  }

  profissional.usuario = profissional.usuario || {};
  profissional.usuario.email = email;
  profissional.usuario.senhaHash = await bcrypt.hash(senha, 10);
  await profissional.save();

  res.json({
    mensagem: 'Acesso do profissional cadastrado.',
    profissional: serializarProfissional(profissional, { incluirAcesso: true })
  });
}));

/** Admin remove o login do profissional */
router.delete('/:id/acesso', autenticar, exigirAdmin, asyncHandler(async (req, res) => {
  const id = sanitizarObjectId(req.params.id);
  if (!id) return respostaErro(res, 400, 'ID inválido.');

  const profissional = await Profissional.findById(id);
  if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');

  profissional.usuario = { email: undefined, senhaHash: undefined };
  profissional.markModified('usuario');
  await profissional.save();

  res.json({
    mensagem: 'Acesso removido.',
    profissional: serializarProfissional(profissional, { incluirAcesso: true })
  });
}));

router.delete('/:id', autenticar, exigirAdmin, asyncHandler(async (req, res) => {
  const id = sanitizarObjectId(req.params.id);
  if (!id) return respostaErro(res, 400, 'ID inválido.');
  const profissional = await Profissional.findByIdAndUpdate(id, { ativo: false }, { new: true });
  if (!profissional) return respostaErro(res, 404, 'Profissional não encontrado.');
  res.json({ mensagem: 'Profissional desativado.' });
}));

module.exports = router;
