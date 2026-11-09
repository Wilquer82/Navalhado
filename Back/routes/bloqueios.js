const express = require('express');
const mongoose = require('mongoose');
const Bloqueio = require('../models/Bloqueio');
const Profissional = require('../models/Profissional');
const { autenticar, asyncHandler } = require('../middlewares/auth');
const { dataValida, horarioValido, diaSemana } = require('../services/validacoes');

const router = express.Router();

const respostaErro = (res, status, mensagem) => res.status(status).json({ erro: mensagem });

async function resolverProfissional(valor) {
  if (mongoose.Types.ObjectId.isValid(valor)) {
    return Profissional.findOne({ _id: valor, ativo: true });
  }
  return Profissional.findOne({ nome: valor, ativo: true });
}

const serializarBloqueio = (b) => ({
  _id: b._id,
  profissionalId: b.profissionalId,
  profissional: b.profissionalNome,
  tipo: b.recorrente ? 'dia-semana' : 'data',
  data: b.data,
  diaSemana: b.diaSemana,
  horarioInicio: b.horarioInicio,
  horarioFim: b.horarioFim,
  recorrenteAte: b.recorrenteAte || '',
  motivo: b.motivo,
  ativo: b.ativo
});

router.get('/', autenticar, asyncHandler(async (req, res) => {
  const { profissionalId } = req.query;
  const query = { ativo: true };
  if (req.auth.role !== 'admin') {
    if (!req.auth.profissionalId) return respostaErro(res, 403, 'Acesso negado.');
    query.profissionalId = req.auth.profissionalId;
  } else if (profissionalId) {
    query.profissionalId = profissionalId;
  }
  const bloqueios = await Bloqueio.find(query).sort({ createdAt: -1 });
  res.json(bloqueios.map(serializarBloqueio));
}));

router.post('/', autenticar, asyncHandler(async (req, res) => {
  const { profissionalId, profissional, tipo, diaSemana: dia, horarioInicio, horarioFim, motivo, recorrente } = req.body;
  const data = typeof req.body.data === 'string' ? req.body.data.trim() : '';
  const recorrenteAte = typeof req.body.recorrenteAte === 'string' ? req.body.recorrenteAte.trim() : '';
  if (req.auth.role !== 'admin' && !req.auth.profissionalId) {
    return respostaErro(res, 403, 'Acesso negado.');
  }
  const alvo = req.auth.role === 'admin'
    ? (profissionalId || profissional)
    : req.auth.profissionalId;
  if (!alvo) return respostaErro(res, 400, 'Profissional é obrigatório.');
  const prof = await resolverProfissional(alvo);
  if (!prof) return respostaErro(res, 404, 'Profissional não encontrado.');
  const rec = recorrente === true || tipo === 'dia-semana';
  const diaNum = rec ? Number(dia) : undefined;
  if (rec) {
    if (!Number.isInteger(diaNum) || diaNum < 0 || diaNum > 6) return respostaErro(res, 400, 'Dia da semana inválido (0-6).');
    if (recorrenteAte && !dataValida(recorrenteAte)) return respostaErro(res, 400, 'Data final da recorrência inválida (YYYY-MM-DD).');
  } else {
    if (!data || !dataValida(data)) return respostaErro(res, 400, 'Data inválida (YYYY-MM-DD).');
    if (recorrenteAte) return respostaErro(res, 400, 'Data final só pode ser usada em bloqueios recorrentes.');
  }
  let hi = horarioInicio, hf = horarioFim;
  if (hi || hf) {
    if (!hi || !hf) return respostaErro(res, 400, 'Horário de início e fim são obrigatórios quando informados.');
    if (!horarioValido(hi) || !horarioValido(hf)) return respostaErro(res, 400, 'Horário inválido (HH:MM).');
    if (hi >= hf) return respostaErro(res, 400, 'Horário de início deve ser anterior ao fim.');
  }
  const bloqueio = new Bloqueio({
    profissionalId: prof._id,
    profissionalNome: prof.nome,
    data: rec ? undefined : data,
    horarioInicio: hi,
    horarioFim: hf,
    motivo: String(motivo || ''),
    diaSemana: diaNum,
    recorrente: rec,
    recorrenteAte: rec ? recorrenteAte || undefined : undefined,
    ativo: true
  });
  await bloqueio.save();
  res.status(201).json(serializarBloqueio(bloqueio));
}));

router.delete('/:id', autenticar, asyncHandler(async (req, res) => {
  const filtro = { _id: req.params.id };
  if (req.auth.role !== 'admin') {
    if (!req.auth.profissionalId) return respostaErro(res, 403, 'Acesso negado.');
    filtro.profissionalId = req.auth.profissionalId;
  }
  const bloqueio = await Bloqueio.findOneAndUpdate(filtro, { ativo: false }, { new: true });
  if (!bloqueio) return respostaErro(res, 404, 'Bloqueio não encontrado.');
  res.json({ mensagem: 'Bloqueio removido.' });
}));

module.exports = router;