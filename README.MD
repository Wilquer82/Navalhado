# 💅 Navalhado - Salão de Beleza

Sistema de agendamento online para salão de cabeleireiros.

## 📁 Estrutura do monorepo

- **`Back/`** - API Node.js + Express + MongoDB
- **`Front/`** - React + Vite + PWA (interface mobile-first)
- **`package.json`** - scripts raiz para executar frontend e backend em conjunto

## 🚀 Como rodar

### Instalar dependências do workspace
```bash
npm install
```

### Rodar em desenvolvimento (frontend + backend)
```bash
npm run dev
```

### Rodar apenas backend
```bash
npm run dev:back
```

### Rodar apenas frontend
```bash
npm run dev:front
```

### Build do frontend
```bash
npm run build
```

### Verificação rápida
```bash
npm run check
```

## 🌐 Endpoints locais

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 🔐 Variáveis de ambiente

O backend usa `MONGO_URI`, `JWT_SECRET` e, opcionalmente, `CORS_ORIGINS`, `PUBLIC_API_URL`, `PROFISSIONAL_EMAIL` e `PROFISSIONAL_PASSWORD`.

O frontend usa `VITE_API` para apontar para a API, por exemplo:

```env
VITE_API=http://localhost:5000/api
```