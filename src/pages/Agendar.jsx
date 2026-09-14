import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API || 'http://localhost:5000/api';

const dataLocalISO = data => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

export default function Agendar() {
  const [step, setStep] = useState(1);
  const [dados, setDados] = useState({});
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [datas, setDatas] = useState([]);
  const [dataSel, setDataSel] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [carregandoProfissionais, setCarregandoProfissionais] = useState(true);
  const [erroAgendamento, setErroAgendamento] = useState('');

  // Carregar dados iniciais
  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API}/profissionais`)
      .then(r => {
        if (!r.ok) throw new Error('Falha ao carregar dados iniciais');
        return r.json();
      })
      .then(d => {
        setProfissionais(d || []);
      })
      .catch(e => {
        if (e.name !== 'AbortError') console.log('Erro ao carregar dados iniciais:', e);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregandoProfissionais(false);
      });
    gerarDatas();

    return () => controller.abort();
  }, []);

  // Gerar 14 dias corridos, distribuídos em duas semanas
  const gerarDatas = () => {
    const arr = [];
    const hoje = new Date();
    for (let i = 0; arr.length < 14; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      arr.push({
        iso: dataLocalISO(d),
        dia: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        num: d.getDate(),
        mes: d.toLocaleDateString('pt-BR', { month: 'short' })
      });
    }
    setDatas(arr);
  };

  // O servidor calcula disponibilidade usando o serviço escolhido.
  useEffect(() => {
    if (!dataSel || !dados.profissional || !dados.servico) return undefined;

    const controller = new AbortController();
    const params = new URLSearchParams({
      data: dataSel,
      servicoId: dados.servico._id
    });

    fetch(`${API}/profissionais/${dados.profissional._id}/horarios-disponiveis?${params}`, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('Falha ao carregar horários');
        return r.json();
      })
      .then(setHorarios)
      .catch(e => {
        if (e.name !== 'AbortError') console.log('Erro ao carregar horários:', e);
      });

    return () => controller.abort();
  }, [dataSel, dados.profissional]);

  const selecionarProfissional = p => {
    setDados({ profissional: p });
    setServicos([]);
    setDataSel('');
    fetch(`${API}/profissionais/${p._id}/servicos`)
      .then(res => res.ok ? res.json() : Promise.reject(new Error('Não foi possível carregar os serviços.')))
      .then(setServicos)
      .catch(e => setErroAgendamento(e.message));
    setStep(2);
  };

  const selecionarServico = s => {
    setDados({ ...dados, servico: s });
    setStep(3);
  };

  const selecionarHorario = h => {
    setDados({ ...dados, horario: h, data: dataSel });
    setStep(4);
  };

  const atualizarDados = e => {
    setDados({ ...dados, [e.target.name]: e.target.value });
  };

  const horarioPassado = h => {
    if (dataSel !== dataLocalISO(new Date())) return false;
    const [hora, minuto] = h.split(':').map(Number);
    const agora = new Date();
    return hora * 60 + minuto <= agora.getHours() * 60 + agora.getMinutes();
  };

  const confirmar = async e => {
    e.preventDefault();
    setCarregando(true);
    setErroAgendamento('');
    const telefone = (dados.telefone || '').replace(/\D/g, '');
    if ((dados.nomeCliente || '').trim().length < 3) {
      setErroAgendamento('Nome deve ter pelo menos 3 caracteres.');
      setCarregando(false);
      return;
    }
    if (telefone.length < 10 || telefone.length > 11) {
      setErroAgendamento('Informe um telefone válido.');
      setCarregando(false);
      return;
    }
    try {
      const res = await fetch(`${API}/agendamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profissionalId: dados.profissional._id,
          servicoId: dados.servico._id,
          data: dados.data,
          horarioInicio: dados.horario,
          nomeCliente: dados.nomeCliente,
          telefoneCliente: telefone
        })
      });

      const resposta = await res.json();
      if (!res.ok) throw new Error(resposta.erro || 'Erro ao agendar. Tente novamente.');
      setDados({ ...dados, whatsappCliente: resposta.whatsappCliente });
      setSucesso(true);
    } catch (e) {
      setErroAgendamento(e.message || 'Não foi possível concluir o agendamento.');
    } finally {
      setCarregando(false);
    }
  };

  const reiniciar = () => {
    setStep(1);
    setDados({});
    setDataSel('');
    setSucesso(false);
    setErroAgendamento('');
  };

  if (sucesso) {
    return (
      <div className="success">
        <div className="header">
          <div className="logo-container">
            <img 
              src="/Logo.webp" 
              alt="Logo Navalhado Cortes" 
              className="logo-img"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <h1 className="logo-nome">Navalhado Cortes</h1>
            <p className="logo-subtitulo">Agendamento Online</p>
          </div>
        </div>
        <div className="icon">✓</div>
        <h2>Solicitação enviada!</h2>
        <p>
          <strong>{dados.profissional?.nome}</strong><br />
          {dados.servico?.nome}<br />
          {new Date(dados.data + 'T00:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long'
          })} às {dados.horario}
        </p>
        <p>Aguarde confirmação do profissional.</p>
        {dados.whatsappCliente && <a className="btn" href={dados.whatsappCliente} target="_blank" rel="noreferrer">Enviar mensagem no WhatsApp</a>}
        <button className="btn btn-outline" onClick={reiniciar}>Novo agendamento</button>
      </div>
    );
  }

  return (
    <>
      <div className="header">
        <div className="logo-container">
          <img 
            src="/Logo.webp" 
            alt="Logo Navalhado Cortes" 
            className="logo-img"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      </div>

      <div className="steps">
        <div className={`step ${step >= 1 ? (step > 1 ? 'done' : 'active') : ''}`}>
          <div className="dot">{step > 1 ? '✓' : '1'}</div>
          <div>Quem</div>
        </div>
        <div className={`step ${step >= 2 ? (step > 2 ? 'done' : 'active') : ''}`}>
          <div className="dot">{step > 2 ? '✓' : '2'}</div>
          <div>Serviço</div>
        </div>
        <div className={`step ${step >= 3 ? (step > 3 ? 'done' : 'active') : ''}`}>
          <div className="dot">{step > 3 ? '✓' : '3'}</div>
          <div>Quando</div>
        </div>
        <div className={`step ${step >= 4 ? 'active' : ''}`}>
          <div className="dot">4</div>
          <div>Seus dados</div>
        </div>
      </div>

      {/* STEP 1: Profissional */}
      {step === 1 && (
        <>
          <div className="section-title">Escolha o profissional</div>
          {carregandoProfissionais ? (
            <div className="loading-state" role="status" aria-live="polite">
              <div className="loading-label">
                Carregando profissionais
                <span className="loading-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>
              </div>
              <div className="professional-skeletons" aria-hidden="true">
                <div className="professional-skeleton"><span /><div><b /><em /></div></div>
                <div className="professional-skeleton"><span /><div><b /><em /></div></div>
              </div>
            </div>
          ) : profissionais.length > 0 ? (
            profissionais.map(p => (
              <div key={p._id || p.id} className="card" onClick={() => selecionarProfissional(p)}>
                <h3>{p.nome}</h3>
                <p>{p.descricao || 'Geral'}</p>
              </div>
            ))
          ) : (
            <div className="loading">Nenhum profissional disponível.</div>
          )}
        </>
      )}

      {/* STEP 2: Serviço */}
      {step === 2 && (
        <>
          <div className="section-title">Escolha o serviço</div>
          {servicos.map(s => (
            <div key={s._id || s.id} className="card" onClick={() => selecionarServico(s)}>
              <h3>{s.nome}</h3>
              <div className="meta">
                <span className="preco">R$ {s.preco}</span>
                <span className="duracao">{s.duracaoMinutos} min</span>
              </div>
            </div>
          ))}
          <button className="btn btn-outline" onClick={() => setStep(1)}>
            ← Voltar
          </button>
        </>
      )}

      {/* STEP 3: Data e Horário */}
      {step === 3 && (
        <>
          <div className="section-title">Escolha a data</div>
          <div className="date-scroll">
            {datas.map(d => (
              <div
                key={d.iso}
                className={`date-item ${dataSel === d.iso ? 'selected' : ''}`}
                onClick={() => setDataSel(d.iso)}
              >
                <div className="dia">{d.dia}</div>
                <div className="num">{d.num}</div>
                <div className="mes">{d.mes}</div>
              </div>
            ))}
          </div>

          {dataSel && (
            <>
              <div className="calendar-heading">
                <div className="section-title">Escolha o horário</div>
                <span>
                  {new Date(`${dataSel}T00:00:00`).toLocaleDateString('pt-BR', {
                    weekday: 'long', day: 'numeric', month: 'long'
                  })}
                </span>
              </div>
              <div className="day-calendar" aria-label="Horários disponíveis">
                {horarios.map(h => (
                  <div
                    key={h.horarioInicio}
                    className={`calendar-slot ${horarioPassado(h.horarioInicio) ? 'past' : ''}`}
                  >
                    <span className="calendar-time">{h.horarioInicio}</span>
                    <button
                      type="button"
                      className="calendar-event"
                      disabled={horarioPassado(h.horarioInicio)}
                      onClick={() => !horarioPassado(h.horarioInicio) && selecionarHorario(h.horarioInicio)}
                    >
                      {horarioPassado(h.horarioInicio) ? 'Indisponível' : 'Disponível'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <button className="btn btn-outline" onClick={() => setStep(2)}>
            ← Voltar
          </button>
        </>
      )}

      {/* STEP 4: Dados do cliente */}
      {step === 4 && (
        <form onSubmit={confirmar}>
          <div className="section-title">Confirme seus dados</div>
          {erroAgendamento && <div className="form-error" role="alert">{erroAgendamento}</div>}

          <div className="summary">
            <h4>Resumo do agendamento</h4>
            <div className="row"><span>Profissional</span><span>{dados.profissional?.nome}</span></div>
            <div className="row"><span>Serviço</span><span>{dados.servico?.nome}</span></div>
            <div className="row"><span>Duração</span><span>{dados.servico?.duracaoMinutos} min</span></div>
            <div className="row"><span>Data</span><span>{new Date(dados.data + 'T00:00:00').toLocaleDateString('pt-BR')}</span></div>
            <div className="row"><span>Horário</span><span>{dados.horario}</span></div>
            <div className="row total"><span>Total</span><span>R$ {dados.servico?.preco}</span></div>
          </div>

          <div className="form-group">
            <label>Nome completo *</label>
            <input name="nomeCliente" value={dados.nomeCliente || ''} onChange={atualizarDados} required />
          </div>
          <div className="form-group">
            <label>Telefone *</label>
            <input name="telefone" value={dados.telefone || ''} onChange={e => {
              const valor = e.target.value.replace(/\D/g, '').slice(0, 11);
              const mascara = valor.length > 10 ? valor.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : valor.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
              atualizarDados({ target: { name: 'telefone', value: mascara } });
            }} required placeholder="(11) 99999-9999" />
          </div>

          <button type="submit" className="btn" disabled={carregando}>
            {carregando ? 'Agendando...' : '✓ Confirmar agendamento'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => setStep(3)}>
            ← Voltar
          </button>
        </form>
      )}

      <div style={{ 
        display: 'flex', justifyContent: 'center', gap: 20, 
        padding: '20px', fontSize: 12 
      }}>
        <a href="/sobre" style={{ color: '#999', textDecoration: 'none' }}>
          ℹ️ Sobre o salão
        </a>
        <span style={{ color: '#ddd' }}>|</span>
        <a href="/login" style={{ color: '#999', textDecoration: 'none' }}>
          🔐 Área dos profissionais
        </a>
      </div>
    </>
  );
}
