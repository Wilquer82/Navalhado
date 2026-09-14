const mongoose = require('mongoose');

const configuracaoGeralSchema = new mongoose.Schema({
  horarioFuncionamento: {
    type: Map,
    of: {
      inicio: { type: String },
      fim: { type: String }
    },
    default: {}
  },
  duracaoIntervaloEntre: { type: Number, default: 15, min: 0 }
});

module.exports = mongoose.model('ConfiguracaoGeral', configuracaoGeralSchema);