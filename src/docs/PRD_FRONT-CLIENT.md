# VUPTH Front Client — PRD (Product Requirements Document)

> Documento de comunicacao entre frontend cliente e backend.
> Descreve os fluxos implementados, endpoints consumidos, formato dos requests/responses,
> divergencias com o contrato real do backend e o que esta pendente.
>
> **App:** React Native 0.81 + Expo SDK 54, Gluestack UI v1, React Navigation native-stack
> **State:** Zustand v5 + Axios + TanStack Query v5 + Expo SecureStore
> **Testes unitarios/integracao:** 131 passando em 16 suites (Jest 29 + axios-mock-adapter)
> **Testes E2E:** Maestro v2.5.1 no celular fisico (Moto G54 via USB)
> **CI/CD:** GitHub Actions — lint (ESLint + eslint-config-expo), typecheck (tsc --noEmit), test (jest --ci --coverage)
>
> **Ultima atualizacao:** 2026-06-03

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
| `/professional/{id}/service-items` | GET | — | **NAO IMPLEMENTADO** | — |
| `/attendances/{id}/leave-queue` | DELETE | — | **NAO IMPLEMENTADO** | — |
| `/attendances/client/me` | GET | Attendances | **NAO IMPLEMENTADO** | — |
| `/profile/general-infos` | PATCH | Settings | **NAO IMPLEMENTADO** | — |
| `/profile/update-email/me` | PATCH | Settings | **NAO IMPLEMENTADO** | — |
| `/profile/update-password/me` | PATCH | Settings | **NAO IMPLEMENTADO** | — |
| `/profile/delete/me` | DELETE | Settings | **NAO IMPLEMENTADO** | — |
| `/users/me/addresses` | POST | Settings | **NAO IMPLEMENTADO** | — |
| `/users/me/addresses/{id}` | PATCH | Settings | **NAO IMPLEMENTADO** | — |
| `/users/me/addresses` | GET | Settings | **NAO IMPLEMENTADO** | — |
| `/users/me/addresses/main` | GET | Settings | **NAO IMPLEMENTADO** | — |
| `/users/me/addresses/{id}/main` | PATCH | Settings | **NAO IMPLEMENTADO** | — |
| `/users/me/addresses/{id}` | DELETE | Settings | **NAO IMPLEMENTADO** | — |
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
  Home.tsx                  — Lista + busca + filtro por tipo + icone perfil + banner fila ativa
  EstablishmentDetail.tsx   — Profissionais + entrar na fila (salva no queueStore)
  Login.tsx                 — Email + senha + toggle visibilidade
  SignUp.tsx                — Email + senha + confirmar + regras visuais + toggle
  QueueStatus.tsx           — Tempo estimado (countdown), info tooltip, criar attendance, cancelar, voltar
  Profile.tsx               — Menu: Atendimentos + Configuracoes + Sair da conta
  Attendances.tsx           — Secao "Em andamento" (fila ativa) + "Realizados" (placeholder)
  Settings.tsx              — Nome, E-mail, Senha, Endereco (placeholder onPress)
