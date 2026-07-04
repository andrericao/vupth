# Handoff Front-Client → Backend

Pendências do app **cliente** que dependem do backend. O front já está pronto (ou pronto para consumir) em cada caso. Detalhe completo nos callouts do `PRD_FRONT-CLIENT.md`.

Última atualização: 2026-06-28 · branch `dev` do front-client.

---

## 1. Verificar a senha atual na troca de senha

**Hoje:** `PATCH /profile/update-password/me` recebe só `{ "password": "<nova>" }` (`PasswordRequest`) e o `UpdatePasswordUseCase` troca direto, **sem conferir a senha atual**.

**Precisa:**
1. Adicionar `currentPassword` ao `PasswordRequest` (`@NotBlank`).
2. No `UpdatePasswordUseCase`, validar `passwordEncoder.matches(request.currentPassword(), user.getPassword())` antes de trocar; se não bater → **401/403** ("senha atual incorreta").
3. Atualizar testes de integração + collection Postman + PRD_BACKEND (seção do endpoint).

**Depois:** o front envia `{ currentPassword, password }` e adiciona o campo "senha atual" na tela (decisão do usuário: verificação no backend, não via re-login).

---

## 2. Esqueci minha senha (forgot password)

**Precisa:** fluxo de recuperação para cliente **sem sessão** — endpoint para solicitar reset (código/e-mail) + endpoint para confirmar a nova senha com o código. Verificar se já existe; provavelmente não.

**Depois:** o front implementa a tela "Esqueci minha senha" no fluxo de login.

---

## 3. Avaliação de atendimento (Item 6 do PRD_BACKEND — hoje ⬜ aberto)

O **front já está pronto** (envio + exibição): `RatingModal` (1–5 estrelas + comentário) no atendimento concluído e nos cards FINISHED; `ratingService` chama `POST /attendances/{id}/rating`; `resolveRating` mostra a nota real quando vier, senão um placeholder.

