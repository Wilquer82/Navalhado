import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Agendar from './pages/Agendar';
import Login from './pages/Login';
import Painel from './pages/Painel';
import Sobre from './pages/Sobre';

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
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Agendar />} />
        <Route path="/sobre" element={<Sobre />} />
        <Route path="/login" element={<Login />} />
        <Route path="/painel" element={
          <RotaProtegida><Painel /></RotaProtegida>
        } />
      </Routes>
    </div>
  );
}