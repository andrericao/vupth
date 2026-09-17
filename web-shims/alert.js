// Alert.alert do React Native para o bundle WEB (ver App.tsx).
//
// O React Native Web NAO implementa `Alert`: a chamada nao falha, nao loga e
// nao pinta nada. Sao 60 chamadas neste app (110 no partner) — confirmacoes,
// erros de formulario, o aviso de multa ao sair da fila, o motivo de uma acao
// recusada. No navegador o usuario clicava e nada acontecia.
//
// POR QUE UM PATCH E NAO UM IMPORT NOVO: trocar `Alert` por um wrapper exigiria
// mexer nas 60 chamadas — e em cada uma escrita daqui pra frente, que ninguem
// lembraria. `Alert` e um objeto exportado pelo react-native; substituir o
// metodo dele atinge todo mundo, inclusive codigo de biblioteca.
//
// `window.alert`/`confirm` foram descartados: sao bloqueantes (travam o event
// loop, e o `onPress` do botao roda depois do bundle inteiro parar) e nao
// suportam mais de dois botoes. Varios Alert do app tem tres.
//
// O VISUAL SEGUE O APP, e cada numero aqui foi COPIADO da fonte, nao escolhido:
//
//   backdrop rgba(0,0,0,.45) e padding 24 ....... DeleteAccountModal.tsx
//   card branco, raio 20 ($card), padding 24 .... idem + config radii/space
//   sombra 0 4px 16px rgba(22,51,0,.08) ......... utils/styles.ts floatingShadow
//   botao pilula, altura MINIMA 54 .............. components/Button.tsx
//   solido #9FE870 com texto #163300 ............ Button.tsx (nunca texto branco:
//                                                 brandGreen e claro demais)
//   hierarquia dos botoes ....................... src/domain/pesoDoBotao, a MESMA
//                                                 regra do dialogo do app (PR #32).
//                                                 ⚠️ Ate 16/09 este arquivo tinha a
//                                                 hierarquia INVERTIDA (cancelar vazado):
//                                                 o arquivo do Design pede cancelar
//                                                 SOLIDO e so o destrutivo vazado.
//   titulo/botao Archivo, corpo Inter ........... config fonts heading/body
//   SEM sombra no botao ......................... Button.tsx ("effect: NENHUMA"
//                                                 no Pencil)
//
// ⚠️ Altura MINIMA, nao cravada: o app honra o ajuste de fonte do aparelho, e
// caixa travada corta o rotulo quando a fonte cresce (DS4).
//
// Sem tema escuro: o app nao tem um. Inventar aqui criaria divergencia com as
// telas. O refinamento fino e da equipe de design — quando vier, muda so este
// arquivo e as 60 chamadas seguem iguais.

import { pesoDoBotao } from "../src/domain/pesoDoBotao";

const Z_INDEX = 99999;

function criarEstilo() {
  if (document.getElementById("vupth-alert-style")) return;
  const style = document.createElement("style");
  style.id = "vupth-alert-style";
  style.textContent = `
    .vupth-alert-backdrop {
      position: fixed; inset: 0; z-index: ${Z_INDEX};
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,.45); padding: 24px;
    }
    .vupth-alert-box {
      background: #FFFFFF; color: #163300;
      border-radius: 20px; padding: 24px;
      max-width: 420px; width: 100%;
      box-shadow: 0 4px 16px rgba(22,51,0,.08);
      font-family: Inter_400Regular, system-ui, -apple-system, sans-serif;
    }
    .vupth-alert-title {
      font-family: Archivo_700Bold, Inter_700Bold, system-ui, sans-serif;
      font-size: 18px; color: #163300; margin: 0 0 12px;
    }
    .vupth-alert-msg {
      font-size: 16px; line-height: 1.45; color: #454745;
      margin: 0; white-space: pre-wrap;
    }
    .vupth-alert-actions { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
    .vupth-alert-btn {
      font-family: Archivo_700Bold, Inter_700Bold, system-ui, sans-serif;
      font-size: 16px; cursor: pointer;
      min-height: 54px; padding: 8px 24px;
      border-radius: 9999px; border: 0;
    }
    /* Pintado pelo PESO, e o peso vem de src/domain/pesoDoBotao — a mesma
       regra do dialogo do app. Os dois nao voltam a divergir. */
    .vupth-alert-btn[data-peso="solido"] { background: #9FE870; color: #163300; }
    .vupth-alert-btn[data-peso="solido"]:hover { background: #8AD95C; }
    .vupth-alert-btn[data-peso="vazado"],
    .vupth-alert-btn[data-peso="vazado-perigo"] {
      background: transparent; color: #163300; border: 1.5px solid #163300;
    }
    /* So o ROTULO em danger: a borda continua forest. A acao sem volta fica
       disponivel sem chamar atencao — e o ponto inteiro da caixa. */
    .vupth-alert-btn[data-peso="vazado-perigo"] { color: #B3261E; }
    .vupth-alert-btn[data-peso="vazado"]:hover,
    .vupth-alert-btn[data-peso="vazado-perigo"]:hover { background: #E2F6D5; }
    .vupth-alert-btn:focus-visible { outline: 2px solid #163300; outline-offset: 2px; }
  `;
  document.head.appendChild(style);
}

