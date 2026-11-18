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
    <div className="about-page">
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

      <div className="about-back">
        <Link to="/">
          ← Voltar ao agendamento
        </Link>
      </div>

      <main className="about-content">
        <section className="about-intro">
          <div className="about-copy">
            <h2 className="about-title">Sobre nós</h2>
            <p>
              Seja bem-vindo à Agenda Navalhado Cortes. Escolha o seu melhor horário,
              não fique de fora dessa grande experiência. Deus te abençoe sempre!!
            </p>
            <p>
              Aqui você encontra cortes modernos, colorações vibrantes, tratamentos
              capilares de alta performance e muito mais. Venha nos conhecer! 💅✨
            </p>
          </div>
          <img
            className="about-image"
            src="/home-massagem/about-session.jpg"
            alt="Atendimento profissional em um espaço tranquilo e acolhedor."
            loading="lazy"
          />
        </section>

        <section className="about-hours">
          <h2 className="about-section-title">🕐 Horário de funcionamento</h2>
          {horarios.map((h, i) => (
            <div className="about-hours-row" key={i}>
              <span>{h.dia}</span>
              <span>{h.horario}</span>
            </div>
          ))}
        </section>

        <section className="about-contact">
          <h2 className="about-section-title">📞 Contato</h2>
          <a className="about-contact-card about-phone" href={`tel:${telefone.replace(/\D/g, '')}`}>
            <span className="about-contact-icon" aria-hidden="true">📱</span>
            <span className="about-contact-copy">
              <span className="about-contact-label">Telefone</span>
              <span className="about-contact-value">{telefone}</span>
            </span>
          </a>

          <a
            className="about-contact-card about-whatsapp"
            href={`https://wa.me/55${telefone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="about-contact-icon" aria-hidden="true">💬</span>
            <span className="about-contact-copy">
              <span className="about-contact-label">WhatsApp</span>
              <span className="about-contact-value">Enviar mensagem</span>
            </span>
          </a>

          <a
            className="about-contact-card about-address"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="about-contact-icon" aria-hidden="true">📍</span>
            <span className="about-contact-copy">
              <span className="about-contact-label">Endereço</span>
              <span className="about-contact-value">{endereco}</span>
            </span>
            <span className="about-map-link">Ver mapa →</span>
          </a>
        </section>

        <div className="about-cta">
          <Link to="/">✨ Agendar horário agora</Link>
        </div>
      </main>
    </div>
  );
}
