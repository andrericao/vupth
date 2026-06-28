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
3. (Opcional, recomendado) expor em `GET /attendances/client/me` se o atendimento **já foi avaliado** (ex.: `rated: boolean`), para o front esconder o "Toque para avaliar" após o voto. Hoje o front só descobre via 409 ao tentar.

**Granularidade alinhada com o usuário:** nota **por profissional** na tela do estabelecimento + nota **agregada** no card da loja.
