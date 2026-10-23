import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AbaProdutos, AbaVendas } from './ProdutosVendas';

const API = import.meta.env.VITE_API || 'https://navalhadoback.onrender.com/api';
const dataLocalISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export default function Painel() {
  const [aba, setAba] = useState('agendamentos');
  const [agendamentos, setAgendamentos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [dataFiltro, setDataFiltro] = useState(dataLocalISO(new Date()));
  const [token] = useState(localStorage.getItem('token'));
  const [mesBalanco, setMesBalanco] = useState(() => {
    const a = new Date();
    return `${a.getFullYear()}-${String(a.getMonth()+1).padStart(2,'0')}`;
  });
  const [balanco, setBalanco] = useState(null);
  const [carregandoBalanco, setCarregandoBalanco] = useState(false);
  const [msg, setMsg] = useState('');
  const [formProf, setFormProf] = useState({ nome: '', especialidade: '', telefone: '', chavePix: '' });
  const [formServ, setFormServ] = useState({ nome: '', duracao: '', preco: '' });
  const [editandoProf, setEditandoProf] = useState(null);
  const [editandoServ, setEditandoServ] = useState(null);
  const nomeProfissional = localStorage.getItem('profissionalNome') || '';
  const nav = useNavigate();

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
    const texto = await res.text();
    let dado = null;
    if (texto) { try { dado = JSON.parse(texto); } catch (e) {} }
    if (res.status === 401) {
      localStorage.removeItem('token');
      nav('/login', { replace: true });
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (!res.ok) throw new Error(dado?.erro || `Erro (${res.status})`);
    return dado;
  };

  useEffect(() => {
    if (aba === 'agendamentos') {
      (async () => {
        try {
          let url = `${API}/agendamentos`;
          if (dataFiltro) url += `?data=${encodeURIComponent(dataFiltro)}`;
          const dados = await apiFetch(url);
          setAgendamentos(Array.isArray(dados) ? dados : []);
        } catch (e) { setAgendamentos([]); if (e.message) setMsg(e.message); }
      })();
    }
    if (aba === 'profissionais') {
      (async () => {
        try { const d = await apiFetch(`${API}/profissionais`); setProfissionais(Array.isArray(d) ? d : []); }
        catch (e) { setProfissionais([]); }
      })();
    }
    if (aba === 'servicos') {
      (async () => {
        try { const d = await apiFetch(`${API}/servicos`); setServicos(Array.isArray(d) ? d : []); }
        catch (e) { setServicos([]); }
      })();
    }
    if (aba === 'bloqueios') {
      (async () => {
        try {
          const [p, b] = await Promise.all([apiFetch(`${API}/profissionais`), apiFetch(`${API}/bloqueios`)]);
          setProfissionais(Array.isArray(p) ? p : []);
          setBloqueios(Array.isArray(b) ? b : []);
        } catch (e) { setBloqueios([]); }
      })();
    }
    if (aba === 'balanco') {
      (async () => {
        setCarregandoBalanco(true);
        try {
          const dados = await apiFetch(`${API}/profissional/balanco?mes=${encodeURIComponent(mesBalanco)}`);
          setBalanco(dados);
        } catch (e) { setBalanco(null); if (e.message) setMsg(e.message); }
        finally { setCarregandoBalanco(false); }
      })();
    }
  }, [aba, dataFiltro, mesBalanco]);

  const formatarMoeda = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const estiloAba = ativa => ({
    flex: 1, padding: '12px 6px', background: ativa ? '#2d2d2d' : '#f5f5f5',
    color: ativa ? '#fff' : '#666', border: 'none', fontSize: 12,
    fontWeight: ativa ? '600' : 'normal', cursor: 'pointer'
  });

  const sair = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('profissionalNome');
    localStorage.removeItem('profissionalId');
    nav('/login');
  };

  return (
    <main>
      <div className="admin-header">
        <div>
          <h2 style={{ fontSize: 18 }}>Painel</h2>
          {nomeProfissional && <p style={{ fontSize: 12, opacity: 0.85 }}>{nomeProfissional}</p>}
        </div>
        <button onClick={sair}>Sair</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        <button style={estiloAba(aba === 'agendamentos')} onClick={() => setAba('agendamentos')}>Agend.</button>
        <button style={estiloAba(aba === 'vendas')} onClick={() => setAba('vendas')}>Vendas</button>
        <button style={estiloAba(aba === 'produtos')} onClick={() => setAba('produtos')}>Produtos</button>
        <button style={estiloAba(aba === 'balanco')} onClick={() => setAba('balanco')}>Balanço</button>
        <button style={estiloAba(aba === 'profissionais')} onClick={() => setAba('profissionais')}>Equipe</button>
        <button style={estiloAba(aba === 'servicos')} onClick={() => setAba('servicos')}>Serviços</button>
        <button style={estiloAba(aba === 'bloqueios')} onClick={() => setAba('bloqueios')}>Bloqueios</button>
      </div>

      {msg && <div style={{ padding: 12, margin: 12, background: '#e8f5e9', color: '#2e7d32', borderRadius: 8, textAlign: 'center' }}>{msg}</div>}

      {aba === 'agendamentos' && (
        <div style={{ padding: 12 }}>
          <input type="date" value={dataFiltro} onChange={e => setDataFiltro(e.target.value)}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', marginBottom: 12 }} />
          {agendamentos.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: 40 }}>Nenhum agendamento.</p>
          ) : agendamentos.map(a => (
            <div key={a._id} className="appointment-item">
              <div className="top">
                <span className="prof">{a.servico}</span>
                <span className="time">{a.horario}</span>
              </div>
              <div className="cliente">{a.nomeCliente} · {a.telefone}</div>
            </div>
          ))}
        </div>
      )}

      {aba === 'produtos' && (
        <AbaProdutos apiFetch={apiFetch} API={API} formatarMoeda={formatarMoeda} msg={msg} setMsg={setMsg} />
      )}

      {aba === 'vendas' && (
        <AbaVendas apiFetch={apiFetch} API={API} formatarMoeda={formatarMoeda} msg={msg} setMsg={setMsg} dataLocalISO={dataLocalISO} />
      )}

      {aba === 'balanco' && (
        <div style={{ padding: 12 }}>
          <input type="month" value={mesBalanco} onChange={e => setMesBalanco(e.target.value)}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd', marginBottom: 16 }} />
          {carregandoBalanco && <p style={{ textAlign: 'center', color: '#888' }}>Carregando...</p>}
          {!carregandoBalanco && balanco && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: '#e8f5e9', borderRadius: 12, padding: 14, gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 12, color: '#2e7d32' }}>Total (serviços + vendas)</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#1b5e20' }}>
                    {formatarMoeda(balanco.resumo.totalGeral ?? ((balanco.resumo.totalPrevisto || 0) + (balanco.resumo.totalVendas || 0)))}
                  </div>
                </div>
                <div style={{ background: '#f5f5f5', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, color: '#666' }}>Serviços</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {formatarMoeda(balanco.resumo.totalPrevistoServicos ?? balanco.resumo.totalPrevisto)}
                  </div>
                </div>
                <div style={{ background: '#e3f2fd', borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 12, color: '#1565c0' }}>Vendas</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#0d47a1' }}>
                    {formatarMoeda(balanco.resumo.totalVendas || 0)}
                  </div>
                </div>
              </div>
              {(balanco.porServico || []).map(s => (
                <div key={s.servico} className="appointment-item">
                  <div className="top"><span className="prof">{s.servico}</span><span className="time">{formatarMoeda(s.total)}</span></div>
                </div>
              ))}
              {(balanco.porProduto || []).map(p => (
                <div key={p.produto} className="appointment-item" style={{ borderLeftColor: '#2e7d32' }}>
                  <div className="top"><span className="prof">{p.produto}</span><span className="time">{formatarMoeda(p.total)}</span></div>
                </div>
              ))}
              <div className="section-title">Vendas ({(balanco.vendas || []).length})</div>
              {(balanco.vendas || []).map(v => (
                <div key={v._id} className="appointment-item" style={{ borderLeftColor: '#2e7d32' }}>
                  <div className="top">
                    <span className="prof">{v.nomeCliente || 'Avulso'}</span>
                    <span className="time">{formatarMoeda(v.total)}</span>
                  </div>
                  <div className="cliente">{(v.itens || []).map(i => `${i.quantidade}x ${i.nome}`).join(' · ')}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {aba === 'profissionais' && (
        <div style={{ padding: 12 }}>
          <form onSubmit={async e => {
            e.preventDefault();
            try {
              if (editandoProf) await apiFetch(`${API}/profissionais/${editandoProf._id}`, { method: 'PUT', body: JSON.stringify(formProf) });
              else await apiFetch(`${API}/profissionais`, { method: 'POST', body: JSON.stringify(formProf) });
              setFormProf({ nome: '', especialidade: '', telefone: '', chavePix: '' });
              setEditandoProf(null);
              setMsg('Salvo!');
              const d = await apiFetch(`${API}/profissionais`); setProfissionais(Array.isArray(d) ? d : []);
            } catch (err) { alert(err.message); }
          }} style={{ background: '#fafafa', padding: 16, borderRadius: 12, marginBottom: 16 }}>
            <input placeholder="Nome" value={formProf.nome} onChange={e => setFormProf({ ...formProf, nome: e.target.value })} required style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: '1px solid #ddd' }} />
            <input placeholder="Especialidade" value={formProf.especialidade} onChange={e => setFormProf({ ...formProf, especialidade: e.target.value })} style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: '1px solid #ddd' }} />
            <input placeholder="Telefone" value={formProf.telefone} onChange={e => setFormProf({ ...formProf, telefone: e.target.value })} style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: '1px solid #ddd' }} />
            <input placeholder="Chave PIX" value={formProf.chavePix} onChange={e => setFormProf({ ...formProf, chavePix: e.target.value })} style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: '1px solid #ddd' }} />
            <button type="submit" style={{ width: '100%', padding: 12, background: '#2d2d2d', color: '#fff', border: 'none', borderRadius: 8 }}>{editandoProf ? 'Atualizar' : 'Adicionar'}</button>
          </form>
          {profissionais.map(p => (
            <div key={p._id} className="appointment-item">
              <div className="top"><span className="prof">{p.nome}</span></div>
              <div className="cliente">{p.especialidade || p.descricao}</div>
              <div className="actions">
                <button className="whats-btn" onClick={() => { setEditandoProf(p); setFormProf({ nome: p.nome, especialidade: p.especialidade || p.descricao || '', telefone: p.telefone || '', chavePix: p.chavePix || '' }); }}>Editar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === 'servicos' && (
        <div style={{ padding: 12 }}>
          <form onSubmit={async e => {
            e.preventDefault();
            const dados = { ...formServ, duracao: Number(formServ.duracao), preco: Number(formServ.preco) };
            try {
              if (editandoServ) await apiFetch(`${API}/servicos/${editandoServ._id}`, { method: 'PUT', body: JSON.stringify(dados) });
              else await apiFetch(`${API}/servicos`, { method: 'POST', body: JSON.stringify(dados) });
              setFormServ({ nome: '', duracao: '', preco: '' });
              setEditandoServ(null);
              setMsg('Salvo!');
              const d = await apiFetch(`${API}/servicos`); setServicos(Array.isArray(d) ? d : []);
            } catch (err) { alert(err.message); }
          }} style={{ background: '#fafafa', padding: 16, borderRadius: 12, marginBottom: 16 }}>
            <input placeholder="Nome" value={formServ.nome} onChange={e => setFormServ({ ...formServ, nome: e.target.value })} required style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: '1px solid #ddd' }} />
            <input type="number" placeholder="Duração min" value={formServ.duracao} onChange={e => setFormServ({ ...formServ, duracao: e.target.value })} required style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: '1px solid #ddd' }} />
            <input type="number" step="0.01" placeholder="Preço" value={formServ.preco} onChange={e => setFormServ({ ...formServ, preco: e.target.value })} required style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: '1px solid #ddd' }} />
            <button type="submit" style={{ width: '100%', padding: 12, background: '#2d2d2d', color: '#fff', border: 'none', borderRadius: 8 }}>{editandoServ ? 'Atualizar' : 'Adicionar'}</button>
          </form>
          {servicos.map(s => (
            <div key={s._id} className="appointment-item">
              <div className="top"><span className="prof">{s.nome}</span><span className="time">{formatarMoeda(s.preco)}</span></div>
              <div className="actions">
                <button className="whats-btn" onClick={() => { setEditandoServ(s); setFormServ({ nome: s.nome, duracao: s.duracao || s.duracaoMinutos, preco: s.preco }); }}>Editar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === 'bloqueios' && (
        <div style={{ padding: 12 }}>
          {bloqueios.length === 0 ? <p style={{ textAlign: 'center', color: '#999' }}>Nenhum bloqueio.</p> : bloqueios.map(b => (
            <div key={b._id} className="appointment-item" style={{ borderLeftColor: '#c62828' }}>
              <div className="top"><span className="prof">{b.profissional}</span></div>
              <div className="cliente">{b.tipo === 'data' ? b.data : `Dia ${b.diaSemana}`}</div>
              <div className="actions">
                <button className="cancel-btn" onClick={async () => {
                  if (!confirm('Remover?')) return;
                  try { await apiFetch(`${API}/bloqueios/${b._id}`, { method: 'DELETE' }); const d = await apiFetch(`${API}/bloqueios`); setBloqueios(Array.isArray(d) ? d : []); }
                  catch (e) { alert(e.message); }
                }}>Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