```

### Home.tsx
- Filtros horizontais: Todos, Barbearia, Salao, Manicure, Spa, Clinica
- Busca por nome (case insensitive, parcial)
- Cards com nome, tipo, bairro/cidade, quantidade de servicos, badge aberto/fechado
- Botoes Entrar/Cadastrar (nao autenticado) ou Sair (autenticado)

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
| — | **EYEBROW** | ❌ **FALTA no frontend** |

### OpenStatus

| Frontend | Backend | Status |
|----------|---------|--------|
| OPEN | OPEN | ✅ Alinhado |
| CLOSED | CLOSED | ✅ Alinhado |
| — | **TEMPORARILY_CLOSED** | ❌ **FALTA no frontend** |

### EstablishmentStatus

| Frontend | Backend | Status |
|----------|---------|--------|
| ACTIVE | ACTIVE | ✅ Alinhado |
| INACTIVE | INACTIVE | ✅ Alinhado |
| — | **TEMPORARY_CLOSED** | ❌ **FALTA no frontend** |

### ServiceItemType

| Frontend (8 valores) | Backend (25 valores) | Status |
|----------------------|----------------------|--------|
| CORTE_MAQUINA | CORTE_MAQUINA | ✅ |
| CORTE_TESOURA | CORTE_TESOURA | ✅ |
| BARBA | BARBA | ✅ |
| CORTE_FEMININO | — | ❌ **NAO EXISTE no backend** |
| MANICURE | MANICURE | ✅ |
| PEDICURE | PEDICURE | ✅ |
| MASSAGEM | — | ❌ **NAO EXISTE** (backend tem MASSAGEM_RELAXANTE e MASSAGEM_MODELADORA) |
| DEPILACAO | DEPILACAO | ✅ |
| — | SOBRANCELHA | ❌ Falta |
| — | PINTURA | ❌ Falta |
| — | HENNA_SOBRANCELHA | ❌ Falta |
| — | MICROPIGMENTACAO_SOBRANCELHA | ❌ Falta |
| — | BROW_LAMINATION | ❌ Falta |
| — | TINTURA_SOBRANCELHA | ❌ Falta |
| — | RECORTE_PONTAS | ❌ Falta |
| — | ESCOVA | ❌ Falta |
| — | HIDRATACAO | ❌ Falta |
| — | PROGRESSIVA | ❌ Falta |
| — | UNHAS_GEL | ❌ Falta |
| — | NAIL_ART | ❌ Falta |
| — | MASSAGEM_RELAXANTE | ❌ Falta |
| — | MASSAGEM_MODELADORA | ❌ Falta |
| — | LIMPEZA_PELE | ❌ Falta |
| — | DRENAGEM | ❌ Falta |
| — | PEELING | ❌ Falta |
| — | BOTOX | ❌ Falta |
| — | MICROAGULHAMENTO | ❌ Falta |

### Specialty (profissional)

| Frontend (enum fixo) | Backend (String livre) | Status |
|----------------------|----------------------|--------|
| BARBER | "BARBER" | ✅ Funciona |
| HAIRDRESSER | "HAIRDRESSER" | ✅ Funciona |
| NAIL_TECH | "NAIL_TECH" | ✅ Funciona |
| MASSEUSE | "MASSEUSE" | ✅ Funciona |
| ESTHETICIAN | "ESTHETICIAN" | ✅ Funciona |
| — | Qualquer string | ⚠️ Frontend vai falhar com valores fora do enum |

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

| # | Divergencia | Detalhe | Acao |
|---|-------------|---------|------|
| 1 | **`services` no GET /establishment** | Backend retorna `string[]` (ex: `["BARBER"]`). Frontend espera `ServiceItem[]` (objetos com id, price, etc.) | Frontend deve tratar `services` como `string[]` na listagem. ServiceItems vem via `GET /professional/{id}/service-items` |
| 2 | **`professionals-with-queue` response** | Backend retorna estrutura diferente: `professionals[].waiting_list[]` com campos `clientId`, `clientName`, `services`, `totalValue`, etc. Frontend espera `attendancesInQueue[]` com campos `position`, `estimatedWaitMinutes` | Ajustar tipo `ProfessionalWithQueue` para refletir contrato real: `waiting_list`, `queue_count`, `estimated_wait_minutes`, `current_attendance` |
| ~~3~~ | ~~QueueStatus nao cria attendance~~ | ~~Corrigido: QueueStatus agora chama POST /attendances ao entrar~~ | **FEITO** (2026-06-03) |
| ~~4~~ | ~~`client-queue` endpoint errado~~ | ~~Corrigido: getQueue envia establishmentId como query param~~ | **FEITO** (2026-06-03) |
| 5 | **ServiceItemType desalinhado** | Frontend tem 8 valores, 2 nao existem no backend (`CORTE_FEMININO`, `MASSAGEM`). Backend tem 25 valores | Alinhar com os 25 valores do backend |
| 6 | **ServiceType falta EYEBROW** | Backend tem `EYEBROW`, frontend nao | Adicionar ao tipo e ao filtro da Home |

### MEDIAS — funcionam mas precisam atencao

| # | Divergencia | Detalhe | Acao |
|---|-------------|---------|------|
| 7 | **OpenStatus falta TEMPORARILY_CLOSED** | Backend suporta 3 estados, frontend so 2 | Adicionar e tratar como "Fechado" na UI |
| 8 | **Specialty e String livre** | Backend aceita qualquer string, frontend usa enum fixo | Mudar para `string` no tipo, mostrar o valor que vier |
| 9 | **Login response tem campos extras** | Backend retorna `first_name`, `last_name`, `phone`, `birth_date`, `gender`, `profile_image_url`, `modified_fields` | Ignorar por agora, usar quando tiver tela de perfil |
| ~~10~~ | ~~`wait-time` endpoint nao usado~~ | ~~Corrigido: useQueueCountdown usa GET /client-queue/{attendanceId}/wait-time com polling adaptativo~~ | **FEITO** (2026-06-03) |
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

### Interceptor Axios
- O frontend **nao tem** interceptor de refresh automatico (partner tem)
- Refresh e chamado manualmente via `authStore.refreshTokens()`
- **TODO:** Implementar interceptor 401 → refresh → retry

---

## 10. Testes Unitarios e Integracao

### Resumo: 131 testes em 16 suites

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

### Ferramentas
- **jest-expo@55** + jest@29
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
| ~~1~~ | ~~POST /attendances no QueueStatus~~ | ~~Criar attendance ao entrar na fila~~ | **FEITO** (2026-06-03) |
| ~~2~~ | ~~getQueue com establishmentId~~ | ~~Adicionar query param~~ | **FEITO** (2026-06-03) |
| ~~3~~ | ~~Remover Alert de debug do SignUp~~ | ~~Era para diagnostico~~ | **FEITO** (sessao anterior) |
| ~~4~~ | ~~CI/CD~~ | ~~GitHub Actions: lint + typecheck + jest~~ | **FEITO** (2026-06-03) |
| ~~5~~ | ~~Usar wait-time endpoint para polling~~ | ~~useQueueCountdown com polling adaptativo~~ | **FEITO** (2026-06-03) |

### Media prioridade — Perfil e Settings

| # | Item | Endpoint backend | Request | Response | Status |
|---|------|-----------------|---------|----------|--------|
| 6 | Editar dados simples (nome, telefone, data nasc., genero, foto) | `PATCH /profile/general-infos` | `{ first_name, last_name, phone, birth_date, gender, profile_image_url }` (todos opcionais) | `UserProfileResponse` (perfil atualizado + `modified_fields[]`) | Pendente |
| 7 | Editar e-mail | `PATCH /profile/update-email/me` | `{ email }` | `UserProfileGeneralInfosAndToken` (perfil + novos tokens) — **atualizar authStore** | Pendente |
| 8 | Editar senha | `PATCH /profile/update-password/me` | `{ password }` | `UserProfileGeneralInfosAndToken` (perfil + novos tokens) — **atualizar authStore** | Pendente |
| 9 | Deletar conta | `DELETE /profile/delete/me` | — | 200 OK (body vazio) — **logout + limpar stores** | Pendente |
| 10 | Endereco (CRUD completo) | `POST /users/me/addresses`, `PATCH /{id}`, `GET /`, `GET /main`, `PATCH /{id}/main`, `DELETE /{id}` | `AddressRequest { street, number, complement?, neighborhood, city, state, zipCode (8 digitos), reference?, latitude?, longitude? }` | `UserAddressAndGeneralInfosResponse` | Pendente |
| 11 | Interceptor 401 → refresh → retry | Interceptor Axios | Partner ja tem, cliente nao | — | Pendente |

### Media prioridade — Funcionalidades

| # | Item | Descricao | Status |
|---|------|-----------|--------|
| 12 | Tela de selecao de servicos | Antes de entrar na fila, selecionar quais servicos. Endpoint: `GET /professional/{id}/service-items` | Pendente |
| 13 | Tela Attendances — historico real | Consumir `GET /attendances/client/me` (filtros: status, dateFrom, dateTo). ClientId extraido do JWT | Pendente |
| 14 | Paleta PRD | primary #1B4332, accent #52B788, cta #00B37E, bg #F7FAF8 | Pendente |

### Nota — Transferencia de proprietario (OWNER)

O backend tem `PATCH /establishment/{id}/owner` que transfere ownership para outro profissional (`{ newOwnerId: "uuid" }`). Este endpoint e de **OWNER** e sera consumido pelo **app partner**, nao pelo client.

### Baixa prioridade

| # | Item | Descricao | Status |
|---|------|-----------|--------|
| 15 | Busca por bairro/cidade | Depende de establishments terem endereco cadastrado | Pendente |
| 16 | Testes de componente/tela | React Native Testing Library | Pendente |
| 17 | Guest na fila | `POST /professional-queue/add-quest-attendance` (sem login) | Pendente |

### Deploy (CI/CD ja configurado)

| # | Item | Descricao | Status |
|---|------|-----------|--------|
| 18 | Configurar EAS Build | Criar `eas.json`, adicionar `package` no `app.json`, configurar ambientes (dev/prod) | Pendente |
| 19 | Gerar APK (Android) | `eas build --platform android --profile preview` para APK de teste | Pendente |
| 20 | Gerar AAB (Play Store) | `eas build --platform android --profile production` para publicacao | Futuro |
| 21 | Publicar na Play Store | EAS Submit ou upload manual do AAB | Futuro |

### Concluidos

| # | Item | Data |
|---|------|------|
| ~~1~~ | Alinhar `ServiceItemType` com 25 valores do backend | 2026-05-30 |
| ~~2~~ | Adicionar `EYEBROW` ao `ServiceType` + filtro na Home | 2026-05-30 |
| ~~3~~ | Adicionar `TEMPORARILY_CLOSED` ao `OpenStatus` | 2026-05-30 |
| ~~4~~ | Corrigir `services` para `string[]` no tipo `Establishment` | 2026-05-30 |
| ~~5~~ | Alinhar `ProfessionalWithQueue` com backend (`waiting_list`, `queue_count`, etc.) | 2026-05-30 |
| ~~6~~ | Mudar `Specialty` de enum para string livre | 2026-05-30 |
| ~~7~~ | Criar PRD_FRONT-CLIENT.md | 2026-05-30 |
| ~~8~~ | Maestro E2E configurado (5 flows) | 2026-05-16 |
| ~~9~~ | Validacao de senha com regras visuais + toggle visibilidade | 2026-05-16 |
| ~~10~~ | Tela Profile (menu: Atendimentos + Configuracoes + Sair) | 2026-06-01 |
| ~~11~~ | Tela Attendances (em andamento + realizados placeholder) | 2026-06-01 |
| ~~12~~ | Tela Settings (nome, email, senha, endereco placeholder) | 2026-06-01 |
| ~~13~~ | queueStore + banner fila ativa na Home + icone perfil | 2026-06-01 |
| ~~14~~ | staleTime nos hooks (60s establishments, 30s professionals) | 2026-06-01 |
| ~~15~~ | Maestro flow multi-client com cancelamento (06) | 2026-06-01 |
| ~~16~~ | QueueStatus cria attendance (POST /attendances) ao entrar | 2026-06-03 |
| ~~17~~ | getQueue envia establishmentId como query param | 2026-06-03 |
| ~~18~~ | useQueueCountdown com polling adaptativo + wait-time endpoint | 2026-06-03 |
| ~~19~~ | Remover Alert de debug do SignUp | 2026-06-03 |
| ~~20~~ | CI/CD GitHub Actions (ESLint + TypeScript check + Jest) | 2026-06-03 |
