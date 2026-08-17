const mongoose = require('mongoose');

const bloqueioSchema = new mongoose.Schema({
  profissional: { type: String, required: true },
  tipo: { type: String, enum: ['data', 'dia-semana'], required: true },
  data: { type: String }, // para tipo 'data' — formato "2026-08-25"
  diaSemana: { type: Number }, // para tipo 'dia-semana' — 0=domingo, 1=segunda, ..., 6=sábado
  horarioInicio: { type: String }, // opcional: se vazio, bloqueia o dia todo
  horarioFim: { type: String }, // opcional
  motivo: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Bloqueio', bloqueioSchema);