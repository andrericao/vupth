# Handoff Front-Client → Backend

Pendências do app **cliente** que dependem do backend. O front já está pronto (ou pronto para consumir) em cada caso. Detalhe completo nos callouts do `PRD_FRONT-CLIENT.md`.

Última atualização: **2026-08-06** · branch `dev` do front-client.

---

## 🥇 PRIORIDADES (lista única, renumerada — regra do Andre)

> Sempre numerada de 1 a N por prioridade. Ao resolver um item, ele **sai** e a lista **renumera** (o 2 vira 1). Itens concluídos viram histórico nas tabelas/seções abaixo, nunca ficam ocupando número.

| # | Pendência | De quem depende |
|---|-----------|-----------------|
| 1 | **Provar (ou não) a entrega no canal PESSOAL do WebSocket** — Configurações → **"Tempo real (diagnóstico)"**, painel novo (2026-08-06). Duas perguntas que nenhum teste anterior separava: (a) o `user-name` do frame CONNECTED veio preenchido ou conectamos **ANÔNIMO** (= S14, canal mudo para sempre)? (b) o contador de **recebidas** do canal pessoal sobe quando algo acontece com a minha fila? O teste que decide é o **de 1 hora** — app aberto >1h (o access token dura 1h), modo avião 10s para forçar reconexão, e olhar o painel. É o único cenário que ninguém nunca exercitou, e o que arbitra a divergência do **S14** (partner trata como causa-raiz; backend rebaixou alegando que só faltou testar "token expirado" — é exatamente esse teste). ⚠️ **O C14 não serve mais para isso** — não reproduz desde bastante tempo (Andre, 2026-08-06) e, pior, o poll do `getWaitTime` mascara o canal pessoal, então ele passaria mesmo com o WS mudo | 🔵 Andre |
| 2 | **Testes no device do lote de 2026-08-05/06** (já no ar por OTA): esqueci-senha (agora com contador de segundos e "Cancelar espera"), oferta de GPS ao abrir o formulário de endereço, "Mudar minha vez" em lista de seleção, hierarquia dos botões no Login/Perfil/Configurações, campos a 48px, e o cabeçalho — que deve estar **idêntico** (o `BrandMark` foi refactor puro, qualquer diferença visual é regressão) | 🔵 Andre |
| 3 | **`eas build` novo** — leva ao device o **splash** com o "V" (2026-08-06). Splash, adaptive-icon e favicon são **nativos**: o `app.json` resolve em tempo de build e **não saem por OTA**. Vale juntar com outras pendências nativas antes de gastar um build | 🔵 Andre |
| 4 | **Esqueci minha senha — B3** (backend). O lado do front foi refeito em 2026-08-06 e o portão de readiness deixou de ser mudo; se ainda pendurar **depois** de o servidor acordar, a suspeita é **SMTP síncrono sem timeout** (`mail.smtp.connectiontimeout/timeout/writetimeout`) ou porta 587 bloqueada no Render (aí é API HTTP do Brevo) | 🔴 backend + reteste |
| 5 | **F5 — Agendar como lista de horários** — núcleo pronto e testado; UI travada no **B2** (blocos anônimos) | 🔴 backend |
| 6 | **Endereço da loja visível ao cliente** (Andre 2026-08-01) — hoje o `EstablishmentDetail` NÃO mostra endereço nenhum; o cliente precisa saber para onde ir (rua/número/bairro + atalho p/ abrir no mapa) | 🟢 front |
| 7 | **Unificar as duas conexões STOMP** (partner C17) — `useQueueSocket` + `useQueueNotifications` abrem um `Client` cada: dois handshakes e duas sessões por usuário, num broker em memória de instância única. Partner faz UMA conexão com duas subscriptions | 🟢 front |
| 8 | **Migração NativeWind** (partner C15) — o partner saiu do Gluestack; decidir QUANDO acompanhar. Não é bump de versão, é troca de arquitetura (~49 arquivos / ~974 props no partner). Cartilha completa no handoff deles | 🟢 front (decisão do Andre) |
| 9 | **Miudezas e código morto** — deletar `src/components/Input.tsx` e `src/assets/vupth-logo/people-waiting.svg` (ambos órfãos, sem nenhum import); coverage dos cantos; caçar o "Jest did not exit" residual (benigno, exit 0) | 🟢 front |

> **GPS/B7 ENCERRADO em 2026-08-06.** O backend entregou a fatia B em 01/08 (`?lat&lng[&radiusKm]`, ordena por distância e devolve `distance_km`) e o front passou a consumir. ⚠️ **Achado no caminho:** estávamos divergentes do contrato — calculávamos Haversine no front e nem mandávamos as coordenadas, então client e partner podiam mostrar distâncias diferentes para a mesma loja. O cálculo local foi removido; a formatação (`formatDistanceKm`) ficou. Com GPS a ordem é a do backend, **distância pura** (decisão do Andre): loja fechada perto vem antes de aberta longe, carregando o badge âmbar AGENDAR. Entra por OTA.
>
> **Saíram da lista em 2026-08-06:** `eas build 1.0.1` (feito) · "WebSocket — validar no device" (virou o item 1, agora com instrumento próprio) · **C18 reconectar no background** (feito: `AppState` nos dois hooks) · **C14** (não reproduz — e, ao contrário do que a lista assumia, nunca serviu de prova do canal pessoal, porque o poll o mascara). A rodada de UI do feedback de device (7 commits) e a identidade da marca (`BrandMark` + splash) estão documentadas no `PRD_FRONT-CLIENT.md` §1c.

