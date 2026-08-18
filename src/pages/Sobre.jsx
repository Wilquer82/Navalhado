import { Link } from 'react-router-dom';

export default function Sobre() {
  const telefone = '(19) 99985-2402';
  const endereco = 'R. Elvira Alves da Silva, Águas de Lindóia - SP';

  const horarios = [
    { dia: 'Segunda-feira', horario: '08:00 - 18:00' },
    { dia: 'Terça-feira', horario: '08:00 - 18:00' },
    { dia: 'Quarta-feira', horario: '08:00 - 18:00' },
    { dia: 'Quinta-feira', horario: '08:00 - 18:00' },
    { dia: 'Sexta-feira', horario: '08:00 - 18:00' },
    { dia: 'Sábado', horario: '08:00 - 14:00' },
    { dia: 'Domingo', horario: '08:00 - 14:00' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Header */}
      <div className="header">
        <div className="logo-container">
          <img 
            src="/Logo.webp" 
            alt="Logo Navalhado Cortes" 
            className="logo-img"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h1 className="logo-nome">Navalhado Cortes</h1>
          <p className="logo-subtitulo">Beleza e autoestima em cada detalhe</p>
        </div>
      </div>

      {/* Botão Voltar */}
      <div style={{ padding: '12px 16px' }}>
        <Link to="/" style={{
          color: '#2d2d2d', textDecoration: 'none',
          fontSize: 14, fontWeight: 500
        }}>
          ← Voltar ao agendamento
        </Link>
      </div>

      {/* Sobre Nós */}
      <div style={{ padding: '0 16px 20px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#2d2d2d' }}>
          Sobre nós
        </h2>
        <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6 }}>
          Seja bem-vindo à Agenda Navalhado Cortes. Escolha o seu melhor horário, 
          não fique de fora dessa grande experiência. Deus te abençoe sempre!!
        </p>
        <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginTop: 12 }}>
          Aqui você encontra cortes modernos, colorações vibrantes, tratamentos 
          capilares de alta performance e muito mais. Venha nos conhecer! 💅✨
        </p>
      </div>

      {/* Horário de Funcionamento */}
      <div style={{ padding: '20px 16px', background: '#fafafa' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#2d2d2d' }}>
          🕐 Horário de funcionamento
        </h2>
        {horarios.map((h, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '10px 0', borderBottom: i < horarios.length - 1 ? '1px solid #eee' : 'none'
          }}>
            <span style={{ fontSize: 14, color: '#333' }}>{h.dia}</span>
            <span style={{ fontSize: 14, fontWeight: 500, color: '#2d2d2d' }}>{h.horario}</span>
          </div>
        ))}
      </div>

      {/* Contato */}
      <div style={{ padding: '20px 16px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#2d2d2d' }}>
          📞 Contato
        </h2>

        {/* Telefone */}
        <a href={`tel:${telefone.replace(/\D/g, '')}`} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px', background: '#f5f5f5', borderRadius: 12,
          textDecoration: 'none', color: '#333', marginBottom: 10
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#4caf50', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18
          }}>📱</div>
          <div>
            <div style={{ fontSize: 12, color: '#888' }}>Telefone</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{telefone}</div>
          </div>
        </a>

        {/* WhatsApp */}
        <a href={`https://wa.me/55${telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px', background: '#e8f5e9', borderRadius: 12,
          textDecoration: 'none', color: '#2e7d32', marginBottom: 10
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#25d366', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18
          }}>💬</div>
          <div>
            <div style={{ fontSize: 12, color: '#66bb6a' }}>WhatsApp</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Enviar mensagem</div>
          </div>
        </a>

        {/* Endereço */}
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`} 
          target="_blank" rel="noopener noreferrer" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px', background: '#f5f5f5', borderRadius: 12,
          textDecoration: 'none', color: '#333'
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#1976d2', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18
          }}>📍</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: '#888' }}>Endereço</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{endereco}</div>
          </div>
          <div style={{ fontSize: 12, color: '#1976d2', fontWeight: 600 }}>Ver mapa →</div>
        </a>
      </div>

      {/* Botão Agendar */}
      <div style={{ padding: '24px 16px 40px' }}>
        <Link to="/" style={{
          display: 'block', width: '100%', padding: '16px',
          background: '#2d2d2d', color: '#fff', textAlign: 'center',
          borderRadius: 12, textDecoration: 'none',
          fontSize: 16, fontWeight: 600
        }}>
          ✨ Agendar horário agora
        </Link>
      </div>
    </div>
  );
}
