const test = require('node:test');
const assert = require('node:assert/strict');
const { bloqueioAfetaHorario, linkWhatsApp, resolverServicoDoProfissional } = require('../services/agenda');

const servico = {
  _id: 'servico-global',
  preco: 45,
  duracaoMinutos: 30
};

test('service without professional links is available at its default price and duration', () => {
  const result = resolverServicoDoProfissional({ servicos: [] }, servico, false);

  assert.deepEqual(result, {
    servico,
    vinculo: {
      servicoId: servico._id,
      preco: 45,
      duracaoMinutos: 30
    }
  });
});

test('service linked to another professional is not available without a local link', () => {
  const result = resolverServicoDoProfissional({ servicos: [] }, servico, true);

  assert.equal(result, null);
});

test('professional-specific service price and duration take precedence', () => {
  const vinculo = {
    servicoId: servico._id,
    preco: 60,
    duracaoMinutos: 45
  };
  const result = resolverServicoDoProfissional({ servicos: [vinculo] }, servico, true);

  assert.deepEqual(result, { servico, vinculo });
});

test('inactive or missing services are not eligible', () => {
  assert.equal(resolverServicoDoProfissional({ servicos: [] }, null, false), null);
});

test('one-time blocks apply only to their date and overlapping interval', () => {
  const bloqueio = {
    data: '2026-11-09',
    horarioInicio: '12:00',
    horarioFim: '14:00'
  };

  assert.equal(bloqueioAfetaHorario(bloqueio, '2026-11-09', '13:00', '13:30'), true);
  assert.equal(bloqueioAfetaHorario(bloqueio, '2026-11-09', '14:00', '14:30'), false);
  assert.equal(bloqueioAfetaHorario(bloqueio, '2026-11-10', '13:00', '13:30'), false);
});

test('all-day recurring blocks stop after their inclusive end date', () => {
  const bloqueio = {
    recorrente: true,
    diaSemana: 1,
    recorrenteAte: '2026-11-09'
  };

  assert.equal(bloqueioAfetaHorario(bloqueio, '2026-11-09', '08:00', '08:15'), true);
  assert.equal(bloqueioAfetaHorario(bloqueio, '2026-11-16', '08:00', '08:15'), false);
});

test('legacy recurring blocks without an end date remain active', () => {
  const bloqueio = { recorrente: true, diaSemana: 1 };

  assert.equal(bloqueioAfetaHorario(bloqueio, '2026-11-16', '08:00', '08:15'), true);
});

test('WhatsApp links add the Brazilian country code to local numbers', () => {
  const link = linkWhatsApp('(11) 99999-8888', 'Olá');

  assert.equal(link, 'https://wa.me/5511999998888?text=Ol%C3%A1');
});

test('WhatsApp links preserve already internationalized numbers', () => {
  assert.equal(
    linkWhatsApp('+55 (11) 99999-8888', 'Confirmado'),
    'https://wa.me/5511999998888?text=Confirmado'
  );
  assert.equal(
    linkWhatsApp('5511999998888', 'Confirmado'),
    'https://wa.me/5511999998888?text=Confirmado'
  );
  assert.equal(
    linkWhatsApp('+1 (202) 555-0100', 'Confirmado'),
    'https://wa.me/12025550100?text=Confirmado'
  );
  assert.equal(
    linkWhatsApp('00 55 (11) 99999-8888', 'Confirmado'),
    'https://wa.me/5511999998888?text=Confirmado'
  );
});

test('WhatsApp links are omitted when the phone number is empty', () => {
  assert.equal(linkWhatsApp('', 'Olá'), null);
  assert.equal(linkWhatsApp(' + ( ) ', 'Olá'), null);
});