**Precisa:**
1. `POST /attendances/{id}/rating` com `{ score: 1-5 (int), comment?: string }` — só o **cliente dono** do attendance, só com `status = FINISHED`, **1 voto** por attendance (409 no 2º), guest não avalia. (Entidade `AttendanceRating` + agregados `ratingSum`/`ratingCount` em `Professional` e `ServiceItem` — já especificado no Item 6.)
2. **Devolver no payload** `rating_average` (number|null) + `rating_count` (number):
   - **por profissional** em `GET /establishment/id/{id}/professionals-with-queue`;
   - **agregado por estabelecimento** em `GET /establishment` — a média da loja = **soma dos `ratingSum` ÷ soma dos `ratingCount`** dos profissionais da loja (média ponderada pelos votos; barato pois são poucos profissionais). *Isto é um complemento ao Item 6, que hoje só prevê agregados de profissional/serviço.*
   - **Card da loja (pedido do usuário 2026-06-29):** o card deve destacar o **melhor** — **menor tempo** (`estimated_wait_minutes`, já feito) + **MAIOR estrela** (loja "mais bem avaliada"). Então, além do `rating_average` agregado, devolver em `GET /establishment` a **maior nota entre os profissionais** da loja (ex.: `rating_best`: number|null) para exibir no card. **Ordenação (#11):** hoje é só por menor fila; considerar também a avaliação (ex.: desempate/boost por melhor avaliado) na ordenação da listagem.
3. (Opcional, recomendado) expor em `GET /attendances/client/me` se o atendimento **já foi avaliado** (ex.: `rated: boolean`), para o front esconder o "Toque para avaliar" após o voto. Hoje o front só descobre via 409 ao tentar.
4. (Pequeno) incluir **`establishmentName`** no `GET /attendances/client/me` (hoje só vem `establishmentId`). A tela de detalhes do atendimento quer mostrar "qual a loja" e não tem o nome.

**Granularidade alinhada com o usuário:** nota **por profissional** na tela do estabelecimento + nota **agregada** no card da loja.

---

## 4. WebSocket em tempo real — NÃO funciona hoje (pendência, "depois vemos")

O servidor WS é o **backend**, compartilhado por **client e partner** (mesmo endpoint STOMP; código quase idêntico com `@stomp/stompjs`). Hoje **nada chega** nos apps; tudo atualiza por **polling** (fallback já implementado no client: `refetchInterval` 60/20/30s + poll de status 30s). Análise (2026-06-29) — causas prováveis, todas de config, **sem custo e sem dependência nova**:

1. **Handshake exige auth e o RN não manda header no upgrade** — o app faz `new WebSocket(url)` sem headers; se o Spring Security protege `/ws/**`, o upgrade é barrado antes do STOMP. Fix: liberar o **handshake** de `/ws/**` (auth de verdade no CONNECT) e/ou o app passar o token no 3º arg do WebSocket (`{ headers: { Authorization } }`).
2. **`/user/queue/notifications` sem Principal** — eventos pessoais ("é a sua vez") usam `/user/**`, que exige o usuário na sessão STOMP. Fix: `ChannelInterceptor` no inbound que lê o JWT do frame **CONNECT**, valida (decoder existente) e `accessor.setUser(principal)`.
3. **SockJS vs WS cru** — `GET /ws/info` responde `{"websocket":true}` ⇒ backend usa `.withSockJS()`. `/ws/websocket` é o transporte cru do SockJS (deveria aceitar WS puro); se não, expor endpoint STOMP **cru** (`addEndpoint("/ws-native")` sem `.withSockJS()`).

**Diagnóstico grátis recomendado:** testar o mesmo backend por uma página HTML no navegador (STOMP → `/topic/establishment/{id}/queue`). Funciona no browser mas não no app ⇒ transporte do RN; não funciona em nenhum ⇒ config do backend.

**Nota de plataforma:** no **Render free** a instância **hiberna** e o WS **cai** quando dorme — então, no plano grátis, o **polling** tende a ser mais robusto que WS de qualquer forma. WS = melhoria futura; polling é a base.

---

## 5. Cliente trocar de lugar na fila — ✅ BACKEND ENTREGOU (#43 + #42)

**Resolvido (2026-07-03).** O backend entregou dois mecanismos:
- **#43 Remanejar:** `PATCH /attendances/{id}/reschedule?targetTime=<ISO>` (vira intenção de fila) + `PATCH /attendances/{id}/move-to-end`. **Front FEITO** (Item 16 do PRD_FRONT-CLIENT), aguarda teste no device.
- **#42 Troca por consentimento mútuo:** `POST /swap-requests`, `PATCH /swap-requests/{id}?accept=`, `GET /swap-requests/me`. **Front ainda NÃO construído** (pendência 10b do PRD) — depende de notificação; como o WebSocket não roda no device (seção 4), o front vai usar polling de `GET /swap-requests/me`.

## 6. Estender o strike de cancelamento tardio (#39) a reschedule/move-to-end

**Regra de negócio selada com o Andre (2026-07-03):** a multa não é definida pela ação, e sim pelo **prejuízo a quem se segue** — qualquer ação que **vaga um lugar perto do início** (ETA da própria vez **< 1h**) faz o próximo ser atendido antes do previsto → deve gerar strike. Regra pelo **tempo estimado, não pelo status**.

**Hoje:** o backend só registra `ClientPenaltyEvent`/`strikeCount` no `PUT /attendances/{id}/cancel` com ETA < 1h (#39, Fase 1).

**Precisa (backend):** aplicar o **mesmo strike** também em `PATCH /attendances/{id}/reschedule` e `PATCH /attendances/{id}/move-to-end` quando o ETA da vez do cliente for **< 1h**. A **troca #42** (consentimento mútuo) **nunca** gera strike (o tempo da fila não muda).

**Front já pronto:** a tela da fila **já avisa** o usuário da multa nessas três ações (sair, reagendar, ir pro fim) quando ETA < 1h. Falta só o backend efetivar o strike/cobrança (a cobrança monetária é a Fase 2 do #39, dep. gateway #21).
