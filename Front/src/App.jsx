import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Agendar from './pages/Agendar.jsx';
import Login from './pages/Login.jsx';
import Painel from './pages/Painel.jsx';
import Sobre from './pages/Sobre.jsx';

const limparDadosDeSessao = async () => {
  try {
    ['token', 'auth', 'session'].forEach(chave => {
      localStorage.removeItem(chave);
      sessionStorage.removeItem(chave);
    });
  } catch (error) {
    console.warn('Erro ao limpar sessão no unload:', error);
  }
};

function RotaProtegida({ children }) {
  const [autenticado, setAutenticado] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setAutenticado(!!token);
    setCarregando(false);
  }, []);

  if (carregando) return null;
  return autenticado ? children : <Navigate to="/login" />;
}

export default function App() {
  useEffect(() => {
    const limparAoSair = () => {
      limparDadosDeSessao();
    };

    window.addEventListener('beforeunload', limparAoSair);

    return () => {
      limparAoSair();
      window.removeEventListener('beforeunload', limparAoSair);
    };
  }, []);

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Agendar />} />
        <Route path="/sobre" element={<Sobre />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/painel"
          element={
            <RotaProtegida>
              <Painel />
            </RotaProtegida>
          }
        />
      </Routes>
    </div>
  );
}
