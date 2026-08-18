# 💈 Navalhado Cortes - Sistema de Agendamento

Sistema de agendamento online para salão de cabeleireiros, desenvolvido com React + Vite.

## 🚀 Como rodar o projeto

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com a URL do seu backend:
```env
# Para desenvolvimento local:
VITE_API=http://localhost:5000/api

# Para produção:
# VITE_API=https://navalhado.onrender.com/api
```

### 3. Rodar em desenvolvimento
```bash
npm run dev
```

O projeto abrirá automaticamente em `http://localhost:3000`

### 4. Build para produção
```bash
npm run build
```

Os arquivos compilados ficarão na pasta `dist/`.

## 📱 Funcionalidades

### Para Clientes (acesso livre)
- Fluxo em 4 passos: Profissional → Serviço → Data/Horário → Dados
- Seletor de datas com scroll horizontal
- Horários ocupados e bloqueados aparecem em cinza
- Resumo do agendamento antes de confirmar
- Página "Sobre Nós" com contato e horários
- **PWA**: instala na tela inicial do celular como app nativo

### Para Profissionais (área admin)
- 📅 **Agendamentos**: Visualizar por data, agrupados por profissional
- 💬 **WhatsApp**: Botão para enviar mensagem de confirmação ao cliente
- 📤 **Compartilhar link**: Botão para compartilhar o site por WhatsApp/SMS
- 👤 **Equipe**: Adicionar/editar/excluir profissionais
- 💇 **Serviços**: Adicionar/editar/excluir serviços
- 🚫 **Bloqueios**: Bloquear agenda por data específica ou dia da semana recorrente

## 🔑 Credenciais
- **Usuário**: admin
- **Senha**: salao2026

## 📁 Estrutura do projeto
```
├── index.html              # HTML principal
├── vite.config.js          # Configuração do Vite
├── package.json
├── .env.example            # Exemplo de variáveis de ambiente
├── public/                 # Arquivos estáticos
│   ├── Logo.webp           # Logo do salão
│   ├── manifest.json       # Configuração PWA
│   └── service-worker.js   # Service Worker PWA
└── src/
    ├── main.jsx            # Entrada da aplicação
    ├── App.jsx             # Rotas
    ├── styles.css          # Estilos globais
    └── pages/
        ├── Agendar.jsx     # Página de agendamento
        ├── Login.jsx       # Login admin
        ├── Painel.jsx      # Painel administrativo
        └── Sobre.jsx       # Página Sobre Nós
```

## 🎨 Personalização
- **Logo**: Substitua o arquivo `public/Logo.webp`
- **Cores**: Edite `src/styles.css` (cor principal: `#2d2d2d`, header: `black`)
- **Dados do salão**: Edite `src/pages/Sobre.jsx` (telefone, endereço, horários)
