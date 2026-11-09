const mongoose = require('mongoose');

const ajusteSchema = new mongoose.Schema({
  tipo: { type: String, enum: ['adicionar', 'resgatar', 'zerar', 'corrigir'], required: true },
  pontos: { type: Number, required: true },
  motivo: { type: String, required: true },
  criadoEm: { type: Date, default: Date.now },
  criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const clienteFidelidadeSchema = new mongoose.Schema({
  telefoneNormalizado: { type: String, required: true },
  pontos: { type: Number, default: 0, min: 0 },
  ajustes: [ajusteSchema],
  ativo: { type: Boolean, default: true }
}, { timestamps: true });

clienteFidelidadeSchema.index({ telefoneNormalizado: 1 }, { unique: true });

clienteFidelidadeSchema.methods.adicionarPontos = async function(pontos, motivo, usuarioId) {
  this.pontos += pontos;
  this.ajustes.push({ tipo: 'adicionar', pontos, motivo, criadoPor: usuarioId });
  return this.save();
};

clienteFidelidadeSchema.methods.resgatar = async function(pontos, motivo, usuarioId) {
  if (this.pontos < pontos) throw new Error('Saldo insuficiente de pontos.');
  this.pontos -= pontos;
  this.ajustes.push({ tipo: 'resgatar', pontos, motivo, criadoPor: usuarioId });
  return this.save();
};

clienteFidelidadeSchema.pre('save', function(next) {
  if (this.isModified('pontos') && this.pontos < 0) {
    this.pontos = 0;
  }
  next();
});

module.exports = mongoose.model('ClienteFidelidade', clienteFidelidadeSchema);