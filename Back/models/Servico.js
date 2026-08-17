const mongoose = require('mongoose');

const servicoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  duracao: { type: Number, required: true }, // minutos
  preco: { type: Number, required: true },
  ativo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Servico', servicoSchema);