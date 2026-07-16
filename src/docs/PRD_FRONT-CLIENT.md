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

**Design "Verde Marca"** (2026-07-06 — "folha vivo" `#3B7A3F` como CTA/primário; alinhado com o front-partner, handoff C7): o verde-floresta escuro do ÍCONE (`#2F432F`) ficava **pesado demais** espalhado pela UI (headers, botões, badges) → o app inteiro escurecia. Escala green re-ancorada no **#3B7A3F** (mesma família do ícone, porém mais claro/saturado, contraste ~5.2:1 com branco) — 50 `#eef5ee` / 100 `#d9ead9` / 300 `#8bbd8d` / 400 `#5c9c60` / **500 `#3b7a3f` (CTA/primário)** / 600 `#316635` / 700 `#26522a` / 900 `#142c17`. O `#2F432F` segue como brand-deep (fundo do 900) e no **ícone NATIVO** do app (só muda com novo `eas build`). Fundo mantido **claro**. amber `#FFB703` (dourado — ratings/atenção; agora também o aviso "a fila hoje termina às HH:MM" no modal Atrasar, cor de **atenção** e não urgência) e red `#E63946` (destructive/erros) **mantidos**. Histórico: teal `#00B37E` → `#2F432F` (2026-07-05, escuro demais) → `#3B7A3F`. Fontes Poppins/Inter. `Button` pilula+sombra; `Input2` raio `$xl` + foco verde; `cardShadow` em cards `$2xl` sem borda; **Skeleton** (SkeletonCard/List) no lugar dos spinners; **TabPill** (pilula verde na aba ativa). **Animacao de abertura** (`PreparingServer`/WarmupAnimation): sequencia de icones (celular→loja→tesoura→saindo) no portao de readiness (cold start), respeita reduce-motion.

**Home:** card mostra **menor tempo de espera** (`estimated_wait_minutes`) + **estrela de avaliacao** (real quando o backend mandar, senao placeholder). **Aberta**: escondida se nao tem profissional com servico (`estimated_wait_minutes === null`). **Fechada**: so aparece se tiver **profissional afiliado com servico** (`available_professionals > 0`), pra o cliente poder **agendar** pra reabertura — nao adianta mostrar loja fechada sem ninguem (regra do Andre 2026-07-10). ⏳ **Interim:** o backend ainda NAO expoe `available_professionals` na listagem `GET /establishment` (so no detalhe `professionals-with-queue`) → enquanto isso o front **esconde TODAS as fechadas**; quando o backend expuser, as fechadas-com-profissional aparecem sozinhas. Ver **HANDOFF secao 11** — ⏳ **backlog do backend #2 (`⬜ aberto`)**. `filterEstablishments` + `getAll()?includeAll=true` (2026-07-10).

