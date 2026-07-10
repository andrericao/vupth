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

## 7. Troca de posição como OFERTA ABERTA (rework do #42) — pedido do Andre — = S3 (front-partner)

> **Alinhamento:** este é o mesmo handoff que o **PRD front-partner** rastreia como **S3** ("oferta ABERTA de troca" / marketplace C6). Manter os dois em sincronia; quando o backend incorporar na lista dele, atualizar ambos.

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

## 8. Agendar respeitando fechamento e refeições (barreira de horário) — aparentada de BUG5 / S4 (front-partner)

> **Alinhamento:** o **PRD front-partner** já rastreia **BUG5** (backend não auto-fecha no `closing_time` / não expõe `is_open` efetivo) e **S4** (refeições Modelo B). Esta barreira é um **requisito NOVO e distinto** — validar o **alvo do `reschedule`** contra fechamento/refeição — mas usa os mesmos dados. Incorporar junto de BUG5/S4 na lista do backend.

**Regra de negócio (Andre 2026-07-03).** Ao **agendar / reagendar** (`reschedule`), o cliente **não pode** escolher um horário:
- **após o fechamento** do estabelecimento (se `closing_time = 20:00`, não pode marcar 20:01), nem
- **durante uma refeição/intervalo** do profissional (almoço/janta).

**Hoje o backend não bloqueia isso no `reschedule`** — a trava atual (`422 QUEUE_TARGET_NOT_FEASIBLE`) é só sobre a **previsão da fila**, não sobre horário de funcionamento nem refeição. O `closing_time`/`opening_time` já existem (`EstablishmentResponse`) e as refeições estão em `GET .../intervals`, mas o `assignAgendaSlot`/`isTargetFeasible` **não** os considera.

