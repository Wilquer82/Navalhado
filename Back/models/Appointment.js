const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  profissionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profissional', required: true },
  servicoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Servico', required: true },
  data: { type: Date, required: true },
  horarioInicio: { type: String, required: true },
  horarioFim: { type: String, required: true },
  nomeCliente: { type: String, required: true },
  telefoneCliente: { type: String, required: true },
  observacoes: { type: String, default: '' },
  status: { type: String, enum: ['pendente', 'confirmado', 'concluido', 'cancelado'], default: 'pendente' },
  criadoEm: { type: Date, default: Date.now },
  tokenConfirmacao: { type: String, unique: true, sparse: true }
}, { timestamps: true });

appointmentSchema.index(
  { profissionalId: 1, data: 1, horarioInicio: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'cancelado' } } }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
