const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  usuario: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  senha: { type: String, required: true },
  senhaHash: { type: String },
  precisaAlterarSenha: { type: Boolean, default: false },
  tokenRecuperacao: { type: String },
  expiraTokenRecuperacao: { type: Date }
}, { collection: 'users' });

userSchema.pre('save', function(next) {
  if (this.isModified('senha') && this.senha.length < 8) {
    return next(new Error('Senha deve ter pelo menos 8 caracteres.'));
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
