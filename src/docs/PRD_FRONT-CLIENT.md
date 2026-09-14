# VUPTH Front Client — PRD (Product Requirements Document)

> Documento de comunicacao entre frontend cliente e backend.
> Descreve os fluxos implementados, endpoints consumidos, formato dos requests/responses,
> divergencias com o contrato real do backend e o que esta pendente.
>
> **App:** React Native 0.81 + Expo SDK 54, Gluestack UI v1, React Navigation native-stack
> **State:** Zustand v5 + Axios + TanStack Query v5 + Expo SecureStore
> **Testes unitarios/integracao:** 144 passando em 18 suites (Jest 29 + axios-mock-adapter)
> **Testes E2E:** Maestro v2.5.1 no celular fisico (Moto G54 via USB)
> **CI/CD:** GitHub Actions — job unico: lint (ESLint v9 flat config + eslint-config-expo) → typecheck (tsc --noEmit) → test (jest --ci), fail-fast — 0 erros/0 warnings. Otimizado p/ economizar minutos (concurrency/cancel-in-progress, paths-ignore, timeout) — ver secao "Economia de minutos" em CI/CD.
>
> **Ultima atualizacao:** 2026-06-08

---

## Indice

1. [Visao Geral do App](#1-visao-geral-do-app)
2. [Endpoints Consumidos — Status](#2-endpoints-consumidos--status)
3. [Fluxo Principal — Cliente](#3-fluxo-principal--cliente)
4. [Telas Implementadas](#4-telas-implementadas)
5. [Stores e Hooks](#5-stores-e-hooks)
6. [Tipos e Enums — Alinhamento com Backend](#6-tipos-e-enums--alinhamento-com-backend)
7. [Divergencias Backend vs Frontend](#7-divergencias-backend-vs-frontend)
8. [Validacao de Formularios](#8-validacao-de-formularios)
9. [Formato dos Tokens e Refresh](#9-formato-dos-tokens-e-refresh)
10. [Testes Unitarios e Integracao](#10-testes-unitarios-e-integracao)
11. [Testes E2E — Maestro](#11-testes-e2e--maestro)
12. [Pendente de Implementacao](#12-pendente-de-implementacao)

> Seções fora da numeração: **1w** (nomes dos ambientes) · **1x** (acesso web) · **1z** (decisões pendentes do Andre).

---

## 1. Visao Geral do App

App para **clientes** que querem buscar estabelecimentos e entrar em filas de atendimento. **Modo visitante (sem login):** o cliente curioso navega livremente e ve **estabelecimentos, profissionais e os precos de cada servico** sem cadastro (todos esses endpoints sao publicos no backend). A **verificacao de token acontece so na ENTRADA da fila** — depois que o visitante ja escolheu os servicos, na `ServiceSelection`. Se nao estiver logado, vai pro login/cadastro levando a selecao e, ao autenticar, o atendimento e criado (`POST /attendances`, exige token — pedido do Andre 2026-07-10; o backend tambem tem `add-quest-attendance` publico, mas optamos por **exigir conta** para vincular historico/avaliacao).

**Navegacao = bottom tab bar (3 abas)**, cada uma com sua stack (sempre visivel):
```
[ Inicio ]            [ Atendimentos ]      [ Config. ]
 Home → Detalhe        Attendances           Settings → Edit*
  → ServiceSelection   (em andamento +
  → QueueStatus         historico)
  (+ Profile, Login,
   SignUp)
```
Entrar na fila (visitante ou logado): Home → Detalhe → **ServiceSelection (ve precos, escolhe)** → **portao de auth aqui** (se nao logado → Login/SignUp levando os `serviceItemIds`) → QueueStatus. O login/cadastro redireciona de volta pra `queueStatus` com a selecao preservada. Tocar na aba ativa volta ao topo; trocar de aba e 1 toque (resolve o "voltar varias vezes").

**Fila fechada agora (loja fechada OU `OPEN` fora do horario — `is_open` efetivo, 2026-07-23):** o MESMO fluxo segue ate a ServiceSelection (badge ambar **"AGENDAR"** na Home/loja; param `establishmentOpen` na rota), mas as acoes finais viram **"Solicitar corte"** (direto p/ autenticado; visitante passa pelo portao de auth e cai na oferta do 409 no QueueStatus) + **"Agendar para depois"**. Ver secao "Loja fechada".

**Visitante e opcoes de conta (2026-07-23):** sem login, **Config.** esconde nome/e-mail/senha/endereco e "Deletar conta" (mostra o convite "Entrar ou criar conta"); **Perfil** mostra "Visitante" e troca "Sair da conta" pelo mesmo convite. Funcionalidades aguardadas e info de OTA seguem visiveis.

**Stack:**
- React Native + Expo SDK 54
- Gluestack UI v1 (sem NativeWind)
- React Navigation: **bottom-tabs + native-stack** (nao Expo Router)
- Axios + axios-mock-adapter (testes)
- Zustand v5 + Expo SecureStore
- TanStack Query v5 (com `refetchInterval` como fallback do WebSocket)
- Phosphor React Native (icones)
- Fontes **Poppins** (titulos/botoes) + **Inter** (texto)

---

## 1b. Estado atual (2026-06-29) — features recentes

> 🎨 **Certificação de design com o partner (2026-08-01).** Li o `HANDOFF_CLIENT.md` do front-partner (o handoff **deles para nós**) e o Guia de Design do PRD partner §13.1. **A paleta está alinhada hex a hex** — o alerta do C7 ("se o client copiou os hexes antigos, está com o verde errado") **não se aplica**: o teal `#00B37E` já saiu daqui há tempos e a Verde Marca nasceu neste projeto. Único desvio encontrado: 4 ícones com `#2F432F` hardcoded (o verde do ÍCONE nativo, não o da UI) em `LocationSelector`, `ScheduleModal` e `Attendances` — **corrigidos para `#3B7A3F`**. Também adotados como regra comum: toque mínimo **48×48px** e contraste **4.5:1**. ⚠️ **NativeWind (partner C15):** o partner saiu do Gluestack; isso **supera** o pedido antigo de atualizar o Gluestack v1 — não gastar esforço nisso. Detalhes, armadilhas e a decisão de "quando migrar" no HANDOFF_BACKEND §15.

**Design "Verde Marca"** (2026-07-06 — "folha vivo" `#3B7A3F` como CTA/primário; alinhado com o front-partner, handoff C7): o verde-floresta escuro do ÍCONE (`#2F432F`) ficava **pesado demais** espalhado pela UI (headers, botões, badges) → o app inteiro escurecia. Escala green re-ancorada no **#3B7A3F** (mesma família do ícone, porém mais claro/saturado, contraste ~5.2:1 com branco) — 50 `#eef5ee` / 100 `#d9ead9` / 300 `#8bbd8d` / 400 `#5c9c60` / **500 `#3b7a3f` (CTA/primário)** / 600 `#316635` / 700 `#26522a` / 900 `#142c17`. O `#2F432F` segue como brand-deep (fundo do 900) e no **ícone NATIVO** do app (só muda com novo `eas build`). Fundo mantido **claro**. amber `#FFB703` (dourado — ratings/atenção; agora também o aviso "a fila hoje termina às HH:MM" no modal Atrasar, cor de **atenção** e não urgência) e red `#E63946` (destructive/erros) **mantidos**. Histórico: teal `#00B37E` → `#2F432F` (2026-07-05, escuro demais) → `#3B7A3F`. Fontes Poppins/Inter. `Button` pilula+sombra; `Input2` raio `$xl` + foco verde; `cardShadow` em cards `$2xl` sem borda; **Skeleton** (SkeletonCard/List) no lugar dos spinners; **TabPill** (pilula verde na aba ativa). **Animacao de abertura** (`PreparingServer`/WarmupAnimation): sequencia de icones (celular→loja→tesoura→saindo) no portao de readiness (cold start), respeita reduce-motion.

**Home:** card mostra **menor tempo de espera** (`estimated_wait_minutes`) + **estrela de avaliacao** (real quando o backend mandar, senao placeholder). **Aberta**: escondida se nao tem profissional com servico (`estimated_wait_minutes === null`). **Fechada**: so aparece se tiver **profissional afiliado com servico** (`available_professionals > 0`), pra o cliente poder **agendar** pra reabertura — nao adianta mostrar loja fechada sem ninguem (regra do Andre 2026-07-10). ✅ **BACKEND ENTREGOU (2026-07-18):** `available_professionals` agora vem na listagem `GET /establishment` (= nº de profissionais afiliados COM servico; `null` fora da listagem). O front **pode parar de esconder todas as fechadas** e passar a exibir as fechadas com `available_professionals > 0` (usar `?includeAll=true` p/ trazer as fechadas). `filterEstablishments` + `getAll()?includeAll=true` (2026-07-10).

**Loja fechada (fila fechada AGORA, `is_open` efetivo):** badge **AMBAR "AGENDAR"** (decisao Andre 2026-07-23 — "Fechado" era conclusivo demais; ambar sinaliza que a fila esta fechada mas ha caminho). O fluxo **NAO bloqueia mais**: cliente toca no profissional, ve os servicos e as acoes viram **"Solicitar corte"** (direto, `cutRequestService`; visitante passa pelo portao de auth e cai no 409→oferta do QueueStatus) + **"Agendar para depois"**. Banner ambar "i" na tela da loja explica os dois caminhos. O backend segue guardiao (gate C1). **Manifestar interesse / agendar para quando reabrir = ✅ ENDPOINT PRONTO (reconciliacao 2026-07-15): `POST /attendances/intentions`** (backend #4, status `INTENTION`; criar + editar/cancelar concluidos, funciona com a loja fechada desde que `desiredTime` no expediente; so a promocao automatica a fila esta pendente). **Front pode construir `manifestar_interesse` agora** — ver HANDOFF secao 11 ponto 2. Hoje ainda mostra "em breve" (nao ligado); trocar `notifyComingSoon("manifestar_interesse")` pela chamada real ao `intentionsService`.
> **✅ NOVO — "solicitar corte" (C2, backend 2026-07-18, fatias 1-2 de 3):** distinto de agendar (INTENÇÃO). Quando o `POST /attendances` retornar **`409 ESTABLISHMENT_NOT_OPEN`** (loja fechada agora), o cliente pode **solicitar corte** = `POST /attendances/cut-requests {professionalId, establishmentId, serviceItemIds}` → cria um pedido **PENDING** com validade de 5min. O profissional aceita (o cliente **entra na fila**, chega WS `CUT_ACCEPTED`) ou recusa (WS `CUT_REFUSED`). Front-Client: oferecer "solicitar corte" no 409 + escutar `CUT_ACCEPTED`/`CUT_REFUSED`. **Falta só a fatia 3** no backend (auto-nega por timer em 5min) — não bloqueia o front.

**Tela da fila (QueueStatus):** status reflete **SCHEDULED → IN_PROGRESS → FINISHED** (via poll de `/attendances/client/me`, fallback do WS). Aguardando: countdown monotonico + "Previsao de inicio". Em atendimento: **tempo decorrido em segundos** (100% no front via `startedAt` cacheado) + "Duracao estimada" + "Horario de termino". Concluido: "Finalizado" + **Avaliar**. **Disclaimer** de estimativa (modal 1x + icone "i"). **Pull-to-refresh**.

**Atendimentos:** EM ANDAMENTO (SCHEDULED ou IN_PROGRESS) + REALIZADOS (dia+hora de inicio); refetch no foco + pull-to-refresh; tocar no card abre **detalhes** (AttendanceDetailModal) + avaliar.

**Avaliacao (Item 6) — ✅ FEITO (front + backend, validado no device 2026-07-04):** `RatingModal` **só 1-5 estrelas** (comentario OCULTO desde 2026-07-11, flag `SHOW_COMMENT=false`) → `POST /attendances/{id}/rating`; agregados `rating_average`/`rating_count` vem no `professionals-with-queue` e o front consome (`resolveRating`). **Esconder "avaliar" apos o voto = FEITO no front** (`ratedStore` local/SecureStore, persistente entre reaberturas; `rated` do backend ainda desejavel p/ cross-device — HANDOFF sec.3.1).

**WebSocket:** `useQueueSocket` / `useQueueNotifications` existem mas **nao funcionam no device** (pendencia, precisa device+backend logs). Substituido por **polling** (`refetchInterval`: establishments 60s, fila 20s, atendimentos 30s) + poll de status da fila (30s).

---

## 1c. Estado atual (2026-08-06) — identidade da marca e rodada de UI do device

### 🎨 A MARCA TEM UMA FONTE ÚNICA: `BrandMark`

**Trocar o logo do VUPTH = trocar `assets/icon.png`.** Nenhuma tela faz `require` de logo.

Antes desta data a arte estava **duplicada**: `assets/icon.png` (que o `app.json` usa como ícone nativo) e `src/assets/vupth-logo/vupth-v.png` (que o `Header` carregava) eram **byte a byte idênticos** (mesmo md5). Quem trocasse a marca teria que lembrar dos dois, e esquecer um faria o ícone do celular divergir do logo de dentro do app. A cópia foi **removida** e `src/components/BrandMark.tsx` passou a apontar para `assets/icon.png` — a arte existe uma vez só. Sem custo de bundle: antes ia a cópia de 945KB, agora vai o original.

`BrandMark` também concentra o **render** (antes embutido no `Header`): `size` opcional com default `BRAND_MARK_SIZE = 50` e arredondamento **proporcional** (24% do lado), de modo que a marca cresce sem deformar. Um teste trava o apontamento para `assets/icon.png`, então um `require` avulso em outra tela não passa despercebido.

**Fronteira honesta — o que NÃO cabe no `BrandMark`:** `assets/adaptive-icon.png`, `assets/splash.png` e `assets/favicon.png` são resolvidos pelo `app.json` em **tempo de build**; não dá para importá-los de um módulo TS e **não saem por OTA**. Estão listados no cabeçalho do `BrandMark` com o aviso de regerar a partir da mesma arte e rodar `eas build`.

**Decisão do Andre (2026-08-06):** dentro do app entra **apenas o "V"** — o nome escrito não acompanha a marca nas telas. Foram estudados lockups com o nome (V + "vupth" em Poppins 700, empilhado e deitado, com e sem fundo) e a conclusão foi manter só o símbolo.

### 🚪 Abertura em duas partes (splash → sequência)

O `assets/splash.png` **nunca tinha sido trocado** — era o círculo cinza padrão do Expo sobre fundo **branco**. A abertura era: tela branca com um círculo genérico → corte → tela verde do app. Agora:

1. **Splash NATIVO** — o mesmo "V" centralizado sobre o verde do ícone (`#2E432F`), gerado a partir de `assets/icon.png` (mesma arte, sem desenho novo). O `backgroundColor` do splash foi de `#ffffff` para o verde, senão havia um flash branco antes de a imagem aparecer.
2. **`PreparingServer`** — a primeira coisa que o JS desenha, enquanto o portão de readiness acorda o Render: a sequência *Abrindo o app → Chegando na loja → Na cadeira → Pronto, sem fila*.

> ⚠️ **O "V" chegou a ser posto nesta tela e foi REMOVIDO no mesmo dia** (Andre, device: *"o começo ficou horrível"*). A ideia era emendar com o splash — mas **o splash é NATIVO e não sai por OTA**, então o aparelho recebeu METADE da ideia: um ladrilho verde escuro solto sobre o fundo quase branco desta tela, sem o splash verde que o justificaria. **Lição:** mudança de abertura que dependa do splash **não pode ser entregue por OTA sozinha** — tem de ir junto com o `eas build`. Se a marca voltar aqui, que seja com a tela inteira no verde, não como um selo avulso.

Sem o passo 2 a marca sumia no instante em que o splash saía e voltava depois, dando um piscar. ⚠️ O splash é **nativo**: só aparece num `eas build` novo.

### 🔧 Rodada de UI a partir do teste no device (2026-08-05)

| Feedback | O que mudou |
|---|---|
| "Esqueci minha senha continua apenas carregando e nada" (passo 1) | **Causa:** `waitForBackend` roda com **60s de timeout por tentativa** e a tela só avisava "Acordando o servidor" a partir da 2ª — que nunca chegava. Com o Render hibernado eram ~50s de "Enviando..." mudo, antes mesmo de o POST sair. **Agora:** `perAttemptMs: 8000`, fases separadas (`sendPhase`: idle/waking/sending), contador de segundos no próprio botão e **"Cancelar espera"** (via `isCancelled` do portão — desistir não dispara o POST). O aviso só aparece após 3s, para não piscar com o servidor quente |
| GPS ao incluir/editar endereço | O botão existia desde 8332dc17 mas era **passivo**. `handleNew`/`handleEdit` agora **oferecem** o GPS ao abrir o formulário, com texto ajustado ao caso; o botão manual continua para quem recusar |
| "O V no mesmo lugar que o banco ficava" | O slot no `Header` nunca mudou; o que mudou foi o **tamanho** — o `people-waiting.svg` era 50×50 e o PNG entrou com 46×46. Voltou a 50×50 |
| "No menu de mudar minha vez quero apenas as opções com select" | `ChangeTurnModal` deixou de ser árvore de telas e virou **uma lista de rádio** (adiantar / trocar com quem está atrás / ir para o fim / agendar) + um único "Confirmar". "Ir para o fim" fica **desabilitado** para quem já é o último, com o motivo na própria linha, no lugar do `Alert` que só aparecia depois do toque. Contrato com o `QueueStatus` inalterado |
| "Entrar e cadastrar não podem ter o mesmo peso" (Login) | "Criar conta grátis" virou `outline` |
| "Cadastrar na tela de visitantes deve ter peso maior" | Perfil e Configurações: **"Criar conta grátis"** (pílula sólida, vai direto ao `signUp`) + "Já tenho conta" (outline). Antes era um convite único que levava sempre ao Login — visitante que nunca teve conta caía numa tela de senha |
| "Formulários do mesmo tamanho dos do partner" | Levantamento entre os repos: os **botões já batiam** (54px / rounded-full nos dois). A diferença estava nos campos — client `h="$14"`/`px="$4"` (56px/16) contra partner `h="$12"`/`px-3` (48px/12). Client passou a **48px/12**. `src/components/Input.tsx` (legado, sem nenhum import) alinhado junto |

**Testes que acompanharam a rodada:** `screens/ForgotPassword.test.tsx` (4 casos), `screens/EditAddress.test.tsx` (3), `components/ChangeTurnModal.test.tsx` (6), `components/BrandMark.test.tsx` (5). Bateria em **55 suítes / 444 testes** no push de 2026-08-06.

### 📍 GPS — a distância passou a ser do BACKEND (2026-08-06)

O backend entregou a fatia B em 01/08: `GET /establishment?lat=&lng=` **ordena por distância** e devolve **`distance_km`** (2 casas) em cada item. O contrato é explícito — **o front NÃO recalcula**, porque se cada app fizesse a própria conta o client e o partner mostrariam números diferentes para a mesma loja.

**Estávamos divergentes** (achado ao ler o PRD deles): calculávamos Haversine em `proximity.ts` e nem mandávamos as coordenadas. O cálculo local foi **removido**.

| O que | Onde |
|---|---|
| Manda `lat`/`lng` (sempre em **par** — metade é `422`) | `establishmentService.getAll(coords?)` |
| **Não** manda `radiusKm` | Não existe raio default (Andre 2026-07-27). Com raio, a loja não geocodificada **sairia** e o cliente leria "não há lojas" onde há |
| Coordenadas na **query key** | `useEstablishments` — a permissão de GPS resolve *depois* da 1ª busca; sem isso o cache devolveria para sempre a lista sem distância |
| `distance_km?: number \| null` | `Establishment`. `null` = busca sem coordenada **ou** loja sem coordenada; os dois exibem igual: sem distância |
| Ordem | `orderForHome(list, hasCoords, loc)` — **com GPS devolve a lista intocada** (reordenar desfaria o desempate estável por id do backend); sem GPS cai na ordenação por bairro/cidade |
| Formatação | `formatDistanceKm` **ficou** — saiu o cálculo, não a exibição |

**Ordenação com GPS = distância pura (decisão do Andre, 2026-08-06):** loja **fechada perto vem antes de aberta longe**. Ela carrega o badge âmbar AGENDAR, então o cliente entende que há caminho. Há teste fixando isso.

### 🧊 HORÁRIO CONGELADO + MULTAS — recurso novo (Andre, 2026-08-07)

> Refinado pelo Andre depois da primeira redação, que estava **errada** em dois pontos: eu tinha escrito que a fila "passa por cima" do cliente congelado (não passa — **ele sai da fila**) e que ele teria imunidade a atraso (não tem — **a proteção é uma verificação no horário**, não um passe livre).

#### A. SÃO DOIS CASOS DIFERENTES — e o app precisa perguntar qual é

O cliente que escolhe um horário pode querer duas coisas **opostas**, e tratá-las igual quebra uma das duas:

| | **Caso 1 — ALVO (flexível)** | **Caso 2 — PISO (rígido)** |
|---|---|---|
| O que o cliente quer dizer | *"Quero por volta das 15:00 — mas se a fila andar e der para cortar antes, ótimo."* | *"Não posso antes das 15:00. Depois, pode."* |
| Se a estimativa **cair** para antes do horário | **Fica e é atendido antes.** É ganho, não problema | **SAI da fila** e volta a esperar — ele declarou que antes não pode |
| Se a estimativa **passar** do horário | Espera normalmente | Espera normalmente |
| Já existe? | ✅ É o comportamento do **horário-alvo** (`targetTime`) | ❌ **É o recurso novo** |

⚠️ **Consequência de UI:** não dá para escolher um default. Ao marcar um horário, o app tem de perguntar — algo como *"se abrir uma vaga antes, você aceita?"* — porque a resposta muda o que acontece com ele na fila e muda a régua da multa.

#### B. O mecanismo do PISO ("não antes das 15:00")

O piso não tira o cliente da fila: **ele sempre acaba indo para a fila** — o que muda é *quando* entra e o que acontece se a fila andar rápido demais.

**No exemplo do Andre** (piso = 15:00):

1. A fila anda. Quando o **tempo estimado cruza o piso** — digamos que fique em **15:10** — ele **entra na fila**.
2. Alguém à frente **desiste** e a estimativa dele **cai para antes das 15:00**. Aí ele **SAI da fila** e volta a esperar.
3. Quando a estimativa cruzar o piso de novo, ele entra de novo.

**A partir do momento em que ele está legitimamente na fila com estimativa ≥ piso, as regras normais valem:** se **sair da fila**, leva multa; se **não aparecer** no horário que ele mesmo escolheu, leva multa. O piso protege contra ser chamado **cedo demais** — não é imunidade.

#### C. Não chegou e não avisou: notificação + duas multas

Quando a vez do cliente chega e ele **não está lá e não avisou**, o app **manda uma notificação** oferecendo dois caminhos, com **multas diferentes**:

| Escolha | Consequência |
|---|---|
| **Sair da fila** | Multa de desistência |
| **Ainda quero ser atendido** | Multa de outro tipo (fica na fila, remanejado) |

Os valores e a natureza de cada multa **ainda não foram definidos** — falta decidir com o Andre.

#### D. ⚠️ O buraco: o atraso em cascata

Apontado pelo Andre e é o ponto mais delicado do desenho:

> *"se ele não chegar no horário e não avisar, o próximo cliente com certeza chegará atrasado, o que torna injusto notificá-lo como atrasado e multá-lo."*

O cliente seguinte foi informado de um horário **mais tarde**. Quando o da frente não aparece, a fila **anda para trás no relógio** e a vez dele chega **antes** do que lhe foi comunicado. Marcá-lo como atrasado é punir alguém por um atraso que **o sistema criou**.

**Princípio que unifica isto com o piso da seção A:**

> **Ninguém pode ser penalizado por não estar presente antes do horário que lhe foi comunicado.**

O piso é a versão **declarada** disso (o cliente diz o horário); o atraso em cascata é a versão **implícita** (o app disse o horário). O **alvo** (caso 1) fica de fora: quem aceitou ser atendido antes não tem o que reclamar de ser chamado antes. Nos dois casos, a régua da multa é o **horário comunicado**, não a posição na fila.

#### E. O que isso exige

1. **Guardar o horário comunicado** a cada cliente, e não só a posição. É dele que a multa passa a depender.
2. **Recalcular a entrada/saída da fila** a cada evento que mexa na estimativa (desistência, no-show, encaixe, atraso de terceiro).
3. **O profissional precisa ver o piso** de quem congelou — senão chama às 14:15, não aparece ninguém, e marca atraso.
4. **A multa só pode disparar depois** do horário comunicado àquele cliente.
5. **Descongelar / editar o piso** pelo cliente.

#### F. Desenho sugerido: orientado a EVENTOS (Andre, 2026-08-07)

> *"seria uma função orientada a eventos que observa cada alteração na fila, aí verifica o horário pretendido"*

É a forma certa, e **o backend já tem esse padrão três vezes**: `IntentionPromotionScheduler`, `CutRequestExpiryScheduler` e `EstablishmentAutoCloseScheduler` — todos com `ThreadPoolTaskScheduler` próprio/daemon e **deliberadamente sem `@Scheduled`**. O reavaliador do piso entra como mais um do mesmo molde: a cada evento, recalcula a estimativa de quem tem piso e decide **entra na fila / sai da fila / fica**.

⚠️ **O gatilho NÃO pode ser só "mudou o tamanho da fila".** Um atendimento que **demora mais que o estimado** empurra a estimativa de todo mundo **sem alterar o tamanho** — e é exatamente o caso em que alguém cruza o piso. A lista de eventos que precisa disparar a reavaliação:

| Evento | Efeito na estimativa |
|---|---|
| `start` / `finish` | move para trás **ou** para a frente, conforme a duração real |
| `cancel` / `leave-queue` / no-show | **antecipa** todo mundo — é o caso do "desistiu às 14:15" |
| `late` / `undo-late` | reordena |
| `fit-in` / encaixe / promover ao 1º lugar | **atrasa** quem está atrás |
| bloco de refeição criado, editado ou pulado | move a janela inteira |
| profissional pausa / retoma / fica indisponível | idem |

Como o backend **já faz `broadcastQueue` a cada mudança**, o ponto de engate natural é o mesmo caminho — quem já sabe que a fila mudou é quem deve acionar a reavaliação.

**Ainda a decidir:** quando alguém **sai** da fila por causa do piso, ele volta para onde? (fica como intenção fora da fila até cruzar de novo, ou vira um estado próprio?) E o cliente precisa ser **avisado** das duas transições — sair e voltar a entrar —, senão ele abre o app, não se vê na fila e acha que perdeu a vez.

#### G. Relação com o que já existe

- **Cancelamento tardio + strikes/aviso** (era o `#39` do backlog do backend em 08/2026 — conferir o número no PRD deles, ver o aviso no topo do HANDOFF): é a base do sistema de penalidade. As multas aqui são uma evolução dele, com **duas saídas** em vez de uma.
- **Intenção de fila com horário-alvo** (`targetTime` no `POST /attendances`): cede a vez enquanto o previsto for antes do alvo. É o parente mais próximo do piso, mas **não faz o cliente sair da fila** quando a estimativa cai, e não trata multa. Está **desligado no nosso front** desde 2026-07-15, com o parâmetro preservado em `ServiceSelection.goToQueue()` para religar sem retrabalho.
- **Intenção fora da fila** (`desiredTime`): promovida ~15min antes e vira `SCHEDULED` comum **na cauda**; se a fila drenar, nada impede o atendimento antes do horário.

⬜ **Bloqueado no backend** — pedido no HANDOFF §16.1 (B9). Não construímos contorno.

### 🐛 Dois defeitos estruturais achados em 2026-08-07

**1. `isDisabled` não bloqueava o toque.** O `Button` fazia `disabled={isLoading}` e espalhava `{...rest}` depois, então o `isDisabled` chegava ao Gluestack como **estado visual apenas**: o botão ficava apagado e o toque continuava disparando o `onPress`. Ninguém tinha notado porque **todas** as telas que usam `isDisabled` têm guarda dentro do handler (`if (!canSend) return`) — escapavam por acaso, não por proteção. Bastou um handler sem guarda (o modal de deletar conta) para o furo aparecer. Corrigido no `Button` (amarra o `disabled` real do `Pressable`) e coberto por `components/Button.test.tsx`. **Achado pelo portão de push**, não no device.

**2. Quatro telas não rolavam.** `Settings`, `Profile`, `EditEmail` e `EditPassword` eram um `VStack flex={1}` seco: conteúdo além da altura da tela ficava **inalcançável**, sem erro nem indicador. Nas Configurações apareceu quando o painel de diagnóstico aumentou a altura; as outras três já estavam assim havia tempo. Todas passaram a `ScrollView` + `contentContainerStyle={{ flexGrow: 1 }}` — o `flexGrow` não é decorativo: sem ele o "Sair da conta" do Perfil sai do rodapé. Guarda: `screens/scrollable.test.ts` varre `src/screens/` e falha se alguma tela não tiver `ScrollView` nem `FlatList`.

### 🏷️ Rótulos de categoria — fonte única (2026-08-06)

`SERVICE_TYPE_LABELS` vivia **dentro da `Home.tsx`** (e havia uma **segunda cópia** logo abaixo, nos filtros). Resultado: só a Home traduzia, e a categoria aparecia crua em qualquer outra tela — feedback do device: *"na tela inicial aparece barbearia, salão etc, mas quando clicamos no estabelecimento o tipo fica em inglês"*.

`domain/establishment/serviceType.ts` passou a ser a fonte única:

- **`serviceTypeLabel(v)`** — aceita minúscula/espaço; **valor desconhecido volta intacto**, para nada sumir da tela quando o backend criar uma categoria nova.
- **`formatSpecialty(raw)`** — a `specialty` do profissional é **texto livre** no backend (`"Corte masculino"`, `"Colorista"`), mas parte dos cadastros veio preenchida com a categoria **em inglês**, e era isso que aparecia embaixo do nome. Traduz o que reconhece e **preserva o resto**: mapear à força apagaria a especialidade de quem escreveu de verdade. Aceita lista por vírgula.
- Os **filtros da Home são derivados** do mapa — categoria nova entra sozinha nos três lugares e o rótulo do filtro nunca diverge do rótulo do card.

### 🔌 Diagnóstico do WebSocket no device (2026-08-06)

Configurações → **"Tempo real (diagnóstico)"**, uma linha por canal (pessoal e público). Existe porque o "Teste 0" pedido pelo backend (imprimir os headers do `CONNECTED`) era **inexequível**: num binário instalado, `console.log` só aparece via `adb logcat` ou dev client.

- **`user-name` vazio ⇒ conexão ANÔNIMA** — é o `#31`/S14, e a assinatura do "às vezes não chega": o tópico público segue atualizando a fila e só o canal pessoal morre calado, sem erro. O painel diz isso em uma frase.
- **`heart-beat`** — mostra o negociado e avisa quando vem `0` (socket zumbi).
- **Recebidas / última / conexões** — separa "conectado" de "recebendo", e conta reconexões.

Domínio puro em `domain/ws/diagnostics.ts` (17 casos). **C18 feito junto:** `AppState` nos dois hooks reconecta ao voltar do primeiro plano com o socket caído — o cenário piorou desde que o servidor passou a mandar heartbeat, porque a sessão suspensa é derrubada em ~10s.

> ⚠️ **Observabilidade não é contorno.** O painel **exibe** o `#31`, não o conserta — ver a regra de fronteira no HANDOFF.

> ⚠️ **Correção ao §1b:** a linha "WebSocket: `useQueueSocket` / `useQueueNotifications` existem mas **não funcionam no device**" está **desatualizada**. Em 2026-08-01 o diagnóstico virou o jogo: o **servidor sempre esteve certo** e o defeito era do app (flags `forceBinaryWSFrames`/`appendMissingNULLonIncoming` + token lido uma única vez no mount, que ia vencido em toda reconexão). Ambos corrigidos. Ver HANDOFF §4.

---

## 1y. 📥 Recebido do front-partner (leitura de 2026-08-17, handoff deles de 11/08)

### 🔑 C24 — a falha de handshake era COLD START, não código

**Eles mediram** (front-partner, 11/08): com a instância do Render **hibernada**, o readiness levou **35s**; com ela **acordada**, o `/ws/info` responde em **0,5s**. Conclusão: **qualquer handshake feito na janela de boot morre** — e isso vale igual para nós.

> ⚠️ **Consequência direta para o nosso teste:** *"falha no handshake no primeiro acesso"* é **infraestrutura, não bug de app**. **Testar sempre com o backend já quente** — senão o A/B mede o Render, não os apps. Isso reenquadra o resultado do teste de device do Andre em 07/08.

**Eles já estão instrumentados** desde 11/08: o painel deles vive em Configurações do profissional e o store (`wsDiagnostics.store.ts`) **espelha o nosso de propósito** — mesmos canais (`public`/`personal`) e mesmas ações — para a comparação ser maçã com maçã. Ou seja, o A/B que pedimos **está pronto dos dois lados**.

**✅ Achado deles que corrigimos aqui (2026-08-17):** o `lastError` **não era limpo ao reconectar**, então a falha do boot ficava colada na tela enquanto o `reconnectDelay` reconectava por baixo — o painel mostrava *"conectado"* **e** *"último erro"* ao mesmo tempo, fazendo uma falha **já superada** parecer permanente. Nosso store tinha o mesmo defeito. Corrigido, com teste de regressão; o contador de falhas fica (é histórico útil), o que sai é a exibição do erro como se fosse o estado atual.

### 🎨 NOVA IDENTIDADE VISUAL — achada na branch `design/marca-dev` do partner (2026-08-17)

⚠️ **Nunca foi comunicada por handoff.** A branch mudou **61 arquivos de código e ZERO documentos** — a informação existe só como comentário dentro do código de uma branch **não mergeada**. Encontramos porque o Andre pediu para procurar.

**A paleta é a do Wise:**

| Token | Hex | Papel |
|---|---|---|
| `brandGreen` | `#9FE870` | verde limão — **só como FUNDO** |
| `forest` | `#163300` | verde muito escuro — o par de texto/ícone por cima |
| `greenTint` | `#E2F6D5` | superfície alternativa |
| `accentBlue` / `accentPeach` / `accentPink` / `accentPlum` | `#A0E1E1` · `#FFC091` · `#FFD7EF` · `#260A2F` | apoio |

Mais `brandSurface #F3F5F1`, `brandTextSecondary #454745`, `brandBorder #D7DDD3`, raios `card: 20` / `hero: 24`.

**Trocam também as fontes:** **Archivo** (700/800) substitui a **Poppins** em heading/display; **DMMono** entra para números (fila, horários). Hoje estamos em Poppins e com `mono: undefined`.

#### O que eles esperam de nós — está escrito no código deles

> *"Precisa bater 1:1 com **`vupth/config/gluestack-ui.config.ts`** e com `tailwind.config.js` — os três têm que ficar sincronizados **no mesmo commit**."*

E o `BrandButton.tsx` deles diz *"espelha `src/components/brand/Button.tsx` do vupth (client)"* — **arquivo que não existe aqui**. Estavam escrevendo como se a nossa metade já estivesse pronta.

#### ✅ O risco é baixo, e isso muda a conversa

Os tokens são **ADITIVOS, não substitutivos**:

> *"Aditivos: não remapeiam `green50-900` (ainda usado como texto em várias telas), porque `brandGreen` é claro demais para texto/ícone sobre fundo claro — só entra como fundo, com `forest` por cima."*

Ou seja: **acrescentar os tokens não muda nenhuma tela existente.** A paleta "Verde Marca" (`#3B7A3F`) continua válida durante a transição — as duas coexistem de propósito, e o `BrandButton` convive com o `Button` atual. **Sincronizar os tokens é barato e sem efeito visual; adotar os componentes é a decisão cara**, e é separada.

**Armadilha que eles já pagaram e nos avisam:** *"o config do partner nasceu ancorado no teal antigo e login/cadastro renderizaram com um verde diferente do resto do app até alguém notar. Ao criar o `tailwind.config.js` do client, **copie os hexes da fonte da verdade — não escolha um verde parecido**."*

⬜ **A decidir pelo Andre:** a identidade nova é decisão fechada? Se for, sincronizamos os tokens (barato) e definimos quando adotar os componentes (caro, e conversa com a **D9** — migrar para a v2 do Gluestack).

### ⛔ C21 — cada profissional escolhe seu regime: fila OU agenda pura (depende do S24)

*Item do handoff do partner datado de 05/08 que **não constava em nenhum documento nosso**.*

Decisão do Andre: *"o profissional poderá escolher se usará fila (modelo que estamos criando), ou se apenas agenda, onde os horários são fixos."*

**Não confundir com a escolha do cliente** (entrar agora *vs* agendar): o C21 é a escolha do **profissional** sobre como ele trabalha. No modo agenda o horário é **FIXO** — hora marcada, nada empurra.

**Ação nossa:** o card e a tela de cada profissional passam a oferecer **"entrar na fila"** ou **"escolher horário"** conforme o modo **dele** — e **os dois modos convivem no mesmo estabelecimento**. No modo agenda não existe posição nem ETA a mostrar: existe **grade de horários livres**.

> ⚠️ **Registrado agora para a tela da loja não ser desenhada assumindo que todo profissional tem fila** — junto com o C22, que diz para ela não assumir horário único da semana. As duas restrições valem para a mesma tela.

### ⛔ C22 — horário de funcionamento por DIA da semana (depende do S27)

Hoje o contrato tem **um** `opening_time`/`closing_time` para a semana inteira. O Andre pediu horário **por dia** (domingo fechado, sábado até as 18h). Quando o backend modelar (**S27**: lista de `{dayOfWeek, openingTime, closingTime, closed}`), a **nossa tela da loja muda**: passa a mostrar **o dia corrente** ("hoje 9h–19h", "fechado hoje") e, idealmente, **quando reabre** ("abre amanhã às 9h") — que é a informação útil para quem chega fora do horário.

> **Registrado agora para a tela da loja não ser desenhada assumindo um horário único.**

### ⛔ C23 — "esqueci minha senha": a mensagem também muda aqui (depende do S21)

O Andre testou e **o fluxo passou com um e-mail sem cadastro**, porque o backend responde **200 sempre** (anti-enumeração). Ele decidiu o contrário: passará a devolver **`404 EMAIL_NOT_FOUND`** (S21).

**Ação nossa quando entrar:** trocar a mensagem para a forma **afirmativa** ("Enviamos um código de 6 dígitos para seu e-mail") e tratar o `404` como **erro do próprio campo** ("E-mail não cadastrado"), sem popup.

⚠️ **No mesmo teste o e-mail não chegou** (S7, SMTP) — então, até o envio voltar, o fluxo segue inutilizável nos dois apps mesmo com a mensagem certa.

---

## 1w. 🌍 NOMES DOS AMBIENTES — `local` · `staging` · `prod` (decidido pelo Andre, 2026-08-28)

> 📣 **Vocabulário único para os TRÊS projetos** (backend, front-client, front-partner). Esta é a
> tabela válida. Qualquer outro nome que apareça em documento, `.env` ou painel está desatualizado.

| Nome | Onde roda | Quem publica ali |
|---|---|---|
| **`local`** | Docker na máquina do dev | ninguém — é a máquina |
| **`staging`** | **Render** | branch **`dev`** |
| **`prod`** | **Railway** | branch **`main`** |

### Por que três nomes, e por que estes

O problema que isto resolve é **uma palavra significando duas máquinas**: `dev` era Docker local no
backend e Render no client. Pior, a branch `dev` **publica no Render** — então "testa na dev" não
distinguia branch de notebook.

**`dev` sai do vocabulário.** É a única palavra que colidia com nome de branch. Os três nomes que
ficam não colidem com nada: nem com branch, nem com os ambientes da Cloudflare Pages
(*Production*/*Preview*), nem com os canais do EAS (`development`/`preview`/`production`).

⚠️ **`staging` foi preferido a `test`** (que chegou a ser acordado em 27/08): "test" carrega junto a
ideia de teste automatizado, e `staging` é o nome que o backend **já usa** no
`application-staging.properties` apontando para o Render. Menos renome, menos ambiguidade.

### O que muda no client

Nada de comportamento — é renome. Quatro pontos, todos em `apiEnv.ts`/`api.ts`, mais os `.env` das
máquinas e o `eas.json`:

| onde | hoje | vira |
|---|---|---|
| `ApiEnv` | `"local" \| "dev" \| "staging" \| "prod"` | `"local" \| "staging" \| "prod"` |
| `BASE_URLS` | `dev` **e** `staging` no mesmo host do Render | **apaga a chave `dev`** (o `staging` já está certo) |
| `CANAL_PARA_ENV` | `development: "dev"` | `development: "staging"` |
| lista branca do `resolveApiEnv` | `["local","dev","staging","prod"]` | `["local","staging","prod"]` |

✅ **Do nosso lado é DELEÇÃO, não renome** — a chave `staging` já existe e já aponta para o Render.
O par `dev`/`staging` era duplicata que só existia porque o mesmo `.env` circulava entre os repos;
ela some, e some o motivo dela.

⚠️ **O renome está TRAVADO POR DATA, de propósito.** Fazer fora de sincronia entre os três repos é o
único jeito de isto custar caro. O levantamento acima existe para o dia ser de execução, não de
descoberta.

⚠️ **O que NÃO é renome e morde antes:** o fallback do `resolveApiEnv` é **`local`**. Build web sem
`EXPO_PUBLIC_API_ENV` declarada sai apontando para um IP de rede local e **não dá erro que
explique** — parece CORS e não é. Ver §1x e `PARA_OUTRAS_EQUIPES.md` §10.7.

---

## 1x. 🌐 ACESSO PELO NAVEGADOR (web) — decisão do Andre, 2026-08-17

**Decisão:** vamos ter acesso por URL, como o partner já tem. E a limitação do navegador **é assumida em voz alta**, não escondida:

> *"é provisório; podemos a todo momento solicitar o download do app para aproveitar todas as funcionalidades. Podemos dizer que pelo navegador não tem notificação e logo abaixo oferecer link para baixá-lo."*

Isso **reenquadra o custo do porte**: não estamos prometendo paridade, então os 64 usos de `Alert.alert` deixam de ser bloqueio — deixam de ser dívida e viram *degradação conhecida*.

### O que o partner fez (achado no código; não está em documento deles)

| Peça | O quê |
|---|---|
| **Alias no Metro** | `expo-secure-store` → `web-shims/expo-secure-store.js` **só no bundle web**. iOS/Android seguem com o pacote real, **o código-fonte não muda** e os testes continuam mockando o pacote |
| **O shim** | Usa **`sessionStorage`**, não `localStorage`: o token morre quando a aba fecha, o que apaga o cenário do computador compartilhado. Fallback em memória para navegador com storage bloqueado |
| **`public/_headers`** | CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS. O Expo copia `public/` para a saída do export; o formato é lido por Cloudflare Pages e Netlify. O CSP ataca o vetor real (XSS) — sem ele, script injetado lê o token |

⚠️ **Aviso deles:** o `connect-src` do CSP lista as URLs da API em `https` **e `wss`**. Se a URL mudar e o CSP não, **a fila para de atualizar sem erro visível**.

### Dimensionamento aqui

- **Fácil (24 arquivos):** o `expo-secure-store` sai de graça — copiar alias + shim, zero mudança de código nosso.
- **Nativos:** `expo-location` e `expo-notifications` já são carregados com `require` dentro de `try/catch` nos nossos hooks, então **degradam sozinhos** em vez de derrubar o app. Falta tratar o `expo-updates` nas Configurações (id da OTA e "verificar atualização" não fazem sentido no navegador).
- **`Alert.alert` é no-op no React Native Web** (64 usos). Com a decisão acima, a maioria vira degradação aceitável — **menos um caso**, abaixo.

### ✅ Escopo do web — DECIDIDO (Andre, 2026-08-17): acesso COMPLETO

**O navegador não é vitrine: é o app.** O visitante pode **se cadastrar e entrar na fila** normalmente. O que muda é que ele **é avisado das limitações**.

> *"ele pode se cadastrar pelo navegador também, só será avisado sobre suas limitações — menos sobre segurança."*

**O que avisamos:** o que ele **perde na prática** — sem notificação fora da aba, então precisa manter o app aberto para ser avisado da vez. Com o CTA de baixar o app logo abaixo.

**O que NÃO avisamos:** nada sobre segurança de sessão. Dizer ao usuário "aqui sua sessão é menos protegida" assusta sem ajudar — ele não tem ação a tomar com essa informação.

> ⚠️ **Não confundir "não avisar" com "não fazer".** As proteções continuam **todas** implementadas: `sessionStorage` em vez de `localStorage` (a sessão morre ao fechar a aba) e o CSP em `public/_headers` (que é o que barra o XSS, o vetor real). A decisão é sobre **mensagem ao usuário**, não sobre o que se constrói.

#### Onde o aviso precisa aparecer

Não basta uma vez no primeiro acesso. O momento que importa é **quando ele entra na fila** — é ali que a falta de notificação passa a ter consequência, porque é dali em diante que ele pode **perder a vez e ser multado** (D1: a multa é dinheiro).

Com o aviso **no momento certo**, a multa fica defensável: ele foi informado antes de assumir o compromisso. Enterrado num banner do primeiro acesso, não fica.

### Ordem de implementação sugerida

1. Alias + shim (barato, e permite rodar no navegador para **ver o que quebra de verdade**).
2. Tratar o `expo-updates` e o que mais só existir no nativo.
3. Banner honesto de limitação + CTA de download.
4. CSP por último, **com o `connect-src` apontando para as nossas URLs**.

Nada aqui aguarda **decisão** — o escopo está fechado. O que falta é **implementação de terceiro**, abaixo.


### 🔤 As FONTES da marca e o deploy web — resolvido em 2026-08-29

**O que acontecia.** O `expo export --platform web` grava cada asset **espelhando o caminho de
origem**. Com as fontes importadas de `@expo-google-fonts/*`, os TTFs saíam em
`dist/assets/node_modules/@expo-google-fonts/...` — e a **Cloudflare Pages descarta `node_modules`
do deploy, por design e sem avisar**.

Somado a isso, o portão do `App.tsx` segurava a tela **só** no `fontsLoaded`, descartando o segundo
elemento do `useFonts`. Resultado: **spinner eterno**. Não era CORS, não era backend.

⚠️ **Por que passou despercebido, e a lição que vale para tudo:** com o fallback de SPA, **o arquivo
ausente responde `200`**, devolvendo o `index.html`. Quem testa por status code vê verde.
**`200` não significa que o arquivo existe — o que distingue é o `content-type`.**

**Como está agora.** Os 6 TTFs que usamos vivem em `assets/fonts/` e entram por `require()`. O
portão é `fontsLoaded || Boolean(fontError)`: fonte que falha **degrada para a do sistema** em vez de
prender o app. De brinde, o export caiu de **42 fontes para 6** — antes o pacote inteiro do
`@expo-google-fonts` entrava no bundle.

**📐 COMO SE VERIFICA** *(medido em 29/08 — se der outro resultado, esta seção está mentindo)*:

```bash
# 1. pegue o bundle publicado
curl -s https://dev.vupth.pages.dev/ | grep -o '/_expo/static/js/web/[^"]*\.js'

# 2. no bundle, NAO pode haver caminho sob node_modules:
grep -c 'assets/node_modules/@expo-google-fonts' bundle.js     # esperado: 0  (era 42)

# 3. e a fonte tem de existir DE VERDADE — olhe o content-type, nao o status:
curl -sI https://dev.vupth.pages.dev/assets/assets/fonts/Archivo_700Bold.<hash>.ttf | grep -i content-type
# ✅ font/ttf   ❌ text/html  = nao existe, quem respondeu foi o fallback de SPA
```

🔒 **Travado por teste:** `src/__tests__/projeto/fontesForaDoNodeModules.test.ts` verifica as **três**
condições juntas — nenhum import de `@expo-google-fonts`, os TTFs existem em `assets/fonts/`, e o
portão considera o erro (inclusive que o render não voltou a usar `{!fontsLoaded ?`).

> 🙏 **Crédito:** achado pelo **front-partner** em 29/08, que perdeu o app publicado para isso e nos
> avisou antes de a gente descobrir sozinho. Eles corrigiram do mesmo jeito (`f310297`).

### 🔴 O bloqueio real do acesso por link: **CORS** (medido em 26/08, nos dois backends)

O porte web em si não é o gargalo. **Nada do que está escrito acima funciona no navegador enquanto
o backend não tiver CORS** — e hoje ele não tem nenhum. Isso vale para as duas pontas: o app nativo
não é afetado (cliente nativo não manda `Origin`), o navegador é barrado antes da primeira chamada.

**Medição nossa (26/08), contra os dois ambientes:**

| Backend | `OPTIONS /auth/login` com `Origin` + `Access-Control-Request-*` | `GET /actuator/health/readiness` com `Origin` |
|---|---|---|
| Railway (prod ← `main`) | **401** | 200, **sem nenhum header `access-control-*`** |
| Render (staging ← `dev`) | **401** | 200, **sem nenhum header `access-control-*`** |

**Por que o modo de falha é mudo:** sem `.cors(...)` no `SecurityConfig`, o **preflight `OPTIONS`**
cai em `anyRequest().authenticated()`, e preflight **não carrega `Authorization`** → 401 antes de
qualquer chamada real. No console do navegador aparece só o erro genérico de CORS, sem corpo e sem
status útil. **Sintoma: o link abre bonito e nenhuma chamada completa.** É por isso que este item
não é diagnosticável a partir do nosso lado — e por isso está escrito aqui.

> ⏱️ **28/08: o backend IMPLEMENTOU o CORS.** O parágrafo abaixo é registro de 27/08.
> Estado atual, com a escada de diagnóstico e o que falta: `PARA_OUTRAS_EQUIPES.md` **§11**.

**Estado do backend** (`PRD_BACKEND.md` §18e, 26/08): CORS 🟠 **especificado, não implementado** ·
WebSocket ✅ **já aberto** · keep-warm = configuração do Andre. O desenho aprovado lá usa
`setAllowedOriginPatterns` + env var `CORS_ALLOWED_ORIGINS` (default vazio), `allowCredentials(false)`.

⚠️ **Duas origens nossas precisam entrar na env var — e em painéis DIFERENTES**, porque as duas
publicações do Pages falam com backends diferentes:

| Origem do client | De onde vem | Env var em |
|---|---|---|
| `https://vupth.pages.dev` | Pages **Production**, build da `main` | **Railway** |
| `https://*.vupth.pages.dev` | Pages **Preview**, builds da `dev` | **Render** |

O §18e cita só `vupth-partner.pages.dev`. **Pedido registrado em `PARA_OUTRAS_EQUIPES.md` §9.2.**

✅ **Nada muda no nosso código por causa disso:** já mandamos o JWT em `Authorization: Bearer`, não
usamos cookie, e não dependemos de `allowCredentials(true)`.

✅ **WebSocket não é bloqueio** — `WebSocketConfig` já está com `setAllowedOriginPatterns("*")` nos
dois endpoints. Nós tínhamos registrado como pendência; **estava errado e foi retirado**
(`PARA_OUTRAS_EQUIPES.md` §9.1).

⚠️ **Antes de culpar o CORS, confirmar o alvo do bundle.** O fallback do `resolveApiEnv` é
**`local`**: build web sem `EXPO_PUBLIC_API_ENV` sai apontando para um IP de rede local e **não dá
erro que explique** — sintoma idêntico ao do CORS. **Verificado em 27/08 que o Production está
certo** (`resolveApiEnv(canal,"prod")` → Railway); **o Preview ainda não foi conferido**, e a
Cloudflare não herda variáveis entre os dois ambientes. Detalhe em `PARA_OUTRAS_EQUIPES.md` §10.7.

⚠️ **Divergência interna a corrigir antes de publicar:** o nosso `web-shims/expo-secure-store.js`
usa **`localStorage`**; o do partner usa **`sessionStorage`**. O C26 deles diz explicitamente que
isso **não pode divergir** — e a decisão desta seção ("a sessão morre ao fechar a aba") é a do
`sessionStorage`. Hoje o nosso shim contradiz o próprio PRD.
---

## 1z. 🧭 DECISÕES PENDENTES DO ANDRE — contexto, pergunta e o que o mercado faz

> Tópico criado a pedido do Andre (2026-08-07) para concentrar **o que depende de decisão dele**, não de implementação. Cada item traz: **contexto**, **a pergunta**, e **como o mercado resolve** — para ele analisar e pesquisar. Nada aqui está decidido. Ao decidir, mover a decisão para a seção da feature e **apagar o item daqui**.

---

### ✅ D1 — DECIDIDO (Andre, 2026-08-07): **a multa é DINHEIRO.**

Não é penalidade reputacional: o cliente **paga**. Isso muda a categoria do produto e destrava/força o resto.

**O que essa decisão arrasta junto** (não é opinião, é consequência):
- **Meio de pagamento vira pré-requisito** do fluxo de fila — hoje o app não tem nenhum.
- **D2 e D3 deixam de ser opcionais** e viram bloqueio: sem definir *como* cobrar e *quanto*, não dá para construir.
- **Entram regras que não existiam:** reembolso, contestação, comprovante/recibo, e o que acontece quando a cobrança **falha** (cartão recusado, sem saldo).
- **Exposição ao CDC:** multa a consumidor exige informação prévia, clara e destacada — a regra precisa estar visível **antes** de o cliente entrar na fila, não escondida em termos de uso.
- **Quem recebe** (loja ou plataforma) tem efeito fiscal e contratual. É a próxima pergunta a fechar, dentro da D2.

**Vale manter à vista o dado da pesquisa:** a Booksy mediu que **só ter o cartão salvo já reduz o no-show em 25–30%**, sem cobrar. Isso não contradiz a decisão — mas sugere que **guardar o cartão** é o passo que entrega mais cedo o efeito, e a cobrança em si pode vir depois, já com a infraestrutura montada.

### ✅ D2/D3 — PARCIALMENTE DECIDIDO (Andre, 2026-08-07)

**Decidido:**
- **A PLATAFORMA fica com o dinheiro** da multa (não a loja).
- **Valor: R$ 3,00**, a princípio. **Valor único, configurável** — *"será apenas o valor deste campo"*. Não é percentual do serviço nem escalonado por reincidência.

**Ainda aberto dentro da D2:** *como* cobrar — cartão salvo no cadastro, cobrança no ato, ou acúmulo para a próxima visita.

#### ⚠️ Duas consequências que precisam de decisão consciente

**1. O profissional é quem perde, e não recebe nada.** Quem sofre o no-show é o profissional: perdeu o horário e o faturamento daquele corte. Com a multa indo **inteira para a plataforma**, ele fica sem compensação — recebe só o transtorno. É sustentável como modelo de receita, mas convém ser escolha explícita, porque **é o profissional que vende o app ao cliente**. Alternativas comuns no mercado: *split* (parte para a loja), ou a multa virar **crédito do cliente naquela loja**.

**2. A R$ 3,00, a taxa de pagamento come uma fatia grande.** Transação de cartão no Brasil custa tipicamente **R$ 0,40–1,00 fixos + percentual** — numa multa de R$ 3,00 isso é **15–30% indo para o adquirente**. Duas saídas usadas no mercado: **acumular** e cobrar quando passar de um piso, ou **pré-autorizar sem capturar** — que é justamente o modelo em que a Booksy mediu 25–30% de redução no no-show **sem cobrar nada**.

#### ❓ Ficou uma pergunta em aberto

Você tinha definido **duas multas diferentes** — uma para *sair da fila* e outra para *seguir na fila mesmo tendo faltado*. Agora falou em *"apenas o valor deste campo"*. É **um valor só para os dois casos**, ou continuam **dois valores**? Muda a modelagem: um campo, ou dois.

### D4. Existe tolerância? De quanto?

**Contexto.** Não conversamos sobre isso, e sem tolerância a régua fica dura demais: trânsito, elevador, fila do estacionamento.

**Pergunta.** Há uma janela de graça entre "chegou a vez" e "está atrasado"? Quantos minutos?

**O que o mercado faz.** Restaurante segura a mesa por **10 minutos** — é quase padrão. Salão costuma usar **10 a 15 minutos** antes de liberar o horário.

---

### ✅ D5 — DECIDIDO (Andre, 2026-08-07): intenção volta, e nasce o **PENDENTE DE ACEITAÇÃO**

**Estado de quem sai da fila pelo piso:** volta a ser **intenção**. Sem estado novo para isso.

#### O discriminador único

> **O pedido cabe no expediente, com tempo disponível?**

| Resposta | O que acontece |
|---|---|
| **SIM** | **Garantido** — aceitação automática, sem pedir nada ao profissional. **Bloqueia o fechamento da loja** |
| **NÃO** (fora do expediente, cruza o fechamento, ou não cabe) | **PENDENTE DE ACEITAÇÃO** do profissional. **Não bloqueia** nada |

Uma pergunta só resolve as três situações — não precisa de regra por caso.

#### As três situações, do jeito que o Andre descreveu

**1. Antes de abrir / iniciar a fila.** O profissional vê os clientes que pediram para cortar e **reorganiza a fila do jeito dele**. Aqui o tema é **ordem**, não aceitação: os garantidos já estão dentro; os pendentes ele aceita ou não.

**2. Durante o expediente.** Quem manifestou interesse com horário disponível tem **atendimento garantido**, igual a quem já está na fila. **Esse bloqueia o fechamento:** ou o profissional remove todos, ou atende todos.

**3. Horário que cruza o fechamento.** Fica **pendente de aceitação** e **não bloqueia** a fila. O profissional decide se estica o expediente para atender.

#### 💡 O efeito que isso tem no produto

Hoje o backend **recusa** esses casos com erro:
- `422 INTENTION_OUTSIDE_BUSINESS_HOURS` — pediu fora do expediente;
- `409 PROFESSIONAL_AGENDA_FULL` — não cabe antes do fechamento.

Nos dois, o cliente leva um "não" e vai embora. Com o pendente de aceitação, os mesmos casos viram **"vou perguntar ao profissional"** — e quem decide passa a ser quem tem interesse em vender. **Dois erros viram uma oportunidade**, sem mudar nada do fluxo feliz.

#### O que muda para cada equipe

- **Backend:** novo estado de intenção (pendente/aceita), o gate de fechamento passando a considerar as garantidas de hoje, e os dois erros acima deixando de ser recusa.
- **Front-partner:** tela de triagem antes de abrir (ver e ordenar) e a decisão de aceitar/recusar os pendentes.
- **Front-client:** mostrar a diferença entre *"agendado"* e *"aguardando o profissional confirmar"* — são expectativas diferentes e não podem parecer a mesma coisa.

---

### 🟡 D6 — PARCIALMENTE DECIDIDO (Andre, 2026-08-07): a tela mostra "AGENDADO"

**Decidido:** enquanto espera fora da fila, o cliente aparece como **intenção / "AGENDADO"** — não como "fora da fila". Isso resolve a maior parte do susto: ele abre o app e vê *"Agendado para 15:00"*, em vez de não se ver em lugar nenhum.

**Ainda aberto:** manda **notificação** nas transições, ou só muda o rótulo em silêncio?

**Minha leitura:** com o rótulo "Agendado" e com a pergunta da D7 já feita (ele *escolheu* a opção "não consigo antes"), o susto praticamente some — ele foi avisado de que isso aconteceria. Sobra **uma** notificação que continua valendo a pena: **quando ele entra na fila de verdade** ("agora você está na fila, faltam X"), porque é a partir daí que ele precisa se deslocar. Sair da fila pode ser silencioso; entrar, não.

---

### ✅ D7 — DECIDIDO (Andre, 2026-08-07): perguntar DEPOIS de confirmar, no padrão "substituição"

**Onde perguntar:** o cliente manifesta a intenção pelo fluxo **que já existe**. **Depois de confirmar**, aparece um aviso de que a fila oscila, com a escolha.

**Como perguntar** (texto do Andre, a lapidar):

> *"Caso o tempo estimado da fila diminua para antes das **15:00**, o que deve ser feito?"*
> 1. **Acompanhar a fila** — aceito ser atendido antes
> 2. **Não consigo cortar antes desse horário** — me mantenha para depois das 15:00

**A referência é o Zé Delivery**, quando o estabelecimento não tem a bebida escolhida e ele pergunta o que fazer. É o **padrão de preferência de substituição**: em vez de o app adivinhar, ele pergunta uma vez, na hora em que a escolha é concreta, e guarda a resposta para quando o caso acontecer.

**Por que esse desenho funciona melhor do que perguntar antes:**
- Só aparece para quem escolheu horário — não polui quem entra na fila normal.
- O horário aparece **preenchido** na pergunta ("antes das 15:00"), então ela é concreta, não hipotética.
- Vem **depois** da confirmação: não adiciona atrito à decisão principal.

**Mapeamento para o modelo:** opção 1 = **alvo** (flexível, comportamento que já existe) · opção 2 = **piso** (rígido, o recurso novo).

**A ajustar na redação:** "diminua" pode ser lido como "diminuir a espera" (bom) em vez de "antecipar o horário". Vale testar algo como *"Se abrir uma vaga antes das 15:00…"*, que é a formulação que companhia aérea e clínica usam.

### 🟡 D8 — EM DESENHO: as três verificações do Andre + a régua

**Proposta do Andre (2026-08-07)** — disparar verificação quando a fila cair por desistência, olhando três sinais:

1. queda da estimativa **maior que 10 minutos**;
2. estimativa de atendimento **menor que 1 hora** (mudança mais delicada);
3. cliente está em **2º ou 3º** na fila.

**Minha contribuição: os três sinais medem a MESMA coisa — tempo de reação.**

Repare: uma queda de 20 minutos não incomoda quem seria atendido daqui a 3 horas (ele é reavisado e se reprograma). Ela é brutal para quem seria atendido em 40 minutos — que talvez já esteja saindo de casa. E "2º ou 3º na fila" é outra forma de dizer "falta pouco". Ou seja, os três são **proxies de uma pergunta só**:

> **O cliente ainda teve tempo de reagir?**

**Desenho que proponho, usando os sinais dele:**

| Camada | Regra |
|---|---|
| **Gatilho** | Queda de estimativa **> 10 min** (o sinal 1 do Andre). Abaixo disso é ruído — não faz nada |
| **Decisão** | `tempo de reação = nova estimativa − agora`. Os sinais 2 e 3 viram este número |
| **Se o tempo de reação for CURTO** | Notificação **urgente** pedindo confirmação: *"sua vez foi antecipada para 14:20 — você consegue chegar?"* E o **horário comunicado NÃO muda** para efeito de multa |
| **Se for LONGO** | Atualiza, notifica normal, e o **novo horário passa a valer** como o comunicado |

**O princípio que fecha a D8:** o horário que serve de régua para a multa **só muda quando o cliente CONFIRMA** — ou quando ele teve folga suficiente para se reprogramar. Sem confirmação e sem folga, a régua continua sendo o horário original. Assim ninguém é multado por uma antecipação que não pediu e não teve como atender.

**A definir:** quanto é "curto"? Sugiro amarrar à tolerância da **D4** — se o cliente não tem pelo menos o tempo da tolerância para chegar, é curto.

### ✅ D9 — DECIDIDO (Andre, 2026-08-07): **ir para a v2 do Gluestack** (= NativeWind)

**O mal-entendido desfeito:** o Andre queria "atualizar o Gluestack" achando que era mexer no `package.json`. Dois fatos:

1. **Já estamos na última v1.** `@gluestack-ui/themed@1.1.73` — não há para onde atualizar dentro da v1. *(A linha do handoff do partner que diz "se o client ainda está no ^1.1.34" está desatualizada.)*
2. **A v2 do Gluestack É o NativeWind.** Eles reescreveram a biblioteca em cima dele. Então "quero a v2" e "migrar para NativeWind" são **a mesma decisão** — que é exatamente o C15 do partner.

**Por que não é um bump:** na v2 os componentes passam a ser **copiados para dentro do projeto** (modelo shadcn) e estilizados por **classes**, não por props. Sai `<Button bg="$green500" h={54}>`, entra `className="bg-green-500 h-[54px]"`. Todo componente e toda tela são tocados — no partner deu ~49 arquivos.

**O que joga a favor:** o partner **já fez** e deixou cartilha no handoff deles. Não é caminho desconhecido; é caminho já percorrido por alguém que atende o mesmo backend e usa a mesma paleta.

**Quando:** ⬜ a decidir. Recomendo **depois** de fechar os defeitos abertos de device (handshake do WebSocket e fila duplicada) e **entre** frentes de feature — migração de estilo não entrega nada visível ao usuário e conflita com todo trabalho de UI em andamento.

> **Fontes da pesquisa (2026-08-07):** [Booksy — no-show policy](https://biz.booksy.com/en-us/blog/no-show-policy-tips) · [Fresha — taxas de no-show](https://www.fresha.com/help-center/knowledge-base/payments/617-charge-no-show-and-cancellation-fees) · [Bookedin — quanto cobrar](https://bookedin.com/blog/how-much-to-charge-for-cancellation-fee/) · [NoShowCost — taxa de 30% em salões](https://noshowcost.com/salons) · [Waitwhile](https://waitwhile.com/restaurant-waitlist/) · [NextMe](https://nextmeapp.com/blog/restaurant-operations/the-best-waitlist-app-for-restaurants-what-to-look-for-in-2026/) · [SevenRooms — waitlist como hospitalidade](https://sevenrooms.com/blog/restaurant-waitlist-hospitality-guide/)

---

## 2. Endpoints Consumidos — Status

| Endpoint | Metodo | Tela | Status Frontend | Testes |
|----------|--------|------|-----------------|--------|
| `/auth/register` | POST | SignUp | Implementado | 14 |
| `/auth/login` | POST | Login | Implementado | 14 |
| `/auth/refresh` | POST | authStore | Implementado | 14 |
| `/auth/logout` | POST | Home | Implementado | 14 |
| `/establishment?includeAll=true[&lat&lng]` | GET | Home | Implementado — **`lat`/`lng` desde 2026-08-06**: o backend ordena por distancia e devolve `distance_km`. O front **nao recalcula** | 2 |
| `/establishment/id/{id}` | GET | EstablishmentDetail | Implementado | 2 |
| `/establishment/id/{id}/professionals-with-queue` | GET | EstablishmentDetail | Implementado | 2 |
| `/attendances` | POST | QueueStatus | Implementado | 2 |
| `/attendances/{id}/cancel` | PUT | QueueStatus | Implementado | 2 |
| `/client-queue/{profId}/queue` | GET | QueueStatus | Implementado | 1 |
| `/client-queue/{id}/wait-time` | GET | QueueStatus (polling) | Implementado | 2 |
| `/professional/{id}/service-items` | GET | ServiceSelection | Implementado | — |
| `/attendances/{id}/leave-queue` | DELETE | — | **NAO IMPLEMENTADO** | — |
| `/attendances/client/me` | GET | Attendances | Implementado | — |
| `/attendances/{id}/rating` | POST | RatingModal | ✅ **Feito (backend entregou, validado device 2026-07-04)** | — |
| `/attendances/{id}/reschedule?targetTime=` | PATCH | QueueStatus (espera longa) | **Implementado (front) / aguarda teste device** | — |
| `/attendances/{id}/move-to-end` | PATCH | QueueStatus (espera longa) | **Implementado (front) / aguarda teste device** | — |
| `/swap-requests` (#42 direcionado) | POST | — | **Front REMOVIDO** — modelo desejado é oferta aberta (ver 10b + HANDOFF sec. 7) | — |
| `/swap-requests/{id}?accept=` | PATCH | — | **Front REMOVIDO** (idem) | — |
| `/swap-requests/me` | GET | — | **Front REMOVIDO** (idem) | — |
| `/profile/general-infos` | PATCH | EditProfile | Implementado | 5 |
| `/profile/update-email/me` | PATCH | EditEmail | Implementado | 5 |
| `/profile/update-password/me` | PATCH | EditPassword | Implementado | 5 |
| `/profile/delete/me` | DELETE | Settings | Implementado | 5 |
| `/users/me/addresses` | POST | EditAddress | Implementado | 7 |
| `/users/me/addresses/{id}` | PATCH | EditAddress | Implementado | 7 |
| `/users/me/addresses` | GET | EditAddress | Implementado | 7 |
| `/users/me/addresses/main` | GET | EditAddress | Implementado | 7 |
| `/users/me/addresses/{id}/main` | PATCH | EditAddress | Implementado | 7 |
| `/users/me/addresses/{id}` | DELETE | EditAddress | Implementado | 7 |
| `/establishment/{id}/owner` | PATCH | — | **FUTURO (partner)** | — |

---

## 3. Fluxo Principal — Cliente

### Sequencia de chamadas

```
1. GET /establishment                           → lista na Home (publico)
2. GET /establishment/id/{id}                   → detalhe (publico)
3. GET /establishment/id/{id}/professionals-with-queue  → profissionais e filas (publico)
4. POST /auth/register { email, password }      → se nao tem conta
5. POST /auth/login { email, password }         → obtem tokens
6. POST /attendances { professionalId, establishmentId, serviceItemIds }  → entra na fila
7. GET /client-queue/{profId}/queue             → posicao na fila (polling 15s)
8. PUT /attendances/{id}/cancel                 → cancela se desistir
```

### Regras de negocio no frontend

- Home: **aberta** sem profissional (`estimated_wait_minutes === null`) e escondida; **fechada** so aparece se `available_professionals > 0` (⏳ backend ainda nao expoe na listagem → todas as fechadas escondidas por ora; **rastreado no backlog do backend #3**). O `getAll()` ja pede `?includeAll=true` pra receber as fechadas quando o filtro puder liberar
- Filtro por `serviceType` (BARBER, BEAUTY_SALON, NAIL_SALON, SPA, CLINIC)
- **Visitante navega e ve precos sem login**; o token so e exigido ao **confirmar a entrada na fila** na `ServiceSelection` (nao mais no Detalhe)
- Se nao autenticado, redireciona para Login/SignUp com `redirectTo: "queueStatus"` + `serviceItemIds` e demais params
- Apos login/cadastro, volta para `queueStatus` com a selecao preservada e cria o atendimento
- Polling adaptativo da fila via `useQueueCountdown`: >60min=10min, >10min=5min, <10min=1min
- **Padrão "em breve" (2026-07-12):** funcionalidades com UI pronta mas **sem endpoint** respondem `notifyComingSoon(...)` ("em breve" + contam o toque no `comingSoonStore`/SecureStore). Config. → **"Funcionalidades aguardadas"** mostra as mais tocadas (= as que fizeram mais falta). Quando o endpoint vier, troca-se o `notifyComingSoon` pela chamada real. Hoje: **Agendar** (`ScheduleModal` na ServiceSelection: **"hoje/mais tarde" E "outro dia" → viram INTENÇÃO** (decisão Andre 2026-07-15) — `POST/PATCH/DELETE /attendances/intentions` (criar/editar/cancelar já prontos no backend) + UI **barra de encaixe**; **o `#40`/`targetTime` é aposentado como entrada de agendamento**. Segue "em breve" até o front construir a barra de encaixe e ligar aos endpoints. Ver a seção **"Trocar de posição (Adiantar/Atrasar) + Agendar (Intenção)"**), **Esqueci minha senha** (Login), **Adiantar/Atrasar = troca** (ChangeTurnModal, `/swap-offers`), **Manifestar interesse** (loja fechada → mesma INTENÇÃO). Modelo fechado no PRD (seção citada) + HANDOFF §7/§11/§12.

---

## 4. Telas Implementadas

```
src/screens/
  Home.tsx                  — Lista + busca + filtro por tipo + icone perfil + banner fila ativa + pull-to-refresh
                              Distancia do card vem do backend (`distance_km`); com GPS a ORDEM e a do backend
  EstablishmentDetail.tsx   — Profissionais + entrar na fila (salva no queueStore)
  Login.tsx                 — Email + senha + toggle visibilidade; "Entrar" solido e "Criar conta" outline
  SignUp.tsx                — Email + senha + confirmar + regras visuais + toggle
  QueueStatus.tsx           — Tempo estimado (countdown), info tooltip, criar attendance, cancelar, voltar
  Profile.tsx               — Menu: Atendimentos + Configuracoes + Sair da conta
  Attendances.tsx           — Secao "Em andamento" (fila ativa) + "Realizados" (placeholder)
  Settings.tsx              — Nome, E-mail, Senha, Endereco, Deletar conta, OTA,
                              + PAINEL DE DIAGNOSTICO DO WS (2026-08-06): estado por canal,
                                `user-name` do CONNECTED (vazio = ANONIMO), heartbeat, recebidas
  EditProfile.tsx           — Nome, sobrenome, telefone, data nasc., genero (PATCH /profile/general-infos)
  EditEmail.tsx             — Troca email + atualiza tokens (PATCH /profile/update-email/me)
  EditPassword.tsx          — Nova senha + regras visuais + atualiza tokens (PATCH /profile/update-password/me)
  EditAddress.tsx           — CRUD completo de enderecos (lista, criar, editar, remover, definir principal)
```

### Home.tsx
- Filtros horizontais: Todos, Barbearia, Salao, Manicure, Spa, Clinica
- Busca por nome (case insensitive, parcial)
- Cards com nome, tipo, bairro/cidade, quantidade de servicos, badge aberto/fechado
- Botoes Entrar/Cadastrar (nao autenticado) ou Sair (autenticado)
- **Pull-to-refresh** para atualizar lista de estabelecimentos

### EstablishmentDetail.tsx
- Nome, badge aberto/fechado, espera minima
- Lista de servicos (nome, preco, duracao)
- Lista de profissionais (nome, especialidade, quantidade na fila, tempo estimado)
- Botao "Entrar na fila (menor espera)" — condicional: so aparece se OPEN e profissionais > 0

### QueueStatus.tsx
- Cria attendance (POST /attendances) ao entrar na tela
- Tempo estimado com countdown local (cores de urgencia: amarelo >10min, vermelho <=10min)
- Icone de info com tooltip explicando a estimativa
- Estabelecimento, profissional, status (SCHEDULED/IN_PROGRESS/PAUSED/FINISHED/CANCELLED)
- Polling adaptativo via `useQueueCountdown` (GET /client-queue/{id}/wait-time)
- Botao "Sair da fila" (so SCHEDULED) e "Voltar ao inicio"

---

## 5. Stores e Hooks

### wsDiagnosticsStore.ts (Zustand, **sem** persistencia — 2026-08-06)
Estado do WebSocket por canal (`public` / `personal`) para o painel de Configuracoes: `status`,
`info` (do frame CONNECTED), `connects`, `connectedAt`, `lastMessageAt`, `messages`.
**Nao e persistido de proposito**: e retrato do momento, e um valor de sessao anterior enganaria.
Alimentado por `useQueueSocket`/`useQueueNotifications` (`markConnecting`/`markConnected`/
`markMessage`/`markError`/`markClosed`). Logica pura em `domain/ws/diagnostics.ts`.


### authStore.ts (Zustand + SecureStore)
- `login(email, password)` — POST /auth/login → armazena tokens
- `register(email, password)` — POST /auth/register
- `logout()` — POST /auth/logout → limpa SecureStore
- `refreshTokens()` — POST /auth/refresh → atualiza tokens
- `restoreSession()` — carrega tokens salvos ao abrir app
- `updateUser(partial)` — atualiza dados do usuario no store e SecureStore
- `updateTokensAndUser(tokens, userPartial)` — atualiza tokens + dados (usado por EditEmail/EditPassword)
- **SecureStore keys:** `vupth_access_token`, `vupth_refresh_token`, `vupth_user`

### queueStore.ts (Zustand + SecureStore)
- `joinQueue(queue)` — salva fila ativa (professionalId, professionalName, establishmentId, establishmentName)
- `leaveQueue()` — limpa fila ativa
- `restoreQueue()` — restaura fila ativa ao abrir app
- **SecureStore key:** `vupth_active_queue`

### useEstablishments.ts (TanStack Query)
- `useEstablishments()` — GET /establishment (cache padrao)
- `useEstablishment(id)` — GET /establishment/id/{id}
- `useProfessionalsWithQueue(id)` — GET /establishment/id/{id}/professionals-with-queue

### useQueue.ts (TanStack Query)
- `useQueueInfo(professionalId, establishmentId, accessToken)` — GET /client-queue/{profId}/queue?establishmentId= (staleTime 30s)
- `useWaitTime(attendanceId, clientId, accessToken)` — GET /client-queue/{attendanceId}/wait-time?clientId= (staleTime 30s)

### useQueueCountdown.ts (countdown local + polling adaptativo)
- Countdown local recalculado a cada 30s
- Polling adaptativo do wait-time: >60min=10min, >10min=5min, <10min=1min
- Urgency levels: `normal` (amarelo #F59E0B), `urgent` (vermelho #EF4444)
- Retorna: `remaining`, `urgency`, `color`, `isInQueue`, `isBeingAttended`, `isPaused`, `isFinished`

---

## 6. Tipos e Enums — Alinhamento com Backend

### ServiceType

| Frontend | Backend | Status |
|----------|---------|--------|
| BARBER | BARBER | ✅ Alinhado |
| BEAUTY_SALON | BEAUTY_SALON | ✅ Alinhado |
| NAIL_SALON | NAIL_SALON | ✅ Alinhado |
| SPA | SPA | ✅ Alinhado |
| CLINIC | CLINIC | ✅ Alinhado |
| EYEBROW | EYEBROW | ✅ Alinhado |

### OpenStatus

| Frontend | Backend | Status |
|----------|---------|--------|
| OPEN | OPEN | ✅ Alinhado |
| CLOSED | CLOSED | ✅ Alinhado |
| TEMPORARILY_CLOSED | TEMPORARILY_CLOSED | ✅ Alinhado |

### EstablishmentStatus

| Frontend | Backend | Status |
|----------|---------|--------|
| ACTIVE | ACTIVE | ✅ Alinhado |
| INACTIVE | INACTIVE | ✅ Alinhado |
| TEMPORARY_CLOSED | TEMPORARY_CLOSED | ✅ Alinhado |

### ServiceItemType

✅ **Alinhado (25/25)** — `src/domain/establishment/types.ts` tem exatamente os 25 valores do backend:
`CORTE_MAQUINA, CORTE_TESOURA, BARBA, SOBRANCELHA, PINTURA, HENNA_SOBRANCELHA, MICROPIGMENTACAO_SOBRANCELHA, BROW_LAMINATION, TINTURA_SOBRANCELHA, RECORTE_PONTAS, ESCOVA, HIDRATACAO, PROGRESSIVA, MANICURE, PEDICURE, UNHAS_GEL, NAIL_ART, MASSAGEM_RELAXANTE, MASSAGEM_MODELADORA, LIMPEZA_PELE, DEPILACAO, DRENAGEM, PEELING, BOTOX, MICROAGULHAMENTO`.
Os antigos `CORTE_FEMININO`/`MASSAGEM` (inexistentes no backend) já foram removidos.

### Specialty (profissional)

✅ **Alinhado** — o frontend usa `specialty: string` (`src/domain/professional/types.ts`), aceitando qualquer valor que o backend enviar. Não há mais enum fixo que quebraria com strings livres.

### AttendanceStatus

| Frontend | Backend | Status |
|----------|---------|--------|
| SCHEDULED | SCHEDULED | ✅ |
| IN_PROGRESS | IN_PROGRESS | ✅ |
| PAUSED | PAUSED | ✅ |
| FINISHED | FINISHED | ✅ |
| CANCELLED | CANCELLED | ✅ |

---

## 7. Divergencias Backend vs Frontend

### CRITICAS — precisam ser corrigidas

> **Nota (2026-06-24):** as divergências de tipos/contrato abaixo (#1, #2, #5, #6, #7, #8) **já foram resolvidas no código** (confirmado em auditoria contra o backend). Mantidas como histórico riscado. Em aberto restam só itens informativos (#9) e de funcionalidade (#11).

| # | Divergencia | Detalhe | Acao |
|---|-------------|---------|------|
| ~~1~~ | ~~`services` no GET /establishment~~ | ~~Backend retorna `string[]`~~ | **FEITO** — `establishmentService` trata `services` como `string[]` |
| ~~2~~ | ~~`professionals-with-queue` response~~ | ~~Contrato `waiting_list`/`queue_count`/`estimated_wait_minutes`/`is_available`~~ | **FEITO** — `ProfessionalWithQueue` reflete o contrato real |
| ~~3~~ | ~~QueueStatus nao cria attendance~~ | ~~Corrigido: POST /attendances ao entrar~~ | **FEITO** (2026-06-03) |
| ~~4~~ | ~~`client-queue` endpoint errado~~ | ~~getQueue envia establishmentId como query param~~ | **FEITO** (2026-06-03) |
| ~~5~~ | ~~ServiceItemType desalinhado~~ | ~~Frontend tinha 8 valores, 2 invalidos~~ | **FEITO** — 25/25 alinhados, `CORTE_FEMININO`/`MASSAGEM` removidos |
| ~~6~~ | ~~ServiceType falta EYEBROW~~ | ~~Backend tem `EYEBROW`~~ | **FEITO** — `EYEBROW` no tipo e no filtro |

### MEDIAS — funcionam mas precisam atencao

| # | Divergencia | Detalhe | Acao |
|---|-------------|---------|------|
| ~~7~~ | ~~OpenStatus falta TEMPORARILY_CLOSED~~ | ~~Backend suporta 3 estados~~ | **FEITO** — `OpenStatus` com 3 estados |
| ~~8~~ | ~~Specialty e String livre~~ | ~~Frontend usava enum fixo~~ | **FEITO** — `specialty: string` |
| 9 | **Login response tem campos extras** | Backend retorna `first_name`, `last_name`, `phone`, `birth_date`, `gender`, `profile_image_url`, `modified_fields` | Já usados nas telas de perfil; sem ação pendente |
| ~~10~~ | ~~`wait-time` endpoint nao usado~~ | ~~useQueueCountdown usa GET /client-queue/{attendanceId}/wait-time~~ | **FEITO** (2026-06-03) |
| 11 | **`leave-queue` nao implementado** | Backend tem `DELETE /attendances/{id}/leave-queue` alem de `PUT /cancel` | Avaliar qual usar no cancelamento |

---

## 8. Validacao de Formularios

### SignUp — validacao em tempo real
- **Email:** obrigatorio, formato valido
- **Senha (4 regras visuais com icones Check/X):**
  - Minimo 6 caracteres
  - Letra maiuscula
  - Letra minuscula
  - Caractere especial (!@#$...)
- **Confirmar senha:** indicador visual "Senhas conferem" (verde) / "Senhas nao conferem" (vermelho)
- **Toggle visibilidade:** icone Eye/EyeSlash (Phosphor) em ambos campos

### Login
- **Email:** obrigatorio, formato valido
- **Senha:** obrigatoria (sem validacao de forca — e login, nao cadastro)
- **Toggle visibilidade:** icone Eye/EyeSlash

### Validacao no backend
- Backend exige min 6 chars na senha, email valido
- Backend **nao exige** maiuscula/minuscula/especial — regras de forca sao apenas frontend
- Backend retorna 409 EMAIL_NOT_AVAILABLE se email ja cadastrado

---

## 9. Formato dos Tokens e Refresh

### Login response
```json
{
  "user": { "id": "uuid", "email": "user@test.com", ... },
  "tokens": {
    "access_token": "eyJ...",
    "refresh_token": "uuid",
    "expires_in": 3600
  }
}
```

### Refresh request/response
```json
// Request
{ "refresh_token": "uuid" }

// Response (flat)
{
  "access_token": "eyJ...",
  "refresh_token": "uuid",
  "expires_in": 3600
}
```

### Interceptor Axios (api.ts)
- **Request interceptor:** injeta `Bearer <token>` automaticamente em requests autenticadas
- **Rotas publicas** (`/establishment`, `/auth/`) nao recebem token
- **Response interceptor 401:** ao receber 401, tenta refresh automatico com refresh_token
  - Se refresh ok: atualiza SecureStore + authStore, retenta request original
  - Se multiplas requests falham ao mesmo tempo: enfileira e resolve todas apos refresh
  - Se refresh falha: limpa sessao (logout automatico)
- **Timeout:** 90s para dev/prod (Render cold start), 10s para local

---

## 10. Testes Unitarios e Integracao

### Resumo: **489 testes em 61 suites** (medido no portao de push, 2026-08-17)

> ⚠️ **A tabela abaixo e um RECORTE historico e envelhece sozinha** — ela parou em "144 testes / 18
> suites" enquanto a bateria triplicava. A contagem autoritativa sai de `npm test` (o `pre-push` roda
> e imprime). Nao gastar esforco mantendo a contagem por suite na mao; manter aqui so as suites que
> documentam uma DECISAO, listadas logo abaixo.

**Suites criadas na rodada de 2026-08-05/06** (cada uma existe para travar uma decisao, nao so para
cobrir linha):

| Suite | Casos | O que trava |
|-------|:-----:|-------------|
| `screens/ForgotPassword.test.tsx` | 4 | Portao de readiness com tentativas CURTAS e cancelavel; cancelar NAO dispara o POST |
| `screens/EditAddress.test.tsx` | 3 | Abrir o formulario OFERECE o GPS; recusar deixa em branco |
| `components/ChangeTurnModal.test.tsx` | 6 | As 4 saidas como radio + um Confirmar; "ir para o fim" desabilitado para quem ja e o ultimo |
| `components/BrandMark.test.tsx` | 5 | A marca aponta para `assets/icon.png` — um `require` de logo avulso em outra tela quebra aqui |
| `domain/wsDiagnostics.test.ts` | 17 | `user-name` vazio = ANONIMO (o `#31`); heartbeat 0; `shouldReconnectOnForeground` (C18) |
| `domain/proximity.test.ts` (reescrita) | — | `orderForHome`: com GPS a lista vem INTOCADA do backend; fechada perto antes de aberta longe |


| Suite | Testes | Tipo |
|-------|--------|------|
| auth.test.ts | 27 | Domain (login, signup, password rules) |
| establishment.test.ts | 9 | Domain |
| establishmentDetail.test.ts | 6 | Domain |
| homeFilter.test.ts | 8 | Domain |
| professional.test.ts | 5 | Domain |
| queue.test.ts | 12 | Domain |
| queueStore.test.ts | 7 | Domain (queue store) |
| api.test.ts | 3 | Domain |
| auth.integration.test.ts | 14 | Integracao (endpoints) |
| establishment.integration.test.ts | 5 | Integracao |
| attendance.integration.test.ts | 4 | Integracao |
| queue.integration.test.ts | 4 | Integracao |
| authService.integration.test.ts | 7 | Integracao (services) |
| establishmentService.integration.test.ts | 5 | Integracao |
| attendanceService.integration.test.ts | 4 | Integracao |
| queueService.integration.test.ts | 5 | Integracao (services) |
| profileService.integration.test.ts | 5 | Integracao (profile CRUD) |
| addressService.integration.test.ts | 7 | Integracao (address CRUD) |

### Ferramentas
- **jest-expo@54** + jest@29
- **axios-mock-adapter** para simular respostas da API
- MSW v2 instalado mas incompativel com jest-expo (nao usado)
- `testPathIgnorePatterns`: __mocks__/, mocks/, integration/setup.ts

---

## 11. Testes E2E — Maestro

### Infraestrutura
- Maestro v2.5.1 em `~/.maestro/bin/maestro`
- Celular fisico Moto G54 5G via USB (sem emulador AVD)
- `adb` em `~/Android/Sdk/platform-tools/adb`
- `adb reverse tcp:8080 tcp:8080` para backend local
- appId: `host.exp.exponent` (Expo Go)

### Flows

| Flow | Descricao | Status |
|------|-----------|--------|
| 01_signup.yaml | Cadastro de usuario | ✅ Passa |
| 02_login.yaml | Login com credenciais | ✅ Passa |
| 03_search_establishments.yaml | Busca + filtro por tipo | ✅ Passa |
| 04_checkin_flow.yaml | Login + detalhe + fila | ⏸️ Depende de profissionais |
| 05_full_e2e.yaml | Cadastro → login → busca → detalhe → check-in | ✅ Passa (Render) |
| 06_multi_client_queue.yaml | 3 clientes na fila + cancelamento | ⏸️ Timeout Render (corrigido, precisa retestar) |

### Convencoes
- Flows NAO usam `launchApp` no 05 — assumem app aberto
- Email unico gerado via `evalScript: ${output.testEmail = 'e2e_' + Date.now() + '@teste.com'}`
- Check-in e condicional: `runFlow when visible "Entrar na fila"`

---

## 12. Pendente de Implementacao

### Alta prioridade

| # | Item | Descricao | Status |
|---|------|-----------|--------|
| 1 | ~~Interceptor 401 → refresh → retry~~ | Implementado em api.ts — auto-token, refresh, fila de requests, logout automatico | **FEITO** |
| 2 | ~~Tela Attendances — historico real~~ | Implementado: `attendanceService.listClientHistory` + hook `useClientAttendances` (TanStack Query) consomem `GET /attendances/client/me` (filtros opcionais status/dateFrom/dateTo, clientId do JWT). Attendances.tsx renderiza secao REALIZADOS (FINISHED/CANCELLED/LATE) com profissional, servicos, data, duracao, valor e badge de status; loading + empty state | **FEITO** |
| 0 | ~~Deletar conta quebrado~~ | ✅ **CORRIGIDO 2026-08-07** (`b17282e5`). O backend reescreveu a rota (S19): a antiga era **destrutiva** (`cascade = ALL` — apagar a conta de um dono apagava a loja inteira) e virou **anonimização**, exigindo `{ current_password }` no corpo; mandávamos `DELETE` sem corpo → `400`. Agora: modal próprio pedindo a senha (`Alert.prompt` só existe no iOS), **`401 CURRENT_PASSWORD_INVALID` tratado como erro de CAMPO** (o interceptor já o isenta — senão o usuário seria deslogado por errar a própria senha), **`409` exibindo a mensagem do backend** que diz como destravar (bloqueio permanente reprova na publicação), e o texto corrigido: dizia "todos os seus dados serão perdidos", o que virou mentira com a anonimização. ⬜ **Falta testar no device** — em especial o 409 | ✅ Feito, a validar |
| 3 | Visualizacao do atendimento atual | Cliente ve detalhes do atendimento IN_PROGRESS (profissional, servicos, tempo decorrido). Dados vem do `GET /client-queue/{attendanceId}/wait-time` + `GET /attendances/{id}` | Pendente |
| 4 | ~~Selecao de servicos obrigatoria~~ | Implementado: ServiceSelection.tsx — lista servicos, multi-selecao, preco, confirmar antes de entrar na fila. Endpoint: `GET /professional-queue/{id}/service-items` | **FEITO** |
| 5 | Tempo real via WebSocket (STOMP) | ✅ **Servidor PROVADO em producao pelo backend (06/08)**: heartbeat `10000,10000`, entrega no canal pessoal e conexao ociosa de 40s sobrevivendo ao proxy do Render. **No front (2026-08-06):** flags do stompjs removidas, token renovado a cada conexao (`beforeConnect`), **C18 feito** (`AppState` reconecta ao voltar do background) e **painel de diagnostico** em Configuracoes. ⚠️ **A entrega no canal PESSOAL segue sem prova de device** — o poll do `getWaitTime` (30s) mascara: o status muda na tela mesmo com o canal mudo. Nao ha sintoma aberto; o que falta e medicao, e o painel resolve em 10s. Fica aberto do lado do backend o **B8** (`#31`: token invalido conecta anonimo em vez de ser recusado) | 🔄 **Sem sintoma; prova pendente** |
| 6 | Consumir ETA estavel (meal-aware lock) | **Backend pronto (item 37, 2026-06-22)** — `GET /client-queue/{attendanceId}/wait-time` ja retorna estimativa estavel (refeicoes travadas no ingresso). O client ja consome esse endpoint em `useQueueCountdown`; validar que usa o `estimatedWaitingTime` estavel e nao recalcula por fora | Validar |
| 7 | 🔴 **A Home pede a MESMA lista DUAS vezes por abertura** | `restoreLocation()` roda sem `await` em `App.tsx:78` e `useEstablishments` **não tem `enabled`**. A query sai com `coords: null`; quando as coordenadas voltam do SecureStore a `queryKey` muda e ela **sai de novo**. Com o `GET /establishment` em ~7-10s (B10), são **duas esperas** a cada abertura. ⚠️ **Não é para tirar as coords da chave** — elas estão lá consertando um bug real (sem isso o React Query devolveria para sempre a lista sem distância). O conserto é **segurar a primeira query até a restauração decidir, com prazo** (`enabled` + deadline, para GPS negado/lento não travar a tela). 📌 **Como se verifica:** log/proxy na abertura — hoje saem 2 `GET /establishment`, tem de sair 1 | Pendente |
| 8 | 🔴 **O cache não sobrevive ao fechamento do app** | `App.tsx:46` é um `new QueryClient()` pelado, sem persistência: toda abertura parte de cache vazio e o usuário encara os ~7-10s inteiros de `SkeletonList`. **`@react-native-async-storage/async-storage` já é dependência** — dá para usar `persistQueryClient` **sem pacote novo**, mostrando a última lista conhecida na hora e revalidando atrás. Muda "10s de skeleton" para "lista imediata, atualiza sozinha". 📌 **Como se verifica:** fechar e reabrir o app offline — hoje mostra skeleton e erro; com persistência deve pintar a última lista | Pendente |
| 9 | 🟡 **Polling caro contra endpoint que cobra por loja** | `useEstablishments` tem `refetchInterval: 60000` para uma chamada de ~7-10s: o app passa **~15% do tempo** com esse request aberto, e o hook é consumido por **três telas** (`Home`, `EstablishmentList`, `Onboarding` — o React Query deduplica por chave, mas a chave muda com as coords, ver item 7). Reavaliar o intervalo **depois** do item 7. Relacionado: `includeAll=true` traz **43 KB contra 10 KB** — não custa tempo no servidor (medido 31/08), mas pesa no 4G do usuário | Pendente |

| 10 | 🔒 **A posição na fila SAI da tela — só tempo estimado** | **DECISÃO DO ANDRE, 2026-08-31** (issue #20, ponto 1). ⚠️ **Inverte design deliberado:** hoje o número de 110px da `QueueStatus` é a posição, e o comentário no código justifica — *"é concreto e não oscila como a estimativa"*. Decidido: **(a)** a posição **some por completo**, o tempo estimado assume o número grande; **(b)** o tempo aparece **cru, como o backend manda**, subindo ou descendo, sem faixa nem suavização. Detalhes e o risco no quadro abaixo | Pendente (decisão fechada) |

#### Item 10 — o que sai da tela, e o efeito colateral

**Dois lugares revelam posição**, não um. O segundo passa despercebido:

| Onde | O quê | Sai? |
|---|---|---|
| `QueueStatus.tsx:647-672` | número de 110px = `peopleAhead` + "pessoas na frente" | ✅ sim, é o alvo do pedido |
| `QueueStatus.tsx:697-720` | fileira de bolinhas + **"Você já passou N pessoas"** (de `initialPosition` vs `position`) | ✅ **sim — Andre, 31/08** |

A fileira de bolinhas não mostra o lugar na fila, mas **entrega a mesma informação por outro caminho
— dá para contar**. A régua é "o cliente não sabe onde está", então ela sai junto.

### 🔴 A restrição que evita o erro seguinte: o dado CONTINUA vindo

**Isto é mudança de EXIBIÇÃO, não de contrato.** O `position` / `initialPosition` continua chegando
do backend e **ninguém deve pedir para ele parar de mandar**:

> **A posição é informação do PROFISSIONAL.** O app do parceiro precisa dela para tocar a fila. O que
> muda é só que o **cliente não a vê** — o dado segue existindo, trafegando e sendo consumido do
> outro lado. *(Andre, 2026-08-31.)*

⚠️ **Consequência prática, para quem mexer nisto depois:** ao ver `position` deixar de ser usado na
`QueueStatus`, a tentação é "limpar" — tirar o campo do tipo, ou abrir pedido ao backend para
enxugar o payload. **Não fazer.** Seria uma economia de bytes que **quebraria o front-partner**.
Retirar só o que **desenha** a posição; o campo fica.

⚠️ **O efeito colateral, registrado antes de codar:** com a posição fora **e** tempo cru, a tela
perde **todo** sinal de progresso — some o número que descia, somem as bolinhas que enchiam, e sobra
um número que **pode subir na cara do cliente**. É a combinação com maior risco de o usuário concluir
que a fila travou. A decisão está tomada e é do Andre; isto fica escrito para que, **se aparecer
reclamação de "parece parado"**, ninguém reinvestigue do zero — a causa já está nomeada aqui, e as
saídas descartadas na decisão (faixa "20-30 min", ou número que só desce) são o primeiro lugar a
olhar.

### ⚠️ Não é só tela: o PUSH também revela a posição (achado de 31/08)

**Andre, 31/08:** *"aviso sobre próximo ou quantos tem na frente serão mudados"*. Isso alcança código
**já em produção, no backend** — o push `QUEUE_NEXT_IN_LINE` é disparado hoje com o texto
**"É quase a sua vez!" / "Você é o próximo da fila."** (`QueuePushService.java:60`). A segunda frase
**é** informação de posição, a mais específica que existe (posição 1), e chega ao cliente com o app
**fechado** — por fora da tela que estamos limpando.

⚠️ **Correção do que este item dizia antes:** escrevemos que a mudança era "um arquivo só, sem pedido
ao backend". **Errado** — para a *tela* é verdade, mas a régua "o cliente não sabe onde está" não
para na tela. O trabalho é em **dois repos**:

| Onde | O quê |
|---|---|
| **client** (nosso) | tirar o número de `peopleAhead` e a fileira de bolinhas da `QueueStatus` |
| **backend** (deles) | trocar **só o TEXTO** do push. Gatilho, dedup por `next_notified` e `data.type` ficam iguais — nós dependemos deles |

O texto novo é decisão do Andre. Registrado no `PRD_BACKEND.md` (especificação de push) e no
`PRD_FRONT-PARTNER.md` §11.2.

📌 **Facilitador:** o caminho já existe. O código tem fallback *"sem a posição, o tempo assume o
lugar"* — a mudança é **tornar esse ramo o único**, não construir tela nova.

> 🔗 **Contexto dos itens 7-9 — a demora ao abrir o app (levantada pelo Andre em 2026-08-31).** A
> causa maior é do backend (**B10** — ⚠️ **diagnosticado em 31/08: NÃO era custo fixo**, o custo é
> **por loja** e o backend processa a base inteira antes de filtrar; e **prod está em ~24s, 9× o
> Render**. Ver o quadro no topo de `HANDOFF_BACKEND.md` §17,
> onde está a remedição de 31/08 e a análise de por que `Pageable` **não** resolve). Mas 7 e 8 são
> **defeito nosso** e consertam independente do B10: não é contorno esconder o B10, é parar de pedir
> duas vezes e parar de jogar fora trabalho já feito. O contorno de verdade foi subir o timeout, e
> esse continua marcado no código como máscara.

### Media prioridade — Funcionalidades

| # | Item | Descricao | Status |
|---|------|-----------|--------|
| 6 | Visualizacao de fila para cliente | Qualquer cliente ve a fila de um profissional (lista de attendances). Endpoint: `GET /client-queue/{profId}/queue?establishmentId=` — campo `attendancesInQueue[]` ja retornado | Pendente |
| 7 | Usar `DELETE /attendances/{id}/leave-queue` | Backend tem endpoint separado para sair da fila (alem de PUT /cancel). Avaliar qual usar em cada contexto | Pendente |
| 8 | Paleta PRD | **Verde Marca (2026-07-06):** CTA/primário = "folha vivo" `#3B7A3F` (o `#2F432F` do ícone escurecia demais a UI); fundo claro; amber/red mantidos; aviso do fim da fila no modal Atrasar agora âmbar (atenção). Escala no `config/gluestack-ui.config.ts` + hexes hardcoded trocados | **FEITO** |
| 9 | Busca "Pra ontem" | Botao que busca o profissional com menor tempo de espera mais proximo do cliente. Ordena por tempo estimado ASC | Pendente |
| 10 | Calendario para pedir entrada na fila | Cliente escolhe o dia em um calendario para solicitar entrada na fila do profissional. Ver secao "Agenda e manifestacao de interesse" | Pendente |
| 11 | Atualizar Gluestack (handoff C2 partner) | Partner foi para `@gluestack-ui/themed` 1.1.73 (ultima v1); client esta em `^1.1.34`. Subir para a ultima v1 e depois avaliar v1→v2. Atencao: 1.1.73 puxa `@gluestack-ui/tooltip → react-aria → react-dom` (adicionar `react-dom` na versao do React) e reiniciar com `expo start -c` | Pendente |
| 12 | Validar UI sem profissional "fantasma" (C4) | Backend (#31) ja nao retorna profissional sem servico em `professionals-with-queue`; so garantir que a UI trata lista vazia e nao assume profissionais inexistentes | Validar |
| 13 | Senha atual na troca de senha | ✅ **Backend entregou (2026-07-22)** — endpoint exige `current_password`. ⚠️ **BREAKING no front**: EditPassword (manda so `{password}`) passou a tomar **422**; adicionar campo "senha atual" + tratar `401 CURRENT_PASSWORD_INVALID` como erro de campo no interceptor (nao deslogar). Ver H1 | ⚠️ **Front URGENTE (breaking)** |
| 14 | Esqueci minha senha (forgot password) | ✅ **Backend entregou fatia 1 (2026-07-22)** — `POST /auth/forgot-password` + `/auth/reset-password` (codigo 6 digitos). SMTP configurado (falta validar envio real). Front: tela e-mail→codigo→nova senha; tirar `esqueci_senha` do "em breve". Ver H2 | Front pode construir |
| 15 | Avaliacao de atendimento (front do Item 6) | ✅ **FEITO (front + backend, validado device 2026-07-04):** `RatingModal` (1-5 estrelas + comentario) em QueueStatus concluido e nos cards FINISHED de Atendimentos; `ratingService` -> `POST /attendances/{id}/rating`; `resolveRating` exibe a nota real (`rating_average`/`rating_count` vem no `professionals-with-queue`). Melhorias opcionais (nao bloqueiam): rollup por ESTABELECIMENTO no `GET /establishment` + `rated` no `client/me` (ver callout) | ✅ **Feito** |
| 16 | Mudar minha vez (remanejar #43 + multa por tempo) | **FRONT FEITO (2026-07-03, aguarda teste device).** Consolidado em **um botao "Mudar minha vez"** (`ChangeTurnModal`) que pergunta a **direcao**: **Adiantar** / **Atrasar** — ambas viram **oferta de TROCA aberta** (`/swap-offers`, modelo fechado 2026-07-15, "em breve" ate o backend; ver a secao "Trocar de posicao (Adiantar/Atrasar) + Agendar (Intencao)"). Alem da troca, **Atrasar** oferece as opcoes solo: **Ir para o fim** → `PATCH /move-to-end` (**bloqueado se o cliente ja for o ultimo** — so avisa "voce ja e o ultimo", `isLast` calculado de `attendancesInQueue`); **Agendar para depois** → hoje `RescheduleModal`/`reschedule` (a **convergir para INTENCAO**, ver modelo fechado). **Regra de multa selada:** nao e pela acao, e pelo **prejuizo a quem se segue** — vagar um lugar com ETA **< 1h** (`incursLatePenalty = remaining < 60`, pelo tempo nao pelo status) avisa **multa de R$3** em **sair, reagendar e ir pro fim** (acoes que deixam BURACO). A **TROCA** (①) nunca tera multa — e mutua, nao deixa buraco, nao afeta os demais. Erros: **422** alvo inviavel, **400** passado/status, **403** nao-dono. Re-ancora o countdown pela previsao real. ⚠️ **Strike ainda depende do backend** (hoje so no CANCELAR #39 — handoff sec. 6 pra estender a reschedule/move-to-end). Testes: dominio. Falta validar no device | **Front FEITO / aguarda teste device + handoffs backend** |

> ✅ **RESOLVIDO PELO BACKEND (2026-07-22) — agora a ação é do FRONT (⚠️ breaking).** `PATCH /profile/update-password/me` passou a **exigir `current_password`** (conferido com `PasswordEncoder.matches`): senha errada → `401 CURRENT_PASSWORD_INVALID` (nada muda); campo ausente → `422 VALIDATION_ERROR`. **A tela `EditPassword` atual (manda só `{password}`) QUEBROU (422)** — fazer:
> 1. Campo **"senha atual"** no `EditPassword`; enviar `{ current_password, password }`.
> 2. **Exceção no interceptor 401** (`api.ts`): `CURRENT_PASSWORD_INVALID` = erro de campo ("senha atual incorreta"), **não** dispara refresh/logout.
> (O **forgot password** do item 14 também foi entregue — fatia 1; ver H2.)

> ✅ **Avaliacao (Item 6) — VALIDADO NO DEVICE (2026-07-04): ver a nota real E avaliar funcionam.** `POST /attendances/{id}/rating` existe **e** os agregados `rating_average`/`rating_count` vem no `professionals-with-queue` (por profissional **e** por service item); o front consome (`resolveRating`). **Comentario OCULTO no front (Andre 2026-07-11)** — `RatingModal` so pede as estrelas (flag `SHOW_COMMENT=false`, codigo mantido); o `POST /rating` vai sem `comment` por ora. **Melhorias (backend) — ver HANDOFF secao 3:**
> 1. ✅ **Esconder "avaliar" quando ja avaliado — FEITO no front (2026-07-12, workaround local `ratedStore`/SecureStore):** marca ao votar e no 409, restaura no boot, esconde em QueueStatus/Attendances/DetailModal; persiste entre reaberturas. **`rated: boolean` no `client/me` ainda desejavel** (fonte da verdade cross-device; o local nao sincroniza entre aparelhos / nao sobrevive a reinstalar) — vira cache quando vier. HANDOFF sec.3.1.
> 2. **Rollup por ESTABELECIMENTO** no `GET /establishment` (media da loja = soma `ratingSum` / soma `ratingCount`) — cards da Home.
> 3. **`rating_best`** (maior nota da loja) no `GET /establishment` — card destaca o melhor; ordenacao #11 considera avaliacao.
> 4. (Se faltar) `establishmentName` no `/attendances/client/me`.

> ✅ **Backend PRONTO (handoff #43)** — *Remanejar cliente com espera longa (2026-07-03).* Quando o ETA da vez do cliente ficar longo (o front decide o gatilho, ex.: > 60 min), oferecer 2 acoes na QueueStatus, **so quando o atendimento estiver `SCHEDULED`**:
> 1. **"Escolher um horario"** → `PATCH /attendances/{id}/reschedule?targetTime=<ISO-8601>`. O atendimento vira **intencao de fila** (mesmo estado do Item 40: cede a vez aos que chegam ate o previsto encostar no alvo, quando e reconfirmado automaticamente). Erros: **422** (`QUEUE_TARGET_NOT_FEASIBLE`, a fila ja preve atender em cima/depois do alvo — sugerir outro horario) e **400** (alvo no passado).
> 2. **"Ir pro fim da fila"** → `PATCH /attendances/{id}/move-to-end`. Desce a vez para depois do ultimo em espera, **sem sair da fila** e sem strike (no-op se ja for o ultimo).
> Ambos exigem ser o **proprio cliente** (clientId do JWT — `403` senao) e status `SCHEDULED` (`400` senao). A fila ao vivo (WebSocket/polling) ja reflete a nova posicao/estado. Resposta = o proprio `AttendanceInQueueResponse` (com `isIntent`/`targetTime`).

> ⏳ **Barreiras de horario ao agendar (Andre 2026-07-03) — aguarda backend.** Ao agendar/reagendar, o cliente **nao pode** escolher horario **apos o fechamento** (`closing_time`; se fecha 20:00, nao marca 20:01) nem **durante uma refeicao/intervalo** do profissional. Hoje o `reschedule` **nao** bloqueia isso (a trava `422 QUEUE_TARGET_NOT_FEASIBLE` e so sobre a fila). **Backend** deve rejeitar o alvo **apos o fechamento** (novo erro) e, quando cair **em refeicao**, **NAO** bloquear: agendar o cliente para **depois do intervalo**, com o estimado ja contando **quem ja pediu para depois do almoco** (o front nao consegue calcular isso — e fila meal-aware, so o backend). O front hoje ja e um **formulario** que digita o horario (sem sugestoes) e faz so a validacao basica; o aviso "voce sera atendido apos o intervalo" + o estimado real vem do backend. Ver **HANDOFF_BACKEND secao 8**. **Alinhamento com front-partner:** e uma validacao NOVA do alvo do `reschedule`, aparentada de **BUG5** (backend nao auto-fecha no `closing_time` / nao expoe `is_open` efetivo) e de **S4** (refeicoes Modelo B) — reusa os mesmos dados (`closing_time`/intervalos), mas e requisito proprio. *Praticas de mercado: bloquear reserva fora do horario e em intervalos e padrao (Calendly, OpenTable, apps de salao).*

> ⏳ **Horario que vaga logo antes do almoco (Andre 2026-07-09) — DECIDIDO (opcao C), aguarda backend.** Quando alguem sai/reagenda/vai pro fim e **vaga um lugar imediatamente antes do inicio do intervalo de almoco**, sobra um **buraco curto** ate o almoco que pode nao caber um atendimento inteiro (ex.: vagou 12:50, almoco 13:00 → so 10 min ate o intervalo). **Regra escolhida (C):** o slot so e oferecido/preenchido por quem tem servico **curto o suficiente para caber antes do inicio do almoco** (soma das duracoes dos serviceItems ≤ minutos ate o `mealStart`). Quem nao couber **nao** e puxado pro buraco — segue e e atendido **apos o intervalo** (sem cruzar o almoco). E **calculo do backend** (o front nao sabe duracoes/ordem da fila); o front so exibe o resultado (ex.: proximo elegivel encaixado, ou gap ate o pos-almoco). Impacta o **estimado meal-aware**. Aparentado das **barreiras de horario (H7)** e da fila meal-aware. **Handoff backend a registrar** (ainda nao esta na HANDOFF_BACKEND). *Praticas de mercado: encaixar so servicos que cabem antes do bloqueio e padrao em agenda com intervalos.*

> ⏳ **Troca "morre" ao iniciar o atendimento (Andre 2026-07-03).** Quando o atendimento vai para `IN_PROGRESS` (`start`), qualquer solicitacao/oferta de troca ainda nao aceita deve ser **cancelada**. O `#42` direcionado **ja** expira no `start`; a **oferta aberta** (rework, ver 10b + HANDOFF secao 7) deve seguir a mesma regra. *Pratica de mercado: invalidar alteracoes pendentes quando o servico comeca e padrao.*

### Handoffs para o backend (resumo — 2026-07-04)

Lista viva dos handoffs abertos do front-client para o backend. Detalhe em `HANDOFF_BACKEND.md` (seção indicada). Onde o front-partner ja rastreia o mesmo item, o ID compartilhado esta na coluna.

| # | Handoff | HANDOFF §| ID partner | Status |
|---|---------|:--------:|:----------:|--------|
| H1 | **Senha atual** no `PATCH /profile/update-password/me` — ✅ **BACKEND ENTREGOU (2026-07-22)**: exige `current_password` (401 `CURRENT_PASSWORD_INVALID` / 422 se ausente). ⚠️ **BREAKING**: EditPassword atual toma 422 → front DEVE add campo "senha atual" + exceção no interceptor 401 (não é sessão expirada) | 1 | — | ⚠️ **Ação no front (breaking)** |
| H2 | **Esqueci minha senha** — ✅ **FRONT FEITO (2026-07-22, validado device 2026-07-23)**: tela `ForgotPassword` (e-mail → código 6 dígitos → nova senha), `esqueci_senha` fora do "em breve". **Fix 2026-07-23:** gate de cold start (`waitForBackend`) antes do envio + feedback no reenvio ("Reenviando…"/"Código reenviado!"). ⚠️ **E-mail do REENVIO não chegou no device — investigação é do backend (B3/SMTP Brevo)** | 2 | S5/S6 | ✅ Front feito / e-mail reenvio ← backend B3 |
| H3 | **Avaliacao (Item 6)** — ✅ **VALIDADO NO DEVICE (2026-07-04, OTA `019f2b2f`): ver a nota real E avaliar funcionam.** Backend manda `rating_average`/`rating_count` no `professionals-with-queue`; front consome (`resolveRating`). **Melhorias opcionais (nao bloqueiam):** rollup por ESTABELECIMENTO no `GET /establishment` (cards da Home) + `rated`/`establishmentName` no `/attendances/client/me` | 3 | — | ✅ **Feito (device)** |
| H4 | **WebSocket** nao funciona no device (backend compartilhado) — coberto por polling | 4 | — | **Ultima prioridade** (Andre 2026-07-04) |
| H5 | **Estender strike #39** a `reschedule` e `move-to-end` com ETA < 1h (hoje so no `cancel`) | 6 | — | Aguarda backend |
| H6 | **Adiantar/Atrasar = TROCA aberta** (modelo fechado 2026-07-15): `POST /swap-offers {attendanceId\|professionalId+serviceItemIds, direction EARLIER\|LATER}`, `GET /swap-offers?professionalId=` (elegíveis por direção/posição), `PATCH .../{id}/accept` (troca 1-por-1; solicitante de fora entra na fila), `DELETE .../{id}`. Bidirecional; solicitante pode estar fora da fila; **expira só quando é atendido**; nunca multa. `#42` direcionado mantido em paralelo.✅ **F8 COMPLETA.** *Na fila (2026-07-24):* `swapOfferService` + `ChangeTurnModal` (Adiantar=EARLIER/Atrasar-trocar=LATER publica oferta) + botão "Trocar de lugar (N)" com contador (`useSwapOffers`) + `SwapOffersModal` (aceitar/cancelar) + WS `SWAP_OFFER_ACCEPTED`. *Fora da fila (2026-08-01; fatia 2 do backend entregue em 27/07):* **"Entrar por troca"** no menu "Mais opções" da tela de serviços publica `{professionalId, serviceItemIds, direction: EARLIER}`; **sem WS fora da fila**, o aceite é detectado por **poll** (`useOutOfQueueSwap`, 30s: a oferta some do `/swap-offers/me` + o atendimento aparece no `client/me`) e o app entra na fila sozinho com o contexto do `pendingSwapStore`; seção **PEDIDOS DE TROCA** na aba Atendimentos acompanha/cancela. `#42` direcionado mantido em paralelo | 7 | **C13** (partner passivo) | ✅ **FEITA (na fila + fora da fila)** |
| H7b | **Agendar = INTENÇÃO** — `intentionsService` + seletor de dia ✅ no front (2026-07-15); backend entregou (2026-07-22) **promoção event-driven** (`ATTENDANCE_PROMOTED` a tratar) + **visão de agenda** (`GET /attendances/intentions/client/me` = frames c/ `projectedQueueEnd`+`opening/closingTime` + intenções). **Resta backend:** endpoint público `professional/{id}` c/ **blocos anônimos** (barra ao agendar). **Resta front:** meus agendamentos, tratar promoted, barra de encaixe | 12 | **S2** | Quase destravado (falta blocos anônimos) |
| H7 | **Barreira de horario ao agendar**: **fechamento BLOQUEIA** (novo erro); **refeicao NAO bloqueia** — agenda pos-intervalo + **estimado meal-aware contando quem ja pediu pos-almoco** (so o backend calcula; resposta traz `scheduledTime` real + ex. `placedAfterBreak`) | 8 | ~BUG5/BUG6 / S4 | Aguarda backend |
| H8 | **Cliente adicionar mais servico JA na fila** — endpoint CLIENT (ex.: `PATCH /attendances/{id}/service-items`), so dono + SCHEDULED, acrescenta serviceItemIds e recalcula `totalValue`/`estimatedTotalMinutes`. Hoje so existe `add-service-items` PROFESSIONAL (catalogo, nao o atendimento) | 9 | — | Aguarda backend |
| H9 | **Atendimento PAUSED fica orfao** — ✅ **BACKEND ENTREGOU (BUG7)**: o "atual" do profissional cai para o `PAUSED` na ausencia de `IN_PROGRESS`; permanece em `current_attendance` do `professionals-with-queue` ate `resume`/`finish`, e nao se inicia novo enquanto ha pausado. Resta so o lado **partner** (UI "Retomar"). Client ja mostra "Pausado" — **pausar/retomar ja confirmado no device 2026-07-12** | 10 | BUG7 | ✅ Backend feito / resta partner |
| H10 | **Solicitar corte (loja fechada p/ novos — BUG5 C2)** — ✅ **backend COMPLETO (2026-07-22)**: quando `POST /attendances` devolver `409 ESTABLISHMENT_NOT_OPEN`, oferecer **"solicitar corte"** → `POST /attendances/cut-requests` (pedido PENDING, validade 5min; profissional aceita/recusa; auto-nega por timer). Client escuta `CUT_ACCEPTED` (entrou na fila) / `CUT_REFUSED` / `CUT_EXPIRED` (WS+push). **Front-client FEITO (2026-07-22/23)**: (a) 409 no QueueStatus oferece "Solicitar corte"; (b) loja fechada libera o fluxo ate os servicos com botao "Solicitar corte" DIRETO na ServiceSelection (badge AGENDAR ambar). WS CUT_* tratados | — | BUG5 C2 | ✅ Front feito / validar device |

> ✅ Ja entregues pelo backend nesta frente (fora da lista): remanejar #43 (`reschedule`/`move-to-end`), troca direcionada #42 (front descartou em favor da oferta aberta H6), rating #6 (backend), push notifications.

### Correcoes de UX e ajustes pendentes

| # | Item | Descricao | Status |
|---|------|-----------|--------|
| 1 | ~~Botao voltar nunca pode fazer logout~~ | Resolvido alinhando com o padrao do front-partner (`router.replace`). No client (react-navigation): login/cadastro com sucesso usam `navigation.replace`/`reset` em vez de `navigate` (Login.tsx, SignUp.tsx) — Login sai do historico. Logout (Profile) e deletar conta (Settings) usam `navigation.reset` para `home` — limpa as telas autenticadas. Voltar nunca mais cai no Login nem desconecta | **FEITO** |
| 2 | ~~Endereco deve ter complemento~~ | Ja implementado: backend (`complement` String opcional em `/users/me/addresses`), `addressService.ts` (campo tipado) e `EditAddress.tsx` (input "Complemento", carregamento e exibicao na lista). Tem teste de integracao | **FEITO** |

### Regras de negocio — Multa por cancelamento

> **Requer backend:** endpoints de multa, saldo pendente e cobranca no proximo atendimento.

**Regra:** Se o cliente cancelar um atendimento com tempo estimado <= 60 minutos para ser atendido, sera cobrada multa de **R$ 3,00** no proximo atendimento.

**Detalhes:**
- A multa e vinculada ao **profissional** do atendimento cancelado, nao ao estabelecimento
- Se cancelou com barbeiro A e depois agenda com manicure B: cobra servico da manicure + R$ 3,00 de multa (que vai para o barbeiro A)
- Valores separados na cobranca: valor do servico + valor da(s) multa(s) pendente(s)
- **Popup de confirmacao obrigatorio** antes de cancelar, informando que havera multa se aplicavel
- No menu do usuario (Profile), adicionar link para **"Multas pendentes"** com icone, listando multas abertas

**Distribuicao do valor da multa (apos subtrair taxa de 4% do intermediador):**
- Se profissional != proprietario: dividido entre **profissional + proprietario + plataforma** (3 partes)
- Se profissional == proprietario: dividido entre **profissional + plataforma** (2 partes)

**Frontend (app client):**
- Tela de multas pendentes acessivel via Profile — *pendente (depende do backend)*
- ✅ **FEITO (2026-07-03):** aviso de multa de R$3 quando o ETA da vez e **< 1h** (`incursLatePenalty`, regra pelo TEMPO nao pelo status) em **todas** as acoes que vagam um lugar perto do inicio: **sair da fila**, **reagendar** ("Escolher um horario") e **ir pro fim**. So a **TROCA por consentimento mutuo (#42)** nunca gera multa. **A cobranca/strike em si ainda depende do backend** — e hoje o backend so aplica strike no CANCELAR (#39); **handoff:** estender o #39 tambem a reschedule/move-to-end com ETA < 1h (ver abaixo).
- ⏳ **Handoff backend — estender strike #39:** hoje `AttendanceServiceImpl` so registra `ClientPenaltyEvent`/`strikeCount` no `PUT /attendances/{id}/cancel` com ETA < 1h. Pela regra selada, **`PATCH /reschedule` e `PATCH /move-to-end` com ETA < 1h tambem prejudicam quem se segue** e devem registrar o mesmo strike. O front ja avisa o usuario nessas acoes.
- Na tela de pagamento do proximo atendimento, mostrar multas pendentes somadas ao valor — *pendente (depende do backend)*

### Regras de negocio — Encaixe na fila

> **Requer backend:** endpoints de solicitacao de encaixe, aceite pelo profissional, calculo de redistribuicao de tempo.

**Regra:** Cliente pode solicitar **encaixe** na fila, pagando valor adicional. O profissional decide se aceita e em qual posicao inserir.

**Valor do encaixe:**
- Padrao: **R$ 3,00** ou **10% do valor do servico** (o que for maior, para servicos > R$ 30,00)
- Profissional pode negociar valor diferente

**Fluxo:**
1. Cliente solicita encaixe informando horario desejado (ex: "quero cortar em 2 horas")
2. Profissional recebe notificacao no app partner
3. Profissional decide a posicao de insercao (ex: 5a posicao)
4. App calcula automaticamente a redistribuicao de tempo para os clientes posteriores
5. Formulario mostra ao profissional: tempo necessario + quanto sera adicionado por atendimento
6. Profissional confirma ou ajusta

**Calculo de redistribuicao de tempo:**
- Tempo extra total e dividido **proporcionalmente** entre os atendimentos posteriores ao encaixe
- Exemplo: encaixe na posicao 5, com 4 clientes depois → sugere ~7,5 min a mais por servico
- Se o atendimento cruza intervalo de refeicao, pode adiantar/atrasar o intervalo em ate 15 min
- **Regra critica:** o tempo medio de atendimento do profissional NAO deve ser afetado. Os minutos extras aparecem progressivamente — o cliente imediatamente apos o encaixe absorve mais, os seguintes menos
- Clientes abaixo da posicao do encaixe mantem seus tempos originais

**Distribuicao do valor de encaixe (apos taxa de 4%):**
- Sempre dividido entre **profissional + plataforma** (2 partes), independente de ser tambem proprietario

**Frontend (app client):**
- Botao "Solicitar encaixe" visivel na tela de fila quando ha espera
- Formulario: horario desejado + valor oferecido (pre-preenchido com padrao)
- Status da solicitacao: PENDENTE → ACEITO/RECUSADO
- Se aceito: mostra nova posicao e tempo estimado atualizado

### Regras de negocio — Agenda e manifestacao de interesse

> **Requer backend:** endpoints de agenda do profissional e manifestacao de interesse.

**Regra:** O profissional pode abrir agenda da semana. Clientes podem manifestar interesse em entrar na fila em um dia especifico. O profissional confirma antes de adicionar a fila.

**Fluxo:**
1. Profissional abre agenda da semana no app partner (dias e horarios disponiveis)
2. Cliente ve agenda aberta no app client
3. Cliente manifesta interesse em um dia (ex: quinta-feira)
4. Profissional ve lista de interessados em ordem de chegada
5. Profissional confirma/edita/reordena os clientes antes de expor a fila publica
6. Apos confirmacao, o cliente e adicionado a fila do dia escolhido

**Frontend (app client):**
- Na tela do profissional, aba "Agenda" mostrando dias disponiveis da semana
- **Calendario** para o cliente visualizar os dias com agenda aberta e pedir para entrar na fila no dia escolhido
- Botao "Quero cortar nesse dia" para manifestar interesse
- Status da manifestacao: PENDENTE → CONFIRMADO/RECUSADO
- Lista de interessados (posicao do cliente na ordem de chegada, sem ver outros nomes)

### Baixa prioridade

| # | Item | Descricao | Status |
|---|------|-----------|--------|
| 10 | Trocar lugar na fila (remanejar #43) | **Backend entregou (handoff #43, 2026-07-03)** via `PATCH /attendances/{id}/reschedule` + `PATCH /attendances/{id}/move-to-end`. Consolidado no **Item 16** — **front FEITO** (aguarda teste device). Ver callout "Backend PRONTO (handoff #43)" | Front FEITO (ver Item 16) |
| 10b | **Adiantar/Atrasar = TROCA de posicao, OFERTA ABERTA** | ✅ **MODELO FECHADO 2026-07-15 — ver a secao "Trocar de posicao (Adiantar/Atrasar) + Agendar (Intencao)"** (contrato completo: troca 1-por-1 bidirecional; solicitante pode estar fora da fila; expira so quando ele e atendido; nunca multa; `POST/GET/PATCH-accept/DELETE /swap-offers`). **Backend NOVO** (o `#42`/`/swap-requests` direcionado nao atende, fica mantido em paralelo). UI **CONSTRUIDA**: na fila = botao "Trocar de lugar (N)" + dot + `ChangeTurnModal` (Adiantar/Atrasar) + `SwapOffersModal`; **fora da fila (2026-08-01)** = "Entrar por troca" no menu **"Mais opcoes"** da tela de servicos + secao **PEDIDOS DE TROCA** na aba Atendimentos + entrada automatica na fila ao ser aceito (poll `useOutOfQueueSwap`, ja que fora da fila nao ha WS). **= C13 no partner** (confirmado 2026-07-15: NÃO é S2 nem S4 — a troca é mecanismo proprio do cliente; o **partner é PASSIVO**, só reflete a fila pos-troca via `professionals-with-queue`/WS, nao marca LATE, sem acao nova) | ✅ **FEITO (backend fatias 1+2 entregues)** |
| 11 | Filtro por bairro/localidade (C1) — **3 FASES (Andre 2026-07-23)** | **Fase 1 ✅ FEITA (front-only):** `LocationSelector` na Home (define localidade por "meu endereco" logado OU CEP via ViaCEP, persiste em `locationStore` com flag `resolved`; **logado auto-preenche do endereco principal** — proximidade sem tocar em nada; quem limpa o filtro nao o ve voltar); `sortByProximity` ordena **mesmo bairro → mesma cidade → resto** (chave = cidade+bairro, exige UF igual p/ homonimas), reusando o `address` que ja vem na listagem. Testes: `proximity`/`locationStore`/`LocationSelector`. Limitacao: ainda baixa a lista toda e ordena no device (ok enquanto a base e pequena). **Fase 2 ⬜ backend:** `GET /establishment?uf=&city=&neighborhood=` p/ escopar server-side (escala). **Fase 3 ⬜ backend+build:** GPS/Haversine — geocodar os enderecos no cadastro (CEP→lat/long) + `GET /establishment?lat=&lng=&radiusKm=` + `expo-location` no client (**modulo NATIVO → eas build**). Ver HANDOFF secao "Filtro por localidade". | **Fase 1 FEITA / Fases 2-3 aguardam backend** |
| 12 | Testes de componente/tela | React Native Testing Library | Pendente |
| 13 | Guest na fila | `POST /professional-queue/add-quest-attendance` (sem login) | Pendente |
| 14 | 🟡 **`npm audit` — 40 vulnerabilidades, mas quase nenhuma chega no app** | Levantado em **2026-08-31**, só anotado (decisão do Andre: registrar, não agir). Ver o quadro abaixo | Anotado, sem ação |

#### Item 14 — leitura do `npm audit` de 2026-08-31

O número cru (**40: 2 críticas, 19 altas, 18 moderadas, 1 baixa**) assusta mais do que deve. Separando
o que **vai no bundle** do que é **ferramenta de build**, a lista encolhe muito:

| Grupo | O que é | Exemplos | Chega no usuário? |
|---|---|---|---|
| **2 críticas + 19 altas** | cadeia do **Metro / `@expo/cli` / prebuild** | `shell-quote`, `tar`, `metro*`, `@expo/metro-config`, `svgo`, `postcss`, `image-size`, `node-forge`, `undici`, `ws`, `minimatch`, `picomatch`, `js-yaml`, `nanoid`, `brace-expansion`, `@xmldom/xmldom` | ❌ **não** — roda na máquina de quem builda |
| **moderadas** | runtime de verdade | `@react-navigation/core`, `@react-navigation/native`, `expo-updates`, `expo-notifications`, `expo-constants`, `expo-asset`, `expo-splash-screen`, `uuid`, `query-string`, `decode-uri-component` | ✅ **sim** |

**Só 1 das 40 é dependência DIRETA** (`expo`), e ela é "alta" apenas por arrastar o `@expo/cli`.

**A inversão que importa:** o que de fato embarca no app está todo no balde **moderado**; o balde
crítico/alto é toolchain. Priorizar por severidade aqui levaria a gastar o esforço no lugar errado.

⚠️ **`npm audit fix --force` está fora de questão** sem decisão: mexeria no `expo`/`metro` e é
troca de versão de SDK disfarçada de correção de segurança.

📌 **Como se verifica:** `npm audit --json` e agrupar por `severity` + `isDirect`. 📎 **Contexto:** a
Almar já puxou o **axios** para fora da faixa vulnerável em `1f21cd6c` (1.13.4 → 1.20.0), então o
assunto já está no radar dela — a decisão de até onde ir em dependência é dela.

⚠️ **Armadilha que isso revelou (custou um push):** o `node_modules` pode ficar **atrasado em relação
ao lock** depois de um rebase que traz bump de dependência. Aqui o lock pedia axios **1.20.0** e o
instalado era **1.13.4**; o `eslint-disable` de `api.ts:75` (necessário no axios 1.17+) virou
**directive sem uso**, e o `--max-warnings 0` **barrou o push** por um "erro" que não existia no
código. **Depois de rebase que toque `package.json`/`package-lock.json`, rodar `npm install` ANTES de
tentar o push.**
| 14 | Countdown resiliente offline | **FEITO no codigo (commit `f056c67f`).** Countdown ja roda pelo relogio do device (`useQueueCountdown`); alem disso: `@react-native-community/netinfo` + `onlineManager` do React Query pausam as queries offline e re-sincronizam ao reconectar, `OfflineBanner` (barra vermelha no topo) avisa o usuario, e `activeQueue` persiste em SecureStore entre reinicios. Uso DEFENSIVO (try/catch) — netinfo e nativo; se o OTA cair em build sem ele, assume online e nao quebra. ⚠️ **A deteccao de offline so ATIVA apos um novo `eas build`** (o OTA atual e seguro mas inerte, pois o modulo nativo nao esta no binario) | **FEITO (codigo) / ativa apos novo eas build** |

### 🔒 Trocar de posição (Adiantar/Atrasar) + Agendar (Intenção) — MODELO FECHADO 2026-07-15

> Fechado com o Andre. **Duas features DISTINTAS — não confundir** (o erro anterior foi tratá-las como a mesma coisa). ✅ **Partner leu e confirmou o alinhamento (2026-07-15):** o Agendar/INTENÇÃO = **S2/C12** deles; a Troca = **C13** deles (mecanismo próprio do cliente, partner **passivo** — só reflete a fila pós-troca, não marca LATE, sem ação nova; **não** é S2 nem S4, e S4 = "promover ao topo" do profissional é outra origem).

**① Adiantar/Atrasar = TROCA de posição na FILA VIVA (agora).**
- Troca **1-por-1**: só os dois envolvidos se movem; o resto da fila fica parado. **Bidirecional:** quem quer **adiantar** publica uma oferta que aparece **para quem está à frente** dele; quem quer **atrasar** publica uma oferta que aparece **para quem está atrás**. Quem aceita assume o outro lado da troca.
- **O solicitante pode nem estar na fila ainda:** um cliente que ainda não entrou pode deixar o pedido no ar (posição implícita = **fim da fila**, onde entraria um recém-chegado). Ao ser aceito, ele **entra na fila** na vaga de quem aceitou, e **quem aceitou vai para o fim**. Só vale escolhendo **profissional + serviços** antes (a fila precisa da duração pra recalcular os ETAs).
- **Vários pedidos simultâneos** são permitidos (o cliente gerencia/cancela os seus).
- **Expira só quando o solicitante é ATENDIDO** (o horário de atendimento dele chega / o atendimento começa). Também sai por: **alguém aceita** (consumida) ou **o solicitante cancela**. **NÃO** expira por fechamento da loja.
- **Nunca gera multa** — a troca é mútua, não deixa buraco, não afeta os demais. ⚠️ A **regra de multa continua valendo** para **sair da fila** e **mudar de posição SEM trocar** (ir pro fim / agendar): quando o ETA da vez é **< 1h**, essas ações vagam um lugar perto do início e **prejudicam quem segue** → multa. A multa é pelo **prejuízo aos outros**, não pela ação em si.
- **Contrato (backend NOVO — o `#42` direcionado `/swap-requests` NÃO atende isto; fica MANTIDO em paralelo por ora, decisão Andre 2026-07-15):**
  - `POST /swap-offers` — cria a oferta. Corpo: **na fila** `{ attendanceId, direction: EARLIER|LATER }`; **fora da fila** `{ professionalId, serviceItemIds, direction: EARLIER }`.
  - `GET /swap-offers?professionalId=` — lista as ofertas **abertas que EU posso aceitar**, filtradas por direção/posição: `EARLIER` de quem está **atrás** de mim aparece (eu à frente posso ceder); `LATER` de quem está **à frente** aparece (eu atrás posso subir). Alimenta o **dot** + a lista.
  - `PATCH /swap-offers/{id}/accept` — executa a troca 1-por-1 (troca os `scheduledTime`/posição; se o solicitante era de fora, ele entra na fila e quem aceitou vai pro fim); notifica os dois; oferta → `ACCEPTED`.
  - `DELETE /swap-offers/{id}` — solicitante cancela.
- **UI cliente:** botão **"Trocar"** na tela do atendimento com um **dot** quando há oferta que eu posso aceitar → toca e vê *"Fulano quer passar na sua frente — aceitar e ir pro lugar dele?"*. **Criar:** na fila via `ChangeTurnModal` (Adiantar/Atrasar); fora da fila, na tela do estabelecimento/serviços. Lista "meus pedidos de troca" pra cancelar (há vários). **Front-partner:** só **reflete** a fila pós-troca (já via `professionals-with-queue`/WS).

**② Agendar = INTENÇÃO (futuro).** **UX (obs. Andre 2026-07-15, testado no device):** **NÃO há mais o split "para hoje / para outro dia"** — um único **"Agendar"** abre direto um **seletor de dia** (uma faixa horizontal: **"Hoje"** e depois os **números dos dias** seguintes). Escolhido o dia, aparece a **barra de encaixe** daquele dia. Um único fluxo cobre "hoje mais tarde" e "outro dia" (a diferença é só qual dia foi tocado). Cria **INTENÇÃO** (`POST/PATCH/DELETE /attendances/intentions` — criar/editar/cancelar prontos; **promoção event-driven ✅ ENTREGUE 2026-07-22** — vira `SCHEDULED` ~15min antes do `desiredTime` e notifica **`ATTENDANCE_PROMOTED`** WS+push, front deve tratar; **visão de agenda ✅ ENTREGUE** — `GET /attendances/intentions/client/me` = `{frames[], intentions[]}` com **`projectedQueueEnd` + `openingTime`/`closingTime`** por profissional → destrava "meus agendamentos" e a moldura da barra; **resta só** o endpoint público `professional/{id}` com **blocos ANÔNIMOS** p/ ver os blocos de terceiros ao agendar — follow-up do backend). **O `#40`/`targetTime` é APOSENTADO como entrada de agendamento do cliente.** UI = seletor de dia + **barra de encaixe** (partição de disco; mockup do partner `design/agendamento-barra.html`). **Fronteira limpa:** horário **que a fila ainda não alcançou** → INTENÇÃO (②); furar/ceder **dentro da fila viva** → TROCA (①). Ver partner **S2** + HANDOFF_CLIENT **C6/C12**. *(O `reschedule`/`move-to-end` do Item 16 — "Atrasar → ir pro fim/agendar" — segue como remanejamento da vez existente; reconciliar depois se for convergir para INTENÇÃO.)*

### ⏳ JANELA de horário (`de 19h às 22h`) — pedido do Andre, 2026-09-14

**O pedido tem DUAS partes, e só a segunda é nova.**

**Parte 1 — *"só posso ser atendido às 18h, não antes, mesmo que a fila esvazie"*: JÁ EXISTE.**
É a INTENÇÃO do ② acima, exatamente como ela funciona: a intenção nasce **fora da fila viva**,
o backend rejeita `422 INTENTION_BEFORE_QUEUE_END` se o horário cair antes do fim projetado
da fila, e a promoção só acontece ~15min antes do `desiredTime`. **A fila esvaziar não puxa
esse cliente para a frente.** O que falta não é modelo — é o endpoint de blocos anônimos, os
três itens do front-client, e sobretudo o **front-partner, que não tem uma linha sobre
INTENÇÃO** (a palavra não aparece em nenhum arquivo de código dele). Sem o partner, o cliente
agenda e o profissional não vê: o agendamento não existe na prática.

**Parte 2 — o TETO (`não depois das 22h`): é novo.** Hoje o modelo tem `desiredTime`, **um
instante**, e "desired" é preferência. Não há limite superior, e "janela"/"período" nunca
apareceram em documento nenhum deste projeto.

#### A decisão que destrava: o que acontece às 22h01

> **Decisão (Alexia, 2026-09-14): PERGUNTA.** Estourado o teto, o cliente é perguntado se
> ainda quer ser atendido — não se cancela por conta própria nem se ignora o que ele pediu.

**Sub-decisões que caem dessa escolha, e que o código precisa saber responder:**

**(a) Perguntar QUANDO — na projeção, não no relógio.** Se às 21h o `projectedQueueEnd` já
aponta 23h, o teto **já foi estourado**, só não chegou a hora. Perguntar às 22h05, com o
profissional parado e a cadeira livre, é a pior hora possível para os dois. A pergunta deve
sair **quando a projeção cruza o teto**, enquanto ainda dá para o cliente se organizar. O dado
para isso já existe (`projectedQueueEnd`/`estimatedStartTime`).

**(b) O silêncio precisa de um default.** Pergunta sem prazo trava a fila. O precedente do
projeto é o **pedido de corte** (PENDING com validade de 5min + auto-nega por timer), mas ali
quem espera é um pedido; aqui quem espera é **um profissional com a cadeira livre**, então o
prazo tem de ser menor. ⬜ **Falta definir o prazo.**
Para o *conteúdo* do default, o vocabulário já existe e não precisa de conceito novo:
**silêncio = "não chegou" (`LATE`)** — cai uma posição e **continua na fila**, em vez de
cancelar. Silêncio não é recusa.

**(c) Quem diz NÃO não paga nada.** A regra de multa está selada no ① acima: *"a multa é pelo
prejuízo aos outros, não pela ação em si"*. Quem sai porque **a loja estourou o horário dele**
não deixa buraco nenhum — o atraso já era da casa. Então: **sem multa e sem strike (#39)**.
Punir aqui seria cobrar do cliente um atraso que não é dele.

**(d) O teto tem de sobreviver à promoção.** A INTENÇÃO vira `SCHEDULED` ~15min antes e daí em
diante é um atendimento como outro qualquer. Se o teto ficar só na intenção, ele **some
exatamente quando começa a valer**. O limite precisa viajar junto para o atendimento promovido.

#### Consequência de modelo, e por que decidir agora

**A janela CONTÉM o ponto:** "às 18h" é a janela `[18h, 18h]`. Trocar `desiredTime` por
`desiredFrom`/`desiredTo` **antes** de o front-client construir a barra de encaixe e de o
partner construir a visão dele custa muito menos do que remendar depois, com as duas pontas já
lendo um campo só. **É a última janela barata para essa mudança.**

⚠️ **Ainda em aberto, e é de produto:** a janela é **flexibilidade** (*"me encaixa em qualquer
hora entre 19h e 22h"* — mais frouxo que um ponto, ajuda a loja a preencher buracos) ou apenas
**limites duros** sobre um horário ainda escolhido a dedo? As duas leituras cabem na frase do
Andre e dão produtos diferentes. **Nada disso foi pedido ao backend ainda.**

📐 **No arquivo de design** existem quatro telas da série (`INT 01 — Escolher horário`,
`INT 02 — Confirmar`, `INT 03 — Meus agendamentos`, `INT 04 — Estados de erro`), desenhadas
para o modelo de **ponto**. Com janela, pelo menos a `INT 01` e a `INT 04` mudam.

---

### Nota — Transferencia de proprietario (OWNER)

O backend tem `PATCH /establishment/{id}/owner` que transfere ownership para outro profissional (`{ newOwnerId: "uuid" }`). Este endpoint e de **OWNER** e sera consumido pelo **app partner**, nao pelo client.

### Deploy (CI/CD ja configurado)

| # | Item | Descricao | Status |
|---|------|-----------|--------|
| 13 | ~~Configurar EAS Build + Update~~ | Projeto `@andrericao/vupth-client` (package `com.vupth.client`, separado do partner). `eas.json` com perfis development/preview/production (channel + `env` EXPO_PUBLIC_API_ENV por perfil); `app.json` com projectId, runtimeVersion e updates.url. EAS Update via `expo-updates` | **FEITO** |
| 14 | Gerar APK (Android) | `eas build --platform android --profile preview` (env=dev/Render). Em andamento | Em progresso |
| 15 | Gerar AAB (Play Store) | `eas build --platform android --profile production` (env=prod/Railway) | Futuro |
| 16 | Publicar na Play Store | EAS Submit ou upload manual do AAB | Futuro |
| 17 | ~~Auto-publish OTA no push (C5)~~ | `.github/workflows/eas-update.yml`: push `dev`→`eas update --branch preview` (env=dev), push `main`→`--branch production` (env=prod). Env setada **explicitamente** por branch no step (o `env` do eas.json so vale para build, nao para update). Export roda na nuvem (sem travar no Metro local) | **FEITO** |

### Portao anti-quebra (CI/CD)

- **Pre-push** (`.githooks/pre-push`, versionado): roda lint + typecheck + testes; bloqueia push se falhar. Ativado via `core.hooksPath` (script `prepare` no `package.json`).
- **CI** (`.github/workflows/ci.yml`): lint + typecheck (bloqueante) + testes em `dev`/`main`.
- **EAS Update OTA** (`.github/workflows/eas-update.yml`): publica o bundle JS automaticamente no push (dev→preview, main→production) com `EXPO_PUBLIC_API_ENV` por branch.
- **Auto-rollback** (`.github/workflows/auto-rollback.yml`): reverte o commit que deixar o CI vermelho em `dev`/`main`, voltando ao ultimo estado funcional. **(Nota: o partner ainda nao tem auto-rollback — vale portar para la.)**

> **Economia de minutos do GitHub Actions (2026-06-29)** — aplicado no client, **recomendado tambem para o front-partner**:
> - **CI num job unico** (lint→typecheck→testes em sequencia, fail-fast) em vez de 3 jobs separados. Antes cada job rodava `npm ci` do zero (3x o custo de instalacao); agora instala **1x**.
> - **`concurrency` + `cancel-in-progress: true`** no CI e no eas-update: pushes seguidos na mesma branch **cancelam** runs/OTA anteriores ainda em andamento (evita gastar minutos com builds que serao descartados). Runs cancelados tem conclusion `cancelled` (nao `failure`), entao **nao disparam o auto-rollback**.
> - **`paths-ignore`** (`**.md`, `src/docs/**`, `.gitignore`): commits so de documentacao **nao rodam CI nem publicam OTA**.
> - **`timeout-minutes`** em todos os jobs (CI 15 / OTA 20 / rollback 10): evita workflow "preso" queimando minutos.
> - Removido `--coverage` + upload de artefato do CI (o pre-push local ja roda os testes).

### Concluidos

| # | Item | Data |
|---|------|------|
| ~~1~~ | Alinhar tipos com backend (ServiceItemType 25 valores, EYEBROW, TEMPORARILY_CLOSED, Specialty string) | 2026-05-30 |
| ~~2~~ | Corrigir `services` para `string[]`, `ProfessionalWithQueue` com campos reais | 2026-05-30 |
| ~~3~~ | PRD_FRONT-CLIENT.md criado | 2026-05-30 |
| ~~4~~ | Maestro E2E (6 flows) + validacao de senha com regras visuais | 2026-05-16 |
| ~~5~~ | Telas Profile, Attendances (placeholder), Settings (placeholder) | 2026-06-01 |
| ~~6~~ | queueStore + banner fila ativa na Home + icone perfil + staleTime | 2026-06-01 |
| ~~7~~ | POST /attendances no QueueStatus + getQueue com establishmentId | 2026-06-03 |
| ~~8~~ | useQueueCountdown com polling adaptativo + wait-time endpoint | 2026-06-03 |
| ~~9~~ | CI/CD GitHub Actions (ESLint + TypeScript check + Jest) | 2026-06-03 |
| ~~10~~ | Tela EditProfile (PATCH /profile/general-infos) — nome, telefone, nasc., genero | 2026-06-03 |
| ~~11~~ | Tela EditEmail (PATCH /profile/update-email/me) — atualiza tokens | 2026-06-03 |
| ~~12~~ | Tela EditPassword (PATCH /profile/update-password/me) — regras visuais + tokens | 2026-06-03 |
| ~~13~~ | Deletar conta (DELETE /profile/delete/me) no Settings | 2026-06-03 |
| ~~14~~ | Tela EditAddress — CRUD completo (6 endpoints /users/me/addresses) | 2026-06-03 |
| ~~15~~ | profileService + addressService + testes de integracao | 2026-06-03 |