**Precisa (backend, autoritativo):**
1. **Fechamento = BLOQUEIA.** Rejeitar `PATCH /attendances/{id}/reschedule?targetTime=` (e o ingresso com `targetTime` do #40) quando o alvo cair **após `closing_time`** — novo erro (ex.: `422 QUEUE_TARGET_OUTSIDE_HOURS`) para o front exibir "escolha um horário dentro do funcionamento".
2. **Refeição = NÃO bloqueia, empurra pra depois.** Se o alvo cair **dentro de uma refeição/intervalo**, o cliente é agendado **após o intervalo** (não recusar). Regra de negócio do Andre (2026-07-03): *"se ele agendar 12:30, é avisado que será atendido após o intervalo; e se alguém já pediu para cortar depois do almoço, o estimado dele é pós-almoço + o tempo de quem pediu antes dele para depois do intervalo."* Ou seja, o **estimado tem de ser meal-aware e contar os outros já posicionados após a refeição** — **só o backend calcula** (o front não tem essa fila). A resposta deve trazer o `scheduledTime`/estimado real + um indicador (ex.: `placedAfterBreak: true`) para o front exibir "você será atendido após o intervalo, por volta de HH:MM".

**Front (já feito):** o `RescheduleModal` agora é um **formulário** (o cliente digita HH:MM, sem sugestões) com validação básica (formato + após o fim da fila). A validação de fechamento (bloqueio) e o comportamento de refeição (empurrar + estimado meal-aware) **dependem deste handoff** — o front consome os novos erros/indicadores quando o backend expuser. Dados já disponíveis: `closing_time` (`EstablishmentResponse`) e refeições (`GET .../intervals`).

## 9. Cliente adicionar mais serviço quando JÁ está na fila — endpoint client pendente

**Pedido do Andre (2026-07-04).** O cliente que já está na fila (atendimento `SCHEDULED`) quer **adicionar mais serviço(s)** ao próprio atendimento, sem sair e re-entrar.

**Hoje NÃO dá:** o único endpoint de adicionar serviço é `POST /professional-queue/{professionalId}/add-service-items` — role **PROFESSIONAL** e mexe no **catálogo do profissional**, não no atendimento do cliente. Não há endpoint **CLIENT** para acrescentar service items a um atendimento existente.

**Precisa (backend):** endpoint CLIENT tipo `PATCH /attendances/{id}/service-items` (ou `POST .../add-services`) — só o **dono** (clientId do JWT), só em `SCHEDULED`, que **acrescenta** serviceItemIds ao atendimento e **recalcula** `totalValue` + `estimatedTotalMinutes` (e reflete na fila/ETA). Resposta = `AttendanceInQueueResponse` atualizado. Definir se remover serviço também é permitido.

**Front (quando pronto):** na `QueueStatus`, botão "Adicionar serviço" → abre a seleção (reusa a lista de `ServiceSelection`) → chama o endpoint → atualiza o atendimento na tela.

## 10. Atendimento PAUSED fica órfão (profissional não vê/retoma) — backend + partner

**Bug reportado pelo Andre (2026-07-04).** O profissional **pausa** um atendimento (`PATCH /attendances/{id}/pause`: IN_PROGRESS → PAUSED) e depois **não consegue mais retomar nem iniciar outro** com aquele cliente — *"na tela do profissional não há resquício, é como se o atendimento não estivesse mais vinculado a ele"*. No client, o atendimento continua ativo.

**Causa provável:** a fila do profissional (`GET /client-queue/{professionalId}/queue` → `QueueResponse`) expõe `attendancesInQueue` (os SCHEDULED em espera) e `inAttendance` (o **IN_PROGRESS** atual). O **PAUSED não é nenhum dos dois** → some da visão do profissional. Como PAUSED é status **ativo** (bloqueia fechar loja / desvincular), o atendimento fica "preso" sem UI para retomar.

**Precisa:**
- **Backend:** o `QueueResponse` (ou um campo dedicado) deve **incluir o atendimento PAUSED** para o profissional dono — hoje ele desaparece. Confirmar também que `/resume` funciona a partir do estado real.
- **Front-partner:** exibir o atendimento **PAUSED** na fila com botão **"Retomar"** (`PATCH /attendances/{id}/resume`) e/ou "Encerrar". (Provável que o partner só renderize `inAttendance` quando IN_PROGRESS.)

**Front-client (já feito):** a tela da fila agora mostra **"Atendimento pausado"/"Pausado"** em vez de "Agora" (antes confundia o cliente). O resto é backend+partner.

## 11. Estabelecimento fechado aparece na Home — manifestar interesse / agendar para a reabertura

**Pedido do Andre (2026-07-10).** A Home passou a listar **estabelecimentos abertos E fechados** (antes só abertos, exceto durante busca). Motivo: o cliente pode querer **manifestar interesse / agendar** para quando o estabelecimento **reabrir**, mesmo estando fechado agora.

**Front (já feito):** `filterEstablishments` não esconde mais os fechados; a ordenação (`sortEstablishments`) joga os fechados pro fim (sem `estimated_wait_minutes` → por último). O card mostra badge **"Fechado"** e **sem** tempo de espera. O filtro por disponibilidade (`estimated_wait_minutes === null` = esconder) passou a valer **só para as ABERTAS** — na fechada o wait é irrelevante, então ela sempre aparece.

**Precisa (backend) — 2 pontos:**
1. **⬜ PENDENTE (bloqueia o front) — expor `available_professionals` na LISTAGEM `GET /establishment`.** Regra do Andre (2026-07-10): estabelecimento **fechado só deve aparecer se tiver profissional afiliado COM serviço** (pra o cliente **agendar** pra reabertura) — *"de nada adianta ver um estabelecimento que nem profissional filiado tem"*. Hoje a listagem NÃO devolve contagem de profissionais; `estimated_wait_minutes` vem `null` tanto pra "fechada" quanto pra "sem profissional" — o front **não consegue distinguir**. O endpoint de **detalhe** (`GET /establishment/id/{id}/professionals-with-queue`) já tem `available_professionals`, mas o front **não pode chamar o detalhe de cada loja** na Home (N requisições). ⚠️ **Semântica crítica:** na listagem, o campo tem de contar **profissionais AFILIADOS com ≥1 `service_item` (agendáveis), independente de `open_status`/`is_available`** — uma loja fechada com equipe deve reportar **número positivo** (senão o `is_available=false` do fechamento zeraria a conta e sumiria com o que a gente quer mostrar). Nome sugerido pra listagem: `available_professionals` (mesmo do detalhe) OU `bookable_professionals` se preferir deixar a semântica explícita. **Front (já pronto):** o tipo `Establishment` já tem `available_professionals?`; `filterEstablishments` só mostra a fechada quando `available_professionals > 0`. **Interim:** enquanto o campo não vem (undefined), o front **esconde TODAS as fechadas**; quando o backend expuser, as fechadas-com-profissional aparecem sozinhas, sem mudança de código no front.
2. **Endpoint de manifestar interesse / agenda (quando fechado).** É a mesma família da seção "Agenda e manifestação de interesse" do PRD: o cliente escolhe um dia/horário futuro e **manifesta interesse** (status PENDENTE), o profissional confirma antes de virar fila. Contrato a definir (ex.: `POST /attendances/intent { establishmentId, professionalId, serviceItemIds, targetDay }`). Enquanto não existir, o front mostra o aviso **"em breve você poderá manifestar interesse para a próxima abertura"** e bloqueia entrar na fila com a loja fechada.
