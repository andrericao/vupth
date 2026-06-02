# Contas de Teste — VUPTH

> Credenciais dos usuarios criados pelo seed do partner e pelos testes E2E.
> Backend: Render (https://vupth-backend-ia.onrender.com)
>
> **Ultima atualizacao:** 2026-06-02

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
