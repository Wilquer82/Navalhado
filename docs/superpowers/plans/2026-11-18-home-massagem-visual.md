# Home Massagem Visual Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar ao frontend do Navalhado a paleta, tipografia e fotografias locais do Home Massagem, preservando a marca, o conteúdo e o comportamento do Navalhado.

**Architecture:** Manter as rotas e os fluxos React/Vite existentes. Centralizar tokens visuais e estilos de componentes em `Front/src/styles.css`, adicionar somente a marcação/classe necessária para as duas fotos nas páginas públicas e ampliar minimamente a CSP para carregar as fontes da referência.

**Tech Stack:** React 18, Vite 5, CSS, Google Fonts e verificação responsiva no navegador.

**Spec:** [2026-11-18-home-massagem-visual-design.md](../specs/2026-11-18-home-massagem-visual-design.md)

## Restrições globais

- Preservar logo, textos, dados de serviços, rotas, chamadas à API, autenticação e fluxos existentes do Navalhado.
- Usar a paleta ativa do CSS do Home Massagem: `#7eb8a8`, `#a8d4c8`, `#b8c9a3`, `#d4e0c4`, `#6b7f4e`, `#556640`, `#f7f9f4`, `#fbfcf8`, `#2f3529` e `#5a6352`.
- Usar Cormorant Garamond nos títulos e Montserrat nos textos da interface, mantendo fontes locais como fallback.
- Usar `pexels-andrea-prochilo-3062027-31234759.jpg` na página pública de agendamento e `pexels-jonathanborba-19641817.jpg` em Sobre; não copiar peças promocionais, vídeo, logo nem textos do Home Massagem.
- Não usar fotografias no painel operacional; não instalar dependências.
- Preservar foco visível, labels semânticos, suporte a movimento reduzido, contraste legível e uso a partir de viewport de 320 px sem overflow horizontal.
- Permitir somente `fonts.googleapis.com` em `style-src` e `fonts.gstatic.com` em `font-src` para carregar as fontes da referência.

## Pontos de revisão

- **CSP bloqueia as fontes:** tarefa 2 verifica o carregamento dos dois hosts e a ausência de violações CSP relacionadas a fontes no console.
- **Imagem copiada ausente ou sem alternativa útil:** tarefas 1 e 3 verificam arquivos e respostas de imagem, além de `alt` descritivo.
- **Overflow em viewport estreita:** tarefas 3 e 5 verificam `scrollWidth <= clientWidth` em 320 px e 375 px.
- **Preferência de movimento reduzido ignorada:** tarefas 2 e 5 emulam `prefers-reduced-motion: reduce` e verificam que animações/transições decorativas sejam desativadas ou minimizadas.
- **Estilização quebra ações do agendamento ou painel:** tarefas 3 e 4 fazem smoke tests das etapas de agendamento, do erro de login e dos controles do painel sem alterar o comportamento da API.

---

### Task 1: Criar o branch de feature e adicionar as imagens aprovadas

**Arquivos:**
- Modificar: `docs/superpowers/specs/2026-11-18-home-massagem-visual-design.md`
- Criar: `docs/superpowers/plans/2026-11-18-home-massagem-visual.md`
- Criar: `Front/public/home-massagem/booking-hero.jpg`
- Criar: `Front/public/home-massagem/about-session.jpg`

**Interfaces:**
- Consome: branch atual `Front` no commit da especificação `3eda658f`, com a atualização de status da especificação e este plano no worktree.
- Produz: branch `feat/home-massagem-visual` e as URLs locais `/home-massagem/booking-hero.jpg` e `/home-massagem/about-session.jpg`.

- [ ] **Etapa 1: Criar o branch de feature**

Executar na raiz do repositório: `git switch -c feat/home-massagem-visual`

Esperado: branch atual passa a ser `feat/home-massagem-visual`; parar se o branch já existir, sem sobrescrevê-lo.

