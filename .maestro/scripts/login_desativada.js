// maestro-excluir-conta (DEC-184): prova pela API que a conta desativada pelo app ficou desativada:
// o login ainda entra (2xx), mas a resposta traz deactivated=true. Sem isso, a etapa falha.
//
// Entradas (env do runScript): API, SENHA, EMAIL_CLIENTE

var r = http.request(API + "/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL_CLIENTE, password: SENHA }),
});
if (r.status < 200 || r.status >= 300) {
  throw new Error("POST /auth/login de " + EMAIL_CLIENTE + " -> " + r.status + " (esperado 2xx: conta desativada ainda entra) " + r.body);
}
var corpo = JSON.parse(r.body);
if (corpo.deactivated !== true) {
  throw new Error("POST /auth/login de " + EMAIL_CLIENTE + ": deactivated=" + corpo.deactivated + " (esperado true) " + r.body);
}
