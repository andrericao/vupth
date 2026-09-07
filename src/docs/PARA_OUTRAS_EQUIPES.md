# 📬 PARA AS OUTRAS EQUIPES — front-client → backend e front-partner

> **Este é o documento que se manda para ler.** Tudo que o front-client descobriu e que pertence a
> **outra equipe** fica aqui, num lugar só. O Andre é o canal entre os três projetos: nós **não
> editamos o repositório de ninguém** — registramos aqui e ele repassa.
>
> Última atualização: **2026-08-29** · branch `dev` do front-client.

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

---

## 6. 🔴 BACKEND + FRONT-PARTNER — intenção ganha **PENDENTE DE ACEITAÇÃO**, e a garantida bloqueia o fechamento

**Decisão do Andre (2026-08-07).** Um discriminador único resolve tudo:

> **O pedido cabe no expediente, com tempo disponível?**
> **SIM** → *garantido* (aceite automático) e **bloqueia o fechamento da loja**.
> **NÃO** → **pendente de aceitação** do profissional e **não bloqueia** nada.

### As três situações

| Momento | Comportamento |
|---|---|
| **Antes de abrir a fila** | O profissional vê os pedidos e **reorganiza a ordem** do jeito dele. Aqui o tema é ordem, não aceitação |
| **Durante o expediente**, horário disponível | **Garantido**, igual a quem já está na fila. **Bloqueia o fechamento**: ou remove todos, ou atende todos |
| **Horário que cruza o fechamento** | **Pendente de aceitação**, **não bloqueia**. O profissional decide se estica o expediente |

### 🔴 Duas coisas que isto muda no backend

**1. O bloqueio de fechamento.** O PRD de vocês diz hoje que a `INTENTION` *"NÃO conta como atendimento ativo (não bloqueia o fechamento da loja — BUG6)"*. Passa a bloquear, **mas só** a intenção **garantida de hoje dentro do expediente** — intenção de amanhã, ou marcada para depois do `closingTime`, não pode prender o profissional. Vocês já têm a matemática de janela (`ClosingTimeMath`, `BusinessClock`) para esse recorte.

**2. 💡 Dois erros deixam de ser recusa e viram oportunidade.** Hoje vocês devolvem:
- `422 INTENTION_OUTSIDE_BUSINESS_HOURS` — pediu fora do expediente;
- `409 PROFESSIONAL_AGENDA_FULL` — não cabe antes do fechamento.

Nos dois casos o cliente leva um "não" e vai embora. Com o pendente de aceitação, viram **"vou perguntar ao profissional"** — e quem decide passa a ser quem tem interesse em vender. **O fluxo feliz não muda**; muda só o que hoje é beco sem saída.

### 🟡 Para o front-partner

Duas telas novas: **triagem antes de abrir** (ver os pedidos do dia e ordenar a fila) e **decisão dos pendentes** (aceitar ou recusar quem pediu horário que cruza o fechamento). Sem a segunda, o pendente fica órfão e o cliente espera para sempre.

**Relacionado:** conversa com o **piso de horário** (seção 1, B9) — quem sai da fila pelo piso volta a ser intenção, então passa a contar para este bloqueio enquanto espera o horário chegar.

---

## 7. 🎨 FRONT-PARTNER — a identidade nova não chegou por handoff

**Achado em 2026-08-17**, procurando na branch `design/marca-dev` a pedido do Andre.

A branch aplica uma **identidade visual nova** (Pencil / `pencil-new.pen`) — paleta `brandGreen #9FE870` + `forest #163300` com pastéis de apoio, e **Archivo** substituindo a Poppins, mais **DMMono** para números.

**O problema não é a marca — é o canal.** A branch mudou **61 arquivos de código e nenhum documento**. O que vocês esperam de nós está escrito **dentro de um comentário de código**, numa branch **não mergeada**:

> *"Precisa bater 1:1 com `vupth/config/gluestack-ui.config.ts` e com `tailwind.config.js` — os três têm que ficar sincronizados **no mesmo commit**."*

E o `BrandButton.tsx` de vocês diz *"espelha `src/components/brand/Button.tsx` do vupth (client)"* — **esse arquivo não existe aqui**. Ficamos sem saber que havia algo esperando por nós.

