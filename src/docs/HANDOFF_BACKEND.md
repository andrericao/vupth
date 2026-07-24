# Handoff Front-Client → Backend

Pendências do app **cliente** que dependem do backend. O front já está pronto (ou pronto para consumir) em cada caso. Detalhe completo nos callouts do `PRD_FRONT-CLIENT.md`.

Última atualização: **2026-07-23** · branch `dev` do front-client.

---

## 📌 QUADRO GERAL — pendências e desalinhamentos por equipe (2026-07-22)

> Consolidado após a reconciliação com o lote do backend de 2026-07-22 e com o partner. **Cada equipe: ler a sua coluna.** Detalhes nas seções indicadas.

### 🔴 BACKEND — pedidos abertos do client
> ✅ **Reconciliação 2026-07-23 confirmada no PRD_BACKEND:** os três pedidos abaixo foram **incorporados na fonte única** do backend (a nota stale do `/swap-offers` foi corrigida). Seguem **abertos** (a construir), mas **não são mais desalinhamento** — só aguardam implementação.
| # | Pedido | Seção | Situação |
|---|--------|:-----:|----------|
| B1 | **`/swap-offers` (troca aberta, C13)** — ✅ **REGISTRADO pelo backend (2026-07-23) como item #5 "Troca de posição como OFERTA ABERTA (`/swap-offers`) — Client C13 / Partner S11"**; nota stale de 2026-07-07 corrigida. Contrato (§7) copiado para lá. **Aguarda construção** — a UI da troca (F8) segue bloqueada até vir | 7 | ⬜ aberto (registrado) |
| B2 | **`GET /attendances/intentions/professional/{id}` público com blocos ANÔNIMOS** — ✅ **REGISTRADO como backend item #6**. **Shape que o front consome (F5):** `{ frame: { projectedQueueEnd, openingTime, closingTime }, blocks: [{ start: ISO-8601, durationMinutes }] }` — **blocos SEM dados pessoais** (só início+duração dos agendamentos de terceiros daquele profissional/dia). Com isso o front calcula os **horários disponíveis** (`computeAvailableSlots`, já pronto+testado no client) e mostra só os que cabem | 12 | ⬜ aberto (registrado) |

