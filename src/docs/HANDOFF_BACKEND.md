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
- **#42 Troca por consentimento mútuo (DIRECIONADO):** `POST /swap-requests` `{proposerAttendanceId, targetAttendanceId}`, `PATCH /swap-requests/{id}?accept=`, `GET /swap-requests/me`. Backend PRONTO, mas ver a **seção 7** — o modelo desejado pelo Andre é **oferta ABERTA** (não direcionada), que precisa de mudança no backend. O front do modelo direcionado foi **removido** (não era o fluxo desejado).

## 6. Estender o strike de cancelamento tardio (#39) a reschedule/move-to-end

**Regra de negócio selada com o Andre (2026-07-03):** a multa não é definida pela ação, e sim pelo **prejuízo a quem se segue** — qualquer ação que **vaga um lugar perto do início** (ETA da própria vez **< 1h**) faz o próximo ser atendido antes do previsto → deve gerar strike. Regra pelo **tempo estimado, não pelo status**.

**Hoje:** o backend só registra `ClientPenaltyEvent`/`strikeCount` no `PUT /attendances/{id}/cancel` com ETA < 1h (#39, Fase 1).

**Precisa (backend):** aplicar o **mesmo strike** também em `PATCH /attendances/{id}/reschedule` e `PATCH /attendances/{id}/move-to-end` quando o ETA da vez do cliente for **< 1h**. A **troca #42** (consentimento mútuo) **nunca** gera strike (o tempo da fila não muda).

**Front já pronto:** a tela da fila **já avisa** o usuário da multa nessas três ações (sair, reagendar, ir pro fim) quando ETA < 1h. Falta só o backend efetivar o strike/cobrança (a cobrança monetária é a Fase 2 do #39, dep. gateway #21).

## 7. Troca de posição como OFERTA ABERTA (rework do #42) — pedido do Andre

**Regra de negócio (Andre 2026-07-03).** A troca desejada **não** é direcionada (escolher um cliente específico). O modelo certo:
- O cliente abre uma **solicitação de troca** dizendo a **direção** (adiantar ou atrasar a vez) e **em até quanto tempo** (ex.: "adiantar em até 30 min", "atrasar em até 1h").
- A solicitação fica **"boiando" (aberta)** — **qualquer cliente elegível** da mesma fila pode aceitar. **O app não faz o match — é na sorte.**
- A oferta **só aparece para quem faz sentido**: se A quer **adiantar**, só interessa a quem está **à frente** dele (que aceitaria atrasar); se quer **atrasar**, só a quem está **atrás**.
- **Nunca gera multa** (a troca não muda o tempo total da fila).
- Se **ninguém aceitar**, o cliente recorre às alternativas do #43: **ir pro fim** ou **agendar para depois**.

**O #42 atual não atende isso** — ele é 1-a-1 (proposer escolhe um target). Precisa de um modelo de **oferta aberta**, algo como:
- `POST /swap-offers` `{ attendanceId, direction: EARLIER|LATER, maxMinutes }` — cria a oferta aberta (só o dono do attendance; só SCHEDULED).
- `GET /swap-offers` (na fila do cliente) — lista as ofertas **abertas de outros** que o cliente pode aceitar (filtradas por elegibilidade de direção/posição).
- `PATCH /swap-offers/{id}/accept` — o cliente aceita uma oferta aberta; o backend troca os `scheduledTime` dos dois (reusando a máquina do #42), expira a oferta e notifica.
- **Expiração por evento** (como o #42 já faz): a oferta aberta **"morre" (CANCELLED)** quando o atendimento do dono **vai para IN_PROGRESS** (`start`) ou sai da fila (cancel/leave/remove). Confirmado pelo Andre 2026-07-03: *"quando o status muda para IN_PROGRESS a solicitação de troca, se não foi atendida, deve morrer."*

**Enquanto isso, o front (Item "Mudar minha vez"):** já entrega **Atrasar → (ir pro fim / agendar)** com o #43; a opção **"Trocar"** está marcada como **"em breve"** aguardando este endpoint. **Avisar o front quando estiver pronto** com o contrato final.

## 8. Agendar respeitando fechamento e refeições (barreira de horário)

**Regra de negócio (Andre 2026-07-03).** Ao **agendar / reagendar** (`reschedule`), o cliente **não pode** escolher um horário:
- **após o fechamento** do estabelecimento (se `closing_time = 20:00`, não pode marcar 20:01), nem
- **durante uma refeição/intervalo** do profissional (almoço/janta).

**Hoje o backend não bloqueia isso no `reschedule`** — a trava atual (`422 QUEUE_TARGET_NOT_FEASIBLE`) é só sobre a **previsão da fila**, não sobre horário de funcionamento nem refeição. O `closing_time`/`opening_time` já existem (`EstablishmentResponse`) e as refeições estão em `GET .../intervals`, mas o `assignAgendaSlot`/`isTargetFeasible` **não** os considera.

**Precisa (backend, autoritativo):** rejeitar `PATCH /attendances/{id}/reschedule?targetTime=` (e o ingresso com `targetTime` do #40) quando o alvo cair **após `closing_time`** ou **dentro de uma refeição/intervalo** do profissional — novo código de erro (ex.: `422 QUEUE_TARGET_OUTSIDE_HOURS` / `..._DURING_BREAK`) para o front exibir a mensagem certa.

**Front (a fazer quando o backend expuser/confirmar):** o seletor de horário (`generateTimeSlots` no `RescheduleModal`) deve **filtrar os slots** — não gerar horários após o `closing_time` nem dentro das refeições, usando `closing_time` (já exposto) + `GET .../intervals`. Hoje o seletor gera slots fixos de 30min sem essa consciência (gap conhecido).
