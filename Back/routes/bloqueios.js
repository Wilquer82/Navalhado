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
  motivo: b.motivo,
  ativo: b.ativo
});

router.get('/', autenticar, asyncHandler(async (req, res) => {
  const { profissionalId } = req.query;
  const query = { ativo: true };
  if (profissionalId) query.profissionalId = profissionalId;
  const bloqueios = await Bloqueio.find(query).sort({ createdAt: -1 });
  res.json(bloqueios.map(serializarBloqueio));
}));

router.post('/', autenticar, asyncHandler(async (req, res) => {
  const { profissionalId, profissional, tipo, data, diaSemana: dia, horarioInicio, horarioFim, motivo, recorrente } = req.body;
  const alvo = profissionalId || profissional;
  if (!alvo) return respostaErro(res, 400, 'Profissional é obrigatório.');
  const prof = await resolverProfissional(alvo);
  if (!prof) return respostaErro(res, 404, 'Profissional não encontrado.');
  const rec = recorrente === true || tipo === 'dia-semana';
  const diaNum = rec ? Number(dia) : undefined;
  if (rec) {
    if (diaNum === undefined || diaNum < 0 || diaNum > 6) return respostaErro(res, 400, 'Dia da semana inválido (0-6).');
  } else {
    if (!data || !dataValida(data)) return respostaErro(res, 400, 'Data inválida (YYYY-MM-DD).');
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
    ativo: true
  });
  await bloqueio.save();
  res.status(201).json(serializarBloqueio(bloqueio));
}));

router.delete('/:id', autenticar, asyncHandler(async (req, res) => {
  const bloqueio = await Bloqueio.findByIdAndUpdate(req.params.id, { ativo: false }, { new: true });
  if (!bloqueio) return respostaErro(res, 404, 'Bloqueio não encontrado.');
  res.json({ mensagem: 'Bloqueio removido.' });
}));

module.exports = router;