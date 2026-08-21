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
  const [ocupados, setOcupados] = useState([]);
  const [datas, setDatas] = useState([]);
  const [dataSel, setDataSel] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [carregandoProfissionais, setCarregandoProfissionais] = useState(true);
  const [erroAgendamento, setErroAgendamento] = useState('');

  // Carregar dados iniciais
  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API}/dados`)
      .then(r => {
        if (!r.ok) throw new Error('Falha ao carregar dados iniciais');
        return r.json();
      })
      .then(d => {
        setProfissionais(d.profissionais || []);
        setServicos(d.servicos || []);
        setHorarios(d.horarios || []);
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

  // Carregar horários ocupados ao selecionar data/profissional
  useEffect(() => {
    setOcupados([]);
    if (!dataSel || !dados.profissional) return undefined;

    const controller = new AbortController();
    const params = new URLSearchParams({
      data: dataSel,
      profissional: dados.profissional.nome
    });

    fetch(`${API}/horarios-ocupados?${params}`, { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error('Falha ao carregar horários');
        return r.json();
      })
      .then(setOcupados)
      .catch(e => {
        if (e.name !== 'AbortError') console.log('Erro ao carregar horários:', e);
      });

    return () => controller.abort();
  }, [dataSel, dados.profissional]);

  const selecionarProfissional = p => {
    setDados({ profissional: p });
    setDataSel('');
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

  const horarioOcupado = h => {
    return ocupados.some(o => o.horario === h);
  };

  const horarioPassado = h => {
    if (dataSel !== dataLocalISO(new Date())) return false;
    const [hora, minuto] = h.split(':').map(Number);
    const agora = new Date();
    return hora * 60 + minuto <= agora.getHours() * 60 + agora.getMinutes();
  };

  const horarioIndisponivel = h => horarioOcupado(h) || horarioPassado(h);

  const horarioDisponivelNoDia = h => {
    const diaSemana = new Date(`${dataSel}T00:00:00`).getDay();
    return diaSemana !== 0 && diaSemana !== 6 || h <= '14:00';
  };

  const confirmar = async e => {
    e.preventDefault();
    setCarregando(true);
    setErroAgendamento('');
    try {
      const res = await fetch(`${API}/agendamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profissional: dados.profissional.nome,
          servico: dados.servico.nome,
          duracao: dados.servico.duracao,
          preco: dados.servico.preco,
          data: dados.data,
          horario: dados.horario,
          nomeCliente: dados.nomeCliente,
          telefone: dados.telefone,
          email: dados.email || '',
          observacoes: dados.observacoes || ''
        })
      });

      if (!res.ok) throw new Error('Erro ao agendar. Tente novamente.');
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
        <h2>Agendamento confirmado!</h2>
        <p>
          <strong>{dados.profissional?.nome}</strong><br />
          {dados.servico?.nome}<br />
          {new Date(dados.data + 'T00:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long'
          })} às {dados.horario}
        </p>
        <button className="btn" onClick={reiniciar}>Novo agendamento</button>
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
                <p>{p.especialidade}</p>
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
                <span className="duracao">{s.duracao} min</span>
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
                {horarios.filter(horarioDisponivelNoDia).map(h => (
                  <div
                    key={h}
                    className={`calendar-slot ${horarioOcupado(h) ? 'occupied' : ''} ${horarioPassado(h) ? 'past' : ''}`}
                  >
                    <span className="calendar-time">{h}</span>
                    <button
                      type="button"
                      className="calendar-event"
                      disabled={horarioIndisponivel(h)}
                      onClick={() => !horarioIndisponivel(h) && selecionarHorario(h)}
                    >
                      {horarioIndisponivel(h) ? 'Indisponível' : 'Disponível'}
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
            <div className="row"><span>Duração</span><span>{dados.servico?.duracao} min</span></div>
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
            <input name="telefone" value={dados.telefone || ''} onChange={atualizarDados} required placeholder="(11) 99999-9999" />
          </div>
          <div className="form-group">
            <label>E-mail</label>
            <input name="email" type="email" value={dados.email || ''} onChange={atualizarDados} />
          </div>
          <div className="form-group">
            <label>Observações</label>
            <textarea name="observacoes" value={dados.observacoes || ''} onChange={atualizarDados} placeholder="Alguma observação?" />
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
