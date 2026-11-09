const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Bloqueio = require('../models/Bloqueio');
const ConfiguracaoGeral = require('../models/ConfiguracaoGeral');
const Profissional = require('../models/Profissional');
const Servico = require('../models/Servico');
const { JWT_SECRET } = require('../middlewares/auth');
const router = require('../routes/agendamentos');

const profissionalId = new mongoose.Types.ObjectId();
const agendamentoId = new mongoose.Types.ObjectId();
const agendamento = {
  _id: agendamentoId,
  profissionalId: { _id: profissionalId, nome: 'Joao Profissional' },
  servicoId: { _id: new mongoose.Types.ObjectId(), nome: 'Corte Classico', preco: 45, duracaoMinutos: 30 },
  data: new Date('2026-11-12T15:00:00.000Z'),
  horarioInicio: '14:30',
  horarioFim: '15:00',
  nomeCliente: 'Ana Cliente',
  telefoneCliente: '11999998888',
  status: 'agendado',
  tokenConfirmacao: 'token-confirmacao-teste'
};

test('authenticated appointment list includes WhatsApp confirmation and reminder links in authorized scope only', async t => {
  const originalFind = Appointment.find;
  const queries = [];
  Appointment.find = query => {
    queries.push(query);
    return {
      populate() { return this; },
      sort() { return Promise.resolve([agendamento]); }
    };
  };
  t.after(() => { Appointment.find = originalFind; });

  const app = express();
  app.use('/api/agendamentos', router);
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise(resolve => server.close(resolve)));

  const url = `http://127.0.0.1:${server.address().port}/api/agendamentos`;
  const anonima = await fetch(url);
  assert.equal(anonima.status, 401);
  assert.equal(queries.length, 0);

  const adminToken = jwt.sign({ role: 'admin' }, JWT_SECRET);
  const respostaAdmin = await fetch(url, { headers: { authorization: `Bearer ${adminToken}` } });
  assert.equal(respostaAdmin.status, 200);
  const [adminAgendamento] = await respostaAdmin.json();
  assert.match(adminAgendamento.whatsappConfirmacao, /^https:\/\/wa\.me\/5511999998888\?/);
  assert.match(adminAgendamento.whatsappLembrete, /^https:\/\/wa\.me\/5511999998888\?/);
  assert.notEqual(adminAgendamento.whatsappConfirmacao, adminAgendamento.whatsappLembrete);
  const textoConfirmacao = new URL(adminAgendamento.whatsappConfirmacao).searchParams.get('text');
  const textoLembrete = new URL(adminAgendamento.whatsappLembrete).searchParams.get('text');
  assert.ok(textoConfirmacao.includes('Ana Cliente'));
  assert.ok(textoConfirmacao.includes('Corte Classico'));
  assert.ok(textoConfirmacao.includes('Joao Profissional'));
  assert.ok(textoConfirmacao.includes('2026-11-12'));
  assert.ok(textoConfirmacao.includes('14:30'));
  assert.match(textoConfirmacao, /confirmado/i);
  assert.match(textoLembrete, /lembramos/i);
  assert.ok(textoLembrete.includes('Corte Classico'));
  assert.ok(textoLembrete.includes('Joao Profissional'));
  assert.ok(textoLembrete.includes('2026-11-12'));
  assert.ok(textoLembrete.includes('14:30'));
  assert.notEqual(textoConfirmacao, textoLembrete);
  assert.doesNotMatch(adminAgendamento.whatsappConfirmacao, /\s/);
  assert.doesNotMatch(adminAgendamento.whatsappLembrete, /\s/);
  assert.equal(queries[0].profissionalId, undefined);
  assert.equal(adminAgendamento.whatsappCliente, undefined);
  assert.equal(adminAgendamento.whatsappProfissional, undefined);

  const profissionalToken = jwt.sign({ role: 'profissional', profissionalId: String(profissionalId) }, JWT_SECRET);
  const respostaProfissional = await fetch(url, { headers: { authorization: `Bearer ${profissionalToken}` } });
  assert.equal(respostaProfissional.status, 200);
  const [profissionalAgendamento] = await respostaProfissional.json();
  assert.ok(profissionalAgendamento.whatsappConfirmacao);
  assert.ok(profissionalAgendamento.whatsappLembrete);
  assert.equal(String(queries[1].profissionalId), String(profissionalId));
  assert.deepEqual(queries[1].status, { $ne: 'cancelado' });
});

