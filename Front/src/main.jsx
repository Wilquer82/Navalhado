import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'

const limparSessao = () => {
  try {
    const chavesSensiveis = ['token', 'auth', 'session'];
    chavesSensiveis.forEach(chave => {
      localStorage.removeItem(chave);
      sessionStorage.removeItem(chave);
    });
  } catch (error) {
    console.warn('Não foi possível limpar dados de sessão:', error);
  }
};

function BootScreen() {
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    const preparar = () => {
      if (ativo) {
        setTimeout(() => setCarregando(false), 300);
      }
    };

    preparar();

    return () => {
      ativo = false;
    };
  }, []);

  if (carregando) {
    return (
      <div className="boot-screen">
        <div className="boot-card">
          <div className="boot-logo">N</div>
          <h2>Navalhado</h2>
          <p>Inicializando ambiente...</p>
          <div className="boot-spinner" />
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(() => console.log('✅ PWA Service Worker registrado'))
      .catch(err => console.log('⚠️ SW não registrado:', err))
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BootScreen />
  </React.StrictMode>,
)