**O que pedimos:** quando a marca for decidida, **registrem no handoff de vocês** (nem que seja um parágrafo) com os hexes, as fontes e a expectativa sobre o client. Comentário em código de branch não mergeada não chega em ninguém — e a regra de "sincronizar no mesmo commit" é justamente a que mais precisa ser combinada com antecedência.

**O que já fizemos:** registramos a paleta, as fontes e a regra de contraste (`brandGreen` só como fundo, `forest` por cima) no nosso PRD, e anotamos que os tokens são **aditivos** — então sincronizá-los aqui não muda tela nenhuma. **Aguardando a decisão do Andre** sobre adotar.

**Obrigado pela armadilha documentada:** a do config nascido no teal antigo, com login/cadastro renderizando um verde diferente do resto do app. Vamos copiar os hexes da fonte da verdade em vez de escolher um verde parecido.

---

## 8. 📌 FRONT-PARTNER — o C21 não estava em nenhum documento nosso

O **C21** (cada profissional escolhe fila **ou** agenda pura) está no handoff de vocês desde **05/08** e **não constava em nenhum documento do client** até hoje. Registramos agora.

É uma dependência forte da nossa tela da loja: junto com o **C22** (horário por dia da semana), as duas dizem que aquela tela **não pode assumir nem regime único nem horário único**. Se tivéssemos redesenhado a tela nesse meio-tempo, teríamos que refazer.

Sem cobrança — o registro é para lembrar que **item que muda tela do outro app precisa de um empurrão ativo**, não só de estar escrito no handoff.

---

## 9. 🔴 BACKEND — resposta ao 18e (CORS / WebSocket / keep-warm) do PRD de 26/08

Lemos a seção **18e. Acesso por link (build web) — CORS, WebSocket e keep-warm** do `PRD_BACKEND.md`
(atualizada em 26/08 22h10). O desenho está certo e é o que destrava o acesso por link. Três coisas:
uma em que **vocês têm razão e nós erramos**, uma **inconsistência que deixa o client de fora**, e
uma **medição** que confirma o diagnóstico de vocês.

### 9.1 ✅ WebSocket — vocês estão certos, o pedido era nosso erro

Levantamos que autorizar só o HTTPS deixaria a fila em tempo real morta. **Não deixa.** Fomos ao
código de vocês e confirmamos: `WebSocketConfig:68-69` já tem `setAllowedOriginPatterns("*")` nos
dois endpoints (nativo e SockJS), com `/ws/**` em `permitAll()`. **Não há nada a fazer, e retiramos
o pedido.**

A observação de vocês procede — *"o front descreve como bloqueio de backend algo que já está
liberado"* — e vale para nós aqui exatamente como valeu para vocês no S19. Registrado como
aprendizado: **antes de escrever "bloqueio do backend", abrir o código do backend.**

⚠️ **Concordamos também com a inversão do risco:** apertar o CORS do HTTP e apertar junto a origem
do WS quebraria o que hoje funciona. **O commit do CORS não deve tocar no `*` do WS.** Se e quando
a decisão registrada (alinhar o WS à lista do HTTP) for executada, **é commit separado, e queremos
saber antes** — é o único ponto do 18e que pode derrubar tela nossa que hoje está de pé.

### 9.2 🔴 A inconsistência: **o client não está na lista de origens**

O 18e cita **apenas** `https://vupth-partner.pages.dev` e `https://*.vupth-partner.pages.dev`.
**O client é outro projeto do Cloudflare Pages, com outro domínio.** Se o `CORS_ALLOWED_ORIGINS`
subir com o que está documentado, o CORS entra, **o link do partner funciona e o do client
continua quebrado — com o mesmíssimo modo de falha mudo.** E a leitura natural seria *"o backend já
fez o CORS, então o problema é do client"*, que é falsa.

**Origens do client, para entrar na env var:**

| Origem | De onde vem | Fala com |
|---|---|---|
| `https://vupth.pages.dev` | Pages **Production**, build da branch `main` | **Railway** (prod) |
| `https://*.vupth.pages.dev` | Pages **Preview**, builds da branch `dev` | **Render** (staging) |

