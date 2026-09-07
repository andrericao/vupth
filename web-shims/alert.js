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
// ⚠️ O visual aqui e SOBRIO DE PROPOSITO. Identidade visual e da equipe de
// design; isto existe para que o aviso APARECA. Quando o design definir o
// dialogo do web, e este arquivo que muda — as 60 chamadas continuam iguais.

const Z_INDEX = 99999;

function criarEstilo() {
  if (document.getElementById("vupth-alert-style")) return;
  const style = document.createElement("style");
  style.id = "vupth-alert-style";
  style.textContent = `
    .vupth-alert-backdrop {
      position: fixed; inset: 0; z-index: ${Z_INDEX};
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,.45); padding: 16px;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    }
    .vupth-alert-box {
      background: #fff; color: #171717; border-radius: 14px;
      max-width: 420px; width: 100%; padding: 20px;
      box-shadow: 0 10px 40px rgba(0,0,0,.25);
    }
    .vupth-alert-title { font-size: 17px; font-weight: 700; margin: 0 0 6px; }
    .vupth-alert-msg { font-size: 15px; line-height: 1.45; margin: 0; white-space: pre-wrap; }
    .vupth-alert-actions {
      display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin-top: 18px;
    }
    .vupth-alert-btn {
      font: inherit; font-size: 15px; font-weight: 600; cursor: pointer;
      border: 0; border-radius: 10px; padding: 10px 16px;
      background: #16a34a; color: #fff;
    }
    .vupth-alert-btn[data-style="cancel"] { background: #e5e5e5; color: #171717; }
    .vupth-alert-btn[data-style="destructive"] { background: #dc2626; color: #fff; }
    .vupth-alert-btn:focus-visible { outline: 2px solid #0a0a0a; outline-offset: 2px; }
    @media (prefers-color-scheme: dark) {
      .vupth-alert-box { background: #171717; color: #fafafa; }
      .vupth-alert-btn[data-style="cancel"] { background: #404040; color: #fafafa; }
      .vupth-alert-btn:focus-visible { outline-color: #fafafa; }
    }
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

  lista.forEach((b) => {
    const btn = document.createElement("button");
    btn.className = "vupth-alert-btn";
    btn.type = "button";
    if (b?.style) btn.dataset.style = b.style;
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
