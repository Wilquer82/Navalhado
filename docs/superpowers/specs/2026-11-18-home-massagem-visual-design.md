# Redesign visual do Navalhado inspirado no Home Massagem

**Status:** proposta aprovada em conversa; aguardando revisão desta especificação antes do plano de implementação.

## Objetivo

Atualizar o visual do frontend do Navalhado usando a paleta, a tipografia e algumas fotografias locais do projeto `home-massagem`, sem alterar a identidade, o conteúdo comercial ou os fluxos funcionais do Navalhado.

## Contexto e restrições

- O frontend atual é React/Vite e possui agendamento público (`/`), página Sobre (`/sobre`), login (`/login`) e painel autenticado (`/painel`).
- O Home Massagem fornece uma referência visual clara, com tons creme, verde-água, pistache e oliva, além de Cormorant Garamond e Montserrat.
- Os tokens CSS ativos em `home-massagem/index.html` são a referência principal. A paleta resumida em `LEIA-ME.txt` é diferente e não será mesclada.
- As fotografias devem ser usadas somente como apoio visual nas páginas públicas. Não copiar textos, logo, preço, contato ou identidade do Home Massagem; não usar fotografias no painel operacional.
- Manter as rotas, a lógica de agendamento, chamadas à API, autenticação, estados, dados, labels e mensagens existentes.
- O projeto tem uma CSP em `Front/index.html`; a inclusão das fontes Google exige permitir apenas os hosts de folha de estilo e arquivos de fonte necessários.

## Abordagens consideradas

1. **Recolorir apenas:** substituir as cores atuais, preservando todos os componentes e imagens. É o menor risco, mas não cumpre o pedido de reaproveitar imagens nem transmite plenamente a referência.
2. **Recriar as páginas no formato da landing page Home Massagem:** levar a estrutura, conteúdo e identidade do site de referência para o Navalhado. Isso descaracterizaria o produto e poderia confundir usuários sobre os serviços oferecidos.
3. **Tema visual compartilhado (recomendado):** estabelecer tokens e tipografia compartilhados, atualizar componentes existentes com ajustes de apresentação e aplicar fotografias locais somente às superfícies públicas. Preserva a experiência do produto e entrega a direção visual solicitada.

## Design escolhido

### Tema compartilhado

Definir tokens em `Front/src/styles.css` para os valores ativos da referência:

- verde-água `#7eb8a8` e claro `#a8d4c8`;
- pistache `#b8c9a3` e claro `#d4e0c4`;
- oliva `#6b7f4e` e escuro `#556640`;
- creme `#f7f9f4` e branco suave `#fbfcf8`;
- texto escuro `#2f3529` e texto secundário `#5a6352`.

Aplicar Cormorant Garamond a títulos e Montserrat à interface textual. Preservar fallback local. Atualizar a cor de tema do navegador para combinar com a superfície clara. Para carregar as fontes da mesma origem externa usada pela referência, permitir somente `fonts.googleapis.com` em `style-src` e `fonts.gstatic.com` em `font-src`.

Aplicar a paleta de forma consistente a fundo, cabeçalhos, cartões, estados selecionados, formulários, botões, calendário e painel; manter cores semânticas de sucesso, erro e WhatsApp reconhecíveis e com contraste legível. Não usar os mesmos adornos e fotografias no painel.

### Páginas públicas

- Reestilizar o fluxo existente de agendamento com os tokens, tipografia, cartões, botões, campos e estados de seleção do tema.
- Atualizar a página Sobre para a mesma linguagem visual, mantendo seus dados e estrutura funcional.
- Adicionar fotografias locais selecionadas do Home Massagem em posições decorativas da experiência pública, sem inserir imagens com texto promocional embutido. Usar `alt` apropriado, dimensões responsivas e carregamento adiado quando a imagem estiver abaixo da dobra.
- Usar `pexels-andrea-prochilo-3062027-31234759.jpg` como imagem ampla na experiência pública e `pexels-jonathanborba-19641817.jpg` como imagem vertical na página Sobre. Não copiar `foto-sobre.jpeg` ou `foto-extra.jpeg`, que incluem mensagens promocionais da outra marca.

### Login e painel

- Aplicar o mesmo tema claro, tipografia, controles e estados de foco/seleção ao login e ao painel para evitar que pareçam produtos distintos.
- Manter as informações operacionais densas e a hierarquia atual do painel; evitar fotografias de massagem e ornamentos que reduzam a legibilidade ou ocupem espaço dos controles.

## Arquivos e escopo

- `Front/src/styles.css`: tokens, tipografia, componentes existentes e regras responsivas.
- `Front/src/pages/Agendar.jsx`: ajustes de marcação/classe apenas onde necessários para a composição visual e fotografias.
- `Front/src/pages/Sobre.jsx` e `Front/src/pages/Login.jsx`: remover estilos inline visuais substituíveis por classes sem mudar comportamento.
- `Front/src/pages/Painel.jsx`: somente ajustes de classe/estrutura visual indispensáveis; lógica permanece intacta.
- `Front/index.html`: fontes, política CSP mínima e cor de tema.
- `Front/public/`: somente cópias das imagens selecionadas, com nomes consistentes e sem incluir vídeos ou peças promocionais completas.

Não instalar dependências. Criar e trabalhar em um branch próprio baseado na branch atual `Front`, com o nome `feat/home-massagem-visual`.

## Acessibilidade e responsividade

- Manter foco visível, labels e semântica existente; não depender somente de cor para indicar seleção, erro ou sucesso.
- Respeitar `prefers-reduced-motion` e manter animações discretas.
- Preservar usabilidade em telas estreitas, incluindo viewport de 320 px, sem overflow horizontal; testar também 375 px e desktop.
- Garantir contraste adequado entre texto, fundo, controles e estados.

## Verificação

1. Executar `npm run build` em `Front`.
2. Abrir as rotas públicas e autenticadas no navegador e conferir visualmente em 320 px, 375 px e desktop.
3. Verificar carregamento das fontes e imagens com a CSP ativa, ausência de imagens quebradas e ausência de overflow horizontal.
4. Confirmar que os controles e estados existentes de agendamento, login e painel continuam presentes e que não houve mudanças de API ou conteúdo.

## Fora de escopo

- Alterar serviços, horários, descrições, preços, contatos, logo, dados ou marca do Navalhado.
- Reescrever a jornada de agendamento, reformular a arquitetura do painel ou alterar contratos de API.
- Copiar textos, layout integral, materiais de redes sociais ou vídeos do Home Massagem.
- Executar deploy ou alterar backend.