---

## 📌 QUADRO GERAL — pendências e desalinhamentos por equipe (2026-07-22)

> Consolidado após a reconciliação com o lote do backend de 2026-07-22 e com o partner. **Cada equipe: ler a sua coluna.** Detalhes nas seções indicadas.

### 🚧 REGRA DE FRONTEIRA (Andre, 2026-08-06): o que é do backend, o backend resolve

> **O front-client NÃO constrói contorno para pendência de backend.** A regra saiu de um caso
> concreto: até 06/08 nós calculávamos a distância por conta própria (Haversine em `proximity.ts`),
> fazendo o trabalho que era do backend — e contra o contrato deles, que diz "o front NÃO
> recalcula". Resultado: client e partner podiam mostrar distâncias diferentes para a MESMA loja, e
> na hora em que a fatia B chegou foi preciso **desmontar** o que tínhamos feito. Contorno em
> território alheio não economiza trabalho, adia e duplica.
>
> **O que isso significa na prática:** os itens abaixo ficam **parados** esperando o backend. Não
> deduzir blocos de agenda por outra rota, não simular envio de e-mail, não mascarar no app uma
> conexão que o servidor deveria ter recusado. Se o custo de esperar for alto, a saída é priorizar
> com o backend — não construir aqui.
>
> **Exceção explícita — observabilidade não é contorno.** O painel de diagnóstico do WS
> (Configurações → "Tempo real") **detecta** o `#31`, não o conserta: mostra quando a sessão subiu
> anônima. Ele existe porque sem instrumento nenhum teste conclui nada, e **não deve ser usado como
> argumento para rebaixar o `#31`** — enquanto o backend não recusar token inválido, o app continua
> sem receber erro nenhum e o canal pessoal segue podendo morrer calado.

### 🔴 BACKEND — pedidos abertos do client
> ✅ **Reconciliação 2026-07-23 confirmada no PRD_BACKEND:** os três pedidos abaixo foram **incorporados na fonte única** do backend (a nota stale do `/swap-offers` foi corrigida). Seguem **abertos** (a construir), mas **não são mais desalinhamento** — só aguardam implementação.
| # | Pedido | Seção | Situação |
|---|--------|:-----:|----------|
| B1 | ~~**`/swap-offers` (troca aberta, C13)**~~ — ✅ **BACKEND COMPLETO: fatia 1 (2026-07-24, solicitante NA fila) + fatia 2 (2026-07-27, solicitante FORA da fila).** Fatia 2: `POST /swap-offers {professionalId, serviceItemIds, direction: EARLIER}` (só EARLIER — fora da fila a posição já é o fim) cria a oferta com `requesterAttendanceId=null`, visível a TODOS na fila; no `accept` **quem aceita cede a vaga e vai pro fim** e o atendimento do solicitante **nasce na vaga cedida** (`resultingAttendanceId`). Erros: `422` (LATER / já estar na fila daquele profissional), `404 SERVICE_ITEM_NOT_FOUND`, `422 SERVICE_ITEM_NOT_OF_PROFESSIONAL`. **Front consumiu tudo em 2026-08-01 (F8 completa)** — item ENCERRADO | 7 | ✅ entregue e consumido |
| B2 | **`GET /attendances/intentions/professional/{id}` público com blocos ANÔNIMOS** — ✅ **REGISTRADO como backend item #6**. **Shape que o front consome (F5):** `{ frame: { projectedQueueEnd, openingTime, closingTime }, blocks: [{ start: ISO-8601, durationMinutes }] }` — **blocos SEM dados pessoais** (só início+duração dos agendamentos de terceiros daquele profissional/dia). Com isso o front calcula os **horários disponíveis** (`computeAvailableSlots`, já pronto+testado no client) e mostra só os que cabem | 12 | ⬜ aberto (registrado) |