⚠️ **Segundo furo, que decorre do primeiro: `CORS_ALLOWED_ORIGINS` é env var POR AMBIENTE, e as duas
origens do client falam com backends DIFERENTES.** O 18e trata o CORS como uma coisa só, mas não
existe "a lista" — existe a lista do Render e a lista do Railway. Configurar só uma delas resolve
metade. E a metade que costuma ser esquecida é **prod/Railway**, que é justamente **a que os
testadores abrem** (o link público sai da `main`).

Sugestão concreta — **as duas linhas**, uma em cada painel:

```
# Render (staging)  — atende as previews da branch dev
CORS_ALLOWED_ORIGINS=https://*.vupth.pages.dev,https://*.vupth-partner.pages.dev

# Railway (prod)    — atende o link público, é o que os testadores abrem
CORS_ALLOWED_ORIGINS=https://vupth.pages.dev,https://vupth-partner.pages.dev
```

O curinga no meio (`https://*.vupth.pages.dev`) confirma a escolha de vocês por
`setAllowedOriginPatterns` em vez de `allowedOrigins` — sem ela, **nenhuma preview de branch
funciona**, nos dois apps.

📣 **Do lado do client, nada muda no código:** já mandamos o JWT em `Authorization: Bearer`, não
usamos cookie em lugar nenhum, e não temos nada que dependa de `allowCredentials(true)`.
`allowCredentials(false)` está ok para nós.

### 9.3 📐 Medição externa que confirma o diagnóstico de vocês (26/08)

Vocês auditaram por dentro (`SecurityConfig` sem `.cors(...)`). Medimos por fora, nos **dois**
backends, e o resultado bate com a previsão do 18e — inclusive o **401 no preflight**:

| Backend | `OPTIONS /auth/login` com `Origin` + `Access-Control-Request-*` | `GET /actuator/health/readiness` com `Origin` |
|---|---|---|
| Railway (prod) | **401** | 200, **sem nenhum header `access-control-*`** |
| Render (staging) | **401** | 200, **sem nenhum header `access-control-*`** |

Ou seja: o preflight cai em `anyRequest().authenticated()` exatamente como vocês descreveram, e
como preflight não carrega `Authorization`, o navegador nunca chega à chamada real. **Confirmado
que não é "falta autorizar a origem" — não existe CORS nenhum, nos dois ambientes.**

> ⏱️ **Medição de 26/08 — SUPERADA em 28/08.** O backend implementou o CORS. Estado atual na **§11**.

✅ **Corrigimos um registro nosso:** havíamos anotado *"OPTIONS sem resposta"*. Era artefato de cold
start do Render. **O comportamento real é 401**, como o 18e diz.

### 9.4 ✅ Keep-warm — a conta das 750h resolve uma dúvida que era nossa

A conta que vocês fizeram (**750 horas/mês somadas entre todos os serviços free da conta**; ping
24/7 ≈ 744h ⇒ risco de **suspensão até o próximo ciclo**, que é pior que cold start; janela 08–22
em dias úteis ≈ 308h) responde algo que estava aberto do nosso lado e que **não tínhamos
considerado**. Adotado.

