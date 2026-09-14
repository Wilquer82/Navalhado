import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API || 'http://localhost:5000/api';
const dataISO = data => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

export default function Painel() {
  const nav = useNavigate();
  const token = localStorage.getItem('token');
  const [data, setData] = useState(dataISO(new Date()));
  const [agenda, setAgenda] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const api = async (url, options = {}) => {
    const resposta = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers } });
    const corpo = await resposta.json().catch(() => ({}));
    if (resposta.status === 401) {
      localStorage.removeItem('token');
      nav('/login', { replace: true });
      throw new Error('Sessão expirada.');
    }
    if (!resposta.ok) throw new Error(corpo.erro || 'Não foi possível concluir a operação.');
    return corpo;
  };

  const carregarAgenda = async () => {
    try {
      setErro('');
      setAgenda(await api(`${API}/profissional/agenda?data=${data}`));
    } catch (e) { setErro(e.message); }
  };

  useEffect(() => { carregarAgenda(); }, [data]);

  const alterarStatus = async (id, status) => {
    try {
      await api(`${API}/agendamentos/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      setMensagem('Agenda atualizada.');
      carregarAgenda();
    } catch (e) { setErro(e.message); }
  };

  const cadastrarFolga = async () => {
    try {
      await api(`${API}/profissional/folgas`, { method: 'POST', body: JSON.stringify({ data }) });
      setMensagem('Dia de folga cadastrado.');
      carregarAgenda();
    } catch (e) { setErro(e.message); }
  };

  const exportar = async () => {
    try {
      const mes = data.slice(0, 7);
      const resposta = await fetch(`${API}/profissional/agenda/exportar?mes=${mes}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!resposta.ok) throw new Error('Não foi possível exportar a agenda.');
      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `agenda-${mes}.csv`; link.click();
      URL.revokeObjectURL(url);
    } catch (e) { setErro(e.message); }
  };

  const sair = () => { localStorage.removeItem('token'); nav('/login', { replace: true }); };

  return (
    <main>
      <div className="admin-header">
        <div><h2 style={{ fontSize: 18 }}>Agenda profissional</h2><p style={{ margin: 0, color: '#777' }}>Atendimentos do dia</p></div>
        <button onClick={sair}>Sair</button>
      </div>
      <div style={{ padding: 16 }}>
        <input type="date" value={data} onChange={e => setData(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #ddd' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn" onClick={cadastrarFolga}>Cadastrar dia de folga</button>
          <button className="btn btn-outline" onClick={exportar}>Exportar mês</button>
        </div>
      </div>
      {mensagem && <div className="form-success">{mensagem}</div>}
      {erro && <div className="form-error" role="alert">{erro}</div>}
      {agenda.length === 0 ? <p style={{ textAlign: 'center', padding: 40, color: '#999' }}>Nenhum agendamento neste dia.</p> : agenda.map(item => (
        <article key={item._id} className="appointment-item">
          <div className="top"><span className="prof">{item.servicoId?.nome || 'Serviço'}</span><span className="time">{item.horarioInicio} - {item.horarioFim}</span></div>
          <div className="cliente">{item.nomeCliente}</div>
          <div className="cliente">{item.telefoneCliente}</div>
          <div className="cliente">Status: {item.status}</div>
          <div className="actions">
            {item.status === 'pendente' && <button onClick={() => alterarStatus(item._id, 'confirmado')}>Confirmar</button>}
            {item.status === 'confirmado' && <button onClick={() => alterarStatus(item._id, 'concluido')}>Concluído</button>}
            {item.status !== 'cancelado' && item.status !== 'concluido' && <button className="cancel-btn" onClick={() => alterarStatus(item._id, 'cancelado')}>Cancelar</button>}
          </div>
        </article>
      ))}
    </main>
  );
}
