// Copiar para a area de transferencia (Andre, 26/09: base da indicacao — o
// cliente que indicar vai ganhar desconto).
//
// O `expo-clipboard` e NATIVO: so existe no APK gerado depois dele. O APK que
// esta no aparelho recebe este codigo por OTA e NAO tem o modulo — importar no
// topo derrubaria o app ao abrir. Por isso o require fica aqui dentro, protegido,
// e quem chama cai no compartilhar do sistema quando nao da para copiar.

type Clipboard = { setStringAsync: (texto: string) => Promise<boolean | void> };

export function carregarClipboard(): Clipboard | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("expo-clipboard") as Clipboard;
    return mod && typeof mod.setStringAsync === "function" ? mod : null;
  } catch {
    return null;
  }
}

/** Copia o texto. `false` = este binario nao sabe copiar (ou falhou). */
export async function copiarTexto(texto: string, clipboard: Clipboard | null = carregarClipboard()): Promise<boolean> {
  if (!clipboard) return false;
  try {
    const ok = await clipboard.setStringAsync(texto);
    return ok !== false;
  } catch {
    return false;
  }
}
