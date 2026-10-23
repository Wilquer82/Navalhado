import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AbaProdutos, AbaVendas } from './ProdutosVendas';

const API = import.meta.env.VITE_API || 'https://navalhadoback.onrender.com/api';
const dataLocalISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export default function Painel() {
  const [aba, setAba] = useState('agendamentos');
  const [agendamentos, setAgendamentos] = useState([]);
  const [dataFiltro, setDataFiltro] = useState(dataLocalISO(new Date()));
  const [token] = useState(localStorage.getItem('token'));
  const [mesBalanco, setMesBalanco] = useState(() => {
    const a = new Date();
    return `${a.getFullYear()}-${String(a.getMonth()+1).padStart(2,'0')}`;
  });
  const [balanco, setBalanco] = useState(null);
  const [carregandoBalanco, setCarregandoBalanco] = useState(false);
  const [msg, setMsg] = useState('');
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
    </main>
  );
}
