# Bateria Maestro do client

Roda no **APK de preview** (`com.vupth.client.preview`), contra o **staging**
(Render), no mesmo formato da bateria do vupth-partner. Quem roda é o Andre,
no celular.

```bash
bash .maestro/setup.sh      # confere celular e APK, desliga corretor e autofill, acorda o staging
# o setup.sh imprime o comando final:
maestro test -e APP_ID=com.vupth.client.preview -e API=https://vupth-backend-ia.onrender.com -e SENHA=Teste@123 .maestro/bateria_completa.yaml
bash .maestro/restaurar.sh  # devolve o autofill e o corretor
```

Cada rodada cria contas e uma loja **novas** (sufixo = hora da rodada). A loja
não vem do app do Partner: `scripts/loja_aberta.js` a monta pela API —
dono e profissional na mesma conta, trabalhando, com um serviço, aberta das
00:00 às 23:59 (perto da meia-noite o servidor fecha a loja sozinho; o
`setup.sh` avisa).

## As etapas

| # | Etapa | O que confere |
|---|-------|---------------|
| 01 | `visitante` | Sem conta, o Perfil mostra só Criar conta, Entrar, os Termos e a versão — nenhum grupo de menu (Andre, 02/10) |
| 02 | `cadastro` | Cadastro pelo convite do Perfil, nome na tela seguinte; logado, o Perfil mostra Conta e Aparência |
| 03 | `loja` | A loja aparece na busca do Início, com o profissional trabalhando e a fila aberta |
| 04 | `fim_de_fila_hibrido` | As duas portas (Entrar na fila e Agendar um horário), a regra da multa antes de entrar e o "Mais opções" só com a troca (C20) |
| 05 | `entra_e_sai_com_multa` | Entra na fila, aceita o aviso, sai com os dois toques e a confirmação — primeiro da fila, a saída gera multa |
| 06 | `multa_no_total` | A multa da 05 aparece só no total, com a explicação (DEC-1) |
| 07 | `agendar_pela_barra` | A segunda porta abre a barra de encaixe, agenda o primeiro horário livre e o agendamento aparece em Atendimentos (DEC-3) |
| 08 | `fila_fechada` | O profissional fecha a fila (pela API): a loja mostra "Fila fechada" no card dele |

`apoio/` tem os pedaços repetidos (abrir a loja, escolher o serviço, fechar
um aviso) e `scripts/` as chamadas à API.

## O que a bateria não cobre

- **Pedido de corte** com a loja fechada: precisa do profissional responder em 5 minutos.
- **Troca de lugar**: precisa de um segundo cliente na fila.
- **Avaliação**: precisa de um atendimento finalizado pelo profissional.

## Arquivos antigos

Os fluxos soltos da raiz (`01_signup.yaml` … `08_profile_settings.yaml`),
o `seed_clients.sh` e o `TEST_ACCOUNTS.md` são do tempo do Expo Go
(`appId: host.exp.exponent`, link `exp://` com IP fixo, contas de um seed que
não existe mais). **Obsoletos desde 02/10** — o `config.yaml` já não os roda.
Apagar fica com o Andre.

O `qa-session.sh` segue valendo: planta uma sessão no app **web** sem digitar
senha, para conferir telas atrás de login no navegador.