// Mesma normalizacao do React Native: sem botoes, vira um "OK" sozinho.
export function normalizarBotoes(buttons) {
  if (!Array.isArray(buttons) || buttons.length === 0) return [{ text: "OK" }];
  return buttons;
}

export function alertWeb(title, message, buttons, options) {
  if (typeof document === "undefined") return;
  criarEstilo();

  const anterior = document.activeElement;
  const backdrop = document.createElement("div");
  backdrop.className = "vupth-alert-backdrop";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");

  const box = document.createElement("div");
  box.className = "vupth-alert-box";

  if (title) {
    const h = document.createElement("h2");
    h.className = "vupth-alert-title";
    h.textContent = String(title);
    box.appendChild(h);
    backdrop.setAttribute("aria-label", String(title));
  }
  if (message) {
    const p = document.createElement("p");
    p.className = "vupth-alert-msg";
    p.textContent = String(message);
    box.appendChild(p);
  }

  const acoes = document.createElement("div");
  acoes.className = "vupth-alert-actions";

  let fechado = false;
  function fechar(onPress) {
    if (fechado) return;
    fechado = true;
    document.removeEventListener("keydown", aoTeclar);
    backdrop.remove();
    if (anterior && typeof anterior.focus === "function") anterior.focus();
    // Depois de tirar da tela: se o callback estourar, o dialogo nao fica presa.
    if (typeof onPress === "function") onPress();
  }

  const lista = normalizarBotoes(buttons);
  const cancelavel = options?.cancelable !== false;
  const botaoCancelar = lista.find((b) => b?.style === "cancel");

  function aoTeclar(e) {
    if (e.key !== "Escape" || !cancelavel) return;
    fechar(botaoCancelar?.onPress ?? options?.onDismiss);
  }

  const comEstilo = lista.map((b) => ({ estilo: b?.style }));
  lista.forEach((b, i) => {
    const btn = document.createElement("button");
    btn.className = "vupth-alert-btn";
    btn.type = "button";
    if (b?.style) btn.dataset.style = b.style;
    btn.dataset.peso = pesoDoBotao(comEstilo, i);
    btn.textContent = b?.text ?? "OK";
    btn.onclick = () => fechar(b?.onPress);
    acoes.appendChild(btn);
  });

  box.appendChild(acoes);
  backdrop.appendChild(box);
  document.body.appendChild(backdrop);

  document.addEventListener("keydown", aoTeclar);
  // O ultimo botao e a acao principal no padrao do iOS, que o app segue.
  const principal = acoes.lastElementChild;
  if (principal && typeof principal.focus === "function") principal.focus();
}

// Troca o metodo no objeto que o react-native exporta: pega as 60 chamadas
// existentes e as que vierem depois, sem import novo em lugar nenhum.
export function instalarAlertWeb(Alert) {
  if (!Alert || Alert.__vupthWebAlert) return false;
  Alert.alert = alertWeb;
  Alert.__vupthWebAlert = true;
  return true;
}
