# Navalhado Cortes — design das melhorias incrementais

## Objetivo e limites

Entregar as 11 melhorias solicitadas sem interromper o agendamento existente, com APIs validadas no backend, telas compatíveis com o visual atual e entregas pequenas verificáveis. A agenda deve continuar usando o fuso `America/Sao_Paulo`; profissionais comuns permanecem limitados aos próprios dados e o admin mantém visão geral.

Esta especificação não autoriza mudanças de código. Cada incremento terá uma proposta curta com arquivos, comportamento e validação, seguida de aprovação explícita antes da implementação.

## Estado atual relevante

- Frontend React/Vite: `Front/src/pages/Agendar.jsx`, `Front/src/pages/Painel.jsx` e `Front/src/pages/ProdutosVendas.jsx`.
- Backend Express/Mongoose: `Back/routes`, `Back/models` e `Back/services/agenda.js`.
- `Appointment` já guarda telefone, observações, pagamento e status; estados existentes incluem `pendente`, `confirmado`, `concluido` e `cancelado`.
- `Profissional` já guarda `foto`, `descricao` e uma lista `servicos` com preço e duração por profissional.
- `Bloqueio` já contempla bloqueio por data ou dia da semana, intervalo opcional e motivo.
- O lembrete atual é push do navegador; WhatsApp deve ser uma ação separada, sem substituir push.
- Os chats do projeto compartilham um working tree. Arquivos compartilhados terão um único responsável por fase; commits e builds serão coordenados após os handoffs.

## Arquitetura proposta

### Contratos e regras de domínio

1. **Agendamento e disponibilidade**
   - Reutilizar `Appointment` e a validação central de `services/agenda.js`; criação pública e manual devem passar pela mesma verificação de expediente, folga, bloqueio, duração, intervalo e conflitos.
   - Fazer a migração de estados de forma compatível: `pendente` → `agendado`, `concluido` → `finalizado`; manter `confirmado` e `cancelado`; preservar registros desconhecidos para revisão em vez de descartá-los.
   - Persistir observação opcional com limite razoável e escapar/validar todos os dados de entrada no servidor.
   - O resumo público deve usar os valores efetivamente escolhidos, mas a API é a fonte de verdade para preço, duração, disponibilidade e profissional.

2. **Serviços por profissional**
   - Manter o vínculo existente em `Profissional.servicos` como fonte de preço e duração daquele profissional.
   - Um serviço sem vínculo ativo com nenhum profissional pode ser tratado como global; quando houver pelo menos um vínculo, só profissionais vinculados podem oferecê-lo.
   - Aplicar a mesma regra em listagem pública, validação do agendamento e formulário manual. Não confiar apenas no filtro de interface.

3. **Perfil profissional**
   - Reutilizar `foto`; separar `especialidade` de `descricao` apenas com compatibilidade dos dados legados.
   - Adicionar bio curta validada no servidor (máximo 120 caracteres) e apresentada de forma opcional.
   - Primeira entrega aceita URL de foto, que atende à alternativa solicitada. Upload só será incluído se for definida uma infraestrutura de armazenamento segura; não guardar binário em MongoDB.

4. **WhatsApp**
   - Gerar URLs `wa.me` com texto codificado e telefone normalizado, incluindo nome do cliente, serviço, profissional, data/hora e salão. Confirmação e lembrete usam textos distintos.
   - O sistema não consegue inferir que uma mensagem aberta pelo `wa.me` foi efetivamente enviada. Após a ação externa, o usuário/admin registra explicitamente o envio; guardar timestamp e tipo de mensagem, sem guardar transcrição desnecessária.
   - A ação de sucesso do agendamento abre WhatsApp do cliente quando o número de contato do salão estiver configurado. Erros de configuração devem ser mostrados, não produzir links inválidos.

5. **Comissão e balanço**
   - Comissão padrão: 50%, configurável por profissional e validada entre 0 e 100.
   - Contabilizar serviço somente quando o agendamento estiver finalizado/concluído; cancelados, ausências e pendentes não geram comissão.
   - Guardar no agendamento snapshots do valor e percentual usados na finalização para que alterações futuras no cadastro não reescrevam períodos antigos.
   - Exibir total de serviços finalizados, comissão do profissional e parcela do salão (`total - comissão`), filtrados por período e escopo autorizado.
   - Separar receitas de serviços de vendas de produtos e impedir dupla contagem. Registros antigos sem snapshot não devem ganhar comissão histórica inventada; expor/identificar essa limitação.

6. **Histórico e fidelidade**
   - Associar cliente por telefone normalizado; não exigir conta para manter histórico.
   - O histórico é consultado a partir dos agendamentos finalizados, com os últimos cinco atendimentos, evitando uma segunda cópia da mesma informação.
   - Adicionar pontos de cliente indexados por telefone normalizado. Cada agendamento finalizado soma exatamente um ponto, de forma idempotente mesmo se a atualização de status for repetida.
   - A cada 10 pontos, liberar um benefício. No resgate, o admin escolhe corte grátis ou desconto e registra a ação. Admin pode corrigir/zerar pontos com confirmação e motivo.

7. **Bloqueios**
   - Unificar horário específico, intervalo e dia inteiro no mesmo contrato de bloqueio; recorrência semanal usa dia da semana, com início e término opcionais.
   - Guardar motivo opcional e respeitar bloqueios tanto na listagem de horários quanto na validação final da reserva.
   - Bloqueios antigos continuam válidos. Atualizar índices/consultas após definir o formato final e cobrir datas limítrofes em testes.

