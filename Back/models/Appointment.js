const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  profissionalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profissional', required: true },
  servicoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Servico', required: true },
  data: { type: Date, required: true },
  horarioInicio: { type: String, required: true },
  horarioFim: { type: String, required: true },
  inicioEm: { type: Date },
  lembreteEm: { type: Date },
  lembreteStatus: { type: String, enum: ['pendente', 'enviando', 'enviado', 'falhou', 'sem_assinatura'], default: 'pendente' },
  lembreteTentativas: { type: Number, default: 0 },
  lembreteEnviadoEm: { type: Date },
  whatsappConfirmacaoEnviadaEm: { type: Date },
  whatsappLembreteEnviadaEm: { type: Date },
  pushSubscription: { type: mongoose.Schema.Types.Mixed },
  nomeCliente: { type: String, required: true },
  telefoneCliente: { type: String, required: true },
  telefoneNormalizado: { type: String, default: undefined },
  pagamento: {
    tipo: { type: String, enum: ['integral', 'sinal_pix'], default: 'integral' },
    valorOriginal: { type: Number, min: 0 },
    valorSinal: { type: Number, min: 0, default: 0 },
    desconto: { type: Number, min: 0, default: 0 },
    valorFinal: { type: Number, min: 0 },
    valorRestante: { type: Number, min: 0 },
    statusSinal: { type: String, enum: ['pendente', 'recebido'], default: 'pendente' },
    aceiteSinal: { type: Boolean, default: false }
  },
  observacoes: { type: String, default: '' },
  status: {
    type: String,
    enum: ['agendado', 'confirmado', 'em_atendimento', 'finalizado', 'cancelado', 'nao_compareceu', 'pendente', 'concluido'],
    default: 'agendado'
  },
  comissaoValor: { type: Number, min: 0, default: undefined },
  comissaoPercentual: { type: Number, min: 0, max: 100, default: undefined },
  fidelidadeJaPontuada: { type: Boolean, default: false },
  criadoEm: { type: Date, default: Date.now },
  tokenConfirmacao: { type: String, unique: true, sparse: true }
}, { timestamps: true });

appointmentSchema.index(
  { profissionalId: 1, data: 1, horarioInicio: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: 'cancelado' } } }
);
appointmentSchema.index({ telefoneNormalizado: 1, status: 1, data: -1 });

appointmentSchema.pre('save', async function(next) {
  if (this.isModified('status') && this.status === 'finalizado' && !this.comissaoValor) {
    const Profissional = mongoose.model('Profissional');
    const profissional = await Profissional.findById(this.profissionalId);
    const percentual = profissional?.comissaoPercentual ?? 50;
    const valorFinal = this.pagamento?.valorFinal ?? 0;
    this.comissaoValor = parseFloat((valorFinal * percentual / 100).toFixed(2));
    this.comissaoPercentual = percentual;
  }
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
