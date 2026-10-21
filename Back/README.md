# Lembretes por notificação do navegador

O backend envia uma notificação push 15 minutos antes do horário, sem usar WhatsApp. O cliente precisa autorizar notificações no navegador ao confirmar o agendamento. O lembrete é enviado apenas depois que o profissional confirma o agendamento; o navegador precisa aceitar notificações push.

Configure as variáveis de ambiente:

- `VAPID_PUBLIC_KEY`: chave pública VAPID.
- `VAPID_PRIVATE_KEY`: chave privada VAPID (mantenha em segredo).
- `VAPID_SUBJECT`: contato do responsável, por exemplo `mailto:contato@navalhado.com`.
- `VITE_VAPID_PUBLIC_KEY`: a mesma chave pública VAPID, configurada no frontend durante o build.

Gere um par de chaves com `npx web-push generate-vapid-keys --json` na pasta `Back`. Configure a chave pública como `VAPID_PUBLIC_KEY` no backend e `VITE_VAPID_PUBLIC_KEY` no frontend; configure a chave privada somente como `VAPID_PRIVATE_KEY` no backend. No Render, defina os valores nos serviços correspondentes e faça um novo deploy para o frontend incorporar a chave pública.

O serviço verifica os lembretes a cada minuto, tenta novamente até três vezes em caso de falha e registra o resultado no agendamento. A permissão do navegador é opcional; sem assinatura válida, o cliente não recebe notificação.