- [ ] **Etapa 2: Commitar o plano aprovado e o status atualizado da especificação**

Adicionar somente a especificação aprovada e este plano. Commitar com `git commit -m "docs: add visual redesign implementation plan" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"`.

- [ ] **Etapa 3: Preparar o destino e confirmar as fontes**

Criar `Front/public/home-massagem/` se ainda não existir.
Confirmar que os dois arquivos de origem existem antes de copiá-los.

- [ ] **Etapa 4: Copiar as fotografias selecionadas**

Copiar `C:\Users\user\Documents\home-massagem\pexels-andrea-prochilo-3062027-31234759.jpg` para `Front/public/home-massagem/booking-hero.jpg` e `C:\Users\user\Documents\home-massagem\pexels-jonathanborba-19641817.jpg` para `Front/public/home-massagem/about-session.jpg`.

- [ ] **Etapa 5: Verificar os recursos copiados e commitar**

Comparar os hashes SHA-256 de cada par de origem/destino com `Get-FileHash`; os dois pares devem corresponder. Depois, commitar somente as duas imagens novas com `git commit -m "feat: add local Home Massagem visual assets" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"`.

---

### Task 2: Definir o tema compartilhado e permitir as fontes da referência

**Arquivos:**
- Modificar: `Front/src/styles.css`
- Modificar: `Front/index.html`

**Interfaces:**
- Consome: nenhum recurso de imagem.
- Produz: propriedades CSS customizadas com a paleta exata das Restrições globais, fontes compartilhadas de títulos/corpo, `theme-color` claro e diretivas CSP para as duas origens das fontes.

- [ ] **Etapa 1: Adicionar tokens do tema e tipografia base**

Definir tokens em `:root`; aplicar Montserrat com fallbacks sans-serif locais ao corpo/textos da interface e Cormorant Garamond com fallbacks serif locais aos títulos. Substituir superfícies base e controles pretos/cinzas atuais por tokens do tema, preservando cores semânticas de sucesso, erro e WhatsApp.

- [ ] **Etapa 2: Atualizar o carregamento das fontes e a CSP**

Adicionar o link de stylesheet do Google Fonts para as duas famílias aprovadas. Adicionar somente `https://fonts.googleapis.com` a `style-src` e `https://fonts.gstatic.com` a `font-src`; definir `theme-color` para a superfície clara.

- [ ] **Etapa 3: Verificar build, fontes e comportamento da CSP no navegador**

Executar em `Front`: `npm run build`

Esperado: build concluído. No navegador, verificar as fontes computadas dos títulos/corpo (Cormorant Garamond/Montserrat), o carregamento das duas origens e a ausência de violações CSP de fontes no console. Emular movimento reduzido e confirmar que transições/animações decorativas são desativadas ou minimizadas.

- [ ] **Etapa 4: Commitar o tema compartilhado**

Commitar somente `Front/src/styles.css` e `Front/index.html` com `git commit -m "feat: add Home Massagem visual theme" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"`.

---

### Task 3: Reestilizar o agendamento público e a página Sobre

**Arquivos:**
- Modificar: `Front/src/pages/Agendar.jsx`
- Modificar: `Front/src/pages/Sobre.jsx`
- Modificar: `Front/src/styles.css`

**Interfaces:**
- Consome: URLs de imagem da tarefa 1 e tokens de tema da tarefa 2.
- Produz: estilos `.booking-hero`, `.booking-hero-image`, `.about-page`, `.about-image` e `.about-contact-card`. Handlers de agendamento, links de rota, labels e dados existentes permanecem inalterados.

- [ ] **Etapa 1: Adicionar o visual de agendamento**

Adicionar à página de agendamento uma seção visual compacta com `/home-massagem/booking-hero.jpg`, texto alternativo descritivo e tamanho responsivo. Manter o cabeçalho Navalhado e posicionar a seção sem interromper o indicador de etapas nem os controles; a imagem acima da dobra deve carregar eager.

