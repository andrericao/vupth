import { Alert, type AlertButton, type AlertOptions } from "react-native";

import { abrirArtigo, type Artigo } from "@utils/artigosDoSuporte";

// `Alert.alert` com "Saiba mais" como ULTIMO botao, depois dos de sempre.
//
// Por que por ultimo: a bateria Maestro acha os botoes pelo indice
// (`dialogo-botao-0`, `-1`...). Com o "Saiba mais" no meio, o indice da acao
// mudaria e a bateria passaria a tocar no navegador. No fim, nada que ja existia
// muda de lugar.
//
// "Saiba mais" nao confirma nem cancela: abre o artigo e MOSTRA O AVISO DE NOVO,
// que continua valendo quando a pessoa volta. Fechar a caixa ao tocar nele
// faria o aviso de ciencia ("o toque E o registro de que ele soube") sumir sem
// ninguem ter respondido.
//
// O estilo: o aviso comum da marca pinta de solido todo botao "default" quando nao ha
// destrutivo, e um terceiro solido tiraria o peso da acao. Entao ele vai como
// "cancel" (vazado) — a menos que a caixa ja tenha um cancel (o iOS nativo so
// aceita um) ou um destrutivo (a cor do cancel muda de papel ali).
export function comSaibaMais(botoes: AlertButton[], artigo: Artigo, reabrir: () => void): AlertButton[] {
  const temCancel = botoes.some((b) => b.style === "cancel");
  const temDestrutivo = botoes.some((b) => b.style === "destructive");
  return [
    ...botoes,
    {
      text: "Saiba mais",
      style: temCancel || temDestrutivo ? "default" : "cancel",
      onPress: () => {
        void abrirArtigo(artigo);
        reabrir();
      },
    },
  ];
}

export function alertaComArtigo(
  titulo: string,
  mensagem: string | undefined,
  botoes: AlertButton[],
  artigo: Artigo,
  opcoes?: AlertOptions,
): void {
  Alert.alert(
    titulo,
    mensagem,
    comSaibaMais(botoes, artigo, () => alertaComArtigo(titulo, mensagem, botoes, artigo, opcoes)),
    opcoes,
  );
}
