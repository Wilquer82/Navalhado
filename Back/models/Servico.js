const mongoose = require('mongoose');

const servicoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  preco: { type: Number, required: true, min: 0 },
  duracaoMinutos: { type: Number, required: true, min: 1 },
  ativo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Servico', servicoSchema);