**Loja fechada:** quando aparecer (backend com `available_professionals`), badge "Fechado" e **bloqueia entrar na fila** (`open_status != OPEN`) com aviso. **Manifestar interesse / agendar para quando reabrir = ✅ ENDPOINT PRONTO (reconciliacao 2026-07-15): `POST /attendances/intentions`** (backend #4, status `INTENTION`; criar + editar/cancelar concluidos, funciona com a loja fechada desde que `desiredTime` no expediente; so a promocao automatica a fila esta pendente). **Front pode construir `manifestar_interesse` agora** — ver HANDOFF secao 11 ponto 2. Hoje ainda mostra "em breve" (nao ligado); trocar `notifyComingSoon("manifestar_interesse")` pela chamada real ao `intentionsService`.

**Tela da fila (QueueStatus):** status reflete **SCHEDULED → IN_PROGRESS → FINISHED** (via poll de `/attendances/client/me`, fallback do WS). Aguardando: countdown monotonico + "Previsao de inicio". Em atendimento: **tempo decorrido em segundos** (100% no front via `startedAt` cacheado) + "Duracao estimada" + "Horario de termino". Concluido: "Finalizado" + **Avaliar**. **Disclaimer** de estimativa (modal 1x + icone "i"). **Pull-to-refresh**.

**Atendimentos:** EM ANDAMENTO (SCHEDULED ou IN_PROGRESS) + REALIZADOS (dia+hora de inicio); refetch no foco + pull-to-refresh; tocar no card abre **detalhes** (AttendanceDetailModal) + avaliar.

**Avaliacao (Item 6) — ✅ FEITO (front + backend, validado no device 2026-07-04):** `RatingModal` **só 1-5 estrelas** (comentario OCULTO desde 2026-07-11, flag `SHOW_COMMENT=false`) → `POST /attendances/{id}/rating`; agregados `rating_average`/`rating_count` vem no `professionals-with-queue` e o front consome (`resolveRating`). **Esconder "avaliar" apos o voto = FEITO no front** (`ratedStore` local/SecureStore, persistente entre reaberturas; `rated` do backend ainda desejavel p/ cross-device — HANDOFF sec.3.1).

**WebSocket:** `useQueueSocket` / `useQueueNotifications` existem mas **nao funcionam no device** (pendencia, precisa device+backend logs). Substituido por **polling** (`refetchInterval`: establishments 60s, fila 20s, atendimentos 30s) + poll de status da fila (30s).

---

## 2. Endpoints Consumidos — Status

| Endpoint | Metodo | Tela | Status Frontend | Testes |
|----------|--------|------|-----------------|--------|
| `/auth/register` | POST | SignUp | Implementado | 14 |
| `/auth/login` | POST | Login | Implementado | 14 |
| `/auth/refresh` | POST | authStore | Implementado | 14 |
| `/auth/logout` | POST | Home | Implementado | 14 |
| `/establishment` | GET | Home | Implementado | 2 |
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
  EstablishmentDetail.tsx   — Profissionais + entrar na fila (salva no queueStore)
  Login.tsx                 — Email + senha + toggle visibilidade
  SignUp.tsx                — Email + senha + confirmar + regras visuais + toggle
  QueueStatus.tsx           — Tempo estimado (countdown), info tooltip, criar attendance, cancelar, voltar
  Profile.tsx               — Menu: Atendimentos + Configuracoes + Sair da conta
  Attendances.tsx           — Secao "Em andamento" (fila ativa) + "Realizados" (placeholder)
  Settings.tsx              — Nome, E-mail, Senha, Endereco, Deletar conta
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

### Resumo: 144 testes em 18 suites

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
| 3 | Visualizacao do atendimento atual | Cliente ve detalhes do atendimento IN_PROGRESS (profissional, servicos, tempo decorrido). Dados vem do `GET /client-queue/{attendanceId}/wait-time` + `GET /attendances/{id}` | Pendente |
| 4 | ~~Selecao de servicos obrigatoria~~ | Implementado: ServiceSelection.tsx — lista servicos, multi-selecao, preco, confirmar antes de entrar na fila. Endpoint: `GET /professional-queue/{id}/service-items` | **FEITO** |
| 5 | Tempo real via WebSocket (STOMP) | **Backend pronto (2026-06-14, PRD_BACKEND 18b)** — handoff C3. **Fatias 1-2 FEITAS:** `@stomp/stompjs` + `WS_URL` (`/ws/websocket`); `useQueueSocket` assina `/topic/establishment/{id}/queue` (atualiza cache, polling vira fallback) em EstablishmentDetail; `useQueueNotifications` (alerta "é a sua vez!"/concluido) agora **app-wide** via `App.tsx`, dirigido por `activeQueue` do store — vale em qualquer tela enquanto houver fila ativa; workarounds RN (`forceBinaryWSFrames`+`appendMissingNULLonIncoming`). (3) `/ws` confirmado no Render (`/ws/info` → `{"websocket":true}`, `/ws/websocket` → 400 = existe). **Falta so:** (4) testar no device os eventos `ATTENDANCE_STARTED/FINISHED`. **⏬ REPRIORIZADO: ULTIMA prioridade (Andre 2026-07-04) — o polling cobre; WS fica por ultimo** | Ultima prioridade |
| 6 | Consumir ETA estavel (meal-aware lock) | **Backend pronto (item 37, 2026-06-22)** — `GET /client-queue/{attendanceId}/wait-time` ja retorna estimativa estavel (refeicoes travadas no ingresso). O client ja consome esse endpoint em `useQueueCountdown`; validar que usa o `estimatedWaitingTime` estavel e nao recalcula por fora | Validar |

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
| 13 | Senha atual na troca de senha | EditPassword deve pedir a **senha atual** alem da nova. **Aguarda backend** (ver "Pendencia para o backend" abaixo). Front so implementa o campo apos o backend verificar `currentPassword` (verificacao no front via re-login foi descartada) | Aguarda backend |
| 14 | Esqueci minha senha (forgot password) | Fluxo de recuperacao de senha (cliente sem sessao). **Depende do backend**: endpoint para solicitar reset (codigo/email) + confirmar nova senha. Verificar se ja existe — provavelmente nao implementado | Aguarda backend |
| 15 | Avaliacao de atendimento (front do Item 6) | ✅ **FEITO (front + backend, validado device 2026-07-04):** `RatingModal` (1-5 estrelas + comentario) em QueueStatus concluido e nos cards FINISHED de Atendimentos; `ratingService` -> `POST /attendances/{id}/rating`; `resolveRating` exibe a nota real (`rating_average`/`rating_count` vem no `professionals-with-queue`). Melhorias opcionais (nao bloqueiam): rollup por ESTABELECIMENTO no `GET /establishment` + `rated` no `client/me` (ver callout) | ✅ **Feito** |
| 16 | Mudar minha vez (remanejar #43 + multa por tempo) | **FRONT FEITO (2026-07-03, aguarda teste device).** Consolidado em **um botao "Mudar minha vez"** (`ChangeTurnModal`) que pergunta a **direcao**: **Adiantar** / **Atrasar** — ambas viram **oferta de TROCA aberta** (`/swap-offers`, modelo fechado 2026-07-15, "em breve" ate o backend; ver a secao "Trocar de posicao (Adiantar/Atrasar) + Agendar (Intencao)"). Alem da troca, **Atrasar** oferece as opcoes solo: **Ir para o fim** → `PATCH /move-to-end` (**bloqueado se o cliente ja for o ultimo** — so avisa "voce ja e o ultimo", `isLast` calculado de `attendancesInQueue`); **Agendar para depois** → hoje `RescheduleModal`/`reschedule` (a **convergir para INTENCAO**, ver modelo fechado). **Regra de multa selada:** nao e pela acao, e pelo **prejuizo a quem se segue** — vagar um lugar com ETA **< 1h** (`incursLatePenalty = remaining < 60`, pelo tempo nao pelo status) avisa **multa de R$3** em **sair, reagendar e ir pro fim** (acoes que deixam BURACO). A **TROCA** (①) nunca tera multa — e mutua, nao deixa buraco, nao afeta os demais. Erros: **422** alvo inviavel, **400** passado/status, **403** nao-dono. Re-ancora o countdown pela previsao real. ⚠️ **Strike ainda depende do backend** (hoje so no CANCELAR #39 — handoff sec. 6 pra estender a reschedule/move-to-end). Testes: dominio. Falta validar no device | **Front FEITO / aguarda teste device + handoffs backend** |

> ⚠️ **Pendencia para o backend (handoff)** — *Verificacao da senha atual na troca de senha.*
> Hoje `PATCH /profile/update-password/me` recebe so `{ "password": "<nova>" }` (`PasswordRequest`) e o `UpdatePasswordUseCase` troca direto, **sem conferir a senha atual**. Para o app pedir a senha atual com seguranca real, o backend precisa:
> 1. Adicionar `currentPassword` ao `PasswordRequest` (`@NotBlank`).
> 2. No `UpdatePasswordUseCase`, validar `passwordEncoder.matches(request.currentPassword(), user.getPassword())` antes de trocar; se nao bater, retornar **401/403** ("senha atual incorreta").
> 3. Atualizar testes de integracao + collection Postman + PRD_BACKEND (secao "PATCH /profile/update-password/me").
> Depois disso o front envia `{ currentPassword, password }` e adiciona o campo na tela. (Tambem avaliar o endpoint de **forgot password** do item 14.)

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
| H1 | Verificar **senha atual** no `PATCH /profile/update-password/me` (add `currentPassword`) | 1 | — | Aguarda backend |
| H2 | **Esqueci minha senha** — endpoint de reset (codigo/email) | 2 | S5/S6 | Aguarda backend |
| H3 | **Avaliacao (Item 6)** — ✅ **VALIDADO NO DEVICE (2026-07-04, OTA `019f2b2f`): ver a nota real E avaliar funcionam.** Backend manda `rating_average`/`rating_count` no `professionals-with-queue`; front consome (`resolveRating`). **Melhorias opcionais (nao bloqueiam):** rollup por ESTABELECIMENTO no `GET /establishment` (cards da Home) + `rated`/`establishmentName` no `/attendances/client/me` | 3 | — | ✅ **Feito (device)** |
| H4 | **WebSocket** nao funciona no device (backend compartilhado) — coberto por polling | 4 | — | **Ultima prioridade** (Andre 2026-07-04) |
| H5 | **Estender strike #39** a `reschedule` e `move-to-end` com ETA < 1h (hoje so no `cancel`) | 6 | — | Aguarda backend |
| H6 | **Adiantar/Atrasar = TROCA aberta** (modelo fechado 2026-07-15): `POST /swap-offers {attendanceId\|professionalId+serviceItemIds, direction EARLIER\|LATER}`, `GET /swap-offers?professionalId=` (elegíveis por direção/posição), `PATCH .../{id}/accept` (troca 1-por-1; solicitante de fora entra na fila), `DELETE .../{id}`. Bidirecional; solicitante pode estar fora da fila; **expira só quando é atendido**; nunca multa. `#42` direcionado mantido em paralelo | 7 | **S2/S4** | Modelo fechado / aguarda backend |
| H7b | **Agendar = INTENÇÃO** — ligar `POST/PATCH/DELETE /attendances/intentions` (criar/editar/cancelar prontos) + UI barra de encaixe; `#40`/`targetTime` aposentado. Falta backend: promoção automática + expor `projectedQueueEnd`/`closing_time`/blocos | 12 | **S2** | Endpoint pronto (falta promoção) / front a construir |
| H7 | **Barreira de horario ao agendar**: **fechamento BLOQUEIA** (novo erro); **refeicao NAO bloqueia** — agenda pos-intervalo + **estimado meal-aware contando quem ja pediu pos-almoco** (so o backend calcula; resposta traz `scheduledTime` real + ex. `placedAfterBreak`) | 8 | ~BUG5/BUG6 / S4 | Aguarda backend |
| H8 | **Cliente adicionar mais servico JA na fila** — endpoint CLIENT (ex.: `PATCH /attendances/{id}/service-items`), so dono + SCHEDULED, acrescenta serviceItemIds e recalcula `totalValue`/`estimatedTotalMinutes`. Hoje so existe `add-service-items` PROFESSIONAL (catalogo, nao o atendimento) | 9 | — | Aguarda backend |
| H9 | **Atendimento PAUSED fica orfao** — ao pausar (IN_PROGRESS→PAUSED), o atendimento some da fila do profissional (`QueueResponse` so expoe `inAttendance`=IN_PROGRESS) e nao da pra retomar. **Backend:** incluir o PAUSED no `QueueResponse` do dono. **Partner:** UI de "Retomar" (`/resume`). Client ja mostra "Pausado" | 10 | — | Aguarda backend + partner |

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
| 10b | **Adiantar/Atrasar = TROCA de posicao, OFERTA ABERTA** | ✅ **MODELO FECHADO 2026-07-15 — ver a secao "Trocar de posicao (Adiantar/Atrasar) + Agendar (Intencao)"** (contrato completo: troca 1-por-1 bidirecional; solicitante pode estar fora da fila; expira so quando ele e atendido; nunca multa; `POST/GET/PATCH-accept/DELETE /swap-offers`). **Backend NOVO** (o `#42`/`/swap-requests` direcionado nao atende, fica mantido em paralelo). UI: botao "Trocar" + dot na tela do atendimento; "Adiantar"/"Atrasar" no `ChangeTurnModal` (hoje "em breve"). **= S2/S4 no partner** (a conferir no alinhamento) | **Modelo fechado / aguarda backend `/swap-offers`** |
| 11 | Busca por bairro ordenada por menor fila (C1) | Cliente escolhe estabelecimento pelo **bairro** ordenado pela **menor fila** (e GPS na fase 2). Depende do backend #2 (`GET /establishment?neighborhood=X` + tempo de espera agregado + ordenacao). Handoff do partner | Aguarda backend |
| 12 | Testes de componente/tela | React Native Testing Library | Pendente |
| 13 | Guest na fila | `POST /professional-queue/add-quest-attendance` (sem login) | Pendente |
| 14 | Countdown resiliente offline | **FEITO no codigo (commit `f056c67f`).** Countdown ja roda pelo relogio do device (`useQueueCountdown`); alem disso: `@react-native-community/netinfo` + `onlineManager` do React Query pausam as queries offline e re-sincronizam ao reconectar, `OfflineBanner` (barra vermelha no topo) avisa o usuario, e `activeQueue` persiste em SecureStore entre reinicios. Uso DEFENSIVO (try/catch) — netinfo e nativo; se o OTA cair em build sem ele, assume online e nao quebra. ⚠️ **A deteccao de offline so ATIVA apos um novo `eas build`** (o OTA atual e seguro mas inerte, pois o modulo nativo nao esta no binario) | **FEITO (codigo) / ativa apos novo eas build** |

### 🔒 Trocar de posição (Adiantar/Atrasar) + Agendar (Intenção) — MODELO FECHADO 2026-07-15

> Fechado com o Andre. **Duas features DISTINTAS — não confundir** (o erro anterior foi tratá-las como a mesma coisa). O partner deve ler para conferir alinhamento com S2/S4 e o `/swap-requests`.

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

**② Agendar = INTENÇÃO (futuro).** "Hoje mais tarde" **e** "outro dia" → **INTENÇÃO** (`POST/PATCH/DELETE /attendances/intentions` — criar/editar/cancelar **já prontos** no backend; falta a **promoção automática** + expor `projectedQueueEnd`/`closing_time`/blocos ocupados). **O `#40`/`targetTime` é APOSENTADO como entrada de agendamento do cliente** (o `ScheduleModal` passa a criar INTENÇÃO). UI = **barra de encaixe** (partição de disco; mockup do partner `design/agendamento-barra.html`). **Fronteira limpa:** horário **que a fila ainda não alcançou** → INTENÇÃO (②); furar/ceder **dentro da fila viva** → TROCA (①). Ver partner **S2** + HANDOFF_CLIENT **C6/C12**. *(O `reschedule`/`move-to-end` do Item 16 — "Atrasar → ir pro fim/agendar" — segue como remanejamento da vez existente; reconciliar depois se for convergir para INTENÇÃO.)*

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
