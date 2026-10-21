const fusoHorario = 'America/Sao_Paulo';

const dataHoraUTC = data => data.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

const escaparICalendar = valor => String(valor || '')
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r\n|\r|\n/g, '\\n');

export function criarEventoCalendario({ data, horario, duracaoMinutos, profissional, servico }) {
  const inicio = new Date(`${data}T${horario}:00-03:00`);
  const duracao = Number(duracaoMinutos);
  if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(duracao) || duracao <= 0) return null;

  const fim = new Date(inicio.getTime() + duracao * 60 * 1000);
  const titulo = `Navalhado Cortes - ${servico}`;
  const detalhes = [
    'Solicitação de horário aguardando confirmação do profissional.',
    `Profissional: ${profissional}`,
    `Serviço: ${servico}`
  ].join('\n');
  const inicioUTC = dataHoraUTC(inicio);
  const fimUTC = dataHoraUTC(fim);
  const urlGoogle = new URL('https://calendar.google.com/calendar/render');
  urlGoogle.searchParams.set('action', 'TEMPLATE');
  urlGoogle.searchParams.set('text', titulo);
  urlGoogle.searchParams.set('dates', `${inicioUTC}/${fimUTC}`);
  urlGoogle.searchParams.set('ctz', fusoHorario);
  urlGoogle.searchParams.set('details', detalhes);

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Navalhado Cortes//Agendamentos//PT-BR',
    'BEGIN:VEVENT',
    `UID:navalhado-${Date.now()}-${Math.random().toString(36).slice(2)}@navalhado`,
    `DTSTAMP:${dataHoraUTC(new Date())}`,
    `DTSTART:${inicioUTC}`,
    `DTEND:${fimUTC}`,
    `SUMMARY:${escaparICalendar(titulo)}`,
    `DESCRIPTION:${escaparICalendar(detalhes)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete do agendamento Navalhado',
    'TRIGGER:-PT15M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return { urlGoogle: urlGoogle.toString(), ics };
}

export function baixarEventoICalendar(ics) {
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'agendamento-navalhado.ics';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
