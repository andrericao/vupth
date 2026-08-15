# 📬 PARA AS OUTRAS EQUIPES — front-client → backend e front-partner

> **Este é o documento que se manda para ler.** Tudo que o front-client descobriu e que pertence a
> **outra equipe** fica aqui, num lugar só. O Andre é o canal entre os três projetos: nós **não
> editamos o repositório de ninguém** — registramos aqui e ele repassa.
>
> Última atualização: **2026-08-07** · branch `dev` do front-client.

> ⚠️ **NÚMERO DE ITEM NÃO É REFERÊNCIA ESTÁVEL.** Os backlogs renumeram, então os `#N` citados aqui
> valiam **na data em que foram escritos**. Procure o item pelo **NOME** no PRD da equipe dona; o
> número serve só como pista datada.

---

> O Andre é o canal entre os três projetos e pediu que **tudo o que for de outra equipe fique
> escrito**, para elas lerem direto daqui. **Nós não editamos o repositório de vocês.**

## 1. 🔴 PARA O BACKEND — o que ficou pendente conosco

| # | Pedido | Situação |
|---|--------|----------|
| **B2** | `GET /attendances/intentions/professional/{id}` **público com blocos ANÔNIMOS** (`{ frame: {projectedQueueEnd, openingTime, closingTime}, blocks: [{start, durationMinutes}] }`, sem dado pessoal). **Trava a F5 do client** — o cálculo dos horários (`computeAvailableSlots`) já está pronto e testado aqui, só faltam os blocos de terceiros | ⬜ aberto |
| **B3** | Esqueci minha senha: **validar o envio real** e investigar o **reenvio** que não chegou (teste de device 2026-07-23). O front já cobre cold start, timeout e reenvio na UX — o que falta é a infra | ⬜ aberto |
| **B8** | `#31` / partner S14: **recusar o CONNECT com token inválido/expirado**, em vez de degradar para anônimo. Sem a recusa o app **não tem como saber** que subiu anônimo: o tópico público segue atualizando e só o canal pessoal morre calado. O painel de diagnóstico do client apenas EXIBE o estado — **não é conserto e não deve ser usado para rebaixar o item** | ⬜ aberto |

| **B9** | 🧊 **PISO DE HORÁRIO ("não posso antes das HH:MM") + multas.** Pedido do Andre (2026-08-07). ⚠️ **São DOIS casos, e hoje só existe um.** **(1) ALVO — flexível:** *"quero por volta das 15:00, mas se der para cortar antes, ótimo"*; se a estimativa cair, ele fica e é atendido antes. **É o que o horário-alvo (`targetTime`) já faz.** **(2) PISO — rígido, é o pedido novo:** *"não posso antes das 15:00; depois pode"*. **Mecanismo:** o cliente **sempre acaba indo para a fila**; quando a estimativa **cruza** o piso ele **entra**; se alguém desiste e a estimativa **cai para antes** do piso, ele **SAI da fila** e volta a esperar; quando cruzar de novo, entra de novo. **Não é imunidade:** já dentro da fila com estimativa ≥ piso, valem as regras normais — sair da fila = multa, não aparecer = multa. **(3) Não chegou e não avisou:** o app notifica e oferece **duas saídas com multas diferentes** — *sair da fila* (multa de desistência) ou *ainda quero ser atendido* (multa de outro tipo, segue na fila remanejado); valores a definir com o Andre. **(4) ⚠️ BURACO — atraso em cascata:** quando alguém não aparece, a fila anda para trás no relógio e o **próximo chega "atrasado" em relação ao horário que lhe foi comunicado** — punir esse cliente é multar alguém por um atraso que o sistema criou. **Princípio que unifica tudo: ninguém pode ser penalizado por não estar presente antes do horário que lhe foi COMUNICADO** — a régua da multa é o horário comunicado, não a posição na fila. Isso exige **guardar o horário comunicado a cada cliente**, e o **profissional precisa ver o piso** (senão chama às 14:15, não aparece ninguém e marca atraso). Evolui o **cancelamento tardio + strikes** (era o `#39` em 08/2026). **Desenho sugerido pelo Andre:** função **orientada a eventos** que reavalia o piso a cada mudança na fila — mesmo molde dos seus `IntentionPromotionScheduler`/`CutRequestExpiryScheduler`/`EstablishmentAutoCloseScheduler` (`ThreadPoolTaskScheduler` próprio, sem `@Scheduled`), engatando no mesmo caminho que já dispara o `broadcastQueue`. ⚠️ **O gatilho não pode ser só "mudou o tamanho da fila"**: atendimento que demora mais que o estimado empurra a estimativa **sem** alterar o tamanho, e é justamente aí que alguém cruza o piso — precisa disparar em `start`/`finish`, `cancel`/`leave-queue`/no-show, `late`/`undo-late`, encaixe/promoção, blocos de refeição e pausa do profissional. **A decidir:** para onde o cliente vai quando SAI da fila pelo piso, e como ele é avisado das duas transições (sair e reentrar) — senão abre o app, não se vê na fila e acha que perdeu a vez. Do nosso lado o `targetTime` já está encanado e desligado de propósito em `ServiceSelection.goToQueue` | 11 | ⬜ aberto |