> **🎨 UX do F5 fechada (Andre 2026-07-23) — LISTA DE HORÁRIOS, não arrastar.** Em vez da barra de arrastar a "sombra", o app **mostra só os horários em que o serviço cabe** e o cliente toca num. Regra (exemplo do Andre): fila até 14:00 + corte de outro cliente às 17:00 + serviço de 1h → oferece 14:00…16:00 (16:00+1h=17:00, encosta sem invadir) e depois do corte até o fechamento. O **cálculo é do front** (`src/domain/schedule/slots.ts`, `computeAvailableSlots` — piso/fechamento/blocos/duração → horários, alinhado à grade local; já testado com o exemplo). **Só falta o B2 entregar os `blocks`** (o `client/me` só traz os do próprio cliente). No dia de HOJE o piso = `max(agora, projectedQueueEnd)`; dia futuro = `openingTime`.
| B3 | **Esqueci minha senha — REFAZER (Andre 2026-08-01):** foi feito e testado, mas **apresentou falhas na prática** (o e-mail do reenvio não chegou). Rever o envio real pelo Brevo ponta a ponta — envio inicial E reenvio (limite/duplicidade/spam/chave SMTP expirada) — e retestar no device. Front já fez a parte dele (cold-start gate + feedback no botão) | 2 | 🔁 **refazer e retestar** |
| B4 | Já na fonte única do backend (só lembrar a prioridade do client): validação do alvo do `reschedule` (janela+refeição) · estender strike a `reschedule`/`move-to-end` ETA<1h · adicionar serviço a attendance na fila (C8) | 8/6/9 | ⬜ abertos lá |
| B5 | **Melhorias de rating (backend item "Melhorias de rating", ⬜ aberto)** — 4 coisas, nenhuma bloqueia: (a) **`rated: boolean`** no `GET /attendances/client/me` (fonte da verdade p/ esconder "Avaliar"; hoje o front usa `ratedStore` local que não sincroniza entre aparelhos) · (b) **rollup por ESTABELECIMENTO** no `GET /establishment` (Σ`ratingSum`÷Σ`ratingCount` → estrela real no card da Home; hoje placeholder) · (c) **`rating_best`** (maior nota entre os profissionais) + rating como desempate na ordenação · (d) **`establishmentName`** no `client/me` (hoje só `establishmentId`) | 3 / PRD H3 | ⬜ backend #13 |
| B6 | **Filtro por localidade — Fase 2** (escala): aceitar `GET /establishment?uf=&city=&neighborhood=` (+ o `includeAll` já existente) e devolver só os da região. O front já tem a localidade do cliente (`locationStore`) pra mandar nos params; a Fase 1 (ordenar no device) já roda. É o item **C1** | 14 / PRD 11 | ⬜ backend |
| B7 | ✅ **ENTREGUE E CONSUMIDO (2026-08-06)** — ~~Filtro por localidade — Fase 3 (GPS) — PRIORIDADE 1 do client (Andre 2026-08-01)**: **geocodar** o endereço de cada estabelecimento no cadastro (CEP/endereço → `latitude`/`longitude`, campos que o `Address` já tem) + `GET /establishment?lat=&lng=&radiusKm=` ordenado por distância (Haversine). ✅ **O LADO DO CLIENT JÁ ESTÁ FEITO (2026-08-01):** `expo-location` instalado + permissão pedida **na primeira abertura** + **reverse geocode no device** (nativo, sem API paga) preenchendo bairro/cidade/UF, e as **coordenadas já ficam guardadas** (`locationStore.coords`) esperando o endpoint. Enquanto o backend não vem, isso já melhora a Fase 1 (a Home abre ordenada pelo bairro do cliente **sem ele digitar CEP**); com o B7 vira **distância real** ("2,3 km"). ⚠️ Ativa só no binário 1.0.1 (módulo nativo) | 14 / PRD 11 | 🟡 **front pronto / backend é o gargalo** |
| B8 | 🔴 **`#31` / partner S14 — token inválido conecta ANÔNIMO em vez de ser recusado.** O `StompAuthChannelInterceptor` loga `warn` e segue. Com access token de 1h e `reconnectDelay` reconectando sozinho, uma reconexão com token vencido sobe anônima: o tópico público continua atualizando a fila e **só o canal pessoal morre calado**, sem erro em nenhuma ponta. **Só o backend fecha** — sem a recusa, o app não tem como saber que está anônimo. O painel de diagnóstico do client (2026-08-06) apenas EXIBE o estado; não substitui a correção. Pedido: recusar o CONNECT com token inválido/expirado (erro STOMP), em vez de degradar para anônimo | 18b | ⬜ aberto |

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
| F8 | **UI da troca** — ✅ **COMPLETA.** *Na fila (2026-07-24):* `swapOfferService`; `ChangeTurnModal` Adiantar=`EARLIER`/Atrasar "Trocar com alguém atrás"=`LATER`; botão **"Trocar de lugar (N)"** com contador (`useSwapOffers`, poll 20s) → `SwapOffersModal` (aceitar/cancelar); WS **`SWAP_OFFER_ACCEPTED`**. *Fora da fila (2026-08-01, fatia 2):* a tela da loja passou a ter **UMA ação primária** (aberta = entrar na fila; fechada = agendar) + menu **"Mais opções"** (`MoreOptionsModal`) com **"Entrar por troca"** (publica `EARLIER` com os serviços escolhidos) e o "Solicitar corte"; portão de auth próprio (`redirectTo: "serviceSelection"` devolve o visitante à seleção). Como **fora da fila não há WS**, o aceite chega por **poll** (`useOutOfQueueSwap`, 30s, app-wide): a oferta some do `/swap-offers/me` + o atendimento aparece no `client/me` ⇒ entra na fila local (contexto guardado no `pendingSwapStore`) e avisa. Aba Atendimentos ganhou **PEDIDOS DE TROCA** (acompanhar/cancelar). Nunca multa | §7 | ✅ **FEITA (na fila + fora da fila)** |
| F9 | **Push token no client** — ✅ **CÓDIGO COMPLETO 2026-07-23:** núcleo OTA-safe (`domain/push` + `pushService` + logout desregistra) **+ parte nativa** (`expo-notifications`/`expo-device`/`expo-constants` instalados, plugin no `app.json`, hook `usePushRegistration` guardado com try/catch, `navigationRef` p/ o toque, ligado no `App.tsx`). Backend `/devices` PRONTO. **⚠️ Só ATIVA num novo `eas build`** (módulo nativo não sai por OTA); até lá fica inerte/guardado. **Nada mais a fazer no código** — é só buildar | PRD_BACKEND push | ✅ código pronto / ativa no próximo build |
| F10 | **Filtro por localidade** — ✅ **FASE 1 (2026-07-23):** `LocationSelector` (meu endereço / CEP ViaCEP) + `sortByProximity` (bairro→cidade→resto) + `locationStore`. ✅ **GPS / lado do client da FASE 3 (2026-08-01, prioridade do Andre):** `expo-location` + permissão **na primeira abertura** (`useDeviceLocation`, `require` guardado — inerte em binário sem o módulo) + **reverse geocode no device** → bairro/cidade/UF sem digitar CEP; coordenadas guardadas em `locationStore.coords` p/ o B7; botão "Usar minha localização atual" no seletor. Domínio puro/injetável em `domain/location/gps.ts` (testado). ⚠️ **só ativa no binário 1.0.1.** **Falta o backend:** Fase 2 (`?uf&city&neighborhood`) e o B7 (geocoding das lojas + `?lat&lng&radiusKm` → distância real) | §14 / PRD 11 | ✅ front feito / distância real ← B7 |

