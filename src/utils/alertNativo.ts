import { Alert, Platform } from "react-native";

import { abrirDialogo, useDialogoStore } from "@stores/dialogo.store";

// O mesmo truque do shim da web, do lado de cá.
//
// 🔴 "o modal de aviso na versão web tá melhor que o modal do apk, quero que
// também acompanhe o design do app" (08/09). O `Alert` nativo é do sistema
// operacional e não aceita tema — seguir o desenho exige um modal nosso. Mas são
// ~100 chamadas em 29 arquivos: trocar uma a uma seria refazer o trabalho que o
// shim da web evitou, e a próxima chamada escrita voltaria ao Alert do sistema.
//
// Então: substituir o método no objeto que o `react-native` exporta. As 100
// chamadas continuam iguais e passam a desenhar a caixa da marca.
//
// ⚠️ REDE OBRIGATÓRIA: se o host (`DialogoVupth`) não estiver montado, cai no
// Alert ORIGINAL. Um app que trocou o diálogo por um modal que ninguém desenha
// fica MUDO — que é exatamente o defeito que estávamos consertando na web. Feio
// e visível é melhor que bonito e invisível.
type Alvo = {
  alert: typeof Alert.alert;
  __vupthDialogo?: boolean;
  __vupthAlertOriginal?: typeof Alert.alert;
};

export function dialogoNativoInstalado(alvo: Alvo = Alert as unknown as Alvo): boolean {
  return alvo.__vupthDialogo === true;
}

export function instalarDialogoNativo(deps: {
  plataforma?: typeof Platform.OS;
  alvo?: Alvo;
  hostMontado?: () => boolean;
} = {}): boolean {
  const plataforma = deps.plataforma ?? Platform.OS;
  // Na web quem desenha é o shim (`web-shims/alert.js`), com o MESMO desenho.
  if (plataforma === "web") return false;

  const alvo = deps.alvo ?? (Alert as unknown as Alvo);
  if (alvo.__vupthDialogo) return true;

  const original = alvo.alert;
  const hostMontado = deps.hostMontado ?? (() => useDialogoStore.getState().hostMontado);

  alvo.__vupthAlertOriginal = original;
  alvo.alert = ((titulo: string, mensagem?: string, botoes?: any[]) => {
    if (!hostMontado()) {
      original(titulo, mensagem, botoes);
      return;
    }
    const lista = botoes && botoes.length > 0 ? botoes : [{ text: "OK" }];
    abrirDialogo({
      titulo,
      mensagem,
      botoes: lista.map((b) => ({ texto: b?.text ?? "OK", estilo: b?.style ?? "default" })),
    }).then((indice) => lista[indice]?.onPress?.());
  }) as typeof Alert.alert;
  alvo.__vupthDialogo = true;
  return true;
}