Também explica o fracasso que o Andre relatou (*"esse keep-alive não funciona, ele é obliterado
toda vez"*): era cron do **GitHub Actions**, que sofre throttling e atrasa — e **intervalo de 10–13
min tolera ZERO falhas** antes dos 15 min de ociosidade. Com **cron-job.org a cada 5 min**, cabem
**duas** falhas consecutivas. A troca de ferramenta é o conserto, não o ajuste do intervalo.

Sem pedido nosso aqui: é configuração do Andre, e o `readiness` (não o `/actuator/health` agregado)
já é o que o nosso portão `waitForBackend` usa.

---

## 10. 🌐 ESTADO DO ACESSO POR LINK — o que já fizemos, e onde travou

> Para **backend** e **front-partner**. Este é o relato completo do que foi tentado do lado do
> client, para ninguém refazer o caminho nem esperar por algo que já está pronto.

### 10.1 ✅ Cloudflare Pages — projeto criado e no ar

**O link do client existe: https://vupth.pages.dev** — responde **200**, a página carrega.

Montado no padrão que o partner já usava, com **dois ambientes dentro do MESMO projeto** do Pages
(não são dois projetos):

| Ambiente do Pages | Branch | Backend |
|---|---|---|
| **Production** | `main` | **Railway** (prod) |
| **Preview** | `dev` | **Render** (staging) |

A variável `EXPO_PUBLIC_API_ENV` é **cravada no build**, por ambiente — não dá para trocar depois
sem rebuildar. Foi criada nos dois.

### 10.2 ✅ Merge na `main` — feito

O merge para a `main` **foi feito** e o build de Production saiu. É de lá que sai o link público.

⚠️ **A `main` ainda não tem tudo:** há **54 commits na `dev` fora da `main`**, na PR **#15**
(`dev` → `main`), ainda aberta. O link de hoje reflete a `main`, não a `dev`.

### 10.3 🔴 …e o link **não funciona**, por causa do CORS do backend

**A página abre, e nenhuma chamada completa.** Não é bug do porte web nem do Cloudflare: é o CORS
inexistente no backend, medido nos dois ambientes (detalhe e números na **§9.3**).

> ⏱️ **Escrito em 27/08 — SUPERADO. Ver §11.**

Este é **o único bloqueio** do acesso por link hoje. Está pedido ao backend na **§9.2** — e o pedido
tem duas partes que precisam ir juntas: **incluir as origens do client** (o §18e do PRD deles cita
só as do partner) e **configurar nos dois painéis**, Render e Railway, porque `CORS_ALLOWED_ORIGINS`
é env var por ambiente.

**Assim que essa barreira cair, seguimos com o teste por link.** Está parado esperando isso, não
esperando trabalho nosso.

### 10.4 🟡 Render vivo — em teste agora, antes de seguir

O motivo é concreto: **na hora de testar com usuários o app ficava lento demais**, porque o servidor
hiberna e o primeiro request leva ~50s. A intenção é o Andre testar em casa contra o **Render** e só
mostrar aos testadores quando estiver com o mínimo de atrito.

- ❌ **Cron do GitHub Actions não funciona** — sofre throttling e atrasa. Além disso, **intervalo de
  10–13 min tolera ZERO falhas** antes dos 15 min de ociosidade.
- ✅ **Adotado o desenho do §18e:** **cron-job.org**, `/actuator/health/readiness` (não o
  `/actuator/health` agregado), **5 min**, com **janela de horário** — que é o único parâmetro que
  protege a cota das **750 h/mês** somadas entre todos os serviços free da conta.

**❌ ENCERRADO EM 2026-08-31 — o keep-warm SAI DE ESCOPO (decisão do Andre).** Não vamos manter
pinger nenhum. O raciocínio que fecha a questão: **o Render deixou de ser ambiente de testador.**

| Ambiente | Quem usa, a partir de agora |
|---|---|
| **Render** (staging) | **só o Andre**, testando |
| **Railway** (prod) | é o que vai na frente do **usuário real** |

Como ninguém além do Andre abre o staging, hibernação virou custo que só ele paga — e ele sabe
esperar os ~50s. Pagar cota de 750 h/mês (e arriscar suspensão da conta) para acelerar o cold start
de uma pessoa não se paga. **O `P3` da lista de painel do backend pode ser fechado como "não
faremos".**

⚠️ **O portão `waitForBackend` CONTINUA valendo, e agora é a única defesa.** Sem keep-warm, todo
primeiro acesso ao staging pega a instância fria.

✅ **CORREÇÃO (31/08): o `P4` NÃO estava aberto — já estava feito.** Chegamos a escrever aqui que o
Health Check Path do Render estava vazio e que isso abria uma janela de 500 a cada deploy. **Errado.**
O backend registrou no commit `29ec009` que o campo **já estava setado**, e que ele entrou na lista
como pendente só porque a seção 18c seguia dizendo "pendente" e ninguém reconferiu.

📌 **A lição, que é a mesma dos dois lados:** eles chamam isso de *"o defeito do `keep-alive.yml`
fantasma na direção contrária — texto que ninguém reconfere envelhece nos dois sentidos, inventando
pendência tanto quanto escondendo"*. **Nós repetimos o erro na sequência**, herdando o estado da
prosa deles em vez de conferir. Config de painel **não é verificável por `curl` de fora** — só no
painel, ou perguntando. É exatamente a Regra 3 do `VUPTH_DOCS` (todo doc diz **como se verifica**)
falhando por não ter resposta possível.

📌 **Como se verifica:** `curl -o /dev/null -w '%{http_code} %{time_total}\n'
https://vupth-backend-ia.onrender.com/actuator/health/readiness` depois de >15 min de ociosidade.
Quente responde **0,5s**; frio, dezenas de segundos. Medido em 31/08: **quente 0,56s e 0,74s**; numa
partida a frio o mesmo endpoint **não respondeu dentro de 120s** — indício de que o teto de ~90s do
`waitForBackend` (PRD_BACKEND §18c) pode estar curto. **Uma medição só, não é conclusão** — para
fechar, deixar hibernar e cronometrar até o primeiro 200.

### 10.5 🔴 INCONSISTÊNCIA DE AMBIENTES — `dev` significa **duas máquinas diferentes**

Achado ao montar o Pages. Os três projetos usam as mesmas palavras para coisas diferentes:

| Nome | Backend (`application-*.properties`) | Front-client (`api.ts`) |
|---|---|---|
| `local` | — | `http://<ip>:8080` |
| **`dev`** | **Docker local** | **Render** ⚠️ |
| `staging` | **Render** | **Render** (apelido de `dev`) |
| `prod` | **Railway** | **Railway** |

⚠️ **`dev` é Docker local no backend e Render no client.** Mesma palavra, máquinas diferentes. Hoje
não quebra nada porque o client tem o apelido `staging` apontando para o mesmo host — mas é um
apelido que **esconde** o desencontro em vez de resolvê-lo, e o nome `local` já cobre o caso local.

✅ **CORREÇÃO (27/08).** Uma versão anterior desta seção propunha `local`/`dev` = Docker local ·
`staging` = Render · `prod` = Railway. **Estava errado, e o erro é nosso:** o acordo já existia e é
outro. Quem leu a tabela antiga, desconsidere.

**Vocabulário DECIDIDO pelo Andre em 28/08: `local` · `staging` · `prod`.** Três nomes, não quatro —
o par `dev`/`staging` some, e some junto o motivo dele existir (era só o mesmo `.env` circulando
entre os repos).

| Nome | Onde roda | Quem publica ali |
|---|---|---|
| `local` | Docker na máquina | ninguém |
| `staging` | **Render** | branch `dev` |
| `prod` | **Railway** | branch `main` |

⚠️ **Mudou em relação ao que foi acordado em 27/08.** A rodada anterior fechou em `local` · **`test`**
· `prod` ([vupth-partner#18](https://github.com/andrericao/vupth-partner/pull/18#issuecomment-5437931194)).
O Andre trocou `test` por **`staging`** por dois motivos: "test" carrega junto a ideia de teste
automatizado, e **`staging` é o nome que o backend JÁ usa** no `application-staging.properties`
apontando para o Render — menos renome em todo mundo. **Quem já tinha anotado `test`, corrija.**

**Estado das três pontas:** front-client ✅ concorda · front-partner ✅ concorda · **backend ⬜ falta**.

**O renome está TRAVADO POR DATA de propósito** — fazer fora de sincronia é o único jeito de isso
custar caro. No client são quatro pontos, todos no mesmo arquivo, mais os `.env` e o `eas.json`:

| onde | hoje | vira |
|---|---|---|
| `ApiEnv` | `"local" \| "dev" \| "staging" \| "prod"` | `"local" \| "staging" \| "prod"` |
| `BASE_URLS` | `dev` **e** `staging` no mesmo host do Render | **apaga a chave `dev`** — o `staging` já está certo |
| `CANAL_PARA_ENV` | `development: "dev"` | `development: "staging"` |
| lista branca do `resolveApiEnv` | `["local","dev","staging","prod"]` | `["local","staging","prod"]` |

📣 **Backend:** é a ponta que falta. O custo aqui já está levantado e é pequeno; o que trava é o
acordo, não o trabalho.

### 10.6 ✅ RESOLVIDO em 06/09 — o canal `preview` saiu de produção

**Estado atual** (`src/services/apiEnv.ts`; no partner é `src/lib/apiEnv.ts`):

```ts
export const CANAL_PARA_ENV: Record<string, ApiEnv> = {
  development: "staging", preview: "staging", production: "prod",
};
```

**Só o canal `production` encosta no Railway.** Travado pelo teste
*"nenhum canal além do `production` fala com o Railway"* em `src/__tests__/domain/apiEnv.test.ts` —
se alguém reapontar um canal para `prod`, o CI reprova.

**Como estava, e por que mudou.** Até 06/09 o `preview` resolvia `prod`: **build de preview em
device gravava no banco de PRODUÇÃO**. Não era descuido — estava documentado como deliberado, com a
justificativa *"é no Railway que o time testa em device"* (22/08). **A premissa caiu duas vezes:**
em 28/08 ficou `staging` = Render (§1w), e em 06/09 o front-partner corrigiu o lado deles e fechou
*"o Render é o que se testa"*. O Andre confirmou para o client no mesmo dia: **testa-se no
`preview`; o que se MOSTRA a usuário é a versão de `production`.**

⚠️ **Efeito esperado, não abram bug:** o Render Free hiberna, então o APK de teste passa a ver o
portão do `waitForBackend` (~50s) no primeiro acesso depois de ociosidade. O keep-warm foi
cancelado em 31/08 de propósito.

🎓 **A lição:** o defeito não estava na escolha, estava na **prosa que ninguém reconferiu**. A
justificativa continuou escrita por 15 dias depois de a premissa dela ter mudado — é o mesmo padrão
do P4 e do `keep-alive.yml` fantasma.

### 10.7 ⚠️ O "link não funciona" que se DISFARÇA de CORS — e a medição que separa os dois

Alerta do **front-partner** (PR #16 do client, 27/08), e ele procede: o fallback do `resolveApiEnv`
é **`local`**. Num build web **sem** `EXPO_PUBLIC_API_ENV` declarada, o site sai apontando para um
**IP de rede local** — e **não dá erro que explique**, só não conecta.

**São dois "o link não funciona" com causas diferentes, e o segundo imita o primeiro.**

✅ **Verificado no bundle que está no ar** (`https://vupth.pages.dev`, 27/08). A variável **está**
cravada no ambiente **Production**:

```js
const l = {local:"http://192.168.0.16:8080", dev:"https://vupth-backend-ia.onrender.com",
           staging:"https://vupth-backend-ia.onrender.com",
           prod:"https://vupth-backend-ia-production.up.railway.app"},
      f = (0,u.resolveApiEnv)(h,"prod"), p = l[f];
```

`resolveApiEnv(canal, "prod")` → `"prod"` → **Railway**. **Confirmado que o bloqueio do link público
é o CORS**, e não o fallback.

⚠️ **Falta conferir o ambiente Preview.** A Cloudflare **não herda** as variáveis entre Production e
Preview — são dois conjuntos. Sem `EXPO_PUBLIC_API_ENV` no Preview, **toda preview da `dev` sai
apontando para `192.168.0.16:8080`** e o sintoma é idêntico ao do CORS.

**Como distinguir, em 10 segundos:** abrir o bundle publicado e procurar o argumento do
`resolveApiEnv`. Se for `"prod"`/`"staging"`, o alvo está certo e a causa é CORS. Se o segundo
argumento vier vazio/ausente, é o fallback `local` — e aí nenhum CORS do mundo resolve.

### 10.8 ✅ A guarda do build web já está na `dev` (PR #16)

Mergeada em 27/08. `tsconfig.json` ganhou `exclude` (`dist`, `web-build`, …) e o `eslint.config.js`
ganhou `dist/` e `web-build/` nos `ignores`, travados por `src/__tests__/projeto/buildOutputIgnorado.test.ts`
— que também barra o erro oposto, um `exclude` engolindo `src` (typecheck verde por não ter olhado
o app).

**Por que importa para quem for mexer aqui:** o client ainda **não tem `build:web`**. A guarda entrou
**antes** do problema. Sem ela, rodar `expo export --platform web` e depois o portão dá duas falhas
que **não apontam para a causa** — `tsc` com *"Maximum call stack size exceeded"* sem citar arquivo,
e lint reprovando por milhares de problemas vindos do bundle.

---

## 11. 📍 ESTADO EM 2026-08-28 — o CORS entrou, e o que ainda falta

> Esta seção **supera** o que as §9.3 e §10.3 dizem sobre "não existe CORS". Elas ficam como
> registro datado; a verdade de hoje é esta.

### ✅ O backend implementou o CORS

Commit `4320108` na `dev` deles (*"CORS para o acesso por link, e o /actuator para de entregar
metrics sem token"*). O `PRD_BACKEND.md` §18e foi reescrito: **CORS ✅ implementado**.

**Faz o que foi combinado, inclusive o cuidado que pedimos com o WebSocket:** o
`CorsConfigurationSource` retorna **`null`** para `/ws` e `/ws/**`, então o `CorsFilter` passa reto e
o `setAllowedOriginPatterns("*")` do `WebSocketConfig` fica **intacto**. O tempo real não foi tocado.

### 🪜 A escada de diagnóstico (serve para os dois apps)

A env var vazia produz um sintoma **diferente** de "sem CORS", e isso permite localizar o problema
sem acesso a painel nenhum:

| `OPTIONS` de preflight | Significa |
|---|---|
| **401**, sem `vary` | código **não deployado** — o preflight cai em `anyRequest().authenticated()` |
| **403** + `vary: Access-Control-Request-*` | código **no ar**, mas a **origem não está autorizada** |
| **200** + `access-control-allow-origin` | **pronto** |

⚠️ **`curl` sem o header `Origin` NÃO testa CORS** — não é requisição CORS, e responde 200 sempre.
O comando que testa de verdade:

```bash
curl -i -X OPTIONS https://vupth-backend-ia.onrender.com/auth/login \
  -H "Origin: https://vupth.pages.dev" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization,content-type"
```

### 📐 Medido em 28/08

| Backend | Origem | Resultado |
|---|---|---|
| **Render** (staging) | `https://vupth-partner.pages.dev` | **200** ✅ |
| **Render** | `https://x.vupth-partner.pages.dev` | **200** ✅ — o curinga de subdomínio funciona |
| **Render** | `https://vupth.pages.dev` | **403** ❌ |
| **Render** | `https://dev.vupth.pages.dev` | **403** ❌ |
| **Railway** (prod) | `https://vupth.pages.dev` | **401** ❌ — código não deployado |

### 🔴 O que falta, e de quem é

1. **Origens do client no `CORS_ALLOWED_ORIGINS` do Render** (+ restart). A variável já está no ar e
   funcionando — só foi preenchida com a lista do §18e, que **citava apenas o partner**. É
   exatamente o risco levantado na §9.2, e ele se concretizou.
   ```
   https://vupth-partner.pages.dev,https://*.vupth-partner.pages.dev,https://vupth.pages.dev,https://*.vupth.pages.dev
   ```
2. **Backend: merge `dev` → `main`** (agendado para 28/08 às 23:00) **+ a mesma variável no Railway.**
   Antes do merge não adianta configurar o painel do Railway: não há código lá para ler a variável.
   O §18e deles fala em *"a env var no Render"* — **no singular**; o link público sai do Railway.

⚠️ **O 403 pega o `readiness` também.** Não é só o login: com a origem não autorizada, o portão
`waitForBackend` da build web nunca passa, e o sintoma é *"preparando servidor…"* para sempre — sem
erro que explique. É o mesmo modo de falha mudo de antes, com outro código HTTP.

### 🟡 Cloudflare — a ponta staging do client ainda não existe

`https://dev.vupth.pages.dev` devolve **404**: nunca houve deploy de preview da `dev`, e o alias
`<branch>.<projeto>.pages.dev` só nasce depois do primeiro. O *branch control* foi ajustado para
`dev` em 28/08, mas ele vale **daqui pra frente** — não reconstrói o que já passou. Resolve com
*"Create deployment"* no painel ou com o próximo push na `dev`.

✅ **Não precisa de código para ligar a preview ao Render:** o `BASE_URLS` já tem `staging` →
Render e o `resolveApiEnv` já aceita `"staging"`. Basta `EXPO_PUBLIC_API_ENV=staging` no ambiente
**Preview** da Cloudflare.

⚠️ **A produção segue vindo da `main`** (conferido: `vupth.pages.dev` → 200, `main` em `cb329119`).
A `dev` está **8 commits à frente**, incluindo a PR #16 inteira — então a preview, quando subir, vai
mostrar coisa que o link público ainda não tem.


### 11.1 ✅ 2026-08-29 — o staging FUNCIONA, e o que faltava não era o CORS

Depois que as origens entraram no Render, o link de staging **ainda não abria**. A causa era outra, e
vale registrar porque **não estava no radar de ninguém**.

**https://dev.vupth.pages.dev está funcionando.**

#### 🙏 O achado é do front-partner

Eles perderam o app publicado para isto, diagnosticaram e **nos avisaram antes de a gente descobrir
sozinho** — inclusive medindo o **nosso** site e mandando a evidência pronta. Sem esse aviso,
teríamos gasto o dia procurando no lugar errado (CORS, backend), que é exatamente onde o sintoma
aponta.

#### O defeito

O `expo export --platform web` grava cada asset **espelhando o caminho de origem**. Com as fontes
vindo de `@expo-google-fonts/*`, os TTFs saíam sob `dist/assets/node_modules/...` — e a **Cloudflare
Pages descarta `node_modules` do deploy, por design e em silêncio**. Somado a um portão que segurava
a tela só no `fontsLoaded`, dava **spinner eterno**.

#### 🔴 A armadilha que vale generalizar: **`200` não significa que o arquivo existe**

Com o fallback de SPA, **todo caminho responde 200** — o ausente devolve o `index.html`. Quem testa
por status code vê verde e conclui que está tudo certo. **O que distingue é o `content-type`.**

**É a mesma família da armadilha do `curl` sem `Origin`** (§11): teste que parece verde **sem ter
verificado nada**. Vale para os três projetos:

| Verificação | ❌ O que engana | ✅ O que prova |
|---|---|---|
| Arquivo estático existe | status `200` | `content-type` do recurso |
| CORS autorizado | `curl` sem `Origin` → 200 | `curl` **com** `Origin` → `access-control-allow-origin` |

**Teste de controle que fecha qualquer dúvida:** peça um caminho **inventado**. Se ele responder
igual ao recurso real, o recurso real não existe.

```bash
curl -sI https://SEU-DOMINIO.pages.dev/nao-existe-mesmo-12345.ttf | grep -i content-type
```

#### 📐 Estado medido em 29/08

| | Antes | Depois |
|---|---|---|
| Fontes sob `assets/node_modules/` no bundle | **42** | **0** |
| Fontes em `assets/assets/fonts/` | 0 | **6** |
| `content-type` do TTF | `text/html` ❌ | **`font/ttf`** ✅ |

#### O que corrigimos (client)

1. Os 6 TTFs saíram do `node_modules` para `assets/fonts/`, carregados por `require()`.
2. O portão virou `fontsLoaded || Boolean(fontError)` — **esta é a mais importante**: sem ela,
   qualquer falha futura de fonte volta a prender o app, em **qualquer** plataforma.
3. 🔒 As três condições ficam travadas em `src/__tests__/projeto/fontesForaDoNodeModules.test.ts`.

⚠️ **Correção ao relato do partner sobre nós:** eles supuseram que o nosso caso era silencioso
("como vocês não travam no `useFonts`"). **Nós travávamos** — o `App.tsx` segurava a tela no
`fontsLoaded`. Era a versão dura do defeito, não a discreta.

### 11.2 📍 O que ainda falta para o LINK PÚBLICO

O staging está resolvido. O público (`vupth.pages.dev` → Railway) depende de **uma linha de painel**:

```
CORS_ALLOWED_ORIGINS=https://vupth-partner.pages.dev,https://*.vupth-partner.pages.dev,https://vupth.pages.dev,https://*.vupth.pages.dev
```

O código de CORS **já está no Railway** — o preflight saiu de `401` para `403`, o que pela escada da
§11 significa "no ar, origem não autorizada". A variável está **vazia** lá: hoje o Railway recusa
**todas** as origens, inclusive as do partner.

✅ **O backend já corrigiu isso antes de pedirmos.** A §18e ganhou uma **lista de tarefas de painel
(P1–P4)**, e o **P2** traz **os dois painéis** e a string completa, **já com as origens do client**.
Íamos abrir pedido; não há o que pedir. Estado deles: **Render ✅ feito 29/08 · Railway ⬜ pendente**.

🔴 **E lá tem um item que nos afeta e não estava no nosso radar — o `P4`:** o *Health Check Path* do
Render está **vazio**, então o Render dá o serviço como no ar **assim que a porta abre** — e no Spring
Boot a porta abre **antes** de o Liquibase terminar. **A cada deploy há uma janela em que trafego real
vai para uma instância com o banco não pronto, e o usuário toma 500.** É a janela que o nosso portão
`waitForBackend` cobre, e a explicação para 500 esporádico logo após deploy: **não é bug de app**.
