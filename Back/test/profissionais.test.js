const test = require('node:test');
const assert = require('node:assert/strict');
const { validarBioProfissional, validarFotoUrl } = require('../services/validacoes');

test('professional bio accepts up to 120 trimmed characters', () => {
  assert.equal(validarBioProfissional('a'.repeat(120)), true);
  assert.equal(validarBioProfissional(`  ${'a'.repeat(120)}  `), true);
  assert.equal(validarBioProfissional('a'.repeat(121)), false);
  assert.equal(validarBioProfissional({ texto: 'bio' }), false);
});

test('professional photo accepts HTTP(S) URLs without credentials', () => {
  assert.equal(validarFotoUrl('https://images.example.com/photo.jpg'), true);
  assert.equal(validarFotoUrl('http://images.example.com/photo.jpg'), true);
  assert.equal(validarFotoUrl(''), true);
  assert.equal(validarFotoUrl('javascript:alert(1)'), false);
  assert.equal(validarFotoUrl('data:image/png;base64,abc'), false);
  assert.equal(validarFotoUrl('https://user:password@images.example.com/photo.jpg'), false);
});