> **🎨 UX do F5 fechada (Andre 2026-07-23) — LISTA DE HORÁRIOS, não arrastar.** Em vez da barra de arrastar a "sombra", o app **mostra só os horários em que o serviço cabe** e o cliente toca num. Regra (exemplo do Andre): fila até 14:00 + corte de outro cliente às 17:00 + serviço de 1h → oferece 14:00…16:00 (16:00+1h=17:00, encosta sem invadir) e depois do corte até o fechamento. O **cálculo é do front** (`src/domain/schedule/slots.ts`, `computeAvailableSlots` — piso/fechamento/blocos/duração → horários, alinhado à grade local; já testado com o exemplo). **Só falta o B2 entregar os `blocks`** (o `client/me` só traz os do próprio cliente). No dia de HOJE o piso = `max(agora, projectedQueueEnd)`; dia futuro = `openingTime`.
| B3 | **Validar SMTP real (Brevo) + investigar o REENVIO** do esqueci-senha — ✅ **backend registrou o reforço** (item #1, "falta testar + investigar reenvio"). Front já corrigiu a UX (cold-start gate + feedback) | 2 | 🔧 backend investiga |
| B4 | Já na fonte única do backend (só lembrar a prioridade do client): validação do alvo do `reschedule` (janela+refeição) · estender strike a `reschedule`/`move-to-end` ETA<1h · adicionar serviço a attendance na fila (C8) | 8/6/9 | ⬜ abertos lá |

**🔗 Regras cross-cutting novas (partner/backend, o client precisa saber):**
- **ETA com buffer de −10min (S10 partner, regra GLOBAL):** o **backend** calcula o tempo de espera **já com −10min** (piso 0) para o cliente chegar antes; **client e partner só EXIBEM o número** que vier — **NÃO subtrair no front** (evita divergência). O client já mostra `estimated_wait_minutes` como veio (nenhuma lógica de buffer a adicionar). Só ficar atento se o backend expuser `display_wait` vs `raw_eta` em campos separados.
- **BUG2 fuso horário (corrigido no partner 2026-07-23):** o partner mandava horário local rotulado "Z"(UTC), deslocando janelas de funcionamento/refeições em −3h. O **client apenas consome o `is_open` efetivo** (calculado no backend) e `opening/closingTime` — não envia esses horários, então não tem a mesma raiz; mas **registros antigos precisam ser re-salvos** (pelo partner) — até lá, `is_open`/janelas de lojas antigas podem vir errados. Sem ação no client, só ciência.

### 🟢 FRONT-CLIENT — a fazer (nossa equipe), por prioridade
| # | Tarefa | Ref | Status |
|---|--------|-----|--------|
| F1 | **`EditPassword`**: campo "senha atual" (`{current_password, password}`) + exceção no interceptor 401 (`CURRENT_PASSWORD_INVALID` = erro de campo, NÃO logout) | §1 / PRD H1 | ✅ **FEITO 2026-07-22** |
| F2 | **Tratar `ATTENDANCE_PROMOTED`/`CANCELLED`/`CUT_*`** no WS — handler puro `handleQueueNotification` (⚠️ entrega in-app é melhor-esforço: WS só conecta com fila ativa + client sem push token, ver F9) | §12 | ✅ **FEITO 2026-07-22** |
| F3 | **Tela "Esqueci minha senha"** (e-mail → código 6 dígitos → nova senha); `esqueci_senha` saiu do "em breve". **2026-07-23:** + gate de cold start (`waitForBackend` antes do envio — o botão penava com o Render hibernado) e feedback no reenvio ("Reenviando…"/"Código reenviado!") | §2 / PRD H2 | ✅ **FEITO** (e-mail do reenvio ← B3) |
| F4 | **"Meus agendamentos"** — seção AGENDAMENTOS na aba Atendimentos (`client/me` agrupado por dia, cancelar com confirmação; editar horário fica com a barra F5) | §12 | ✅ **FEITO 2026-07-22** |
| F5 | **Agendar = LISTA DE HORÁRIOS** (modelo Andre 2026-07-23, substitui a barra de arrastar): mostra só os horários em que o serviço cabe → cria INTENÇÃO. **Núcleo pronto+testado** (`computeAvailableSlots`, `src/domain/schedule/slots.ts`) + `intentionsService.create` pronto. **UI e ligar aguardam o B2** entregar os `blocks` de terceiros (só o `client/me` tem os próprios). Shape do B2 registrado abaixo | 12 / B2 | 🟡 **núcleo FEITO / UI aguarda B2** |
| F6 | **Solicitar corte** — (a) `409 ESTABLISHMENT_NOT_OPEN` no QueueStatus oferece o corte; (b) **2026-07-23:** loja fechada libera o fluxo até os serviços com botão **"Solicitar corte" DIRETO** na ServiceSelection | PRD H10 | ✅ **FEITO** |
| F7 | **Validar no device** — parcial: esqueci-senha ✅; restam: fechadas na Home (badge AGENDAR), fluxo corte, meus agendamentos, trocar senha, visitante | §11 | 🔜 Andre |
| F8 | **UI da troca** ("Trocar"+dot, criar/aceitar/cancelar ofertas) — 🔒 bloqueada até **B1** | §7 | 🔒 |
| F9 | **Push token no client** — 🟡 **NÚCLEO FEITO 2026-07-23 (OTA-safe, testado):** `domain/push.ts` (mapPlatform, deviceDeletePath url-encodado, notificationRoute, acquireExpoPushToken com DI) + `pushService` (register/unregister `/devices`) + logout desregistra. **FALTA p/ ATIVAR (exige `eas build`):** `expo install expo-notifications expo-device` + plugin no `app.json` + hook nativo `usePushRegistration` (guardado try/catch) + ligar no `App.tsx`. Backend `/devices` PRONTO | PRD_BACKEND push | 🟡 núcleo feito / nativo aguarda build |

**🎨 Decisões de UX registradas em 2026-07-23 (sessão de feedback no device):**
1. **Loja fechada (fila fechada agora, `is_open` efetivo) deixou de ser beco sem saída:** badge **ÂMBAR "AGENDAR"** na Home e na tela da loja (era "Fechado" cinza, conclusivo demais). O fluxo **não bloqueia mais**: cliente toca no profissional, vê serviços/preços e as ações finais viram **"Solicitar corte"** + **"Agendar para depois"** (o backend segue guardião — gate C1). Banner "i" âmbar explica os dois caminhos. *Consequência: o F6 ficou alcançável — antes o bloqueio na tela da loja impedia de chegar ao 409.*
2. **`is_open` efetivo adotado no front** (loja `OPEN` fora do horário = fechada p/ exibição/entrada) — corrige o caso "fecha 20:00 e aparecia aberta de noite".
3. **Visitante não vê opções de conta** (boa prática): Config. esconde nome/e-mail/senha/endereço/deletar e mostra "Entrar ou criar conta"; Perfil mostra "Visitante" com o mesmo convite.
4. Nota p/ quando a **barra de encaixe (F5)** chegar: o banner "i" da loja fechada vira o botão **"Agendar"** de verdade, e o coming-soon `manifestar_interesse` é aposentado (superado pelo caminho Agendar/Solicitar).

### 🔵 FRONT-PARTNER — nada bloqueante do nosso lado
- **Troca (C13): partner é PASSIVO** — só reflete a fila pós-troca (já via `professionals-with-queue`/WS); nenhuma ação nova, não marca LATE (§7).
- Promoções de intenção chegam na fila normalmente (o partner já consome o read-model); aba Agenda (`professional/me`) é handoff backend→partner, já nos docs deles.
- Alinhado em 2026-07-15 (C13 criado, C6 corrigido) — sem divergência conosco.

---

## 1. Verificar a senha atual na troca de senha — ✅ BACKEND ENTREGOU (2026-07-22) · ⚠️ BREAKING no front

**Entregue:** `PATCH /profile/update-password/me` agora **EXIGE `current_password`** no corpo (`@NotBlank`), conferido com `PasswordEncoder.matches`. Senha errada → **`401 CURRENT_PASSWORD_INVALID`** (nada muda, tokens não rotacionam); campo ausente → **`422 VALIDATION_ERROR`** (`fieldErrors.currentPassword`).

**⚠️ AÇÃO OBRIGATÓRIA no front-client (a tela atual QUEBROU):**
1. `EditPassword` hoje manda só `{ password }` → passa a tomar **422**. Adicionar o campo **"senha atual"** e enviar `{ current_password, password }`.
2. **Exceção no interceptor 401** (`api.ts`): `401 CURRENT_PASSWORD_INVALID` é **erro de campo** ("senha atual incorreta"), **não** sessão expirada — não pode disparar refresh/logout.

---

## 2. Esqueci minha senha (forgot password) — ✅ FATIA 1 ENTREGUE (2026-07-22) · front pode construir

**Entregue (fatia 1):** `POST /auth/forgot-password { email }` (público; **sempre 200**, anti-enumeração) gera **código de 6 dígitos** (validade 15min, uso único, máx 5 tentativas) e envia por e-mail; `POST /auth/reset-password { email, code, new_password }` (público) confere e troca. Erros: `400 RESET_CODE_INVALID` / `400 RESET_CODE_EXPIRED` / `422`.
**Fatia 2 (SMTP real):** Brevo **configurado (2026-07-22), falta validar o envio real** — até lá o código pode não chegar por e-mail em staging.

**Front-client:** construir a tela "Esqueci minha senha" (e-mail → código 6 dígitos → nova senha) e **tirar `esqueci_senha` do padrão "em breve"** no Login.

---

## 3. Avaliação de atendimento (Item 6 do PRD_BACKEND)

✅ **NÚCLEO ENTREGUE (backend confirmou 2026-07-11, validado no device 2026-07-04):** `POST /attendances/{id}/rating` + agregados `rating_average`/`rating_count` **por profissional** no `professionals-with-queue`. O front envia (`RatingModal` → `ratingService`) e exibe (`resolveRating`).

> **Front (2026-07-11):** o **campo de comentário está OCULTO** no `RatingModal` (flag `SHOW_COMMENT = false`, pedido do Andre — não precisa agora, código mantido pra reativar). O `POST /rating` passa a ir **sem `comment`** por enquanto — o backend já trata `comment?` como opcional, então nada muda do lado dele.

**Ainda falta (melhorias, não bloqueiam):**
1. **`rated: boolean` no `GET /attendances/client/me`** — ⚠️ **NÃO bloqueia mais o front (workaround local entregue 2026-07-12), mas ainda é desejável.** Esconder o "Avaliar" quando já avaliado:
   - **Front — ✅ FEITO (in-session E persistente):** o `RatingModal` marca o atendimento no `ratedStore` (SecureStore) ao votar **e no 409**; `restoreRated()` recarrega no boot; QueueStatus/Attendances/AttendanceDetailModal escondem o "Avaliar" via `ratedStore`. Persiste entre reaberturas **sem depender do backend**.
   - **Backend `rated` (desejável, não bloqueia):** o `ratedStore` é **local ao device** — não sincroniza entre aparelhos nem sobrevive a limpar dados/reinstalar. Com `rated: boolean` no `client/me` (fonte da verdade), o front usa o backend e o local vira só cache/fallback.
2. **Rollup por ESTABELECIMENTO** em `GET /establishment` — média da loja = **soma `ratingSum` ÷ soma `ratingCount`** dos profissionais (ponderada; barato). Hoje só há agregado por profissional/serviço. Para os **cards da Home**.
3. **`rating_best` (maior nota entre os profissionais)** em `GET /establishment` — o card destaca o "melhor" (menor tempo + maior estrela). **Ordenação (#11):** considerar avaliação como desempate/boost.
4. (Pequeno) **`establishmentName`** no `GET /attendances/client/me` (hoje só `establishmentId`) — a tela de detalhes quer mostrar a loja.

**Granularidade alinhada com o usuário:** nota **por profissional** na tela do estabelecimento (✅ feito) + nota **agregada** no card da loja (pendente, itens 2/3).

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

## 7. Troca de posição como OFERTA ABERTA (`/swap-offers`) — pedido do Andre — = C13 (front-partner, partner passivo)

> **Alinhamento (partner leu e confirmou 2026-07-15):** o partner rastreia isto como **C13** (troca), separado do **C6/S2** (agendamento/INTENÇÃO). O **partner é PASSIVO** — só reflete a fila pós-troca via `professionals-with-queue`/WS, **não marca LATE**, sem ação nova. **Não** é S2 nem S4 (S4 = "promover ao topo" do profissional, outra origem). Manter os dois em sincronia; quando o backend incorporar `/swap-offers` na lista dele, atualizar ambos.

> ✅ **RESOLVIDO O GAP (2026-07-23):** o backend **registrou a troca aberta na FONTE ÚNICA** (item #5 "Troca de posição como OFERTA ABERTA / `/swap-offers` — Client C13 / Partner S11") e **corrigiu a nota stale** de 2026-07-07. O item está **⬜ aberto** (a construir), com o contrato desta seção. *(Histórico: até 2026-07-22 a troca não constava no backlog — o `#42` direcionado não atende e a nota stale dizia "substituído pela INTENTION", superada em 2026-07-15. Certificado por varredura do arquivo inteiro; partner também cobrou.)* A UI da troca (F8) segue bloqueada até o endpoint existir.

> ✅ **MODELO FECHADO com o Andre (2026-07-15).** Distinto da **INTENÇÃO** (S2 / agendamento futuro): a **TROCA** é sobre a **fila viva** (agora). A reconciliação anterior confundiu os dois — o `INTENTION` **não** substitui a troca; são features separadas. **O `#42` direcionado (`/swap-requests`) fica MANTIDO em paralelo por ora** (decisão Andre 2026-07-15); a **oferta ABERTA (`/swap-offers`) é backend NOVO** a construir com o contrato abaixo.

**Regra de negócio (fechada Andre 2026-07-15).**
- **Troca 1-por-1:** só os dois envolvidos se movem; o resto da fila fica parado. **Bidirecional:** quem quer **adiantar** publica oferta vista **por quem está à frente**; quem quer **atrasar** publica oferta vista **por quem está atrás**. Quem aceita assume o outro lado.
- **Solicitante pode estar FORA da fila:** um cliente que ainda não entrou deixa o pedido no ar (posição implícita = **fim da fila**). Ao ser aceito, ele **entra na fila** na vaga de quem aceitou e **quem aceitou vai pro fim**. Exige `professionalId` + `serviceItemIds` (duração pra recalcular ETAs).
- **Vários pedidos simultâneos** por cliente.
- **Expira SÓ quando o solicitante é ATENDIDO** (o horário de atendimento dele chega / o atendimento inicia). Também sai por **accept** (consumida) ou **cancel** (solicitante). **NÃO** expira por fechamento da loja.
- **Nunca gera multa** (mútua, não deixa buraco). A regra de multa (ETA<1h, prejuízo aos demais — seção 6) segue valendo só para **sair da fila** e **mudar de posição SEM trocar** (ir pro fim / agendar).

**Contrato (`/swap-offers` — backend NOVO):**
- `POST /swap-offers` — cria a oferta. Corpo: **na fila** `{ attendanceId, direction: EARLIER|LATER }`; **fora da fila** `{ professionalId, serviceItemIds, direction: EARLIER }`. (Sem `maxMinutes` — a versão fechada não usa teto de tempo.)
- `GET /swap-offers?professionalId=` — lista as ofertas **abertas que o cliente pode ACEITAR**, filtradas por direção/posição: `EARLIER` de quem está **atrás** do caller aparece; `LATER` de quem está **à frente** aparece; ofertas de recém-chegado (posição = fim) aparecem para todos na fila. Alimenta o **dot** + a lista.
- `PATCH /swap-offers/{id}/accept` — executa a troca 1-por-1 (troca `scheduledTime`/posição; solicitante de fora **entra** na fila e o accepter vai pro fim), notifica os dois (WS `/user/queue/notifications` + push), oferta → `ACCEPTED`.
- `DELETE /swap-offers/{id}` — solicitante cancela (→ `CANCELLED`).

**Front (Item "Mudar minha vez"):** botão **"Trocar"** na tela do atendimento + **dot** quando `GET /swap-offers` traz oferta aceitável; **"Adiantar"/"Atrasar"** no `ChangeTurnModal` criam a oferta (hoje "em breve"). **Avisar o front quando estiver pronto** com o contrato final. **Espelho no PRD front-client:** seção "Trocar de posição (Adiantar/Atrasar) + Agendar (Intenção)".

**Distinção "Adiantar" (cliente) × "Promover ao topo" (partner) — decisão do Andre 2026-07-14:**
- **Adiantar** (app CLIENTE): subir de posição **por troca consensual** — alguém à frente precisa **aceitar** (é a oferta aberta acima, `direction: EARLIER`). Não fura a fila; é troca 1-por-1 e voluntária; nunca gera multa.
- **Promover ao topo** (app PARTNER, **exclusivo do profissional**): mover um cliente **direto para a 1ª posição**, à frente de todos, **sem consentimento** dos demais. É ação unilateral do profissional (VIP/exceção), **não existe no app do cliente**. Endpoint/contrato ficam na trilha do front-partner. Manter separado da oferta aberta acima.

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

**Front (já feito):** `filterEstablishments` mostra a fechada **só quando `available_professionals > 0`** (tem profissional afiliado com serviço, pra agendar). Aberta segue escondida se `estimated_wait_minutes === null`. `getAll()` já pede `?includeAll=true` pra receber as fechadas; a ordenação (`sortEstablishments`) joga os fechados pro fim (sem `estimated_wait_minutes` → por último). Card com badge **"Fechado"**, sem tempo de espera. **Interim: como o backend ainda não manda `available_professionals` na listagem, TODAS as fechadas ficam escondidas** (ver ponto 1).

**🔗 Alinhamento com o Front-Partner (implementar no backend de uma vez):**
- O ponto 1 (contar profissional **afiliado com serviço**) é **o mesmo dado** da **pendência #7 do partner** ("Abrir" só com profissional com serviço — hoje o partner só checa vínculo, a validação de "com serviço" depende do backend). Um cálculo serve os dois fronts.
- O ponto 2 (manifestar interesse com loja fechada) é o **mesmo** que a **"Solicitação antecipada com a loja fechada"** já listada no PRD do partner (entidade/estado de "pedido para a próxima abertura", distinto de attendance na fila).

**Precisa (backend) — 2 pontos:**
1. **✅ BACKEND ENTREGOU (2026-07-22) — `available_professionals` na LISTAGEM `GET /establishment`** (= nº de profissionais afiliados COM serviço, derivado do snapshot `professionals-with-queue`, `null` fora da listagem; `AvailableProfessionalsListingIntegrationTest`). **O front já estava pronto** (`filterEstablishments` mostra fechada só com `available_professionals > 0`) → **as lojas fechadas com equipe passam a aparecer sozinhas, sem mudança de código**. ⬜ Falta só **validar no device**. (Histórico do pedido abaixo.) Regra do Andre (2026-07-10): estabelecimento **fechado só deve aparecer se tiver profissional afiliado COM serviço** (pra o cliente **agendar** pra reabertura) — *"de nada adianta ver um estabelecimento que nem profissional filiado tem"*. Hoje a listagem NÃO devolve contagem de profissionais; `estimated_wait_minutes` vem `null` tanto pra "fechada" quanto pra "sem profissional" — o front **não consegue distinguir**. O endpoint de **detalhe** (`GET /establishment/id/{id}/professionals-with-queue`) já tem `available_professionals`, mas o front **não pode chamar o detalhe de cada loja** na Home (N requisições). ⚠️ **Semântica crítica:** na listagem, o campo tem de contar **profissionais AFILIADOS com ≥1 `service_item` (agendáveis), independente de `open_status`/`is_available`** — uma loja fechada com equipe deve reportar **número positivo** (senão o `is_available=false` do fechamento zeraria a conta e sumiria com o que a gente quer mostrar). Nome sugerido pra listagem: `available_professionals` (mesmo do detalhe) OU `bookable_professionals` se preferir deixar a semântica explícita. **Front (já pronto):** o tipo `Establishment` já tem `available_professionals?`; `filterEstablishments` só mostra a fechada quando `available_professionals > 0`. **Interim:** enquanto o campo não vem (undefined), o front **esconde TODAS as fechadas**; quando o backend expuser, as fechadas-com-profissional aparecem sozinhas, sem mudança de código no front.
2. **Manifestar interesse / agenda (quando fechado) — ✅ ENDPOINT JÁ EXISTE (reconciliação 2026-07-15): `POST /attendances/intentions`.** É o backend **#4** (status `INTENTION`): **criar (fatia 1) e editar/cancelar (fatia 3) estão CONCLUÍDOS** — `POST /attendances/intentions { professionalId, serviceItemIds, desiredTime }` cria a intenção **mesmo com a loja fechada agora**, desde que `desiredTime` caia no expediente (rejeita `422 INTENTION_OUTSIDE_BUSINESS_HOURS`), até 30 dias (`422 INTENTION_HORIZON_EXCEEDED`), futuro (`400`), fila não cheia (`409 PROFESSIONAL_AGENDA_FULL`), e não antes do fim projetado da fila (`422 INTENTION_BEFORE_QUEUE_END`). A intenção fica **fora da fila viva** (não aparece em `professionals-with-queue`). `PATCH`/`DELETE .../{id}` editam/cancelam (dono por JWT). **Resta só a promoção automática** a `SCHEDULED` (~15min antes, event-driven — fatia 3 pendente) e a **fatia 2 (visão de agenda)**. ⇒ **O front-client PODE CONSTRUIR `manifestar_interesse` AGORA** (registrar/editar/cancelar a intenção); só o "vira fila sozinho na hora" depende da promoção pendente. Este endpoint **também serve o `agendar_outro_dia`** (§12.2) — `desiredTime` pode ser um dia futuro. **Resposta:** `IntentionResponse` (`id`, estab/prof/client, `services[]`, `status=INTENTION`, `desiredTime`, `estimatedStartTime`). Ver PRD_BACKEND "POST /attendances/intentions".

## 12. Botão "Agendar" no estabelecimento = INTENÇÃO (decisão fechada 2026-07-15)

**Decisão Andre 2026-07-15 (supersede o desenho via #40).** **UX (obs. após teste no device):** o `ScheduleModal` **deixa de ter os dois botões** ("Para hoje, mais tarde" / "Para outro dia") — um único **"Agendar"** abre direto um **seletor de dia** (faixa horizontal: "Hoje" + números dos dias seguintes); escolhido o dia, mostra a **barra de encaixe** dele. Tudo vira **INTENÇÃO** (`/attendances/intentions`, status `INTENTION`) — "hoje" ou "outro dia" é só qual dia foi tocado. **O `#40`/`targetTime` no `POST /attendances` é APOSENTADO como entrada de agendamento do cliente** (era o desenho anterior; foi origem da confusão com a troca e da divergência no device). Fronteira: **agendar = horário que a fila ainda NÃO alcançou** (INTENÇÃO, fora da fila viva); **furar/ceder dentro da fila viva = TROCA** (seção 7). Ver o modelo completo no **PRD front-client, seção "Trocar de posição (Adiantar/Atrasar) + Agendar (Intenção)"**.

1. **"Para hoje, mais tarde"** e **"Para outro dia"** — ✅ **endpoint pronto:** `POST/PATCH/DELETE /attendances/intentions` (criar/editar/cancelar concluídos; ver seção 11 ponto 2 + PRD_BACKEND "POST /attendances/intentions"). Cria a INTENÇÃO com `desiredTime` (hoje mais tarde OU dia futuro até 30 dias), fica **fora da fila viva** e é **promovida a `SCHEDULED`** quando o fim da fila cruza o horário.
   - **✅ Front já construído (2026-07-15):** `intentionsService` (create/edit/cancel, com testes) + **seletor de dia** (`DaySelector`: "Hoje" + números dos dias, horizonte 30d) já no `ScheduleModal` (sem o split hoje/outro-dia). **Falta só a barra de encaixe** (a escolha do horário no dia), que está bloqueada nos campos abaixo — hoje o modal mostra "barra em breve".
   - **✅ BACKEND ENTREGOU (lote 2026-07-22 — reconciliação):**
     1. **Promoção event-driven** ✅ — a `INTENTION` vira `SCHEDULED` sozinha ~15min antes do `desiredTime` (timer server-side `IntentionPromotionScheduler`, loop de drenagem, reconstrução no boot). Ao promover, notifica o cliente com **`ATTENDANCE_PROMOTED`** (WS `/user/queue/notifications` + push) — ⬜ **front-client precisa tratar esse tipo novo** (mostrar "você entrou na fila").
     2. **Visão de agenda (fatia 2)** ✅ — `GET /attendances/intentions/client/me` (CLIENT) e `.../professional/me` devolvem `IntentionAgendaResponse = { frames[], intentions[] }`: **`frames[]` traz `projectedQueueEnd` + `openingTime`/`closingTime` por profissional** (o "quadro" da barra!) e `intentions[]` os blocos congelados (`desiredTime`/`estimatedStartTime`/`estimatedMinutes`). → destrava **"meus agendamentos"** (listar/editar/cancelar por dia) e a **moldura da barra**.
   - **⏳ RESTA SÓ 1 pendência backend (follow-up já anotado por eles):** endpoint **público `GET /attendances/intentions/professional/{id}`** com **blocos ANÔNIMOS** — o `client/me` só traz as intenções do **próprio** cliente, então ao **agendar com um profissional** o front ainda não vê os blocos dos OUTROS clientes (nem o frame de um profissional com quem não tenho intenção). Sem isso a barra de encaixe ao agendar fica sem os blocos travados.
   - **Próximo no front:** (a) tratar `ATTENDANCE_PROMOTED`; (b) "meus agendamentos" via `client/me`; (c) barra de encaixe — moldura dá pra montar com o `frame`; blocos de terceiros aguardam o endpoint público acima. Aí troca-se o `notifyComingSoon` do `ScheduleModal` pela barra → `intentionsService.create({ professionalId, serviceItemIds, desiredTime })`.

2. **Agenda por dia (disponibilidade do profissional)** — **Modelo decidido com o Andre (2026-07-12):**
   - Cliente escolhe **um DIA** (dentre os que o profissional deixou disponíveis) e **manifesta intenção** (não é reserva de horário fixo — é intenção por dia).
   - **Auto-aceita até a capacidade** do dia (abrir agenda = disponível; sem aprovação manual).
   - Existe uma **previsão** de posição/horário; **antes de a fila do dia abrir (check-in), o profissional pode REORDENAR** as intenções.
   - Lado **partner**: funcionalidade **"Abrir agenda"** — o profissional publica disponibilidade **por dia ou semana** e marca **feriados/ausências** (que removem dias). (Mapeia à seção "Agenda / Agendamento" + "Solicitação de Corte Dia X" do PRD-Partner.)
   - **Endpoints a definir:** publicar disponibilidade (partner), listar dias disponíveis de um profissional (client), criar/editar/cancelar intenção-por-dia (client), reordenar intenções do dia (partner). Ex.: `GET /professional/{id}/agenda`, `POST /attendances/day-intention { professionalId, serviceItemIds, day }`.
   - ⚠️ **Reconciliar arquitetura:** o backend tem um conceito concorrente — o **status `INTENTION`** (S2, "promove ≤15min", specado 2026-07-05, não construído). O modelo escolhido é a **agenda-por-dia** acima; **decidir se o S2 é aposentado ou subordinado** a ela (não construir os dois).

## 13. Padrão "em breve" (funcionalidades com UI pronta aguardando endpoint)

**Decisão do Andre (2026-07-12):** construir a **UI das funcionalidades pendentes de backend agora**, cada uma respondendo **"em breve"** ao toque e **contando os toques** (`comingSoonStore` em SecureStore, visível em Config. → "Funcionalidades aguardadas", ordenado por mais tocadas = as que fizeram mais falta). Assim, quando o endpoint existir, **é só trocar o `notifyComingSoon(...)` pela chamada real** no ponto de uso. Features hoje nesse padrão: `agendar_hoje` e `agendar_outro_dia` (**ambos → INTENÇÃO**, decisão 2026-07-15; `#40` aposentado — ver §12; endpoint pronto, falta o front construir a barra de encaixe), `esqueci_senha` (seção 2), `trocar_posicao` (TROCA aberta `/swap-offers`, seção 7), `manifestar_interesse` (loja fechada = mesma INTENÇÃO, seção 11 ponto 2).