**🎨 Decisões de UX registradas em 2026-07-23 (sessão de feedback no device):**
1. **Loja fechada (fila fechada agora, `is_open` efetivo) deixou de ser beco sem saída:** badge **ÂMBAR "AGENDAR"** na Home e na tela da loja (era "Fechado" cinza, conclusivo demais). O fluxo **não bloqueia mais**: cliente toca no profissional, vê serviços/preços e as ações finais viram **"Solicitar corte"** + **"Agendar para depois"** (o backend segue guardião — gate C1). Banner "i" âmbar explica os dois caminhos. *Consequência: o F6 ficou alcançável — antes o bloqueio na tela da loja impedia de chegar ao 409.*
2. **`is_open` efetivo adotado no front** (loja `OPEN` fora do horário = fechada p/ exibição/entrada) — corrige o caso "fecha 20:00 e aparecia aberta de noite".
3. **Visitante não vê opções de conta** (boa prática): Config. esconde nome/e-mail/senha/endereço/deletar e mostra "Entrar ou criar conta"; Perfil mostra "Visitante" com o mesmo convite.
4. Nota p/ quando a **barra de encaixe (F5)** chegar: o banner "i" da loja fechada vira o botão **"Agendar"** de verdade, e o coming-soon `manifestar_interesse` é aposentado (superado pelo caminho Agendar/Solicitar).
5. **Menu "Mais opções" na tela da loja (Andre 2026-08-01):** a tela de serviços passou a ter **UMA ação primária** — loja aberta = "Confirmar e entrar na fila"; fechada = "Agendar para depois" — e todas as outras (**Solicitar corte**, **Entrar por troca**, e o agendar quando a loja está aberta) vivem num **menu próprio** (`MoreOptionsModal`), no mesmo espírito do `ChangeTurnModal` de quem já está na fila. Efeito colateral bom: o portão de auth dessas ações deixou de jogar o visitante na fila — ele loga e **volta para a seleção de serviços** (`redirectTo: "serviceSelection"`).

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

## 4. WebSocket em tempo real — ✅ SERVIDOR OK; o defeito era no CLIENTE (diagnosticado 2026-08-01)

> ⚠️ **Esta seção foi REESCRITA.** Até 2026-08-01 ela dizia "não funciona, causas prováveis no backend" e listava três suspeitas. **As três foram testadas e REFUTADAS.** Quem estava errado era o app.

**Como foi diagnosticado.** Página de teste `src/docs/ws-test.html` (abre no navegador, conecta no MESMO servidor STOMP, mostra etapa por etapa). Rodadas feitas contra `dev` (Render):

| Suspeita antiga | Resultado real |
|---|---|
| Handshake barrado pelo Spring Security em `/ws/**` | ❌ **falsa** — conecta e recebe `CONNECTED` **até sem token** |
| `/user/**` sem `Principal` | ❌ **falsa** — com o JWT no frame CONNECT, o `CONNECTED` volta com `user-name: <userId>` |
| SockJS × WebSocket cru | ❌ **falsa** — o transporte cru `/ws/websocket` funciona |
| Backend não publica | ❌ **falsa** — entrar na fila disparou o broadcast em `/topic/establishment/{id}/queue` **no ato**, com o payload completo |

**⇒ Nenhuma das três causas antigas existe.** O servidor faz o essencial: handshake livre, JWT do CONNECT validado, `Principal` setado, broadcast publicando.

> ⚠️ **A prova está pela METADE — honestidade sobre o que foi testado (2026-08-01).** Provocamos evento só no **tópico público** (entrar na fila → 📨 chegou com payload completo). O **canal pessoal nunca foi provocado**: nenhum `ATTENDANCE_STARTED`/`CUT_REQUESTED` foi disparado durante o teste. Ou seja, **a entrega do `/user/queue/notifications` ainda NÃO foi comprovada ponta a ponta** — só a subscrição. O partner registra o mesmo ("falta a metade da prova"). Fechar isso no device: entrar na fila e pedir ao partner para **iniciar** o atendimento.

