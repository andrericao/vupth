// Para a bateria se o app no aparelho nao roda o commit esperado (Andre, 03/10).
// O texto vem do copyTextFrom da versao do Perfil ("Versão 1.0.3 · 03/10/2026 · c65338e7").
//
// Entrada (env da bateria): COMMIT

// COMMIT pode ser uma lista "a|b" (o esperado e os chore(logs) filhos dele): vale qualquer um.
var esperado = (typeof COMMIT === "undefined" || COMMIT == null ? "" : String(COMMIT)).trim().toLowerCase();
var instalado = String(maestro.copiedText || "");

// Sem COMMIT (rodada fora da bateria.sh, 03/10): nao trava a bateria — avisa
// que a versao nao foi conferida e segue.
if (!esperado) {
  console.log(
    "AVISO: versao NAO conferida (sem COMMIT). Instalado: \"" + instalado +
      "\". Para conferir, rode pela bateria.sh: bash .maestro/bateria.sh"
  );
} else if (!esperado.split("|").some(function (h) { return h && instalado.toLowerCase().indexOf(h) >= 0; })) {
  throw new Error(
    "Versao errada no aparelho. Instalado: \"" + instalado + "\". Esperado: o commit " + esperado +
      ". Instale o APK certo ou espere o OTA da dev e rode de novo."
  );
}