**Correções ao PRD de vocês** (para vocês aplicarem — não mexemos lá):

1. **C18 já está FEITO no client** desde 2026-08-06 (`AppState` nos dois hooks: ao voltar ao primeiro plano com o socket caído, derruba e reconecta). O PRD de vocês, conferido em 05/08, ainda diz *"Client ⬜ ABERTO — hoje na prioridade 9"*.
2. **S19 — consumido no client em 2026-08-07** (`b17282e5`): mandamos `{ current_password }`, tratamos o `401` como erro de campo e exibimos a mensagem do `409` como veio. ⚠️ **O front-PARTNER não tem exclusão de conta nenhuma** — ver seção 3(d); é bloqueio de publicação nas lojas.
3. **S19 — resolvido, e obrigado pela correção.** Apontamos em 06/08 que a rota `DELETE /profile/delete/me` **já existia** (seção 6, tabela de permissões do CLIENT e cobertura de integração), contra o enunciado que dizia "não existe rota de exclusão (grep vazio)". Vocês reescreveram no dia seguinte — e acharam o problema **real**, que era muito pior: a rota era **destrutiva** (`cascade = ALL`), então apagar a conta de um dono **apagava a loja inteira**. Está fechado.

## 2. ✅ O novo delete de conta — o que ele quebrou no client (já corrigido em 07/08)

**Ficou quebrado e já foi corrigido** (`b17282e5`). Fica registrado porque o **front-partner ainda não tem exclusão de conta** e vai passar por isto quando implementar. Enviamos `DELETE /profile/delete/me` **sem corpo**, e o contrato novo (2026-08-07) devolve **`400 INVALID_REQUEST_BODY`** — o próprio PRD de vocês já registra que *"é o que os apps mandam hoje"*.

Para consertar do nosso lado (**item de front, registrado no PRD_FRONT-CLIENT §12**):

- pedir a **senha atual** antes de apagar e mandar `{ "current_password": "..." }`;
- tratar **`401 CURRENT_PASSWORD_INVALID`** como erro de campo, **não** como sessão expirada — senão o interceptor global desloga o usuário no meio do fluxo;
- tratar **`409 ACCOUNT_DELETE_NOT_ALLOWED`** exibindo **a mensagem do backend**, que diz *o que fazer* para destravar (sair da fila, encerrar o atendimento, esperar a loja esvaziar). Nunca traduzir para "não é possível apagar esta conta" — bloqueio permanente reprova na publicação;
- sucesso agora é **`204 No Content`** e a conta **para de autenticar no request seguinte** (o token morre na hora, não espera expirar) — o app tem de ir direto para o fluxo deslogado.

## 3. 📍 PARA O FRONT-PARTNER

**a) GPS.** Spec completa na **§15.6**: pedir a permissão de localização **na abertura do app** e mandar a **`latitude`/`longitude` do aparelho do dono** no cadastro/edição do endereço do estabelecimento (caminho preferencial — com ela o backend **não** geocodifica e não sobrescreve o dado mais preciso). Inclui `GET /geocoding/reverse`, a validação `422` do par, e as armadilhas que já pagamos aqui.

