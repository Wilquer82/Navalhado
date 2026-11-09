import { useEffect, useRef, useState } from 'react';

const formatarData = dataISO => {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataISO || '');
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : '';
};

const converterParaISO = dataBR => {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dataBR);
  if (!partes) return null;

  const [, dia, mes, ano] = partes;
  const data = new Date(0);
  data.setUTCHours(0, 0, 0, 0);
  data.setUTCFullYear(Number(ano), Number(mes) - 1, Number(dia));
  if (
    data.getUTCFullYear() !== Number(ano) ||
    data.getUTCMonth() !== Number(mes) - 1 ||
    data.getUTCDate() !== Number(dia)
  ) return null;

  return `${ano}-${mes}-${dia}`;
};

const formatarEntrada = valor => {
  const digitos = valor.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
};

export default function CampoData({ value, onChange, style = {} }) {
  const [texto, setTexto] = useState(() => formatarData(value));
  const [invalida, setInvalida] = useState(false);
  const seletorRef = useRef(null);
  const { marginBottom = 12, ...estiloInput } = style;

  useEffect(() => {
    setTexto(formatarData(value));
    setInvalida(false);
  }, [value]);

  const alterarTexto = e => {
    const novoTexto = formatarEntrada(e.target.value);
    setTexto(novoTexto);

    if (!novoTexto) {
      setInvalida(false);
      onChange('');
      return;
    }

    const dataISO = converterParaISO(novoTexto);
    setInvalida(!dataISO);
    if (dataISO) onChange(dataISO);
  };

  const abrirCalendario = () => {
    const seletor = seletorRef.current;
    if (typeof seletor?.showPicker === 'function') seletor.showPicker();
    else seletor?.click();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 8, marginBottom }}>
      <input
        type="text"
        inputMode="numeric"
        maxLength={10}
        placeholder="DD/MM/YYYY"
        aria-label="Data (DD/MM/YYYY)"
        aria-invalid={invalida}
        value={texto}
        onChange={alterarTexto}
        style={{
          width: '100%',
          minWidth: 0,
          padding: 12,
          borderRadius: 8,
          border: `1px solid ${invalida ? '#c62828' : '#ddd'}`,
          fontSize: 14,
          ...estiloInput
        }}
      />
      <button
        type="button"
        onClick={abrirCalendario}
        aria-label="Abrir calendário"
        style={{ padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer' }}
      >
        Calendário
      </button>
      <input
        ref={seletorRef}
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Selecionar data no calendário"
        tabIndex={-1}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />
      {invalida && (
        <small style={{ gridColumn: '1 / -1', color: '#c62828' }}>
          Informe uma data válida no formato DD/MM/YYYY.
        </small>
      )}
    </div>
  );
}
