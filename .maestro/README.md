# Testes E2E — Alinhamento Client + Partner

## Fluxo de teste cruzado

Os dois apps (client e partner) compartilham o mesmo backend.
Para testar o fluxo completo de atendimento, os testes devem rodar em sequencia coordenada.

### Sequencia recomendada

```
PARTNER (prepara dados)          CLIENT (testa fluxo)
─────────────────────────        ─────────────────────
1. seed_complete.yaml            
   → cria establishments,        
     profissionais, servicos     
   → toggle OPEN                 
                                 2. 05_full_e2e.yaml
                                    → cadastra, login, busca
                                    → entra na fila
                                 
                                 3. 06_multi_client_queue.yaml
                                    → 5 clientes entram na fila
                                    → testa cancelamento
                                    
PARTNER (simula atendimentos)    CLIENT (verifica)
─────────────────────────        ─────────────────────
4. attendance_flow.yaml          
   → start attendance            5. Verificar que posicao
   → finish attendance              atualiza no polling
   → cancelar attendance          
```

### Como rodar

**Passo 1 — Partner prepara dados (rodar no terminal do partner):**
```bash
cd ~/Documentos/programacao/vupth-partner
maestro test .maestro/seed_complete.yaml
```

**Passo 2 — Client testa fluxo basico:**
```bash
cd ~/Documentos/programacao/vupth
maestro test .maestro/05_full_e2e.yaml
```

**Passo 3 — Client testa fila com multiplos clientes:**
```bash
maestro test .maestro/06_multi_client_queue.yaml
```

**Passo 4 — Partner simula atendimentos (TODO):**
```bash
cd ~/Documentos/programacao/vupth-partner
maestro test .maestro/attendance_flow.yaml
```

### Ambiente

- Backend: Render (`https://vupth-backend-ia.onrender.com`)
- Timeout: 60s (cold start do Render)
- Celular: Moto G54 via USB
- Nao precisa de `adb reverse` (backend remoto)

### Testes que o PARTNER precisa criar

| Flow | Descricao |
|------|-----------|
| `attendance_flow.yaml` | Owner faz login → dashboard → inicia atendimento → pausa → retoma → finaliza |
| `cancel_attendance.yaml` | Owner cancela um atendimento da fila |
| `toggle_status.yaml` | Owner abre/fecha estabelecimento → client verifica que CLOSED nao aparece na Home |

### Contexto para o Claude do Partner

> Precisamos criar testes Maestro no partner que simulem atendimentos.
> O app cliente ja tem testes que criam clientes e entram na fila
> (flow `06_multi_client_queue.yaml` cria 3 clientes na fila de "Corte Real").
>
> Crie os seguintes flows Maestro:
>
> 1. `attendance_flow.yaml` — Owner do "Corte Real" faz login, vai ao dashboard,
>    inicia o primeiro atendimento da fila (PATCH /attendances/{id}/start),
>    finaliza (PATCH /attendances/{id}/finish)
>
> 2. `cancel_attendance.yaml` — Owner cancela um atendimento da fila
>    (DELETE /professional-queue/{id}/remove)
>
> 3. `toggle_status.yaml` — Owner fecha o estabelecimento
>    (PATCH /establishment/{id}/open-status { openStatus: "CLOSED" })
>    e depois reabre
>
> Os endpoints de fila e atendimento estao documentados no PRD_BACKEND.md
> secoes 11 (Attendance) e 12 (Professional Queue).
>
> O backend esta no Render: https://vupth-backend-ia.onrender.com
> Timeout de 60s para cold start.
