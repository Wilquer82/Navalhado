const mongoose = require('mongoose');

const produtoSchema = new mongoose.Schema({
  nome: { type: String, required: true, trim: true },
  descricao: { type: String, default: '' },
  preco: { type: Number, required: true, min: 0 },
  estoque: { type: Number, default: 0, min: 0 },
  controlarEstoque: { type: Boolean, default: false },
  ativo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Produto', produtoSchema);
