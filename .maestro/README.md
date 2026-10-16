# Bateria Maestro do client

Roda no **APK de preview** (`com.vupth.client.preview`), contra o **staging**
(Render), no mesmo formato da bateria do vupth-partner. Quem roda é o Andre,
no celular.

```bash
bash .maestro/bateria.sh    # um comando só (03/10)
```

O `bateria.sh` chama o `setup.sh` (celular, APK, corretor e autofill, acorda o
staging), acha o `COMMIT` esperado sozinho (o último da `origin/dev`), roda o
roteiro e, no fim — verde ou não —, o `restaurar.sh`.

**Uma etapa não para as outras (bateria-nao-para, 05/10).** Cada etapa de
`avulsas/NN_*.yaml` roda num `maestro test` próprio e prepara o estado dela
pela API (`apoio/preparo.yaml`: loja, cliente, fila fechada), com contas
próprias (TAG + número da etapa). Se uma falha, ela fica no relatório e a
próxima roda. Só a `00_atualizacao` para tudo: ela entra, toca em "Verificar atualização" (Perfil → Versão do app) e confere o commit; as etapas logadas fazem o mesmo no preparo, em vez de fechar e abrir o app (fatia-de-atualizacao). Onde a API não cria o estado,
a avulsa roda antes a etapa de que depende (a 06 roda a 05; a 11, a 10). Uma
etapa só: `ETAPAS="05 06" bash .maestro/bateria.sh`. O `bateria_completa.yaml`
segue como roteiro único, para rodar à mão com `maestro test`.

**Conjunta (bateria-conjunta, 05/10).** As etapas 18, 19, 21b e 22 abrem o
Partner no mesmo celular e conferem no Client: o tempo do serviço novo (18), o
só agenda (19), o atraso marcado (21b; a 21a só abre a fila pelo card) e o atendimento finalizado e avaliado (22). Os subfluxos são os do Partner, lidos do clone ao lado
(`../vupth-partner/.maestro/conjunta`). Sem esse clone ou sem o APK do Partner,
elas aparecem como ⏭.

**Pula as aprovadas (bateria-pula-aprovados, 05/10).** A etapa verde grava
`NN <commit>` em `aprovados.txt` (fora do git); no mesmo commit, a próxima
rodada a pula. `bash .maestro/bateria.sh --completa` roda tudo de novo.

**Para o Andre (05/10).** O que só o olho confere: a etapa chama
`apoio/para_o_andre.yaml` (NOME, O_QUE) e o print vai para
`logs/<data>/para-o-andre/`, com a linha do que olhar em `para-o-andre.txt`.
Rodada verde com prints para o Andre guarda só essa pasta.

**Os logs ficam na pasta (03/10).** Cada rodada grava o `console.txt`, o
`maestro.log`, os prints e o `falhou_em` (o passo `NN.MM` que falhou) em
`.maestro/logs/<data>/`, versionada (DEC-29): a bateria commita só essa pasta e dá push — a equipe lê o erro no GitHub.
Rodada verde não guarda nada; rodada vermelha apaga as antigas e fica só a
dela — a mesma regra do Partner (limpar-logs, 05/10).

**A versão antes de tudo (03/10).** O app mostra o commit do JS que roda no
fim da versão — no Perfil do visitante e no rodapé das Boas-vindas e do Entrar (`Versão 1.0.3 · 03/10/2026 · c65338e7`). A 01.07
compara com o `COMMIT` — o `bateria.sh` usa o último da `origin/dev`, que é o
do OTA do canal preview. O `clearState` da 00.05 apaga o OTA baixado e o app
abre no bundle do APK; por isso a 01.07 fecha e abre o app (sem limpar) até
3 vezes, para o OTA novo entrar. Não bateu: a bateria para com o instalado e
o esperado na mensagem.

Cada rodada cria contas e uma loja **novas** (sufixo = hora da rodada). A loja
não vem do app do Partner: `scripts/loja_aberta.js` a monta pela API —
dono e profissional na mesma conta, trabalhando, com um serviço, aberta das
00:00 às 23:59 (perto da meia-noite o servidor fecha a loja sozinho; o
`setup.sh` avisa).

## As etapas

| # | Etapa | O que confere |
|---|-------|---------------|
| 01 | `visitante` | Sem conta, o Perfil mostra só Criar conta, Entrar, os Termos e a versão — nenhum grupo de menu (Andre, 02/10). Na 01.07 a versão tem de mostrar o `COMMIT` esperado; se não, a bateria para ali (03/10) |
| 02 | `cadastro` | Cadastro pelo convite do Perfil, nome na tela seguinte; logado, o Perfil mostra Conta e Aparência |
| 03 | `loja` | A loja aparece na busca do Início, com o profissional trabalhando e a fila aberta; o "Pra ontem" a mostra entre as livres |
| 04 | `fim_de_fila_hibrido` | As duas portas (Entrar na fila e Agendar um horário), a regra da multa antes de entrar e o "Mais opções" só com a troca (C20) |
| 05 | `entra_e_sai_com_multa` | Entra na fila, aceita o aviso, sai com os dois toques e a confirmação — primeiro da fila, a saída gera multa |
| 06 | `multa_no_total` | A multa da 05 aparece só no total, com a explicação (DEC-1) |
| 07 | `agendar_pela_barra` | A segunda porta abre a barra de encaixe, agenda o primeiro horário livre e o agendamento aparece em Atendimentos (DEC-3) |
| 08 | `fila_fechada` | O profissional fecha a fila (pela API): a loja mostra "Fila fechada" no card dele, e a escolha de serviços só oferece Agendar e, no menu, o pedido de corte (DEC-6) |
| 09 | `login` | Sai da conta e entra de novo com o e-mail e a senha do cadastro (DEC-7) |
| 10 | `pedido_de_corte` | Com a fila fechada, pede o corte pelo "Mais opções"; o profissional aceita pela API e o app põe o cliente na fila (DEC-7) |
| 11 | `reabrir_o_app` | Fecha e abre o app na fila: a caixa de notificação (do app e do sistema) não volta, e o aviso da política da multa não se repete |
| 12 | `aparencia` | Perfil → Aparência: o tema avisa "Tema escuro", a fonte +2 salva e continua na tela; volta ao Normal |

`apoio/` tem os pedaços repetidos (abrir a loja, escolher o serviço, fechar
um aviso, conferir a versão e o `esperar_negando`, que espera uma tela negando a
caixa de permissão do sistema que vier no meio — 00.06 e 02.10, 03/10) e `scripts/` as chamadas à API.

## O que a bateria não cobre

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
