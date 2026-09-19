const mongoose = require('mongoose');

const bloqueioSchema = new mongoose.Schema({
  profissionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profissional', required: true },
  data: { type: String },
  horarioInicio: { type: String },
  horarioFim: { type: String },
  motivo: { type: String, default: '' },
  diaSemana: { type: Number, min: 0, max: 6 },
  recorrente: { type: Boolean, default: false },
  ativo: { type: Boolean, default: true }
}, { timestamps: true });

bloqueioSchema.index({ profissionalId: 1, data: 1 });
bloqueioSchema.index({ profissionalId: 1, diaSemana: 1 });

module.exports = mongoose.model('Bloqueio', bloqueioSchema);