> 🔴 **Dois pedidos ao backend que NASCERAM disto (abertos pelo partner, nos afetam direto):**
> - **S14 — token inválido conecta como ANÔNIMO em vez de recusar.** O `StompAuthChannelInterceptor` loga `warn` e segue; com token de 1h, a reconexão sobe anônima e o canal pessoal morre **em silêncio**, sem erro em nenhuma ponta. Nós já corrigimos a nossa metade (token fresco no `beforeConnect`), mas **só o backend fecha o buraco**: sem a rejeição, o app não tem como saber que está anônimo. ⚠️ **Divergência entre projetos:** o partner trata como 🔴 causa-raiz de C14/C9; o **backend REBAIXOU** para "item pequeno de robustez", argumentando que nosso teste cobriu "sem token" e "token válido" — **nunca "token expirado"** — e que as flags já explicam os sintomas. **Quem decide é o teste no device.**
> - **S17 — heartbeat DESLIGADO** (`enableSimpleBroker` sem `TaskScheduler`). **Evidência colhida no NOSSO teste:** pedimos `heart-beat:10000,10000` no CONNECT e o servidor respondeu **`heart-beat:0,0`**. Sem heartbeat, quando o Render corta a conexão ociosa o socket vira **zumbi**: o app se acha conectado, o `reconnectDelay` nunca dispara (não houve erro) e simplesmente para de chegar coisa. Explica o "às vezes não chega" mesmo dentro da 1ª hora — é **independente** do S14.

**A causa real (client):** o cliente STOMP do app passava duas opções que existem para contornar servidores **fora do padrão** e que, com o Spring correto, atrapalham o parse — o socket conecta e a mensagem nunca aparece:

```ts
forceBinaryWSFrames: true,        // manda os frames em binário
appendMissingNULLonIncoming: true // mexe no terminador do frame recebido
```

**Removidas no client em 2026-08-01.** Além disso, o app assinava **só** o canal pessoal, então nunca via o broadcast da fila — passou a assinar `/topic/establishment/{id}/queue` também (`findMyPosition` em `domain/queue/broadcast.ts` deriva a MINHA posição/espera do payload; antes isso só vinha do poll de até 2min).

**📣 Front-Partner:** o código de vocês é quase idêntico ao nosso (mesmo `@stomp/stompjs`, mesmo servidor). **Confiram se o cliente de vocês tem essas mesmas duas flags** — se tiver, é provavelmente a mesma causa do "WS não funciona" de lá. A página `src/docs/ws-test.html` serve igual para vocês: troquem o `establishmentId` e usem um token de profissional; o canal pessoal de vocês é o mesmo `/user/queue/notifications`.

**Nota de plataforma (segue valendo):** no **Render free** a instância hiberna e o WS **cai** junto — o **polling continua sendo a base**, e o WS é a camada de tempo real por cima dele. Não remover o polling.

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

