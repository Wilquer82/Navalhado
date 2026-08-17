const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  profissional: { type: String, required: true },
  servico: { type: String, required: true },
  duracao: { type: Number, required: true },
  preco: { type: Number, required: true },
  data: { type: String, required: true },
  horario: { type: String, required: true },
  nomeCliente: { type: String, required: true },
  telefone: { type: String, required: true },
  email: { type: String, default: '' },
  observacoes: { type: String, default: '' },
  status: { type: String, enum: ['ativo', 'cancelado', 'concluido'], default: 'ativo' }
}, { timestamps: true });

appointmentSchema.index({ profissional: 1, data: 1, horario: 1 }, { unique: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
