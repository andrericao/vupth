# VUPTH Front Client — PRD (Product Requirements Document)

> Documento de comunicacao entre frontend cliente e backend.
> Descreve os fluxos implementados, endpoints consumidos, formato dos requests/responses,
> divergencias com o contrato real do backend e o que esta pendente.
>
> **App:** React Native 0.81 + Expo SDK 54, Gluestack UI v1, React Navigation native-stack
> **State:** Zustand v5 + Axios + TanStack Query v5 + Expo SecureStore
> **Testes unitarios/integracao:** 144 passando em 18 suites (Jest 29 + axios-mock-adapter)
> **Testes E2E:** Maestro v2.5.1 no celular fisico (Moto G54 via USB)
> **CI/CD:** GitHub Actions — lint (ESLint v9 flat config + eslint-config-expo), typecheck (tsc --noEmit), test (jest --ci --coverage) — 0 erros/0 warnings
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

App para **clientes** que querem buscar estabelecimentos e entrar em filas de atendimento. A Home e publica (nao exige login). Auth so e exigida para entrar na fila.

```
Home (publica) → Busca/Filtro → Detalhe do Estabelecimento
                                        ↓
                               Login (se nao autenticado)
                                        ↓
                               QueueStatus (posicao na fila)
```

**Stack:**
- React Native + Expo SDK 54
- Gluestack UI v1 (sem NativeWind)
- React Navigation native-stack (nao Expo Router)
- Axios + axios-mock-adapter (testes)
- Zustand v5 + Expo SecureStore
- TanStack Query v5
- Phosphor React Native (icones)

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

- Home mostra **apenas estabelecimentos OPEN** por padrao
- Busca por nome mostra **OPEN e CLOSED**
- Filtro por `serviceType` (BARBER, BEAUTY_SALON, NAIL_SALON, SPA, CLINIC)
- Login so e exigido ao clicar "Entrar na fila"
- Se nao autenticado, redireciona para Login com `redirectTo` params
- Apos login/cadastro, volta para o fluxo de fila automaticamente
- Polling adaptativo da fila via `useQueueCountdown`: >60min=10min, >10min=5min, <10min=1min

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
| 5 | Tempo real via WebSocket (STOMP) | **Backend pronto (2026-06-14, PRD_BACKEND 18b)** — handoff C3. **Fatias 1-2 FEITAS:** `@stomp/stompjs` + `WS_URL` (`/ws/websocket`); `useQueueSocket` assina `/topic/establishment/{id}/queue` (atualiza cache, polling vira fallback) em EstablishmentDetail; `useQueueNotifications` (alerta "é a sua vez!"/concluido) agora **app-wide** via `App.tsx`, dirigido por `activeQueue` do store — vale em qualquer tela enquanto houver fila ativa; workarounds RN (`forceBinaryWSFrames`+`appendMissingNULLonIncoming`). (3) `/ws` confirmado no Render (`/ws/info` → `{"websocket":true}`, `/ws/websocket` → 400 = existe). **Falta so:** (4) testar no device os eventos `ATTENDANCE_STARTED/FINISHED` | Em progresso |
| 6 | Consumir ETA estavel (meal-aware lock) | **Backend pronto (item 37, 2026-06-22)** — `GET /client-queue/{attendanceId}/wait-time` ja retorna estimativa estavel (refeicoes travadas no ingresso). O client ja consome esse endpoint em `useQueueCountdown`; validar que usa o `estimatedWaitingTime` estavel e nao recalcula por fora | Validar |

### Media prioridade — Funcionalidades

| # | Item | Descricao | Status |
|---|------|-----------|--------|
| 6 | Visualizacao de fila para cliente | Qualquer cliente ve a fila de um profissional (lista de attendances). Endpoint: `GET /client-queue/{profId}/queue?establishmentId=` — campo `attendancesInQueue[]` ja retornado | Pendente |
| 7 | Usar `DELETE /attendances/{id}/leave-queue` | Backend tem endpoint separado para sair da fila (alem de PUT /cancel). Avaliar qual usar em cada contexto | Pendente |
| 8 | Paleta PRD | primary #1B4332, accent #52B788, cta #00B37E, bg #F7FAF8 | Pendente |
| 9 | Busca "Pra ontem" | Botao que busca o profissional com menor tempo de espera mais proximo do cliente. Ordena por tempo estimado ASC | Pendente |
| 10 | Calendario para pedir entrada na fila | Cliente escolhe o dia em um calendario para solicitar entrada na fila do profissional. Ver secao "Agenda e manifestacao de interesse" | Pendente |
| 11 | Atualizar Gluestack (handoff C2 partner) | Partner foi para `@gluestack-ui/themed` 1.1.73 (ultima v1); client esta em `^1.1.34`. Subir para a ultima v1 e depois avaliar v1→v2. Atencao: 1.1.73 puxa `@gluestack-ui/tooltip → react-aria → react-dom` (adicionar `react-dom` na versao do React) e reiniciar com `expo start -c` | Pendente |
| 12 | Validar UI sem profissional "fantasma" (C4) | Backend (#31) ja nao retorna profissional sem servico em `professionals-with-queue`; so garantir que a UI trata lista vazia e nao assume profissionais inexistentes | Validar |

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
- Tela de multas pendentes acessivel via Profile
- Popup de cancelamento mostra aviso de multa quando tempo <= 60min
- Na tela de pagamento do proximo atendimento, mostrar multas pendentes somadas ao valor

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
| 10 | Trocar lugar na fila | Endpoint pendente no backend (`ClientServiceImpl:138`). Frontend consumira quando pronto | Aguarda backend |
| 11 | Busca por bairro ordenada por menor fila (C1) | Cliente escolhe estabelecimento pelo **bairro** ordenado pela **menor fila** (e GPS na fase 2). Depende do backend #2 (`GET /establishment?neighborhood=X` + tempo de espera agregado + ordenacao). Handoff do partner | Aguarda backend |
| 12 | Testes de componente/tela | React Native Testing Library | Pendente |
| 13 | Guest na fila | `POST /professional-queue/add-quest-attendance` (sem login) | Pendente |
| 14 | Countdown resiliente offline | O countdown ja roda a partir do relogio do device (`useQueueCountdown` calcula `estimatedMinutes - (Date.now() - enteredAt)`), so o polling depende de internet. Falta polish: detectar conexao (`@react-native-community/netinfo`), pausar polling offline e re-sincronizar ao reconectar, mostrar badge "offline / atualizado ha X min" para o usuario nao ficar cego, e manter `activeQueue` persistido (ja em SecureStore) entre reinicios offline. A cada reconexao a aferição melhora; sem internet o numero continua descontando localmente | Pendente |

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
