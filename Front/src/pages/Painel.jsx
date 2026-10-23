import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API || 'https://navalhadoback.onrender.com/api';
const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const dataLocalISO = data => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

export default function Painel() {
  const [aba, setAba] = useState('agendamentos');
  const [agendamentos, setAgendamentos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [dataFiltro, setDataFiltro] = useState(dataLocalISO(new Date()));
  const [token] = useState(localStorage.getItem('token'));
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [mesBalanco, setMesBalanco] = useState(() => {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
  });
  const [balanco, setBalanco] = useState(null);
  const [carregandoBalanco, setCarregandoBalanco] = useState(false);
  const nomeProfissional = localStorage.getItem('profissionalNome') || '';
  const nav = useNavigate();

  // Formulários
  const [formProf, setFormProf] = useState({ nome: '', especialidade: '', telefone: '', chavePix: '' });
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
    if (aba === 'balanco') carregarBalanco();
  }, [aba, dataFiltro, mesBalanco]);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers }
    });
    const texto = await res.text();
    let dado = null;

    if (texto) {
      try { dado = JSON.parse(texto); } catch (e) { /* resposta sem JSON */ }
    }

    if (res.status === 401) {
      localStorage.removeItem('token');
      nav('/login', { replace: true });
      throw new Error('Sua sessão expirou. Faça login novamente.');
    }
    if (!res.ok) throw new Error(dado?.erro || `Erro na operação (${res.status}).`);
    return dado;
  };

  const carregarAgendamentos = async () => {
    try {
      let url = `${API}/agendamentos`;
      if (dataFiltro) url += `?data=${encodeURIComponent(dataFiltro)}`;
      const dados = await apiFetch(url, { headers: { Authorization: `Bearer ${token}` } });
      setAgendamentos(Array.isArray(dados) ? dados : []);
    } catch (e) {
      setAgendamentos([]);
      if (e.message) setMsg(e.message);
    }
  };

  const carregarProfissionais = async () => {
    try {
      const dados = await apiFetch(`${API}/profissionais`);
      setProfissionais(Array.isArray(dados) ? dados : []);
    } catch (e) {
      setProfissionais([]);
      if (e.message) setMsg(e.message);
    }
  };

  const carregarServicos = async () => {
    try {
      const dados = await apiFetch(`${API}/servicos`);
      setServicos(Array.isArray(dados) ? dados : []);
    } catch (e) {
      setServicos([]);
      if (e.message) setMsg(e.message);
    }
  };

  const carregarBloqueios = async () => {
    try {
      const dados = await apiFetch(`${API}/bloqueios`);
      setBloqueios(Array.isArray(dados) ? dados : []);
    } catch (e) {
      setBloqueios([]);
      if (e.message) setMsg(e.message);
    }
  };

  const carregarBalanco = async () => {
    setCarregandoBalanco(true);
    setMsg('');
    try {
      const dados = await apiFetch(`${API}/profissional/balanco?mes=${encodeURIComponent(mesBalanco)}`);
      setBalanco(dados);
    } catch (e) {
      setBalanco(null);
      if (e.message) setMsg(e.message);
    } finally {
      setCarregandoBalanco(false);
    }
  };

  const formatarMoeda = valor =>
    Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const labelStatus = status => {
    const mapa = {
      pendente: 'Pendente',
      confirmado: 'Confirmado',
      concluido: 'Concluído',
      cancelado: 'Cancelado'
    };
    return mapa[status] || status;
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
    const valor = agendamento.pagamento?.valorFinal ?? agendamento.servico?.preco ?? agendamento.preco;
    const mensagem = `Olá ${agendamento.nomeCliente}! 👋\n\n` +
      `Confirmamos seu agendamento no Navalhado Cortes:\n\n` +
      `💈 Serviço: ${agendamento.servico}\n` +
      `👤 Profissional: ${agendamento.profissional}\n` +
      `📅 Data: ${dataFormatada}\n` +
      `⏰ Horário: ${agendamento.horario}\n` +
      `💰 Valor: R$ ${valor}\n\n` +
      `Aguardamos você! 💈✨`;
    const telefone = agendamento.telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  const cancelarAgendamento = async id => {
    if (!confirm('Cancelar este agendamento?')) return;
    try {
      await apiFetch(`${API}/agendamentos/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      carregarAgendamentos();
    } catch (e) { alert(e.message); }
  };

  const confirmarSinalPix = async agendamento => {
    if (!confirm(`Confirma que recebeu o sinal PIX de R$ ${agendamento.pagamento.valorSinal}?`)) return;
    try {
      await apiFetch(`${API}/agendamentos/${agendamento._id}/sinal-pix`, { method: 'PUT' });
      carregarAgendamentos();
    } catch (e) { alert(e.message); }
  };

  const excluirSinalPendente = async agendamento => {
    if (!confirm(`Excluir o agendamento de ${agendamento.nomeCliente} porque o sinal PIX não foi recebido?`)) return;
    try {
      await apiFetch(`${API}/agendamentos/${agendamento._id}/sinal-pendente`, { method: 'DELETE' });
      carregarAgendamentos();
    } catch (e) { alert(e.message); }
  };

  // ===== PROFISSIONAIS =====
  const salvarProfissional = async e => {
    e.preventDefault();
    setMsg('');
    try {
      if (editandoProf) {
        await apiFetch(`${API}/profissionais/${editandoProf._id}`, {
          method: 'PUT', body: JSON.stringify(formProf)
        });
        setMsg('✅ Profissional atualizado!');
      } else {
        await apiFetch(`${API}/profissionais`, {
          method: 'POST', body: JSON.stringify(formProf)
        });
        setMsg('✅ Profissional adicionado!');
      }
    } catch (e) {
      alert(e.message);
      return;
    }
    setFormProf({ nome: '', especialidade: '', telefone: '', chavePix: '' });
    setEditandoProf(null);
    carregarProfissionais();
    setTimeout(() => setMsg(''), 3000);
  };

  const editarProfissional = p => {
    setEditandoProf(p);
    setFormProf({
      nome: p.nome,
      especialidade: p.especialidade,
      telefone: p.telefone || '',
      chavePix: p.chavePix || ''
    });
  };

  const excluirProfissional = async p => {
    if (!confirm(`Excluir ${p.nome}?`)) return;
    try {
      await apiFetch(`${API}/profissionais/${p._id}`, { method: 'DELETE' });
      carregarProfissionais();
    } catch (e) { alert(e.message); }
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
    try {
      if (editandoServ) {
        await apiFetch(`${API}/servicos/${editandoServ._id}`, {
          method: 'PUT', body: JSON.stringify(dados)
        });
        setMsg('✅ Serviço atualizado!');
      } else {
        await apiFetch(`${API}/servicos`, {
          method: 'POST', body: JSON.stringify(dados)
        });
        setMsg('✅ Serviço adicionado!');
      }
    } catch (e) {
      alert(e.message);
      return;
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
    try {
      await apiFetch(`${API}/servicos/${s._id}`, { method: 'DELETE' });
      carregarServicos();
    } catch (e) { alert(e.message); }
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

    try {
      await apiFetch(`${API}/bloqueios`, {
        method: 'POST', body: JSON.stringify(dados)
      });
    } catch (e) {
      alert(e.message);
      return;
    }

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
    try {
      await apiFetch(`${API}/bloqueios/${b._id}`, { method: 'DELETE' });
      carregarBloqueios();
    } catch (e) { alert(e.message); }
  };

  const sair = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('profissionalNome');
    localStorage.removeItem('profissionalId');
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
        <div>
          <h2 style={{ fontSize: 18 }}>Painel</h2>
          {nomeProfissional && (
            <p style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>{nomeProfissional}</p>
          )}
        </div>
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
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        <button style={estiloAba(aba === 'agendamentos')} onClick={() => setAba('agendamentos')}>📅 Agend.</button>
        <button style={estiloAba(aba === 'balanco')} onClick={() => setAba('balanco')}>💰 Balanço</button>
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
                    {a.pagamento?.tipo === 'sinal_pix' ? (
                      <>
                        <div className="cliente">
                          💠 Sinal PIX R$ {a.pagamento.valorSinal} · {a.pagamento.statusSinal === 'recebido' ? 'Recebido' : 'Pendente'} · Desconto: R$ {a.pagamento.desconto} · Saldo: R$ {a.pagamento.valorRestante}
                        </div>
                        {a.pagamento.statusSinal !== 'recebido' && (
                          <div className="actions">
                            <button className="whats-btn" onClick={() => confirmarSinalPix(a)}>Confirmar PIX recebido</button>
                            <button className="cancel-btn" onClick={() => excluirSinalPendente(a)}>Excluir sem pagamento</button>
                          </div>
                        )}
                      </>
                    ) : a.pagamento?.valorFinal !== undefined && (
                      <div className="cliente">💰 Valor integral: R$ {a.pagamento.valorFinal}</div>
                    )}
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
            <input type="tel" placeholder="Telefone celular" value={formProf.telefone}
              onChange={e => setFormProf({ ...formProf, telefone: e.target.value })}
              style={inputStyle} />
            <input placeholder="Chave PIX" value={formProf.chavePix}
              onChange={e => setFormProf({ ...formProf, chavePix: e.target.value })}
              style={inputStyle} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={{
                flex: 1, padding: 12, background: '#2d2d2d', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer'
              }}>{editandoProf ? 'Atualizar' : 'Adicionar'}</button>
              {editandoProf && (
                <button type="button" onClick={() => {
                  setEditandoProf(null);
                  setFormProf({ nome: '', especialidade: '', telefone: '', chavePix: '' });
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
              {p.telefone && <div className="cliente">📱 {p.telefone}</div>}
              {p.chavePix && <div className="cliente">💠 PIX: {p.chavePix}</div>}
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

      {/* ABA SERVIÇOS - ver arquivo completo no repositório; seção mantida */}
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
                required style={{ ...inputStyle, flex: 1 }} step="0.01" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" style={{
                flex: 1, padding: 12, background: '#2d2d2d', color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer'
              }}>{editandoServ ? 'Atualizar' : 'Adicionar'}</button>
              {editandoServ && (
                <button type="button" onClick={() => {
                  setEditandoServ(null);
                  setFormServ({ nome: '', duracao: '', preco: '' });
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
              <div className="cliente">⏱️ {s.duracao || s.duracaoMinutos} min</div>
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
            <select value={formBloq.profissional}
              onChange={e => setFormBloq({ ...formBloq, profissional: e.target.value })}
              required style={inputStyle}>
              <option value="">Selecione o profissional</option>
              {profissionais.map(p => (
                <option key={p._id} value={p._id}>{p.nome}</option>
              ))}
            </select>
            <select value={formBloq.tipo}
              onChange={e => setFormBloq({ ...formBloq, tipo: e.target.value })}
              style={inputStyle}>
              <option value="dia-semana">Dia da semana (recorrente)</option>
              <option value="data">Data específica</option>
            </select>
            {formBloq.tipo === 'data' ? (
              <input type="date" value={formBloq.data}
                onChange={e => setFormBloq({ ...formBloq, data: e.target.value })}
                style={inputStyle} />
            ) : (
              <select value={formBloq.diaSemana}
                onChange={e => setFormBloq({ ...formBloq, diaSemana: e.target.value })}
                style={inputStyle}>
                {DIAS_SEMANA.map((d, i) => (
                  <option key={i} value={String(i)}>{d}</option>
                ))}
              </select>
            )}
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

      {/* ABA BALANÇO MENSAL */}
      {aba === 'balanco' && (
        <div style={{ padding: '12px' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>
              Mês de referência
            </label>
            <input
              type="month"
              value={mesBalanco}
              onChange={e => setMesBalanco(e.target.value)}
              style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', fontSize: 15 }}
            />
          </div>

          {carregandoBalanco && (
            <p style={{ textAlign: 'center', padding: 24, color: '#888' }}>Carregando balanço...</p>
          )}

          {!carregandoBalanco && balanco && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 16
              }}>
                <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Total previsto</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                    {formatarMoeda(balanco.resumo.totalPrevisto)}
                  </div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                    {balanco.resumo.quantidade} agendamento{balanco.resumo.quantidade !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ background: '#e8f5e9', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, color: '#2e7d32' }}>Confirmado / concluído</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: '#1b5e20' }}>
                    {formatarMoeda(balanco.resumo.totalConfirmado)}
                  </div>
                  <div style={{ fontSize: 11, color: '#558b2f', marginTop: 4 }}>
                    {balanco.resumo.quantidadeConfirmada} de {balanco.resumo.quantidade}
                  </div>
                </div>
                <div style={{ background: '#e3f2fd', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, color: '#1565c0' }}>Ticket médio</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4, color: '#0d47a1' }}>
                    {formatarMoeda(balanco.resumo.ticketMedio)}
                  </div>
                </div>
                <div style={{ background: '#fff8e1', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, color: '#f57f17' }}>Sinal PIX</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>
                    Recebido: <strong>{formatarMoeda(balanco.resumo.totalSinalRecebido)}</strong>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>
                    Pendente: <strong>{formatarMoeda(balanco.resumo.totalSinalPendente)}</strong>
                  </div>
                </div>
              </div>

              {balanco.porServico?.length > 0 && (
                <>
                  <div className="section-title" style={{ padding: '0 0 8px 0' }}>Por serviço</div>
                  {balanco.porServico.map(s => (
                    <div key={s.servico} className="appointment-item" style={{ borderLeftColor: '#1565c0' }}>
                      <div className="top">
                        <span className="prof">{s.servico}</span>
                        <span className="time">{formatarMoeda(s.total)}</span>
                      </div>
                      <div className="cliente">{s.quantidade} atendimento{s.quantidade !== 1 ? 's' : ''}</div>
                    </div>
                  ))}
                </>
              )}

              <div className="section-title" style={{ padding: '16px 0 8px 0' }}>
                Detalhamento ({balanco.agendamentos?.length || 0})
              </div>
              {(balanco.agendamentos || []).length === 0 ? (
                <p style={{ textAlign: 'center', padding: 32, color: '#999' }}>
                  Nenhum agendamento neste mês.
                </p>
              ) : (
                balanco.agendamentos.map(a => (
                  <div key={a._id} className="appointment-item">
                    <div className="top">
                      <span className="prof">{a.servico}</span>
                      <span className="time">{formatarMoeda(a.valor)}</span>
                    </div>
                    <div className="cliente">
                      📅 {new Date(a.data + 'T12:00:00').toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', weekday: 'short'
                      })} · {a.horario}
                    </div>
                    <div className="cliente">👤 {a.nomeCliente}</div>
                    <div className="cliente" style={{ textTransform: 'capitalize' }}>
                      Status: {labelStatus(a.status)}
                      {a.pagamento?.tipo === 'sinal_pix' && (
                        <> · Sinal {a.pagamento.statusSinal === 'recebido' ? 'recebido' : 'pendente'}</>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {!carregandoBalanco && !balanco && (
            <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              Não foi possível carregar o balanço.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
