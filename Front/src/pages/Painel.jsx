import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AbaProdutos, AbaVendas } from './ProdutosVendas';
import CampoData from '../components/CampoData';

const API = import.meta.env.VITE_API || 'https://navalhadoback-v81k.onrender.com/api';
const dataLocalISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const mesLocalISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const statusAgendamentoLabel = {
  agendado: 'Agendado',
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  em_atendimento: 'Em atendimento',
  finalizado: 'Finalizado',
  concluido: 'Finalizado',
  cancelado: 'Cancelado',
  nao_compareceu: 'Não compareceu'
};
const statusAgendamentoTerminal = ['finalizado', 'concluido', 'cancelado', 'nao_compareceu'];
const formProfissionalVazio = {
  nome: '',
  foto: '',
  especialidade: '',
  bio: '',
  telefone: '',
  chavePix: ''
};

function AvatarProfissional({ nome, foto, className = '' }) {
  const [imagemFalhou, setImagemFalhou] = useState(false);

  useEffect(() => {
    setImagemFalhou(false);
  }, [foto]);

  const iniciais = String(nome || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(parte => parte[0])
    .join('')
    .toLocaleUpperCase('pt-BR');

  return (
    <span className={`professional-avatar ${className}`} aria-label={`Foto de ${nome || 'profissional'}`}>
      {foto && !imagemFalhou
        ? <img src={foto} alt="" onError={() => setImagemFalhou(true)} />
        : <span aria-hidden="true">{iniciais || '?'}</span>}
    </span>
  );
}

export default function Painel() {
  const [aba, setAba] = useState('agendamentos');
  const [agendamentos, setAgendamentos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [dataFiltro, setDataFiltro] = useState(() => dataLocalISO(new Date()));
  const [filtroProfissional, setFiltroProfissional] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [mostrarFormManual, setMostrarFormManual] = useState(false);
  const [carregandoAgendamentos, setCarregandoAgendamentos] = useState(false);
  const [salvandoManual, setSalvandoManual] = useState(false);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [erroHorarios, setErroHorarios] = useState('');
  const [statusEmAtualizacao, setStatusEmAtualizacao] = useState('');
  const [whatsappEmRegistro, setWhatsappEmRegistro] = useState('');
  const [erroAgendamentos, setErroAgendamentos] = useState('');
  const [formManual, setFormManual] = useState({
    data: dataLocalISO(new Date()),
    horario: '',
    nomeCliente: '',
    telefoneCliente: '',
    observacoes: '',
    profissionalId: '',
    servicoId: ''
  });
  const [token] = useState(localStorage.getItem('token'));
  const [mesBalanco, setMesBalanco] = useState(() => mesLocalISO(new Date()));
  const [balanco, setBalanco] = useState(null);
  const [carregandoBalanco, setCarregandoBalanco] = useState(false);
  const [msg, setMsg] = useState('');
  const [formProf, setFormProf] = useState(formProfissionalVazio);
  const [formServ, setFormServ] = useState({ nome: '', duracao: '', preco: '' });
  const [editandoProf, setEditandoProf] = useState(null);
  const [editandoServ, setEditandoServ] = useState(null);
  const nomeProfissional = localStorage.getItem('profissionalNome') || '';
  const isAdmin = localStorage.getItem('role') === 'admin';
  const [formAcesso, setFormAcesso] = useState({ profissionalId: '', email: '', senha: '' });
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
        setCarregandoAgendamentos(true);
        try {
          let url = `${API}/agendamentos`;
          if (dataFiltro) url += `?data=${encodeURIComponent(dataFiltro)}`;
          const dados = await apiFetch(url);
          setAgendamentos(Array.isArray(dados) ? dados : []);
          setErroAgendamentos('');
        } catch (e) {
          setAgendamentos([]);
          setErroAgendamentos(e.message || 'Não foi possível carregar os agendamentos.');
        } finally {
          setCarregandoAgendamentos(false);
        }
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

  useEffect(() => {
    if (aba !== 'agendamentos') return;
    (async () => {
      try {
        const [listaProfissionais, listaServicos] = await Promise.all([
          apiFetch(`${API}/profissionais`),
          apiFetch(`${API}/servicos`)
        ]);
        setProfissionais(Array.isArray(listaProfissionais) ? listaProfissionais : []);
        setServicos(Array.isArray(listaServicos) ? listaServicos : []);
      } catch (e) {
        setErroAgendamentos(e.message || 'Não foi possível carregar profissionais e serviços.');
      }
    })();
  }, [aba]);

  useEffect(() => {
    if (!mostrarFormManual || !formManual.profissionalId || !formManual.servicoId || !formManual.data) {
      setHorariosDisponiveis([]);
      setCarregandoHorarios(false);
      setErroHorarios('');
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      data: formManual.data,
      servicoId: formManual.servicoId
    });
    setHorariosDisponiveis([]);
    setCarregandoHorarios(true);
    setErroHorarios('');
    setFormManual(form => ({ ...form, horario: '' }));

    (async () => {
      try {
        const dados = await apiFetch(
          `${API}/profissionais/${encodeURIComponent(formManual.profissionalId)}/horarios-disponiveis?${params}`,
          { signal: controller.signal }
        );
        if (!Array.isArray(dados)) throw new Error('Resposta inválida ao carregar horários disponíveis.');
        setHorariosDisponiveis(dados);
      } catch (e) {
        if (e.name !== 'AbortError') {
          setErroHorarios(e.message || 'Não foi possível carregar os horários disponíveis.');
        }
      } finally {
        if (!controller.signal.aborted) setCarregandoHorarios(false);
      }
    })();

    return () => controller.abort();
  }, [aba, mostrarFormManual, formManual.profissionalId, formManual.servicoId, formManual.data]);

  const formatarMoeda = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const servicosDoProfissional = profissionalId => {
    const profissional = profissionais.find(p => p._id === profissionalId);
    return (profissional?.servicos || [])
      .map(vinculo => {
        const servicoId = typeof vinculo.servicoId === 'object' ? vinculo.servicoId?._id : vinculo.servicoId;
        const servico = servicos.find(item => item._id === servicoId && item.ativo !== false);
        return servico ? { ...servico, preco: vinculo.preco ?? servico.preco } : null;
      })
      .filter(Boolean);
  };
  const servicosManuais = servicosDoProfissional(formManual.profissionalId);
  const agendamentosAtivosDoDia = agendamentos.filter(a => a.status !== 'cancelado').length;
  const termoBusca = buscaCliente.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const telefoneBusca = buscaCliente.replace(/\D/g, '');
  const agendamentosVisiveis = agendamentos.filter(a => {
    const nome = String(a.nomeCliente || '').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const telefone = String(a.telefoneCliente || a.telefone || '').replace(/\D/g, '');
    return (!filtroProfissional || String(a.profissional?._id || a.profissionalId) === filtroProfissional)
      && (!filtroStatus
        || (filtroStatus === 'finalizado' ? ['finalizado', 'concluido'].includes(a.status) : a.status === filtroStatus))
      && (!termoBusca || nome.includes(termoBusca) || (telefoneBusca && telefone.includes(telefoneBusca)));
  });

  const atualizarStatusAgendamento = async (agendamento, status) => {
    if (status === 'cancelado' && !confirm(`Cancelar o agendamento de ${agendamento.nomeCliente}?`)) return;
    setStatusEmAtualizacao(agendamento._id);
    setErroAgendamentos('');
    try {
      const atualizado = await apiFetch(`${API}/agendamentos/${agendamento._id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      setAgendamentos(lista => lista.map(item => item._id === atualizado._id ? atualizado : item));
      const resultado = status === 'em_atendimento'
        ? 'iniciado'
        : ['finalizado', 'concluido'].includes(status)
          ? 'finalizado'
          : status === 'nao_compareceu'
            ? 'marcado como não compareceu'
            : status === 'cancelado'
              ? 'cancelado'
              : 'confirmado';
      setMsg(`Agendamento ${resultado}.`);
    } catch (e) {
      setErroAgendamentos(e.message || 'Não foi possível atualizar o agendamento.');
    } finally {
      setStatusEmAtualizacao('');
    }
  };

  const formatarDataHoraEnvio = valor => {
    if (!valor) return '';
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return '';
    return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const registrarWhatsAppEnviado = async (agendamento, tipo) => {
    const chave = `${agendamento._id}-${tipo}`;
    setWhatsappEmRegistro(chave);
    setErroAgendamentos('');
    try {
      const atualizado = await apiFetch(`${API}/agendamentos/${agendamento._id}/whatsapp-enviado`, {
        method: 'PUT',
        body: JSON.stringify({ tipo })
      });
      setAgendamentos(lista => lista.map(item => item._id === agendamento._id
        ? {
            ...item,
            ...atualizado,
            whatsappConfirmacao: atualizado.whatsappConfirmacao || item.whatsappConfirmacao,
            whatsappLembrete: atualizado.whatsappLembrete || item.whatsappLembrete
          }
        : item));
      setMsg(`${tipo === 'confirmacao' ? 'Confirmação' : 'Lembrete'} registrado como enviado.`);
    } catch (e) {
      setErroAgendamentos(e.message || 'Não foi possível registrar o envio do WhatsApp.');
    } finally {
      setWhatsappEmRegistro('');
    }
  };

  const prepararWhatsApp = (evento, agendamento, tipo) => {
    const link = tipo === 'confirmacao' ? agendamento.whatsappConfirmacao : agendamento.whatsappLembrete;
    if (!link) {
      evento.preventDefault();
      setErroAgendamentos(`A API não retornou o link de WhatsApp para ${tipo === 'confirmacao' ? 'confirmação' : 'lembrete'} deste agendamento.`);
      return;
    }
    window.setTimeout(() => {
      if (window.confirm('Você enviou esta mensagem ao cliente pelo WhatsApp?')) {
        registrarWhatsAppEnviado(agendamento, tipo);
      }
    }, 350);
  };

  const criarAgendamentoManual = async e => {
    e.preventDefault();
    setSalvandoManual(true);
    setErroAgendamentos('');
    setMsg('');
    try {
      const criado = await apiFetch(`${API}/agendamentos`, {
        method: 'POST',
        body: JSON.stringify({
          profissionalId: formManual.profissionalId,
          servicoId: formManual.servicoId,
          data: formManual.data,
          horarioInicio: formManual.horario,
          nomeCliente: formManual.nomeCliente,
          telefoneCliente: formManual.telefoneCliente,
          observacoes: formManual.observacoes.trim()
        })
      });
      setDataFiltro(formManual.data);
      setMsg('Agendamento criado com sucesso.');
      setFormManual({
        data: formManual.data,
        horario: '',
        nomeCliente: '',
        telefoneCliente: '',
        observacoes: '',
        profissionalId: '',
        servicoId: ''
      });
      setMostrarFormManual(false);
    } catch (e) {
      setErroAgendamentos(e.message || 'Não foi possível criar o agendamento.');
      setSalvandoManual(false);
      return;
    }

    try {
      let url = `${API}/agendamentos`;
      if (formManual.data) url += `?data=${encodeURIComponent(formManual.data)}`;
      const atualizados = await apiFetch(url);
      setAgendamentos(Array.isArray(atualizados) ? atualizados : []);
      setErroAgendamentos('');
    } catch (e) {
      setErroAgendamentos(`Agendamento salvo, mas não foi possível atualizar a lista: ${e.message || 'erro desconhecido.'}`);
    } finally {
      setSalvandoManual(false);
    }
  };

  const estiloAba = ativa => ({
    flex: 1, padding: '12px 6px', background: ativa ? '#2d2d2d' : '#f5f5f5',
    color: ativa ? '#fff' : '#666', border: 'none', fontSize: 12,
    fontWeight: ativa ? '600' : 'normal', cursor: 'pointer'
  });

  const sair = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('profissionalNome');
    localStorage.removeItem('profissionalId');
    localStorage.removeItem('role');
    nav('/login');
  };

  const salvarAcesso = async e => {
    e.preventDefault();
    if (!formAcesso.profissionalId) { alert('Selecione o profissional'); return; }
    if (!formAcesso.email || formAcesso.senha.length < 4) {
      alert('Informe e-mail válido e senha com pelo menos 4 caracteres');
      return;
    }
    try {
      await apiFetch(`${API}/profissionais/${formAcesso.profissionalId}/acesso`, {
        method: 'PUT',
        body: JSON.stringify({ email: formAcesso.email, senha: formAcesso.senha })
      });
      setMsg('Acesso do profissional cadastrado!');
      setFormAcesso({ profissionalId: '', email: '', senha: '' });
      const d = await apiFetch(`${API}/profissionais`);
      setProfissionais(Array.isArray(d) ? d : []);
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { alert(err.message); }
  };

  const removerAcesso = async p => {
    if (!confirm(`Remover login de ${p.nome}?`)) return;
    try {
      await apiFetch(`${API}/profissionais/${p._id}/acesso`, { method: 'DELETE' });
      setMsg('Acesso removido.');
      const d = await apiFetch(`${API}/profissionais`);
      setProfissionais(Array.isArray(d) ? d : []);
    } catch (err) { alert(err.message); }
  };

  return (
    <main className="admin-panel">
      <div className="admin-header">
        <div>
          <h2 style={{ fontSize: 18 }}>Painel</h2>
          <p style={{ fontSize: 12, opacity: 0.85 }}>
            {isAdmin ? 'Administrador' : (nomeProfissional || 'Profissional')}
          </p>
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

      {msg && <div style={{ padding: 12, margin: 12, background: '#d1e7dd', color: '#1b5e20', borderRadius: 8, textAlign: 'center' }}>{msg}</div>}

      {aba === 'agendamentos' && (
        <div className="appointments-page">
          <div className="appointments-heading">
            <div>
              <p className="appointments-eyebrow">Agenda do salão</p>
              <h1>Agendamentos</h1>
              <p className="appointments-date">
                {dataFiltro
                  ? new Date(`${dataFiltro}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
                  : 'Selecione uma data'}
              </p>
            </div>
            <div className="appointments-heading-actions">
              <label className="appointments-date-input">
                <span>Data</span>
                <CampoData value={dataFiltro} onChange={data => {
                  if (!data) return;
                  setDataFiltro(data);
                  setFormManual(form => ({ ...form, data }));
                }} style={{ marginBottom: 0 }} />
              </label>
              {isAdmin && (
                <button className="appointment-create-toggle" onClick={() => setMostrarFormManual(aberto => !aberto)}>
                  {mostrarFormManual ? 'Fechar formulário' : '+ Novo agendamento'}
                </button>
              )}
            </div>
          </div>

          <div className="appointments-summary">
            <strong>{agendamentosAtivosDoDia}</strong>
            <span>{agendamentosAtivosDoDia === 1 ? 'agendamento no dia' : 'agendamentos no dia'}</span>
          </div>

          {isAdmin && mostrarFormManual && (
            <form className="manual-appointment-form" onSubmit={criarAgendamentoManual}>
              <div className="manual-form-heading">
                <div>
                  <h2>Novo agendamento</h2>
                  <p>Adicione um horário diretamente à agenda.</p>
                </div>
              </div>
              <div className="manual-form-grid">
                <label>
                  <span>Cliente</span>
                  <input value={formManual.nomeCliente} onChange={e => setFormManual({ ...formManual, nomeCliente: e.target.value })} placeholder="Nome do cliente" minLength={3} required />
                </label>
                <label>
                  <span>Telefone</span>
                  <input type="tel" value={formManual.telefoneCliente} onChange={e => setFormManual({ ...formManual, telefoneCliente: e.target.value })} placeholder="(00) 00000-0000" required />
                </label>
                <label>
                  <span>Profissional</span>
                  <select value={formManual.profissionalId} onChange={e => {
                    const profissionalId = e.target.value;
                    const servicos = servicosDoProfissional(profissionalId);
                    setFormManual(form => ({ ...form, profissionalId, servicoId: servicos[0]?._id || '' }));
                  }} required>
                    <option value="">Selecione</option>
                    {profissionais.map(p => <option key={p._id} value={p._id}>{p.nome}</option>)}
                  </select>
                </label>
                <label>
                  <span>Serviço</span>
                  <select value={formManual.servicoId} onChange={e => setFormManual(form => ({ ...form, servicoId: e.target.value, horario: '' }))} required disabled={!servicosManuais.length}>
                    <option value="">Selecione</option>
                    {servicosManuais.map(s => <option key={s._id} value={s._id}>{s.nome} · {formatarMoeda(s.preco)}</option>)}
                  </select>
                </label>
                <label>
                  <span>Data</span>
                  <input type="date" value={formManual.data} onChange={e => setFormManual(form => ({ ...form, data: e.target.value, horario: '' }))} required />
                </label>
                <label>
                  <span>Horário</span>
                  <select
                    value={formManual.horario}
                    onChange={e => setFormManual(form => ({ ...form, horario: e.target.value }))}
                    required
                    disabled={carregandoHorarios || !horariosDisponiveis.length || !formManual.profissionalId || !formManual.servicoId}
                  >
                    <option value="">
                      {carregandoHorarios
                        ? 'Carregando horários...'
                        : !formManual.profissionalId || !formManual.servicoId || !formManual.data
                          ? 'Selecione profissional, serviço e data'
                          : horariosDisponiveis.length
                            ? 'Selecione um horário'
                            : 'Nenhum horário disponível'}
                    </option>
                    {horariosDisponiveis.map(item => {
                      const horario = typeof item === 'string' ? item : item.horarioInicio;
                      return <option key={horario} value={horario}>{horario}</option>;
                    })}
                  </select>
                </label>
                <label className="manual-form-observations">
                  <span>Observação <small>{formManual.observacoes.length}/500 · opcional</small></span>
                  <textarea
                    value={formManual.observacoes}
                    onChange={e => setFormManual(form => ({ ...form, observacoes: e.target.value.slice(0, 500) }))}
                    maxLength={500}
                    rows={3}
                    placeholder="Detalhes úteis sobre o atendimento"
                  />
                </label>
              </div>
              {erroHorarios && <div className="appointments-error" role="alert">{erroHorarios}</div>}
              {!carregandoHorarios && !erroHorarios && formManual.profissionalId && formManual.servicoId && formManual.data && !horariosDisponiveis.length && (
                <p className="manual-no-slots">Não há horários disponíveis para esta combinação.</p>
              )}
              <div className="manual-form-actions">
                <button type="button" className="appointment-secondary-button" onClick={() => setMostrarFormManual(false)}>Voltar</button>
                <button type="submit" className="appointment-primary-button" disabled={salvandoManual || carregandoHorarios || !servicosManuais.length || !horariosDisponiveis.some(item => (typeof item === 'string' ? item : item.horarioInicio) === formManual.horario)}>
                  {salvandoManual ? 'Salvando...' : 'Criar agendamento'}
                </button>
              </div>
            </form>
          )}

          <div className="appointments-filters">
            <label className="appointments-search">
              <span>Buscar cliente</span>
              <input type="search" value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)} placeholder="Nome ou telefone" />
            </label>
            {isAdmin && (
              <label>
                <span>Profissional</span>
                <select value={filtroProfissional} onChange={e => setFiltroProfissional(e.target.value)}>
                  <option value="">Todos</option>
                  {profissionais.map(p => <option key={p._id} value={p._id}>{p.nome}</option>)}
                </select>
              </label>
            )}
            <label>
              <span>Status</span>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                <option value="">Todos</option>
                <option value="agendado">Agendado</option>
                <option value="pendente">Pendente</option>
                <option value="confirmado">Confirmado</option>
                <option value="em_atendimento">Em atendimento</option>
                <option value="finalizado">Finalizado</option>
                <option value="nao_compareceu">Não compareceu</option>
                {isAdmin && <option value="cancelado">Cancelado</option>}
              </select>
            </label>
          </div>

          {erroAgendamentos && <div className="appointments-error" role="alert">{erroAgendamentos}</div>}
          {carregandoAgendamentos ? (
            <p className="appointments-empty">Carregando agenda...</p>
          ) : agendamentosVisiveis.length === 0 ? (
            <div className="appointments-empty">
              <strong>{agendamentos.length ? 'Nenhum resultado para esses filtros' : 'Nenhum agendamento nesta data'}</strong>
              <span>{agendamentos.length ? 'Ajuste a busca ou os filtros para ver outros horários.' : 'Escolha outra data ou crie um agendamento manual.'}</span>
            </div>
          ) : (
            <div className="appointments-list">
              {agendamentosVisiveis.map(a => (
                <article key={a._id} className={`appointment-card appointment-card-${a.status}`}>
                  <div className="appointment-card-main">
                    <div className="appointment-time">{a.horarioInicio || a.horario}</div>
                    <div className="appointment-details">
                      <div className="appointment-client">{a.nomeCliente}</div>
                      <a className="appointment-phone" href={`tel:${a.telefoneCliente || a.telefone}`}>{a.telefoneCliente || a.telefone}</a>
                    </div>
                    <div className="appointment-service">
                      <strong>{a.servico?.nome || 'Serviço'}</strong>
                      <span>{formatarMoeda(a.pagamento?.valorFinal ?? a.servico?.preco)}</span>
                    </div>
                    <div className="appointment-professional">{a.profissional?.nome || 'Profissional'}</div>
                    <span className={`status-badge status-${a.status}`}>
                      {statusAgendamentoLabel[a.status] || a.status}
                    </span>
                  </div>
                  {!statusAgendamentoTerminal.includes(a.status) && (
                    <div className="appointment-actions">
                      {['agendado', 'pendente'].includes(a.status) && (
                        <button className="appointment-primary-button" onClick={() => atualizarStatusAgendamento(a, 'confirmado')} disabled={statusEmAtualizacao === a._id}>
                          {statusEmAtualizacao === a._id ? 'Atualizando...' : 'Confirmar'}
                        </button>
                      )}
                      {a.status === 'confirmado' && (
                        <button className="appointment-primary-button" onClick={() => atualizarStatusAgendamento(a, 'em_atendimento')} disabled={statusEmAtualizacao === a._id}>
                          {statusEmAtualizacao === a._id ? 'Atualizando...' : 'Iniciar atendimento'}
                        </button>
                      )}
                      {a.status === 'em_atendimento' && (
                        <button className="appointment-primary-button" onClick={() => atualizarStatusAgendamento(a, 'finalizado')} disabled={statusEmAtualizacao === a._id}>
                          {statusEmAtualizacao === a._id ? 'Atualizando...' : 'Finalizar'}
                        </button>
                      )}
                      {['agendado', 'pendente', 'confirmado'].includes(a.status) && (
                        <button className="appointment-secondary-button" onClick={() => atualizarStatusAgendamento(a, 'nao_compareceu')} disabled={statusEmAtualizacao === a._id}>Não compareceu</button>
                      )}
                      <button className="appointment-cancel-button" onClick={() => atualizarStatusAgendamento(a, 'cancelado')} disabled={statusEmAtualizacao === a._id}>Cancelar</button>
                    </div>
                  )}
                  <div className="appointment-whatsapp">
                    {[
                      ['confirmacao', 'Enviar confirmação', a.whatsappConfirmacao, a.whatsappConfirmacaoEnviadaEm],
                      ['lembrete', 'Enviar lembrete', a.whatsappLembrete, a.whatsappLembreteEnviadoEm]
                    ].map(([tipo, rotulo, link, enviadoEm]) => {
                      const chave = `${a._id}-${tipo}`;
                      return (
                        <div key={tipo} className="appointment-whatsapp-item">
                          {link ? (
                            <a
                              className="appointment-whatsapp-link"
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={evento => prepararWhatsApp(evento, a, tipo)}
                            >
                              {rotulo}
                            </a>
                          ) : (
                            <span className="appointment-whatsapp-unavailable">
                              {tipo === 'confirmacao' ? 'Confirmação' : 'Lembrete'} indisponível
                            </span>
                          )}
                          {whatsappEmRegistro === chave
                            ? <span className="appointment-whatsapp-status">Registrando envio...</span>
                            : enviadoEm
                              ? <span className="appointment-whatsapp-status">Enviado em {formatarDataHoraEnvio(enviadoEm) || 'horário indisponível'}</span>
                              : <span className="appointment-whatsapp-status">Ainda não enviado</span>}
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {aba === 'produtos' && (
        <AbaProdutos apiFetch={apiFetch} API={API} formatarMoeda={formatarMoeda} msg={msg} setMsg={setMsg} />
      )}

      {aba === 'vendas' && (
        <AbaVendas
          apiFetch={apiFetch}
          API={API}
          formatarMoeda={formatarMoeda}
          msg={msg}
          setMsg={setMsg}
          dataVenda={dataFiltro}
          setDataVenda={setDataFiltro}
        />
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
              setFormProf(formProfissionalVazio);
              setEditandoProf(null);
              setMsg('Salvo!');
              const d = await apiFetch(`${API}/profissionais`); setProfissionais(Array.isArray(d) ? d : []);
            } catch (err) { alert(err.message); }
          }} className="professional-form">
            <h3>{editandoProf ? 'Editar profissional' : 'Adicionar profissional'}</h3>
            <label>
              <span>Nome</span>
              <input value={formProf.nome} onChange={e => setFormProf({ ...formProf, nome: e.target.value })} required />
            </label>
            <label>
              <span>Foto por URL</span>
              <input type="url" value={formProf.foto} onChange={e => setFormProf({ ...formProf, foto: e.target.value })} placeholder="https://exemplo.com/foto.jpg" />
            </label>
            {formProf.foto.trim() && (
              <div className="professional-photo-preview">
                <AvatarProfissional nome={formProf.nome} foto={formProf.foto.trim()} />
                <span>Prévia da foto</span>
              </div>
            )}
            <label>
              <span>Especialidade</span>
              <input value={formProf.especialidade} onChange={e => setFormProf({ ...formProf, especialidade: e.target.value })} placeholder="Ex.: Barbeiro" />
            </label>
            <label>
              <span>Bio <small>{formProf.bio.length}/120</small></span>
              <textarea value={formProf.bio} onChange={e => setFormProf({ ...formProf, bio: e.target.value.slice(0, 120) })} maxLength={120} rows={3} placeholder="Uma breve apresentação profissional" />
            </label>
            <label>
              <span>Telefone</span>
              <input type="tel" value={formProf.telefone} onChange={e => setFormProf({ ...formProf, telefone: e.target.value })} />
            </label>
            <label>
              <span>Chave PIX</span>
              <input value={formProf.chavePix} onChange={e => setFormProf({ ...formProf, chavePix: e.target.value })} />
            </label>
            <div className="professional-form-actions">
              <button type="submit">{editandoProf ? 'Atualizar profissional' : 'Adicionar profissional'}</button>
              {editandoProf && (
                <button type="button" className="professional-form-cancel" onClick={() => {
                  setEditandoProf(null);
                  setFormProf(formProfissionalVazio);
                }}>Cancelar edição</button>
              )}
            </div>
          </form>

          {isAdmin && (
            <form onSubmit={salvarAcesso} style={{ background: '#eef6ff', padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, marginBottom: 12 }}>Cadastrar login do profissional</h3>
              <select
                value={formAcesso.profissionalId}
                onChange={e => {
                  const id = e.target.value;
                  const p = profissionais.find(x => x._id === id);
                  setFormAcesso({
                    profissionalId: id,
                    email: p?.emailAcesso || '',
                    senha: ''
                  });
                }}
                required
                style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: '1px solid #ddd' }}
              >
                <option value="">Selecione o profissional...</option>
                {profissionais.map(p => (
                  <option key={p._id} value={p._id}>{p.nome}{p.temAcesso ? ' (já tem acesso)' : ''}</option>
                ))}
              </select>
              <input
                type="email"
                placeholder="E-mail de login"
                value={formAcesso.email}
                onChange={e => setFormAcesso({ ...formAcesso, email: e.target.value })}
                required
                style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: '1px solid #ddd' }}
              />
              <input
                type="password"
                placeholder="Senha (m�n. 8 caracteres)"
                value={formAcesso.senha}
                onChange={e => setFormAcesso({ ...formAcesso, senha: e.target.value })}
                required
                minLength={8}
                style={{ width: '100%', padding: 12, marginBottom: 8, borderRadius: 8, border: '1px solid #ddd' }}
              />
              <button type="submit" style={{ width: '100%', padding: 12, background: '#1565c0', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600 }}>
                Salvar acesso
              </button>
            </form>
          )}

          {profissionais.map(p => (
            <div key={p._id} className="team-professional-card">
              <AvatarProfissional nome={p.nome} foto={p.foto} />
              <div className="team-professional-info">
                <strong>{p.nome}</strong>
                <span>{p.especialidade || p.descricao || 'Especialidade não informada'}</span>
                {p.bio && <p>{p.bio}</p>}
                {isAdmin && (
                  <small>
                    {p.temAcesso
                      ? `Login: ${p.emailAcesso || 'cadastrado'}`
                      : 'Sem login cadastrado'}
                  </small>
                )}
              </div>
              <div className="actions">
                <button className="whats-btn" onClick={() => {
                  setEditandoProf(p);
                  setFormProf({
                    nome: p.nome || '',
                    foto: p.foto || '',
                    especialidade: p.especialidade || p.descricao || '',
                    bio: p.bio || '',
                    telefone: p.telefone || '',
                    chavePix: p.chavePix || ''
                  });
                }}>Editar</button>
                {isAdmin && p.temAcesso && (
                  <button className="cancel-btn" onClick={() => removerAcesso(p)}>Remover login</button>
                )}
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
