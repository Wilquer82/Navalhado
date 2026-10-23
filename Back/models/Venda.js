const mongoose = require('mongoose');

const itemVendaSchema = new mongoose.Schema({
  produtoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Produto', required: true },
  nome: { type: String, required: true },
  precoUnitario: { type: Number, required: true, min: 0 },
  quantidade: { type: Number, required: true, min: 1 },
  subtotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const vendaSchema = new mongoose.Schema({
  profissionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profissional', required: true },
  itens: { type: [itemVendaSchema], required: true, validate: v => Array.isArray(v) && v.length > 0 },
  total: { type: Number, required: true, min: 0 },
  nomeCliente: { type: String, default: '' },
  observacoes: { type: String, default: '' },
  data: { type: Date, required: true },
  status: { type: String, enum: ['concluida', 'cancelada'], default: 'concluida' }
}, { timestamps: true });

vendaSchema.index({ profissionalId: 1, data: 1 });

module.exports = mongoose.model('Venda', vendaSchema);