- [ ] **Etapa 2: Aplicar classes de tema à página Sobre**

Substituir estilos visuais inline em `Sobre.jsx` por classes nomeadas e adicionar `/home-massagem/about-session.jpg` como imagem de apoio responsiva, com texto alternativo descritivo e `loading="lazy"`. Preservar telefone, WhatsApp, endereço, horários e links de rota exatamente.

- [ ] **Etapa 3: Estilizar e validar as duas rotas públicas**

Executar em `Front`: `npm run build`

No navegador, verificar `/` e `/sobre` em 320 px, 375 px e desktop. Confirmar carregamento das duas imagens locais, `scrollWidth <= clientWidth`, foco visível e que o fluxo ainda permite selecionar profissional, serviço, data e horário sem alterar handlers de seleção.

- [ ] **Etapa 4: Commitar as páginas públicas**

Commitar somente as duas páginas e `styles.css` com `git commit -m "feat: restyle public booking pages" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"`.

---

### Task 4: Aplicar o tema ao login e ao painel operacional

**Arquivos:**
- Modificar: `Front/src/pages/Login.jsx`
- Modificar: `Front/src/pages/Painel.jsx`
- Modificar: `Front/src/styles.css`

**Interfaces:**
- Consome: tokens de tema e estilos compartilhados da tarefa 2.
- Produz: login, cabeçalho do painel, navegação, controles de formulário, cartões, badges de status, estados de erro/sucesso e botões de ação existentes com o tema. Nenhuma interface nova de API ou estado.

- [ ] **Etapa 1: Substituir estilos visuais inline no login**

Adicionar classes de página/formulário para espaçamento e tema; preservar handler de envio, mensagem de erro, estado de carregamento/desabilitado e link de retorno.

- [ ] **Etapa 2: Aplicar a paleta compartilhada aos componentes do painel**

Atualizar seletores existentes do painel e adicionar classes somente quando um estilo visual inline atual impedir o tema. Preservar hierarquia compacta, semântica de status, listas de vendas/produtos, navegação e todos os event handlers. Não adicionar imagens ao painel.

- [ ] **Etapa 3: Fazer build e smoke test do login e painel**

Executar em `Front`: `npm run build`

Verificar login em 320 px e desktop, incluindo foco visível e apresentação do erro de credenciais inválidas. Stubbar as chamadas de login e painel no contexto local do navegador; não enviar mutações reais. Verificar diferenciação visual dos botões de ação e badges de status, e `scrollWidth <= clientWidth` em 320 px e 375 px.

- [ ] **Etapa 4: Commitar o estilo do login e painel**

Commitar somente `Login.jsx`, `Painel.jsx` e `styles.css` com `git commit -m "feat: restyle professional dashboard" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"`.

---

### Task 5: Executar a checklist visual e de regressão completa

**Arquivos:**
- Verificar: todos os arquivos alterados do frontend e as duas imagens locais.

**Interfaces:**
- Consome: tarefas de implementação 1–4 concluídas.
- Produz: reformulação visual responsiva e acessível verificada, mantendo os fluxos existentes.

- [ ] **Etapa 1: Executar o build de produção**

Executar em `Front`: `npm run build`

Esperado: Vite termina com código de saída 0.

- [ ] **Etapa 2: Verificar todas as rotas e viewports**

Revisar `/`, `/sobre`, `/login` e `/painel` em 320 px, 375 px e desktop. Confirmar ausência de overflow horizontal; respostas bem-sucedidas das imagens; fontes carregadas sob CSP; foco, erro, seleção, sucesso e estados de status legíveis; e usabilidade em movimento reduzido.

- [ ] **Etapa 3: Confirmar escopo e estado dos commits**

Revisar `git diff --check` e `git status --short --branch`. Confirmar que não foram incluídas mudanças no backend, contratos de serviço/API, dependências, conteúdo comercial ou identidade. Informar se alguma rota autenticada não pôde ser verificada e o motivo.
