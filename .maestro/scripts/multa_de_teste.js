// Semeia uma multa pendente na conta de teste do Client (contestar-multa, Backend 68455a1): POST /test/penalties
// com o token da conta, sem corpo: 201 {penalty_id, amount, created_at}. A rota so existe no staging; se a
// resposta for 404 (rota ainda sem deploy), a etapa pula (PULADO-MULTA), nao falha.
//
// Entradas (env do runScript): API, SENHA, EMAIL_CLIENTE
// Saidas (output): MULTA_OK = "1" ou "0"; MULTA_ID

output.MULTA_OK = "0";
output.MULTA_ID = "";
var headers = { "Content-Type": "application/json" };
var login = http.request(API + "/auth/login", {
  method: "POST",
  headers: headers,
  body: JSON.stringify({ email: EMAIL_CLIENTE, password: SENHA }),
});
if (login.status >= 300) throw new Error("POST /auth/login -> " + login.status + " " + login.body);
var token = json(login.body).tokens.access_token;
var r = http.request(API + "/test/penalties", {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
});
if (r.status === 201) {
  output.MULTA_ID = json(r.body).penalty_id;
  output.MULTA_OK = "1";
} else if (r.status !== 404) {
  throw new Error("POST /test/penalties -> " + r.status + " " + r.body);
}