8. **Lista de espera**
   - Criar registros com nome, telefone normalizado, serviço e profissional opcional, além de timestamps/status.
   - Não expor a lista administrativa a usuários públicos nem permitir notificação sem ação do operador.
   - A notificação abre uma mensagem `wa.me`; marcar como notificada somente após confirmação manual. Remoção deve ser rastreável.

9. **Segurança e recuperação**
   - Aplicar mínimo de oito caracteres tanto ao criar quanto ao trocar senha; manter hashes com bcrypt e invalidar/rotacionar credenciais conforme o fluxo existente.
   - Detectar a senha padrão legada `1234` por comparação com o hash existente; após login, exigir troca antes de liberar o painel. Nunca armazenar senha em claro nem introduzir nova credencial padrão universal.
   - Recuperação usa token aleatório de uso único, armazenado como hash e com expiração; a resposta não revela se o e-mail existe.
   - Envio de e-mail depende de SMTP configurado por variáveis de ambiente. Sem provedor, não simular sucesso: endpoint deve informar indisponibilidade sem expor dados da conta.
   - Log de ações administrativas fica fora do primeiro corte, salvo necessidade identificada durante implementação.

## Experiência por fluxo

- **Público:** selecionar profissional e serviços elegíveis; exibir foto/especialidade/bio; escolher disponibilidade real; informar nome, telefone e observação; revisar profissional, serviço, preço, duração, data/hora e dados; confirmar; ver resumo e ação de WhatsApp.
- **Admin:** visualizar e alterar dados de perfil; criar agendamento com profissional, serviço, data, horário carregado da disponibilidade real, nome, telefone e observação; consultar histórico; gerir estados, lembretes, bloqueios, espera, comissão e fidelidade.
- **Profissional:** visualizar somente seus dados; balanço mostra serviços finalizados, comissão e parcela do salão do próprio profissional.
- **Falhas:** erros de API, conflito de horário, falta de configuração de e-mail/telefone e indisponibilidade de horários aparecem com mensagens explícitas; não usar resposta vazia como sucesso.

## Fases e responsáveis

As fases são seriais por causa do working tree compartilhado:

0. Fechar as tarefas já iniciadas: correção de acesso admin, datas, status do agendamento e UI administrativa existente. A conversa que edita `Painel.jsx` continua única responsável por esse arquivo.
1. **Fundação de agenda e contratos:** validar associação profissional-serviço, preço/duração por profissional, disponibilidade e bloqueios; definir DTOs e testes de regras no backend.
2. **Fluxos de reserva:** completar agendamento manual e revisão/confirmação pública usando os contratos da fase 1.
3. **Perfil e mensagens:** completar foto URL, especialidade/bio, links de confirmação/lembrete e estado de envio manual.
4. **Financeiro e relacionamento:** snapshots de comissão, balanço de finalizados, histórico e fidelidade idempotentes.
5. **Lista de espera:** persistência, gestão administrativa e notificação manual com WhatsApp.
6. **Autenticação:** política de senha, troca obrigatória e recuperação por e-mail; testar configuração ausente e token expirado/reutilizado.
7. **Integração final:** build frontend, validações backend e regressões públicas/admin/profissional; revisar todos os diffs antes de integrar.

Responsabilidades provisórias:

- Conversa de acesso admin: concluir a correção original e, depois, item 11 somente quando as fases anteriores e a proposta específica forem aprovadas.
- Conversa de backend/status: contratos, validações e modelos/API, sem editar telas.
- Conversa de datas/fluxo público: concluir a correção original; futuramente, somente `Agendar.jsx` e componentes próprios.
- Conversa canônica de UI: concluir a UI existente e, futuramente, somente `Painel.jsx`, estilos e componentes administrativos.
- Conversa coordenadora: handoffs, verificação do working tree e integração, sem editar os arquivos de produto em paralelo.

Cada fase começa com um resumo de arquivos e comportamento para o usuário. Nenhuma conversa inicia a fase seguinte antes do handoff explícito e da aprovação do respectivo incremento.

## Migração, compatibilidade e validação

- Fazer alterações aditivas e compatíveis com documentos MongoDB antigos; fornecer defaults para campos novos e scripts idempotentes quando backfill for necessário.
- Não reescrever histórico financeiro com o preço atual de um serviço.
- Testes backend devem cobrir disponibilidade e conflito de horário, serviço global versus vinculado, bloqueios recorrentes/intervalos, autorização admin/profissional, transição repetida para finalizado e cálculos de comissão/pontos.
- Build frontend deve validar os fluxos públicos e administrativos; quando não houver suíte automatizada no pacote, executar verificações direcionadas e relatar claramente o que não foi testado.
- Antes da integração, revisar o diff completo e confirmar que alterações preexistentes das outras conversas foram preservadas.

## Premissas para revisão

- A divisão e a ordem serial foram aprovadas pelo usuário com “divida e comece”.
- WhatsApp será manual via `wa.me`, com estado de envio confirmado pelo operador; não haverá automação pela WhatsApp Business API neste escopo.
- Foto por URL é a primeira entrega; upload fica condicionado à escolha de armazenamento.
- Agendamentos antigos sem snapshot não terão comissão retroativa estimada.
- Bloqueios recorrentes serão semanais; data final será opcional (sem data final significa recorrência contínua até remoção).
- Recuperação de senha usará SMTP configurável por ambiente; a implementação ficará inativa até a configuração segura do provedor.
- Benefício de fidelidade será liberado a cada 10 pontos; o admin escolhe corte grátis ou desconto no resgate.
- Cada incremento ainda exige apresentação breve de arquivos/comportamento e aprovação explícita antes de codificar, conforme pedido do usuário.