test('public appointment creation does not expose WhatsApp confirmation or reminder links', async t => {
  const originals = {
    appointmentFind: Appointment.find,
    appointmentSave: Appointment.prototype.save,
    bloqueioFind: Bloqueio.find,
    configuracaoFindOne: ConfiguracaoGeral.findOne,
    profissionalFindOne: Profissional.findOne,
    servicoFindOne: Servico.findOne
  };
  const savedAppointments = [];
  t.after(() => {
    Appointment.find = originals.appointmentFind;
    Appointment.prototype.save = originals.appointmentSave;
    Bloqueio.find = originals.bloqueioFind;
    ConfiguracaoGeral.findOne = originals.configuracaoFindOne;
    Profissional.findOne = originals.profissionalFindOne;
    Servico.findOne = originals.servicoFindOne;
  });

  const profissional = {
    _id: profissionalId,
    nome: 'Joao Profissional',
    telefone: '11988887777',
    ativo: true,
    servicos: [{ servicoId: agendamento.servicoId._id, preco: 45, duracaoMinutos: 30 }],
    horarioTrabalho: new Map(),
    folgas: []
  };
  Profissional.findOne = async () => profissional;
  Servico.findOne = async () => agendamento.servicoId;
  ConfiguracaoGeral.findOne = async () => ({
    horarioFuncionamento: new Map([['quinta', { inicio: '08:00', fim: '18:00' }]]),
    duracaoIntervaloEntre: 15
  });
  Bloqueio.find = async () => [];
  Appointment.find = async () => [];
  Appointment.prototype.save = async function save() {
    savedAppointments.push(this);
    return this;
  };

  const app = express();
  app.use(express.json());
  app.use('/api/agendamentos', router);
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise(resolve => server.close(resolve)));

  const url = `http://127.0.0.1:${server.address().port}/api/agendamentos`;
  const criarAgendamento = observacoes => fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      profissionalId: String(profissionalId),
      servicoId: String(agendamento.servicoId._id),
      data: '2026-11-12',
      horarioInicio: '14:30',
      nomeCliente: 'Ana Cliente',
      telefoneCliente: '11999998888',
      ...observacoes
    })
  });
  const resposta = await criarAgendamento({ observacoes: '  Cliente prefere corte curto.  ' });
  assert.equal(resposta.status, 201);
  const resultado = await resposta.json();
  assert.equal(Object.hasOwn(resultado, 'whatsappConfirmacao'), false);
  assert.equal(Object.hasOwn(resultado, 'whatsappLembrete'), false);
  assert.ok(resultado.whatsappCliente);
  assert.ok(resultado.whatsappProfissional);
  assert.ok(resultado.linkConfirmacao);
  assert.equal(resultado.observacoes, 'Cliente prefere corte curto.');
  assert.equal(savedAppointments[0].observacoes, 'Cliente prefere corte curto.');
  assert.equal(savedAppointments[0].telefoneNormalizado, '5511999998888');
  assert.equal(Object.hasOwn(resultado, 'telefoneNormalizado'), false);

  const respostaSemObservacoes = await criarAgendamento({});
  assert.equal(respostaSemObservacoes.status, 201);
  const resultadoSemObservacoes = await respostaSemObservacoes.json();
  assert.equal(resultadoSemObservacoes.observacoes, '');
  assert.equal(savedAppointments[1].observacoes, '');

  const respostaLimite = await criarAgendamento({ observacoes: 'a'.repeat(500) });
  assert.equal(respostaLimite.status, 201);
  assert.equal(savedAppointments[2].observacoes.length, 500);

  for (const observacoes of [null, 123, { texto: 'inválido' }, 'a'.repeat(501)]) {
    const respostaInvalida = await criarAgendamento({ observacoes });
    assert.equal(respostaInvalida.status, 400);
  }
  assert.equal(savedAppointments.length, 3);
});
