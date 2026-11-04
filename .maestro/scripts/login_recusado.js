// maestro-exclusao-de-conta (CLI-29, DEC-166): prova pela API que a conta excluida pelo app nao existe mais:
// o login com o mesmo e-mail e senha tem de ser recusado (4xx). 2xx = a conta ainda existe: a etapa falha.
//
// Entradas (env do runScript): API, SENHA, EMAIL_CLIENTE

var r = http.request(API + "/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: EMAIL_CLIENTE, password: SENHA }),
});
if (r.status < 400 || r.status >= 500) {
  throw new Error("POST /auth/login de " + EMAIL_CLIENTE + " -> " + r.status + " (esperado 4xx: conta excluida) " + r.body);
}