> ✅ **SEÇÃO ENCERRADA (2026-08-01): backend COMPLETO (fatias 1+2) e front CONSUMINDO tudo (F8).** A fatia 2 (solicitante FORA da fila) chegou em 2026-07-27: `POST /swap-offers {professionalId, serviceItemIds, direction: "EARLIER"}` (só EARLIER; `422` para LATER ou para quem já está na fila daquele profissional; `404 SERVICE_ITEM_NOT_FOUND`; `422 SERVICE_ITEM_NOT_OF_PROFESSIONAL`), oferta visível a todos na fila, e no `accept` quem aceita vai pro fim enquanto o atendimento do solicitante nasce na vaga cedida (`resultingAttendanceId`). **Nota de implementação do front:** quem está fora da fila **não tem WS conectado**, então o aceite é detectado por **poll** (`useOutOfQueueSwap`) — a oferta some do `/swap-offers/me` e o atendimento aparece no `client/me`. Nada mais a pedir ao backend aqui.
>
> ✅ **BACKEND ENTREGOU A FATIA 1 (2026-07-24) — certificado no PRD_BACKEND (item #2).** Troca com o solicitante **NA fila** está PRONTA: `POST /swap-offers {attendanceId, direction: EARLIER|LATER}` · `GET /swap-offers?professionalId=` (aceitáveis pelo caller → dot) · `GET /swap-offers/me` · `PATCH /swap-offers/{id}/accept` (troca 1-por-1 + WS **`SWAP_OFFER_ACCEPTED`** aos DOIS lados, cada um com o próprio `attendanceId` + push) · `DELETE /swap-offers/{id}`. Erros: `403` não-dono, `422` (não SCHEDULED / própria oferta / não elegível / fora da fila / já consumida), `404`. Expira quando o solicitante é atendido/cancela (não por fechamento). **RESTA a FATIA 2** (solicitante FORA da fila: `POST {professionalId, serviceItemIds, direction: EARLIER}`, hoje `422 QUEUE_SWAP_OFFER_NOT_ALLOWED`; no aceite ele entra na vaga e quem aceitou vai pro fim). ⇒ **A F8 pode ser construída agora para o caso "na fila".**
>
> **Modelo (2026-07-15).** Distinto da **INTENÇÃO** (agendamento futuro): a **TROCA** é sobre a **fila viva**. O `#42` direcionado (`/swap-requests`) fica mantido em paralelo. Partner PASSIVO.

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

**Front (FEITO):** *na fila* — botão **"Trocar de lugar (N)"** + dot (`GET /swap-offers?professionalId=`, poll 20s), "Adiantar"/"Atrasar" no `ChangeTurnModal` publicam a oferta, `SwapOffersModal` aceita/cancela. *fora da fila* — **"Entrar por troca"** no menu "Mais opções" da tela de serviços (publica `EARLIER` com os serviços escolhidos), seção **PEDIDOS DE TROCA** na aba Atendimentos (acompanhar/cancelar) e entrada automática na fila ao ser aceito (`useOutOfQueueSwap` + `pendingSwapStore`). **Espelho no PRD front-client:** seção "Trocar de posição (Adiantar/Atrasar) + Agendar (Intenção)".

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

## 14. Filtro por localidade (bairro/cidade/GPS) — Fase 1 no front, Fases 2/3 no backend

**Problema (Andre 2026-07-23):** um cliente novo em SC e outro no CE veem a **mesma** lista inicial (`GET /establishment` traz tudo, filtro só por nome). Precisa de **proximidade**. ⚠️ Bairro **não é único** (quase toda cidade tem "Centro") → chave sempre **UF + cidade + bairro** (ou lat/long).

- **Fase 1 — ✅ FEITA no front (front-only, sem backend):** `LocationSelector` na Home define a localidade por **endereço do logado** (`getMain`) ou **CEP (ViaCEP)**; `sortByProximity` (domínio, testado) ordena **mesmo bairro → mesma cidade → resto** usando o `address` que **já vem** na listagem. Persiste em `locationStore`. **Polimento (2026-07-23):** cliente logado **sem localidade ainda resolvida** tem o endereço principal auto-preenchido (proximidade funciona sem tocar em nada); flag `resolved` no store garante que quem **limpou** o filtro ("Ver todos") não o vê voltar sozinho. Testes: `proximity`, `locationStore`, `LocationSelector`. *Limitação:* baixa a lista inteira e ordena no device — ok enquanto a base é pequena; não escala pra base nacional.
- **Fase 2 — ⬜ BACKEND (quando a base crescer):** aceitar query params na listagem — `GET /establishment?uf=&city=&neighborhood=` (+ `includeAll` já existente) — devolvendo só os da região. É o item **C1** ("busca por bairro ordenada por menor fila"). Escala o que a Fase 1 faz no device.
- **Fase 3 — ⬜ BACKEND + BUILD (padrão-ouro) — DETALHADA (Andre 2026-07-24):** proximidade real por **GPS/Haversine**. **Custo: dá pra fazer 100% GRÁTIS** (nenhuma API paga é necessária). Peças:
  1. **Pegar a posição do device — client, GRÁTIS:** `expo-location` (`getCurrentPositionAsync`) devolve lat/long. É API nativa do SO, **sem custo por uso**. ⚠️ **módulo NATIVO → exige `eas build`** (igual o push F9) + permissão de localização (o app pede na hora).
  2. **Geocodar os estabelecimentos (endereço → lat/long) — backend, no CADASTRO:** é o **único ponto com custo potencial**, mas **evitável**. Roda **1× por estabelecimento** (não por busca) → volume = nº de lojas, ~zero. Opções **grátis** suficientes (precisão nível CEP/rua, ótima pra "ordenar por perto"): **Nominatim/OpenStreetMap** (grátis, limite ~1 req/s, exige atribuição) ou **API BR de CEP→coordenada** gratuita. **Evitar Google Geocoding** (pago, exige cartão; ~US$5/1000 — desnecessário). O `Address` já tem `latitude`/`longitude` opcionais → só preencher no cadastro. Reprocessar os endereços antigos uma vez.
  3. **Ordenar por distância — backend, GRÁTIS:** `GET /establishment?lat=&lng=&radiusKm=` calcula **Haversine** (matemática pura, sem API) e devolve ordenado por distância / dentro do raio. Idealmente inclui a `distanceKm` no `EstablishmentResponse` p/ o card mostrar "a X km".
  4. **Exibir — client, GRÁTIS:** basta uma **LISTA** ordenada por distância (a Home já é lista). **NÃO precisa de mapa.** Um mapa visual (Google Maps/Mapbox) **teria** custo (tiles/SDK) e é **opcional / fora do MVP**.
  - **Resumo de custo:** GPS = grátis · Haversine = grátis · lista = grátis · geocoding = grátis (Nominatim/CEP-coord BR, 1×/loja). Custo só apareceria com **Google Geocoding** ou **mapa visual**, e **nenhum é necessário**. Já no backlog do backend como "Busca por GPS / proximidade (Haversine)".

---

## 15. Alinhamento de UI/design com o front-partner (leitura de 2026-08-01)

> Lidos: `vupth-partner/src/docs/HANDOFF_CLIENT.md` (handoff **partner → client**, atualizado 2026-08-01) e `PRD_FRONT-PARTNER.md` §13/§13.1 (Guia de Design). **O handoff deles é endereçado a NÓS** — é lá que moram os itens C1–C18.

### 15.1 Paleta — ✅ ALINHADA (conferido hex a hex)

O C7 do partner alerta que a versão antiga daquele item listava a paleta **teal** (`#00B37E`), abandonada em 2026-07-09, e que "se o client copiou aqueles hexes, está com o verde errado". **Conferido: não está.** O `config/gluestack-ui.config.ts` do client já usa a **Verde Marca** — e ela nasceu aqui (o client é a fonte da verdade da MARCA; o partner re-ancorou nela):

`50 #eef5ee · 100 #d9ead9 · 200 #b5d5b6 · 300 #8bbd8d · 400 #5c9c60 · **500 #3b7a3f** · 600 #316635 · 700 #26522a · 800 #1c3d1f · 900 #142c17` · sombra `#1A281A` · amber `#FFB703` · red `#E63946` · Poppins (títulos/botões) + Inter (texto).

**Desvio encontrado e corrigido (2026-08-01):** 4 ícones usavam `#2F432F` hardcoded (o verde **escuro do ícone nativo**, não o da UI) — `LocationSelector`, `ScheduleModal` e 2× `Attendances`. Trocados para `#3B7A3F`. Regra do partner que vale para nós: **nunca "um verde parecido"** — ou o token, ou o hex real da fonte da verdade.

### 15.2 NativeWind (C15) — decisão pendente, sem pressa

O partner **saiu do Gluestack** e estiliza com NativeWind/Tailwind (`className`). Isso **supera o C2** (que mandava atualizar o Gluestack v1) — ou seja, **não vale gastar esforço subindo o v1**. Pontos que herdamos da experiência deles:

- A "v2" do Gluestack **é** NativeWind: migrar é **troca de arquitetura**, não bump. No partner: ~49 arquivos, ~974 props `$token`.
- **Nada de big-bang:** as duas libs convivem, converte-se tela por tela; o `GluestackUIProvider` só sai quando o último arquivo sair.
- `nativewind` + `tailwindcss` são **build-time (JS)** → entram por **OTA**, não exigem build novo.
- `jest`: incluir `nativewind|react-native-css-interop` no `transformIgnorePatterns`.
- **Armadilha de comportamento (não de estilo):** o `Input` do Gluestack embutia `autoCapitalize="words"`; a primitiva nova precisa manter esse default, senão nome/endereço param de capitalizar e ninguém nota na revisão.
- Preservar `testID`/`accessibilityLabel` na conversão — são a âncora dos testes RNTL/Maestro e a única rede de proteção, já que estilo não se valida por tipo.
- `tsc`/`eslint` provam que **compila**, não que **renderiza**: validar no device a cada 2-3 lotes (o partner acumulou 7 antes do primeiro QA).

### 15.3 Guia de Design (PRD partner §13.1) — o que adotamos

Tokens de tipografia e acessibilidade valem para os dois apps: **Poppins** (H1/H2 24–32px, H3/H4 18–22px, botões 16px) + **Inter** (texto 14–16px); toque mínimo **48×48px**; contraste mínimo **4.5:1**. Mockups de referência no repo partner: `design/redesign-form-tabbar-skeleton.html`, `design/agendamento-barra.html` (F5), `design/card-fila-enxuto.html`.

⚠️ **Divergência que o próprio guia carrega:** ele usa linguagem de **"Agendar agora"**, mas o produto é **fila walk-in**. No client isso já está resolvido — "Entrar na fila" é a ação primária e "Agendar" é a INTENÇÃO (F5), coisas distintas. Não importar a semântica do PDF.

### 15.4 Itens que o partner descobriu e são NOSSOS (infra de WS)

| Item | O quê | Status aqui |
|---|---|---|
| **C16** | 🔴 **Token do socket nunca renovado** — lido uma vez no mount e fixado em `connectHeaders`; com `reconnectDelay` reconectando sozinho e access token de 1h, toda reconexão vai com header vencido. O backend, ao receber token inválido, **conecta como anônimo em vez de recusar** (partner S14) ⇒ socket "vivo" e canal pessoal **mudo para sempre**, sem erro. Candidato a causa-raiz do C14 e do C9 | ✅ **CORRIGIDO 2026-08-01** — token lido no `beforeConnect` (roda a cada tentativa) nos **dois** hooks |
| **C17** | 🟠 Client abre **duas** conexões STOMP; partner abre uma com duas subscriptions | ⬜ prioridade 8 |
| **C18** | 🟡 Nenhum app reconecta ao voltar do background (sem `AppState`) | ✅ **FEITO 2026-08-06** — `AppState` nos dois hooks: ao voltar para o primeiro plano com o socket caído, derruba e reconecta |
| **C14** | 🐛 Cliente não vê `IN_PROGRESS` (pula de "na fila" para "concluído") | ✅ **NÃO REPRODUZ (Andre, device, 2026-08-06)** — "o status muda na tela do cliente sim, esse erro não existe mais há bastante tempo". ⚠️ **Mas NÃO serve como prova do WebSocket** — ver o aviso abaixo |
| **C9** | 🐛 Remoção da fila não reflete no cliente | 🔄 idem — o poll cobre, então o sintoma some sem dizer nada sobre o WS |

> ⚠️ **C14 era um proxy RUIM para o canal pessoal — não usar mais como teste decisivo.** O status na tela do cliente é reconciliado pelo **poll** do `getWaitTime` (`useQueueCountdown`, a cada 30s), não só pelo WebSocket. Ou seja: o sintoma do C14 desaparece mesmo com o canal pessoal completamente mudo — o polling mascara. Isso vale igual para o C9. **Consequência:** a entrega em `/user/queue/notifications` segue **não comprovada**, exatamente como já estava registrado no §4 ("a prova está pela metade"), e o C14 não arbitra a divergência do S14. Quem arbitra agora é o **painel de diagnóstico** (Configurações → "Tempo real"), que mostra o `user-name` do frame CONNECTED e conta as mensagens recebidas **por canal** — separando "conectado" de "recebendo", que era justamente o que nenhum teste anterior conseguia distinguir.
| **C8/C10/C11** | Adicionar serviço na fila · mensagens distintas de saída · ETA com buffer −10min | ⬜ aguardam backend (B4/S10/S11) |

### 15.5 O que MANDAMOS para o partner nesta rodada

O diagnóstico do WebSocket (§4): **as três suspeitas que viviam no nosso handoff eram falsas** — o servidor sempre funcionou. A causa era `forceBinaryWSFrames` + `appendMissingNULLonIncoming` no cliente. **O código deles é quase idêntico ao nosso**, então provavelmente têm as mesmas flags. A página `src/docs/ws-test.html` está versionada aqui e serve aos dois apps.

---

### 15.6 📍 GPS no FRONT-PARTNER — pedido do Andre (2026-08-06)

> **Para o front-partner.** Pedido do Andre: *"preciso que o front partner também peça o GPS assim que os parceiros acessarem o app, principalmente para os estabelecimentos — é muito importante pegarmos a lat/long deles."*
>
> Escrito aqui (handoff do client) porque **não editamos o repositório do partner**. Copiem para o PRD de vocês.

#### Por que isso importa mais do que parece

A coordenada do estabelecimento é o **ativo** da busca por proximidade. Sem ela, a loja simplesmente **não existe** para quem procura por perto: com `?lat&lng&radiusKm`, o backend **remove** da lista quem não tem coordenada (não dá para afirmar que ela cabe no raio). E o dono **está dentro da loja** no momento em que a cadastra — é a fonte mais precisa que vai existir. O CEP resolve a **faixa do logradouro, não a porta**.

#### O que o backend já faz sozinho (não reimplementar)

| Fato | Consequência para vocês |
|---|---|
| Sem `latitude`/`longitude` no request, o backend **geocodifica sozinho** depois do commit, em thread de fundo (BrasilAPI CEP v2 → Nominatim) | O cadastro por texto continua funcionando. O GPS **melhora** a precisão, não é pré-requisito |
| Com `latitude`/`longitude` no request, o backend **NÃO geocodifica** | É o **caminho preferencial**: ele não sobrescreve o dado mais preciso pelo menos preciso |
| Falha do geocoding **não quebra** o cadastro | Grava sem coordenada e é retentado depois |
| `PATCH /establishments/{id}/addresses/{addressId}` conserta endereço já cadastrado | Editar só o texto **não** re-geocodifica; endereço **sem** coordenada **é** retentado no update |

#### Contrato (PRD_BACKEND é a fonte da verdade — seções 17 e "GPS fatia A2")

**Enviar a coordenada no cadastro/edição do endereço do establishment:**

```jsonc
{ "street": "...", "number": "100", "neighborhood": "...", "city": "...", "state": "RJ",
  "zipCode": "21012000",
  "latitude": -22.8422, "longitude": -43.2764 }   // opcionais, mas PREFERENCIAIS
```

- **Tem de ir o PAR.** `422 ADDRESS_INVALID_COORDINATES` quando vem **só uma das duas**, fora do globo, ou **`(0,0)`** — a "ilha nula", que no front costuma ser um objeto de localização **não preenchido**, não um erro de digitação. **As duas ausentes é válido** (cadastro por texto).

**`GET /geocoding/reverse?lat=&lng=`** — coordenada → endereço por extenso, para o dono **conferir**.

- **Autenticado, sem exigir role** (quem cadastra a primeira loja ainda pode não ter `ROLE_OWNER`).
- A resposta **espelha o `AddressRequest` de propósito** — jogar direto no formulário — e traz `displayName`.
- ⚠️ **Qualquer campo pode vir `null`** e o front tem de aguentar: o reverso quase nunca sabe o número da casa e às vezes nem o CEP. Só o `displayName` é praticamente sempre presente.

#### Receita de implementação (o que aprendemos fazendo no client)

1. **`expo-location` no `app.json`**, com as strings de permissão em pt-BR explicando o benefício.
2. **Carregar o módulo nativo com `require` dentro de `try/catch`.** Uma OTA que caia num binário **sem** o módulo nativo derruba o app inteiro no boot. Com o try/catch, o hook simplesmente não faz nada e o cadastro por texto continua valendo. Herdamos essa disciplina do push e ela já nos salvou.
3. **Pedir na primeira abertura**, marcando um `gpsAsked` persistido para **não re-perguntar**, e sem atropelar quem já definiu algo na mão.
4. **No formulário de endereço, OFERECER o GPS ativamente** — não basta um botão na tela. Feedback do Andre no device (05/08) sobre o nosso app: o botão existia desde 01/08 e ele **não percebeu que dava para não digitar**. Passamos a perguntar ao abrir o formulário; o botão manual ficou para quem recusar.
5. **Fluxo completo:** pegar coords → `GET /geocoding/reverse` → **pré-preencher** → o dono **confere e completa** (número, complemento) → salvar **com** `latitude`/`longitude`.
6. **Campo ausente no reverso NÃO apaga o que o dono já digitou.** No client isso virou uma função pura (`toAddressDraft`) que só devolve o que o aparelho soube dizer; CEP incompleto é descartado. Sem essa regra, um reverso pobre limpa o formulário.
7. **Editar endereço existente preserva a coordenada já salva**, a menos que o dono peça o GPS de novo.

#### E se vocês exibirem distância em algum lugar

Usem o **`distance_km` do backend**. **Não recalcular** — foi exatamente o erro que o client cometeu e desfez em 06/08: calculávamos Haversine por conta e os dois apps podiam mostrar números diferentes para a **mesma** loja. Ver a regra de fronteira no topo deste documento.
