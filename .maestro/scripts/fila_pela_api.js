// O cliente entra ou sai da fila pela API (push-na-bateria): com o app
// FECHADO, o push so pode vir de algo feito fora dele.
//
// Entradas (env do runScript): API, SENHA, EMAIL_CLIENTE, ACAO ("entrar"|"sair")
//   entrar: PROF_ID, LOJA_ID, SERVICO_ID — saida: output.ATENDIMENTO_ID
//   sair:   ATENDIMENTO_ID (dentro da tolerancia, sem multa)

// PATCH/PUT sem corpo: o http do Maestro (OkHttp) recusa ("method PATCH must
// have a request body", bateria 09/10 20:30, 10.07) — vai um "{}".
function pedir(metodo, url, corpo, token) {
  var headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  var r = http.request(API + url, { method: metodo, headers: headers, body: corpo ? JSON.stringify(corpo) : (metodo === "GET" ? undefined : "{}") });
  if (r.status >= 300) throw new Error(metodo + " " + url + " -> " + r.status + " " + r.body);
  return r.body ? json(r.body) : null;
}

var token = pedir("POST", "/auth/login", { email: EMAIL_CLIENTE, password: SENHA }).tokens.access_token;
if (ACAO === "entrar") {
  var at = pedir("POST", "/attendances", {
    professionalId: PROF_ID,
    establishmentId: LOJA_ID,
    serviceItemIds: [SERVICO_ID]
  }, token);
  output.ATENDIMENTO_ID = at.id;
} else if (ACAO === "sair") {
  pedir("PUT", "/attendances/" + ATENDIMENTO_ID + "/cancel", null, token);
} else {
  throw new Error("ACAO deve ser entrar ou sair, veio: " + ACAO);
}
