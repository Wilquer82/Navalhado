import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API || 'http://localhost:5000/api';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const nav = useNavigate();

  const entrar = async e => {
    e.preventDefault();
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, senha })
    });
    const dado = await res.json();
    
    if (res.ok) {
      localStorage.setItem('token', dado.token);
      window.location.href = '/painel';
    } else {
      setErro(dado.erro || 'Falha no login');
    }
  };

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
          <h1 className="logo-nome">Área dos Profissionais</h1>
          <p className="logo-subtitulo">Acesso restrito à equipe</p>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {erro && <p style={{ color: '#c62828', textAlign: 'center', marginBottom: 16 }}>{erro}</p>}
        
        <form onSubmit={entrar}>
          <div className="form-group" style={{ margin: '0 0 16px 0' }}>
            <label>Usuário</label>
            <input value={usuario} onChange={e => setUsuario(e.target.value)} required />
          </div>
          <div className="form-group" style={{ margin: '0 0 20px 0' }}>
            <label>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)} required />
          </div>
          <button type="submit" className="btn" style={{ width: '100%', margin: 0 }}>
            Entrar
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13 }}>
          <a href="/" style={{ color: '#666' }}>← Voltar ao agendamento</a>
        </p>
        <p style={{ textAlign: 'center', marginTop: 40, fontSize: 12, color: '#999' }}>
          Usuário padrão: admin / salao2026
        </p>
      </div>
    </>
  );
}
