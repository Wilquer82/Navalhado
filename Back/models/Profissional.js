const mongoose = require('mongoose');

const profissionalSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  foto: { type: String, default: '' },
  descricao: { type: String, default: 'Geral' },
  telefone: { type: String, default: '' },
  servicos: [{
    servicoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Servico', required: true },
    preco: { type: Number, required: true, min: 0 },
    duracaoMinutos: { type: Number, required: true, min: 1 }
  }],
  horarioTrabalho: {
    type: Map,
    of: {
      inicio: { type: String },
      fim: { type: String }
    },
    default: {}
  },
  folgas: { type: [Date], default: [] },
  usuario: {
    email: { type: String, lowercase: true, trim: true },
    senhaHash: { type: String }
  },
  ativo: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Profissional', profissionalSchema);