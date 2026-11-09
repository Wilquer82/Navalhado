const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const Appointment = require('../models/Appointment');
const { JWT_SECRET } = require('../middlewares/auth');
const { normalizarTelefoneBrasileiro } = require('../services/validacoes');
const { linksNotificacao, serializarAgendamento } = require('../services/agenda');
const router = require('../routes/agendamentos');

test('Brazilian telephone normalization accepts local, +55 and 00 55 formats', () => {
  assert.equal(normalizarTelefoneBrasileiro('(11) 99999-8888'), '5511999998888');
  assert.equal(normalizarTelefoneBrasileiro('+55 (11) 99999-8888'), '5511999998888');
  assert.equal(normalizarTelefoneBrasileiro('55 11 99999 8888'), '5511999998888');
  assert.equal(normalizarTelefoneBrasileiro('00 55 11 99999-8888'), '5511999998888');
  assert.equal(normalizarTelefoneBrasileiro('12345'), null);
});

test('public appointment serialization omits the normalized telephone field', () => {
  const serializado = serializarAgendamento({
    _id: 'agendamento',
    profissionalId: 'profissional',
    servicoId: 'servico',
    data: new Date('2026-11-09T15:00:00.000Z'),
    horarioInicio: '14:30',
    telefoneCliente: '(11) 99999-8888',
    telefoneNormalizado: '5511999998888'
  });

  assert.equal(Object.hasOwn(serializado, 'telefoneNormalizado'), false);
});

test('appointment schema indexes normalized phone with status and descending date', () => {
  const index = Appointment.schema.indexes().find(([fields]) =>
    fields.telefoneNormalizado === 1 && fields.status === 1 && fields.data === -1
  );
  assert.ok(index);
  assert.equal(Appointment.schema.path('telefoneNormalizado').options.required, undefined);
});

test('WhatsApp message text does not include the stored normalized telephone field', async () => {
  const links = await linksNotificacao({
    data: new Date('2026-11-09T15:00:00.000Z'),
    horarioInicio: '14:30',
    nomeCliente: 'Ana Cliente',
    telefoneCliente: '(11) 99999-8888',
    tokenConfirmacao: 'token-confirmacao-teste'
  }, {
    nome: 'Joao Profissional',
    telefone: '11988887777'
  }, {
    nome: 'Corte Classico'
  });

  for (const link of [links.whatsappCliente, links.whatsappConfirmacao, links.whatsappLembrete, links.whatsappProfissional]) {
    const texto = new URL(link).searchParams.get('text');
    assert.doesNotMatch(texto, /5511999998888/);
  }
});

test('admin history returns at most five finalized appointments and matches legacy formatted phones', async t => {
  const originalFind = Appointment.find;
  const chamadas = [];
  const registros = Array.from({ length: 7 }, (_, index) => ({
    _id: `agendamento-${index + 1}`,
    profissionalId: { _id: `profissional-${index + 1}`, nome: `Profissional ${index + 1}` },
    servicoId: { _id: `servico-${index + 1}`, nome: `Serviço ${index + 1}`, preco: 45, duracaoMinutos: 30 },
    data: new Date(Date.UTC(2026, 10, 9 - index, 15)),
    horarioInicio: '14:30',
    horarioFim: '15:00',
    nomeCliente: 'Cliente',
    telefoneCliente: '(11) 99999-8888',
    telefoneNormalizado: index % 2 ? undefined : '5511999998888',
    status: index % 2 ? 'concluido' : 'finalizado'
  }));
  Appointment.find = query => {
    const chamada = { query, sort: null, limit: null, populate: [] };
    chamadas.push(chamada);
    return {
      populate(path, fields) { chamada.populate.push({ path, fields }); return this; },
      sort(value) { chamada.sort = value; return this; },
      limit(value) {
        chamada.limit = value;
        return Promise.resolve(registros.slice(0, value));
      }
    };
  };
  t.after(() => { Appointment.find = originalFind; });

  const app = express();
  app.use('/api/agendamentos', router);
  const server = await new Promise(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  t.after(() => new Promise(resolve => server.close(resolve)));

  const base = `http://127.0.0.1:${server.address().port}/api/agendamentos/historico`;
  const semAutenticacao = await fetch(`${base}?telefone=11999998888`);
  assert.equal(semAutenticacao.status, 401);
  const profissional = await fetch(`${base}?telefone=11999998888`, {
    headers: { authorization: `Bearer ${jwt.sign({ role: 'profissional' }, JWT_SECRET)}` }
  });
  assert.equal(profissional.status, 403);
  assert.equal(chamadas.length, 0);

  const adminToken = jwt.sign({ role: 'admin' }, JWT_SECRET);
  const telefoneInvalido = await fetch(`${base}?telefone=123`, {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.equal(telefoneInvalido.status, 400);
  assert.equal(chamadas.length, 0);

  const resposta = await fetch(`${base}?telefone=%2B55%20%2811%29%2099999-8888`, {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.equal(resposta.status, 200);
  const historico = await resposta.json();
  assert.equal(historico.length, 5);
  assert.deepEqual(historico.map(item => item.status), ['finalizado', 'concluido', 'finalizado', 'concluido', 'finalizado']);
  assert.equal(historico[0].data, '2026-11-09');
  assert.equal(historico[0].nomeCliente, 'Cliente');
  assert.equal(historico[0].profissional.nome, 'Profissional 1');
  assert.equal(historico[0].servico.nome, 'Serviço 1');
  assert.equal(Object.hasOwn(historico[0], 'telefoneNormalizado'), false);
  assert.equal(Object.hasOwn(historico[0], 'telefoneCliente'), false);
  assert.equal(Object.hasOwn(historico[0], 'telefone'), false);

  const { query, sort, limit, populate } = chamadas[0];
  assert.deepEqual(query.status, { $in: ['finalizado', 'concluido'] });
  assert.equal(query.$or[0].telefoneNormalizado, '5511999998888');
  assert.equal(query.$or[1].telefoneCliente.test('(11) 99999-8888'), true);
  assert.equal(query.$or[1].telefoneCliente.test('+55 (11) 99999-8888'), true);
  assert.equal(query.$or[1].telefoneCliente.test('(21) 99999-8888'), false);
  assert.deepEqual(sort, { data: -1, horarioInicio: -1, createdAt: -1 });
  assert.equal(limit, 5);
  assert.deepEqual(populate, [
    { path: 'profissionalId', fields: 'nome' },
    { path: 'servicoId', fields: 'nome preco duracaoMinutos' }
  ]);
});