**b) O C14 de vocês pode ser ENCERRADO — e não serve como prova do WebSocket.** O item ainda consta no handoff de vocês como bug aberto ("atendimento em andamento não aparece pro cliente"). **Não reproduz** (Andre, device, 2026-08-06): o status muda na tela normalmente. Mais importante que isso: ele **nunca serviu de prova do canal pessoal**, porque o status do cliente é reconciliado pelo **poll do `getWaitTime` (30s)** — o sintoma some mesmo com o canal pessoal completamente mudo. Se vocês usarem o C14 como critério, vão declarar o WebSocket funcionando sem ter medido nada. O que mede é o **teste de 1 hora** (token expirado + reconexão) olhando o `user-name` do frame CONNECTED.

**c) `isDisabled` do Gluestack é só estado VISUAL — confiram aí.** Descobrimos em 07/08 que o botão fica apagado mas **o toque continua disparando o `onPress`**. Nossas telas escapavam por acaso, porque os handlers tinham guarda interna. Se o app de vocês ainda usa Gluestack em alguma tela (ou se o equivalente em NativeWind tiver o mesmo comportamento), vale conferir — o caso perigoso é botão de ação irreversível.

**d) ⚠️ O app de vocês NÃO tem "deletar conta" — e isso é bloqueio de publicação.** Procurei no repo e não há nenhuma chamada de exclusão. Exclusão de conta é **exigência da Play Store e da App Store** e da LGPD, então a publicação reprova sem ela. Duas facilidades novas: o backend **reescreveu a rota em 2026-08-07** e ela deixou de ser `CLIENT`-only — agora é **qualquer usuário autenticado**, justamente porque o dono também precisa poder apagar a própria conta; e o desenho está pronto do nosso lado, com a receita na **seção 2** (senha atual no corpo, `401` como erro de campo, `409` exibindo a mensagem que diz como destravar). Para vocês há um caso a mais: quando **o dono** apaga a conta, a loja não é apagada — é **desligada** (`open_status = CLOSED` **e** `status = INACTIVE`, com os profissionais desafiliados). ⚠️ Atenção à armadilha que o backend registrou: **`CLOSED` sozinho NÃO tira a loja da vitrine** — quem tira é `status = INACTIVE`, que é outro campo.
---

## 4. 🆕 Achados do teste no device de 2026-08-07

### 4.1 🔴 BACKEND — o WebSocket não conecta a partir do React Native

**Sintoma medido** (painel de diagnóstico do app-cliente, no device): ao entrar na fila, o canal pessoal reporta **falha no handshake — não chega a conectar**. O `heart-beat` não aparece, o que é coerente: ele só vem no frame `CONNECTED`, que nunca chega.

**Por que isso é novo.** A prova de vocês (`ws-probe.js`, 6/6 contra o Render) foi feita de **Node**. O que nunca foi exercitado é o **WebSocket do React Native** contra `wss://vupth-backend-ia.onrender.com/ws/websocket`. O REST no mesmo momento funcionava — o Andre acabara de salvar alterações de perfil com sucesso, então **o servidor estava de pé**; o que não sobe é o upgrade da conexão.

**Consequência para o que estava em disputa:** com a conexão não abrindo, o **`#31`** (token inválido conecta como anônimo) **não explica este sintoma** — não se chega ao ponto de ser anônimo. E o teste de 1 hora fica suspenso até o socket subir.

**O que pedimos:** olhar os logs do servidor no horário de uma tentativa e dizer se o CONNECT chega a bater na aplicação ou se morre antes (proxy/upgrade do Render). O app já foi ajustado para reportar o **motivo** do erro e a **URL tentada** — mandamos o print da próxima rodada.

### 4.2 🔴 BACKEND — falta invariante: o mesmo cliente entra DUAS VEZES na fila

**Reproduzido pelo Andre (device, 2026-08-07):** ele estava **em atendimento** (`IN_PROGRESS`) e conseguiu **entrar na fila do mesmo estabelecimento outra vez** — ficou esperando o próprio corte terminar.

**Onde está o buraco.** Do nosso lado a guarda é **puramente local** (`shouldCreateAttendance` só consulta o store do aparelho). Se o store dessincronizar — logout/login, reinstalação, corrida entre telas —, o front chama o `POST /attendances` e **o backend aceita**. Guarda local sempre pode ser furada; o conserto que resolve é o invariante no servidor.

