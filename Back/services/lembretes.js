const webpush = require('web-push');
const Appointment = require('../models/Appointment');
const { dataFormatada } = require('./validacoes');

const intervaloVerificacaoMs = 60 * 1000;
const maxTentativas = 3;

function configuracaoVapid() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return null;
  return {
    publicKey: VAPID_PUBLIC_KEY,
    privateKey: VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT || 'mailto:contato@navalhado.com'
  };
}

async function enviarLembrete(agendamento) {
  await webpush.sendNotification(agendamento.pushSubscription, JSON.stringify({
    title: 'Lembrete de agendamento',
    body: `Olá, ${agendamento.nomeCliente}! Seu horário é dia ${dataFormatada(agendamento.inicioEm)}, às ${agendamento.horarioInicio}.`,
    url: '/'
  }), { TTL: 3600 });
}

async function processarLembretes() {
  const agora = new Date();
  const agendamentos = await Appointment.find({
    status: 'confirmado',
    inicioEm: { $gt: agora },
    lembreteEm: { $lte: agora },
    pushSubscription: { $exists: true, $ne: null },
    lembreteStatus: { $in: ['pendente', 'falhou'] },
    lembreteTentativas: { $lt: maxTentativas }
  }).sort({ lembreteEm: 1 }).limit(20);

  for (const agendamento of agendamentos) {
    const reivindicado = await Appointment.findOneAndUpdate({
      _id: agendamento._id,
      status: 'confirmado',
      inicioEm: { $gt: new Date() },
      pushSubscription: { $exists: true, $ne: null },
      lembreteStatus: { $in: ['pendente', 'falhou'] },
      lembreteTentativas: { $lt: maxTentativas }
    }, {
      $set: { lembreteStatus: 'enviando' },
      $inc: { lembreteTentativas: 1 }
    }, { new: true });
    if (!reivindicado) continue;

    try {
      await enviarLembrete(reivindicado);
      await Appointment.updateOne({ _id: reivindicado._id, lembreteStatus: 'enviando' }, {
        $set: { lembreteStatus: 'enviado', lembreteEnviadoEm: new Date() }
      });
      console.log(`Lembrete enviado para o agendamento ${reivindicado._id}.`);
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await Appointment.updateOne({ _id: reivindicado._id, lembreteStatus: 'enviando' }, {
          $set: { lembreteStatus: 'sem_assinatura' },
          $unset: { pushSubscription: '' }
        });
        console.error(`Assinatura de notificações expirada para o agendamento ${reivindicado._id}.`);
        continue;
      }

      await Appointment.updateOne({ _id: reivindicado._id, lembreteStatus: 'enviando' }, {
        $set: { lembreteStatus: 'falhou' }
      });
      console.error(`Falha ao enviar lembrete do agendamento ${reivindicado._id}: ${error.message}`);
    }
  }
}

function iniciarAgendadorLembretes() {
  const config = configuracaoVapid();
  if (!config) {
    console.error('Notificações push desativadas: configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.');
    return null;
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  let executando = false;
  const verificar = async () => {
    if (executando) return;
    executando = true;
    try {
      await processarLembretes();
    } catch (error) {
      console.error(`Falha ao buscar lembretes de agendamento: ${error.message}`);
    } finally {
      executando = false;
    }
  };

  const timer = setInterval(verificar, intervaloVerificacaoMs);
  timer.unref();
  verificar();
  return timer;
}

module.exports = { iniciarAgendadorLembretes, processarLembretes, enviarLembrete, configuracaoVapid };
