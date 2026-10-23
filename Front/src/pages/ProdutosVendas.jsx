import { useState, useEffect } from 'react';

const inputStyle = {
  width: '100%', padding: 12, marginBottom: 8,
  borderRadius: 8, border: '1px solid #ddd', fontSize: 14
};

export function AbaProdutos({ apiFetch, API, formatarMoeda, msg, setMsg }) {
  const [produtos, setProdutos] = useState([]);
  const [formProd, setFormProd] = useState({ nome: '', descricao: '', preco: '', estoque: '0', controlarEstoque: false });
  const [editandoProd, setEditandoProd] = useState(null);

  const carregar = async () => {
    try {
      const dados = await apiFetch(`${API}/produtos`);
      setProdutos(Array.isArray(dados) ? dados : []);
    } catch (e) {
      setProdutos([]);
      if (e.message) setMsg(e.message);
    }
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async e => {
    e.preventDefault();
    setMsg('');
    const dados = {
      nome: formProd.nome,
      descricao: formProd.descricao,
      preco: Number(formProd.preco),
      estoque: Number(formProd.estoque) || 0,
      controlarEstoque: Boolean(formProd.controlarEstoque)
    };
    try {
      if (editandoProd) {
        await apiFetch(`${API}/produtos/${editandoProd._id}`, { method: 'PUT', body: JSON.stringify(dados) });
        setMsg('Produto atualizado!');
      } else {
        await apiFetch(`${API}/produtos`, { method: 'POST', body: JSON.stringify(dados) });
        setMsg('Produto adicionado!');
      }
    } catch (err) {
      alert(err.message);
      return;
    }
    setFormProd({ nome: '', descricao: '', preco: '', estoque: '0', controlarEstoque: false });
    setEditandoProd(null);
    carregar();
    setTimeout(() => setMsg(''), 3000);
  };

  const editar = p => {
    setEditandoProd(p);
    setFormProd({
      nome: p.nome,
      descricao: p.descricao || '',
      preco: String(p.preco ?? ''),
      estoque: String(p.estoque ?? 0),
      controlarEstoque: Boolean(p.controlarEstoque)
    });
  };

  const excluir = async p => {
    if (!confirm(`Desativar ${p.nome}?`)) return;
    try {
      await apiFetch(`${API}/produtos/${p._id}`, { method: 'DELETE' });
      carregar();
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ padding: '12px' }}>
      <form onSubmit={salvar} style={{ background: '#fafafa', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>{editandoProd ? 'Editar' : 'Adicionar'} Produto</h3>
        <input placeholder="Nome do produto" value={formProd.nome} onChange={e => setFormProd({ ...formProd, nome: e.target.value })} required style={inputStyle} />
        <input placeholder="Descricao (opcional)" value={formProd.descricao} onChange={e => setFormProd({ ...formProd, descricao: e.target.value })} style={inputStyle} />
        <input type="number" step="0.01" min="0" placeholder="Preco (R$)" value={formProd.preco} onChange={e => setFormProd({ ...formProd, preco: e.target.value })} required style={inputStyle} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 14 }}>
          <input type="checkbox" checked={formProd.controlarEstoque} onChange={e => setFormProd({ ...formProd, controlarEstoque: e.target.checked })} />
          Controlar estoque
        </label>
        {formProd.controlarEstoque && (
          <input type="number" min="0" placeholder="Estoque" value={formProd.estoque} onChange={e => setFormProd({ ...formProd, estoque: e.target.value })} style={inputStyle} />
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" style={{ flex: 1, padding: 12, background: '#2d2d2d', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{editandoProd ? 'Atualizar' : 'Adicionar'}</button>
          {editandoProd && (
            <button type="button" onClick={() => { setEditandoProd(null); setFormProd({ nome: '', descricao: '', preco: '', estoque: '0', controlarEstoque: false }); }} style={{ padding: 12, background: '#eee', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
          )}
        </div>
      </form>
      <div className="section-title" style={{ padding: '0 0 8px 0' }}>Produtos ({produtos.length})</div>
      {produtos.length === 0 ? (
        <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>Nenhum produto cadastrado.</p>
      ) : produtos.map(p => (
        <div key={p._id} className="appointment-item" style={{ opacity: p.ativo === false ? 0.55 : 1 }}>
          <div className="top">
            <span className="prof">{p.nome}</span>
            <span className="time">{formatarMoeda(p.preco)}</span>
          </div>
          {p.descricao && <div className="cliente">{p.descricao}</div>}
          <div className="cliente">{p.controlarEstoque ? `Estoque: ${p.estoque}` : 'Sem controle de estoque'}{p.ativo === false ? ' · Inativo' : ''}</div>
          <div className="actions">
            <button className="whats-btn" onClick={() => editar(p)}>Editar</button>
            {p.ativo !== false && <button className="cancel-btn" onClick={() => excluir(p)}>Desativar</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AbaVendas({ apiFetch, API, formatarMoeda, msg, setMsg, dataLocalISO }) {
  const [produtos, setProdutos] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [dataVenda, setDataVenda] = useState(dataLocalISO(new Date()));
  const [formVenda, setFormVenda] = useState({ nomeCliente: '', observacoes: '', itens: [] });
  const [produtoVendaId, setProdutoVendaId] = useState('');
  const [qtdVenda, setQtdVenda] = useState('1');

  const carregarProdutos = async () => {
    try {
      const dados = await apiFetch(`${API}/produtos`);
      setProdutos(Array.isArray(dados) ? dados : []);
    } catch (e) { setProdutos([]); }
  };

  const carregarVendas = async () => {
    try {
      let url = `${API}/vendas`;
      if (dataVenda) url += `?data=${encodeURIComponent(dataVenda)}`;
      const dados = await apiFetch(url);
      setVendas(Array.isArray(dados) ? dados : []);
    } catch (e) {
      setVendas([]);
      if (e.message) setMsg(e.message);
    }
  };

  useEffect(() => { carregarProdutos(); carregarVendas(); }, [dataVenda]);

  const adicionarItem = () => {
    if (!produtoVendaId) { alert('Selecione um produto'); return; }
    const qtd = Math.floor(Number(qtdVenda) || 0);
    if (qtd < 1) { alert('Quantidade invalida'); return; }
    const prod = produtos.find(p => p._id === produtoVendaId && p.ativo !== false);
    if (!prod) { alert('Produto nao encontrado'); return; }
    if (prod.controlarEstoque && prod.estoque < qtd) {
      alert(`Estoque insuficiente. Disponivel: ${prod.estoque}`);
      return;
    }
    const existentes = [...formVenda.itens];
    const idx = existentes.findIndex(i => i.produtoId === prod._id);
    if (idx >= 0) existentes[idx] = { ...existentes[idx], quantidade: existentes[idx].quantidade + qtd };
    else existentes.push({ produtoId: prod._id, nome: prod.nome, preco: prod.preco, quantidade: qtd });
    setFormVenda({ ...formVenda, itens: existentes });
    setProdutoVendaId('');
    setQtdVenda('1');
  };

  const totalCarrinho = formVenda.itens.reduce((acc, i) => acc + Number(i.preco) * Number(i.quantidade), 0);

  const registrar = async e => {
    e.preventDefault();
    setMsg('');
    if (!formVenda.itens.length) { alert('Adicione pelo menos um produto'); return; }
    try {
      await apiFetch(`${API}/vendas`, {
        method: 'POST',
        body: JSON.stringify({
          data: dataVenda,
          nomeCliente: formVenda.nomeCliente,
          observacoes: formVenda.observacoes,
          itens: formVenda.itens.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade }))
        })
      });
      setMsg('Venda registrada!');
      setFormVenda({ nomeCliente: '', observacoes: '', itens: [] });
      carregarVendas();
      carregarProdutos();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { alert(err.message); }
  };

  const cancelar = async v => {
    if (!confirm('Cancelar esta venda? O estoque sera devolvido se controlado.')) return;
    try {
      await apiFetch(`${API}/vendas/${v._id}`, { method: 'DELETE' });
      carregarVendas();
      carregarProdutos();
    } catch (err) { alert(err.message); }
  };

  return (
    <div style={{ padding: '12px' }}>
      <form onSubmit={registrar} style={{ background: '#fafafa', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>Registrar venda</h3>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#555' }}>Data da venda</label>
        <input type="date" value={dataVenda} onChange={e => setDataVenda(e.target.value)} style={inputStyle} />
        <input placeholder="Cliente (opcional)" value={formVenda.nomeCliente} onChange={e => setFormVenda({ ...formVenda, nomeCliente: e.target.value })} style={inputStyle} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <select value={produtoVendaId} onChange={e => setProdutoVendaId(e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 2 }}>
            <option value="">Produto...</option>
            {produtos.filter(p => p.ativo !== false).map(p => (
              <option key={p._id} value={p._id}>
                {p.nome} — {formatarMoeda(p.preco)}{p.controlarEstoque ? ` (est. ${p.estoque})` : ''}
              </option>
            ))}
          </select>
          <input type="number" min="1" value={qtdVenda} onChange={e => setQtdVenda(e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="Qtd" />
          <button type="button" onClick={adicionarItem} style={{ padding: '0 14px', background: '#1565c0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>+</button>
        </div>
        {formVenda.itens.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            {formVenda.itens.map(i => (
              <div key={i.produtoId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #eee', fontSize: 14 }}>
                <span>{i.quantidade}x {i.nome}</span>
                <span>
                  {formatarMoeda(i.preco * i.quantidade)}{' '}
                  <button type="button" onClick={() => setFormVenda({ ...formVenda, itens: formVenda.itens.filter(x => x.produtoId !== i.produtoId) })} style={{ border: 'none', background: 'transparent', color: '#c62828', cursor: 'pointer' }}>X</button>
                </span>
              </div>
            ))}
            <div style={{ textAlign: 'right', fontWeight: 700, marginTop: 8 }}>Total: {formatarMoeda(totalCarrinho)}</div>
          </div>
        )}
        <input placeholder="Observacoes (opcional)" value={formVenda.observacoes} onChange={e => setFormVenda({ ...formVenda, observacoes: e.target.value })} style={inputStyle} />
        <button type="submit" style={{ width: '100%', padding: 12, background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Registrar venda</button>
      </form>
      <div className="section-title" style={{ padding: '0 0 8px 0' }}>Vendas do dia ({vendas.length})</div>
      {vendas.length === 0 ? (
        <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>Nenhuma venda neste dia.</p>
      ) : vendas.map(v => (
        <div key={v._id} className="appointment-item" style={{ borderLeftColor: '#2e7d32' }}>
          <div className="top">
            <span className="prof">{v.nomeCliente || 'Cliente avulso'}</span>
            <span className="time">{formatarMoeda(v.total)}</span>
          </div>
          <div className="cliente">{(v.itens || []).map(i => `${i.quantidade}x ${i.nome}`).join(' · ')}</div>
          {v.observacoes && <div className="serv">{v.observacoes}</div>}
          <div className="actions">
            <button className="cancel-btn" onClick={() => cancelar(v)}>Cancelar venda</button>
          </div>
        </div>
      ))}
    </div>
  );
}
