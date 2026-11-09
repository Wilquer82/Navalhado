const mongoose = require('mongoose');

const listaEsperaSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  telefoneNormalizado: { type: String, required: true },
  servicoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Servico', required: true },
  profissionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profissional' },
  status: { type: String, enum: ['pendente', 'notificado', 'confirmado', 'cancelado'], default: 'pendente' },
  motivo: { type: String },
  notificadoEm: { type: Date },
  criadoEm: { type: Date, default: Date.now }
}, { timestamps: true });

listaEsperaSchema.index({ telefoneNormalizado: 1, servicoId: 1, profissionalId: 1 }, { unique: true });

module.exports = mongoose.model('ListaEspera', listaEsperaSchema);