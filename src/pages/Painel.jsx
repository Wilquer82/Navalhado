import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API || 'http://localhost:5000/api';
const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export default function Painel() {
  const [aba, setAba] = useState('agendamentos');
  const [agendamentos, setAgendamentos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [token] = useState(localStorage.getItem('token'));
  const [linkCopiado, setLinkCopiado] = useState(false);
  const nav = useNavigate();

  // Formulários
  const [formProf, setFormProf] = useState({ nome: '', especialidade: '' });
  const [formServ, setFormServ] = useState({ nome: '', duracao: '', preco: '' });
  const [formBloq, setFormBloq] = useState({
    profissional: '', tipo: 'dia-semana', data: '',
    diaSemana: '0', horarioInicio: '', horarioFim: '', motivo: ''
  });
  const [editandoProf, setEditandoProf] = useState(null);
  const [editandoServ, setEditandoServ] = useState(null);
  const [msg, setMsg] = useState('');

  const linkSite = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (aba === 'agendamentos') carregarAgendamentos();
    if (aba === 'profissionais') carregarProfissionais();
    if (aba === 'servicos') carregarServicos();
    if (aba === 'bloqueios') { carregarProfissionais(); carregarBloqueios(); }
  }, [aba, dataFiltro]);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const carregarAgendamentos = async () => {
    let url = `${API}/agendamentos`;
    if (dataFiltro) url += `?data=${dataFiltro}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (res.status === 401) { localStorage.removeItem('token'); nav('/login'); return; }
    setAgendamentos(await res.json());
  };

  const carregarProfissionais = async () => {
    const res = await fetch(`${API}/profissionais`, { headers: { Authorization: `Bearer ${token}` } });
    setProfissionais(await res.json());
  };

  const carregarServicos = async () => {
    const res = await fetch(`${API}/servicos`, { headers: { Authorization: `Bearer ${token}` } });
    setServicos(await res.json());
  };

  const carregarBloqueios = async () => {
    const res = await fetch(`${API}/bloqueios`, { headers: { Authorization: `Bearer ${token}` } });
    setBloqueios(await res.json());
  };

  // ===== COMPARTILHAR LINK =====
  const compartilharLink = async () => {
    const texto = `💈 Navalhado Cortes\nAgende seu horário online!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Navalhado Cortes', text: texto, url: linkSite });
      } catch (e) { console.log('Compartilhamento cancelado'); }
    } else {
      copiarLink();
    }
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkSite);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch (e) { alert('Link: ' + linkSite); }
  };

  // ===== WHATSAPP =====
  const enviarWhatsApp = agendamento => {
    const dataFormatada = new Date(agendamento.data + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
    const mensagem = `Olá ${agendamento.nomeCliente}! 👋\n\n` +
      `Confirmamos seu agendamento no Navalhado Cortes:\n\n` +
      `💈 Serviço: ${agendamento.servico}\n` +
      `👤 Profissional: ${agendamento.profissional}\n` +
      `📅 Data: ${dataFormatada}\n` +
      `⏰ Horário: ${agendamento.horario}\n` +
      `💰 Valor: R$ ${agendamento.preco}\n\n` +
      `Aguardamos você! 💈✨`;
    const telefone = agendamento.telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  const cancelarAgendamento = async id => {
    if (!confirm('Cancelar este agendamento?')) return;
    await fetch(`${API}/agendamentos/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    carregarAgendamentos();
  };

  // ===== PROFISSIONAIS =====
  const salvarProfissional = async e => {
    e.preventDefault();
    setMsg('');
    if (editandoProf) {
      await fetch(`${API}/profissionais/${editandoProf._id}`, {
        method: 'PUT', headers, body: JSON.stringify(formProf)
      });
      setMsg('✅ Profissional atualizado!');
    } else {
      await fetch(`${API}/profissionais`, {
        method: 'POST', headers, body: JSON.stringify(formProf)
      });
      setMsg('✅ Profissional adicionado!');
    }
    setFormProf({ nome: '', especialidade: '' });
    setEditandoProf(null);
    carregarProfissionais();
    setTimeout(() => setMsg(''), 3000);
  };

  const editarProfissional = p => {
    setEditandoProf(p);
    setFormProf({ nome: p.nome, especialidade: p.especialidade });
  };

  const excluirProfissional = async p => {
    if (!confirm(`Excluir ${p.nome}?`)) return;
    const res = await fetch(`${API}/profissionais/${p._id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    const dado = await res.json();
    if (!res.ok) alert(dado.erro);
    else carregarProfissionais();
  };

  // ===== SERVIÇOS =====
  const salvarServico = async e => {
    e.preventDefault();
    setMsg('');
    const dados = {
      ...formServ,
      duracao: Number(formServ.duracao),
      preco: Number(formServ.preco)
    };
    if (editandoServ) {
      await fetch(`${API}/servicos/${editandoServ._id}`, {
        method: 'PUT', headers, body: JSON.stringify(dados)
      });
      setMsg('✅ Serviço atualizado!');
    } else {
      await fetch(`${API}/servicos`, {
        method: 'POST', headers, body: JSON.stringify(dados)
      });
      setMsg('✅ Serviço adicionado!');
    }
    setFormServ({ nome: '', duracao: '', preco: '' });
    setEditandoServ(null);
    carregarServicos();
    setTimeout(() => setMsg(''), 3000);
  };

  const editarServico = s => {
    setEditandoServ(s);
    setFormServ({ nome: s.nome, duracao: s.duracao, preco: s.preco });
  };

  const excluirServico = async s => {
    if (!confirm(`Excluir ${s.nome}?`)) return;
    await fetch(`${API}/servicos/${s._id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    carregarServicos();
  };

  // ===== BLOQUEIOS =====
  const adicionarBloqueio = async e => {
    e.preventDefault();
    setMsg('');
    if (!formBloq.profissional) { alert('Selecione um profissional'); return; }

    const dados = {
      profissional: formBloq.profissional,
      tipo: formBloq.tipo,
      motivo: formBloq.motivo
    };

    if (formBloq.tipo === 'data') {
      if (!formBloq.data) { alert('Selecione uma data'); return; }
      dados.data = formBloq.data;
    } else {
      dados.diaSemana = Number(formBloq.diaSemana);
    }

    if (formBloq.horarioInicio && formBloq.horarioFim) {
      dados.horarioInicio = formBloq.horarioInicio;
      dados.horarioFim = formBloq.horarioFim;
    }

    await fetch(`${API}/bloqueios`, {
      method: 'POST', headers, body: JSON.stringify(dados)
    });

    setMsg('✅ Bloqueio adicionado!');
    setFormBloq({
      profissional: '', tipo: 'dia-semana', data: '',
      diaSemana: '0', horarioInicio: '', horarioFim: '', motivo: ''
    });
    carregarBloqueios();
    setTimeout(() => setMsg(''), 3000);
  };

  const excluirBloqueio = async b => {
    if (!confirm('Remover este bloqueio?')) return;
    await fetch(`${API}/bloqueios/${b._id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    carregarBloqueios();
  };

  const sair = () => {
    localStorage.removeItem('token');
    nav('/login');
  };

  const agruparPorProfissional = () => {
    const grupos = {};
    agendamentos.forEach(a => {
      if (!grupos[a.profissional]) grupos[a.profissional] = [];
      grupos[a.profissional].push(a);
    });
    return grupos;
  };

  const grupos = agruparPorProfissional();

  const estiloAba = (ativa) => ({
    flex: 1, padding: '12px 6px',
    background: ativa ? '#2d2d2d' : '#f5f5f5',
    color: ativa ? '#fff' : '#666',
    border: 'none', fontSize: '12px',
    fontWeight: ativa ? '600' : 'normal',
    cursor: 'pointer'
  });

  const inputStyle = {
    width: '100%', padding: 12, marginBottom: 8,
    borderRadius: 8, border: '1px solid #ddd', fontSize: 14
  };

  return (
    <main>
      <div className="admin-header">
        <div><h2 style={{ fontSize: 18 }}>Painel Admin</h2></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={compartilharLink} className="btn-compartilhar">
            📤 Compartilhar
          </button>
          <button onClick={sair}>Sair</button>
        </div>
      </div>

      {/* Link do site */}
      <div className="link-site">
        <span>🔗 {linkSite}</span>
        <button onClick={copiarLink}>
          {linkCopiado ? '✓ Copiado!' : 'Copiar'}
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex' }}>
        <button style={estiloAba(aba === 'agendamentos')} onClick={() => setAba('agendamentos')}>📅 Agend.</button>
        <button style={estiloAba(aba === 'profissionais')} onClick={() => setAba('profissionais')}>👤 Equipe</button>
        <button style={estiloAba(aba === 'servicos')} onClick={() => setAba('servicos')}>💇 Serviços</button>
        <button style={estiloAba(aba === 'bloqueios')} onClick={() => setAba('bloqueios')}>🚫 Bloqueios</button>
      </div>

      {msg && <div style={{
        padding: '12px', margin: '12px', background: '#e8f5e9',
        color: '#2e7d32', borderRadius: '8px', textAlign: 'center'
      }}>{msg}</div>}

      {/* ABA AGENDAMENTOS */}
      {aba === 'agendamentos' && (
        <>
          <div style={{ padding: '12px' }}>
            <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)}
              style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 15 }} />
            <p style={{ fontSize: 12, color: '#888', marginTop: 8, textAlign: 'center' }}>
              {new Date(dataFiltro + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long'
              })}
            </p>
          </div>
          {agendamentos.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>Nenhum agendamento.</p>
          ) : (
            Object.keys(grupos).map(prof => (
              <div key={prof}>
                <div className="section-title">{prof}</div>
                {grupos[prof].map(a => (
                  <div key={a._id} className="appointment-item">
                    <div className="top">
                      <span className="prof">{a.servico}</span>
                      <span className="time">{a.horario}</span>
                    </div>
                    <div className="cliente">👤 {a.nomeCliente}</div>
                    <div className="cliente">📞 {a.telefone}</div>
                    {a.observacoes && <div className="serv">📝 {a.observacoes}</div>}
                    <div className="actions">
                      <button className="whats-btn" onClick={() => enviarWhatsApp(a)}>💬 WhatsApp</button>
                      <button className="cancel-btn" onClick={() => cancelarAgendamento(a._id)}>Cancelar</button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </>
      )}

      {/* ABA PROFISSIONAIS */}
      {aba === 'profissionais' && (
        <div style={{ padding: '12px' }}>
          <form onSubmit={salvarProfissional} style={{
            background: '#fafafa', padding: '16px', borderRadius: '12px', marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>
              {editandoProf ? '✏️ Editar' : '➕ Adicionar'} Profissional
            </h3>
            <input placeholder="Nome completo" value={formProf.nome}
              onChange={e => setFormProf({ ...formProf, nome: e.target.value })}
              required style={inputStyle} />
            <input placeholder="Especialidade" value={formProf.especialidade}
              onChange={e => setFormProf({ ...formProf, especialidade: e.target.value })}
              required style={inputStyle} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={{
                flex: 1, padding: 12, background: '#2d2d2d', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer'
              }}>{editandoProf ? 'Atualizar' : 'Adicionar'}</button>
              {editandoProf && (
                <button type="button" onClick={() => {
                  setEditandoProf(null); setFormProf({ nome: '', especialidade: '' });
                }} style={{ padding: 12, background: '#eee', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
          <div className="section-title" style={{ padding: '0 0 8px 0' }}>
            Profissionais ({profissionais.length})
          </div>
          {profissionais.map(p => (
            <div key={p._id} className="appointment-item">
              <div className="top"><span className="prof">{p.nome}</span></div>
              <div className="cliente">🎯 {p.especialidade}</div>
              <div className="actions">
                <button onClick={() => editarProfissional(p)} style={{
                  background: '#e3f2fd', color: '#1565c0', border: 'none',
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer'
                }}>✏️ Editar</button>
                <button className="cancel-btn" onClick={() => excluirProfissional(p)}>🗑️ Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA SERVIÇOS */}
      {aba === 'servicos' && (
        <div style={{ padding: '12px' }}>
          <form onSubmit={salvarServico} style={{
            background: '#fafafa', padding: '16px', borderRadius: '12px', marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>
              {editandoServ ? '✏️ Editar' : '➕ Adicionar'} Serviço
            </h3>
            <input placeholder="Nome do serviço" value={formServ.nome}
              onChange={e => setFormServ({ ...formServ, nome: e.target.value })}
              required style={inputStyle} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" placeholder="Duração (min)" value={formServ.duracao}
                onChange={e => setFormServ({ ...formServ, duracao: e.target.value })}
                required style={{ ...inputStyle, flex: 1 }} />
              <input type="number" placeholder="Preço (R$)" value={formServ.preco}
                onChange={e => setFormServ({ ...formServ, preco: e.target.value })}
                required style={{ ...inputStyle, flex: 1 }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={{
                flex: 1, padding: 12, background: '#2d2d2d', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer'
              }}>{editandoServ ? 'Atualizar' : 'Adicionar'}</button>
              {editandoServ && (
                <button type="button" onClick={() => {
                  setEditandoServ(null); setFormServ({ nome: '', duracao: '', preco: '' });
                }} style={{ padding: 12, background: '#eee', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
          <div className="section-title" style={{ padding: '0 0 8px 0' }}>
            Serviços ({servicos.length})
          </div>
          {servicos.map(s => (
            <div key={s._id} className="appointment-item">
              <div className="top">
                <span className="prof">{s.nome}</span>
                <span className="time">R$ {s.preco}</span>
              </div>
              <div className="cliente">⏱️ {s.duracao} minutos</div>
              <div className="actions">
                <button onClick={() => editarServico(s)} style={{
                  background: '#e3f2fd', color: '#1565c0', border: 'none',
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer'
                }}>✏️ Editar</button>
                <button className="cancel-btn" onClick={() => excluirServico(s)}>🗑️ Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA BLOQUEIOS */}
      {aba === 'bloqueios' && (
        <div style={{ padding: '12px' }}>
          <form onSubmit={adicionarBloqueio} style={{
            background: '#fafafa', padding: '16px', borderRadius: '12px', marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>🚫 Novo Bloqueio</h3>
            
            <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Profissional</label>
            <select value={formBloq.profissional}
              onChange={e => setFormBloq({ ...formBloq, profissional: e.target.value })}
              style={inputStyle}>
              <option value="">Selecione...</option>
              {profissionais.map(p => <option key={p._id} value={p.nome}>{p.nome}</option>)}
            </select>

            <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Tipo de bloqueio</label>
            <select value={formBloq.tipo}
              onChange={e => setFormBloq({ ...formBloq, tipo: e.target.value })}
              style={inputStyle}>
              <option value="dia-semana">🔁 Recorrente (dia da semana)</option>
              <option value="data">📅 Data específica</option>
            </select>

            {formBloq.tipo === 'data' ? (
              <>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Data</label>
                <input type="date" value={formBloq.data}
                  onChange={e => setFormBloq({ ...formBloq, data: e.target.value })}
                  style={inputStyle} />
              </>
            ) : (
              <>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Dia da semana</label>
                <select value={formBloq.diaSemana}
                  onChange={e => setFormBloq({ ...formBloq, diaSemana: e.target.value })}
                  style={inputStyle}>
                  {DIAS_SEMANA.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </>
            )}

            <p style={{ fontSize: 12, color: '#888', margin: '4px 0 8px' }}>
              💡 Deixe os horários vazios para bloquear o dia todo
            </p>
            
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Horário início</label>
                <input type="time" value={formBloq.horarioInicio}
                  onChange={e => setFormBloq({ ...formBloq, horarioInicio: e.target.value })}
                  style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Horário fim</label>
                <input type="time" value={formBloq.horarioFim}
                  onChange={e => setFormBloq({ ...formBloq, horarioFim: e.target.value })}
                  style={inputStyle} />
              </div>
            </div>

            <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Motivo (opcional)</label>
            <input placeholder="Ex: Férias, compromisso pessoal..." value={formBloq.motivo}
              onChange={e => setFormBloq({ ...formBloq, motivo: e.target.value })}
              style={inputStyle} />

            <button type="submit" style={{
              width: '100%', padding: 12, background: '#c62828', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer'
            }}>🚫 Adicionar Bloqueio</button>
          </form>

          <div className="section-title" style={{ padding: '0 0 8px 0' }}>
            Bloqueios ativos ({bloqueios.length})
          </div>

          {bloqueios.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>Nenhum bloqueio cadastrado.</p>
          ) : (
            bloqueios.map(b => (
              <div key={b._id} className="appointment-item" style={{ borderLeftColor: '#c62828' }}>
                <div className="top">
                  <span className="prof">🚫 {b.profissional}</span>
                </div>
                <div className="cliente">
                  {b.tipo === 'data' 
                    ? `📅 ${new Date(b.data + 'T00:00:00').toLocaleDateString('pt-BR')}`
                    : `🔁 Todos os ${DIAS_SEMANA[b.diaSemana]}s`
                  }
                </div>
                <div className="cliente">
                  {b.horarioInicio && b.horarioFim 
                    ? `⏱️ ${b.horarioInicio} às ${b.horarioFim}`
                    : '⏱️ Dia todo bloqueado'
                  }
                </div>
                {b.motivo && <div className="serv">📝 {b.motivo}</div>}
                <div className="actions">
                  <button className="cancel-btn" onClick={() => excluirBloqueio(b)}>🗑️ Remover</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}
