const mongoose = require('mongoose');

const TIME_ZONE = 'America/Sao_Paulo';
const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const dataValida = (data) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const [ano, mes, dia] = data.split('-').map(Number);
  const valor = new Date(`${data}T12:00:00-03:00`);
  return valor.getFullYear() === ano && valor.getMonth() + 1 === mes && valor.getDate() === dia;
};

const minutos = (horario) => {
  const [hora, minuto] = horario.split(':').map(Number);
  return hora * 60 + minuto;
};

const horario = (total) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

const dataBanco = (data) => new Date(`${data}T12:00:00-03:00`);

const intervaloData = (data) => ({
  $gte: new Date(`${data}T00:00:00-03:00`),
  $lt: new Date(new Date(`${data}T00:00:00-03:00`).getTime() + 24 * 60 * 60 * 1000)
});

const diaSemana = (data) => new Date(`${data}T12:00:00-03:00`).getDay();

const dataFormatada = (data) => new Intl.DateTimeFormat('pt-BR', { timeZone: TIME_ZONE }).format(data);

const horarioValido = (horario) => /^([01]\d|2[0-3]):[0-5]\d$/.test(horario);

const horariosSobrepostos = (inicioA, fimA, inicioB, fimB) => inicioA < fimB && fimA > inicioB;

const normalizarTelefone = (telefone) => String(telefone || '').replace(/\D/g, '');

const validarNome = (nome) => String(nome || '').trim().length >= 3;

const validarPreco = (preco) => Number(preco) >= 0;

const validarDuracao = (duracao) => Number(duracao) >= 1;

const formatarDataAPI = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(d);
};

/** Aceita apenas string hexadecimal de 24 chars (ObjectId). Rejeita objetos ($ne, etc.). */
const objectIdValido = (valor) => {
  if (typeof valor !== 'string' && typeof valor !== 'number') return false;
  const id = String(valor).trim();
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
};

/** Retorna o id como string segura ou null. */
const sanitizarObjectId = (valor) => (objectIdValido(valor) ? String(valor).trim() : null);

/** Garante que o valor é primitivo escalar (nunca objeto de operadores Mongo). */
const escalarSeguro = (valor) => {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'object') return null;
  return valor;
};

module.exports = {
  TIME_ZONE,
  diasSemana,
  dataValida,
  minutos,
  horario,
  dataBanco,
  intervaloData,
  diaSemana,
  dataFormatada,
  horarioValido,
  horariosSobrepostos,
  normalizarTelefone,
  validarNome,
  validarPreco,
  validarDuracao,
  formatarDataAPI,
  objectIdValido,
  sanitizarObjectId,
  escalarSeguro
};