**O que pedimos:** recusar `POST /attendances` quando o cliente já tem atendimento **ativo** (`SCHEDULED`/`LATE`/`IN_PROGRESS`/`PAUSED`) com o **mesmo profissional** — e definir se vale também para profissionais diferentes na mesma loja. Vocês já têm a noção em `/swap-offers` (o `422` de "já estar na fila daquele profissional"); falta no caminho de entrada.

**Efeito colateral que isso causa hoje:** a fila conta duas vezes o mesmo cliente, a estimativa dos outros infla, e o atendimento órfão trava o fechamento da loja e o apagar-conta (que checam atendimento ativo).

### 4.3 🟡 FRONT-PARTNER — vale conferir os dois acima

O `4.1` afeta vocês igual se o app de vocês também conecta por WebSocket a partir do React Native. O `4.2` afeta a tela de fila: se o mesmo cliente aparecer duas vezes, o profissional vê duplicado e a estimativa dele fica errada.

---

## 5. 📣 PEDIDO AO FRONT-PARTNER — coloquem também um painel de WebSocket nas Configurações

**O pedido em uma linha:** façam no app de vocês o mesmo painel de diagnóstico de tempo real que o front-client colocou em **Configurações → "Tempo real"**.

### Por que isso importa mais do que parece

Passamos semanas discutindo o WebSocket sem conseguir concluir nada, e o motivo era simples: **ninguém conseguia observar a conexão**. "Não chega mensagem" não diz de quem é a culpa — pode ser o servidor não publicando, o socket morto sem avisar, ou a sessão ter subido sem identidade. Os três produzem exatamente o mesmo sintoma: silêncio.

O backend chegou a pedir um "Teste 0" que era imprimir os headers do `CONNECTED` no console. **Isso é inexequível num binário instalado** — só aparece com o aparelho ligado no computador via `adb logcat` ou num dev client, e quem testa está com o celular na mão. Por isso viramos o log em **tela**.

**O resultado prático, no primeiro teste depois de pronto:** o que era "o WebSocket não funciona" virou **"falha no handshake, não chega a conectar, motivo X, nesta URL"**. Isso é acionável; o anterior não era.

### O que o painel mostra (uma linha por canal)

| Dado | A pergunta que ele responde |
|---|---|
| `user-name` do frame `CONNECTED` | A sessão subiu **identificada** ou **ANÔNIMA**? Vazio = anônima, e o canal pessoal morre calado (é o `#31` do backlog do backend / S14 de vocês) |
| `heart-beat` negociado | O servidor manda batida ou `0`? `0` = socket zumbi, a queda passa despercebida (o S17 de vocês) |
| Mensagens recebidas + hora da última | Separa **"conectado"** de **"recebendo"** — que era exatamente o que nenhum teste anterior distinguia |
| Nº de conexões | Quantas vezes reconectou (é o que os testes de background e troca de rede medem) |
| **Motivo do erro + URL tentada** | Quando falha, **por quê** e contra quem |

### O motivo mais forte: só com os dois apps instrumentados dá para isolar a causa

Hoje o front-client falha o handshake no device. **Não dá para saber se é problema do nosso código ou do WebSocket do React Native contra o Render.** Com o painel nos dois apps, o teste vira trivial:

- **Os dois falham** → é servidor/infra, e o backend age.
- **Só o client falha** → é código nosso, e nós agimos.
- **Só o partner falha** → é código de vocês.

Sem instrumento nos dois lados, isso continua sendo troca de suposições.

### Custo

Baixo, e **sem dependência de backend**: um store pequeno com o estado por canal, alimentado nos callbacks que vocês já têm (`onConnect`, `onWebSocketError`, `onStompError` e o `subscribe`), mais um componente de leitura na tela de Configurações. No nosso caso a lógica pura ficou em `domain/ws/diagnostics.ts` com 17 casos de teste — a parte que decide se a sessão é anônima e se o heartbeat está zerado.

**Detalhe que custou caro aqui:** capturem o **motivo** do erro, não só o fato de ter falhado. Nossa primeira versão descartava o evento de erro, e o primeiro teste no device voltou com "falhou" sem causa — teste queimado. E capturem também o `onStompError`: erro de **protocolo** (um CONNECT recusado, por exemplo) não passa pelo `onWebSocketError` e, sem ele, uma recusa do servidor aparece como silêncio.
