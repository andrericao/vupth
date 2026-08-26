# Contas de Teste — VUPTH

> ⚠️ **ESTE ARQUIVO ESTA DESATUALIZADO — verificado em 2026-08-26.**
>
> As contas abaixo **NAO EXISTEM MAIS**. Conferi loja por loja (`Corte Real`,
> `Tesoura de Ouro`, `Unhas de Cristal`, `Zen Vida Nova`) nos DOIS backends e
> nenhuma responde. O seed de 02/06 se foi.
>
> **O que existe hoje:**
>
> | backend | quem aponta pra la | lojas |
> |---|---|---|
> | Railway `vupth-backend-ia-production.up.railway.app` | app do **cliente** (canal `preview`) | Barbearia Premium ×2, Barbearia do Ricardo, Studio Beleza Total |
> | Render `vupth-backend-ia.onrender.com` | app do **parceiro** | 17, quase todas "Barbearia Premium" |
>
> **As duas contas que o time usa de fato** (achadas na sessao guardada dos
> apps em dev — as SENHAS nao estao em lugar nenhum do repo):
>
> | app | e-mail | papeis |
> |---|---|---|
> | cliente | `cliente.teste@vupth.dev` | — |
> | parceiro | `parceiro.teste@vupth.dev` | `ROLE_OWNER`, `ROLE_CLIENT` |
>
> Pra recriar contas com credencial conhecida, rode `seed_clients.sh` (senha
> `Teste@123`). ⚠️ Ele grava no backend que o `.env` apontar — e o Railway e
> **producao**.
>
> **Ultima atualizacao do conteudo abaixo:** 2026-06-02 (morto)

## Owners (app partner — login pelo partner)

| Owner | Email | Senha | Establishment | Tipo | Profissional |
|-------|-------|-------|---------------|------|-------------|
| Owner 1 | owner1_97616@teste.com | Teste@123 | Corte Real 97616 | BARBER | Carlos 97616 |
| Owner 2 | owner2_97616@teste.com | Teste@123 | Tesoura de Ouro 97616 | BEAUTY_SALON | — |
| Owner 3 | owner3_97616@teste.com | Teste@123 | Unhas de Cristal 97616 | NAIL_SALON | — |
| Owner 4 | owner4_97616@teste.com | Teste@123 | Zen Vida Nova 97616 | SPA | — |

> Nota: sufixo (97616, 72978, 86410) varia por execucao do seed.
> Verifique os establishments reais com: GET /establishment

## Profissionais afiliados (app partner)

| Profissional | Email | Senha | Establishment afiliado |
|-------------|-------|-------|----------------------|
| Ricardo 97616 | prof1_97616@teste.com | Teste@123 | Corte Real 97616 |
| Lucia 97616 | prof2_97616@teste.com | Teste@123 | Tesoura de Ouro 97616 |

## Clientes E2E (criados pelo flow 06_multi_client_queue)

| Cliente | Email | Senha | Notas |
|---------|-------|-------|-------|
| Cliente 1 | cli1_{sufixo}@teste.com | Teste@123 | Entra na fila e faz logout |
| Cliente 2 | cli2_{sufixo}@teste.com | Teste@123 | Entra na fila e faz logout |
| Cliente 3 | cli3_{sufixo}@teste.com | Teste@123 | Entra na fila e cancela |

> Sufixo = ultimos 5 digitos do timestamp da execucao.

## Como verificar contas existentes

```bash
# Listar establishments
curl -s https://vupth-backend-ia.onrender.com/establishment | python3 -m json.tool

# Buscar por nome
curl -s "https://vupth-backend-ia.onrender.com/establishment?name=Corte" | python3 -m json.tool

# Ver profissionais de um establishment
curl -s "https://vupth-backend-ia.onrender.com/establishment/id/{ID}/professionals-with-queue" | python3 -m json.tool
```

## Fluxo de teste cruzado

```
1. PARTNER: seed_complete.yaml → cria owners + profissionais + servicos
2. CLIENT: 05_full_e2e.yaml → cadastra cliente + busca + detalhe
3. CLIENT: 06_multi_client_queue.yaml → 3 clientes na fila
4. PARTNER: owner faz login → dashboard → inicia/finaliza atendimento
5. CLIENT: verifica que posicao atualizou
```
