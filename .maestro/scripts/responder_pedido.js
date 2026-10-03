// O profissional responde o pedido de corte pela API (o modal do Partner):
// pega o pedido PENDING mais novo e aceita (ACAO=accept) ou recusa (refuse).
//
// Entradas (env do runScript): API, SENHA, EMAIL_PROF, ACAO

function pedir(metodo, url, corpo, token) {
  var headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  var r = http.request(API + url, { method: metodo, headers: headers, body: corpo ? JSON.stringify(corpo) : undefined });
  if (r.status >= 300) throw new Error(metodo + " " + url + " -> " + r.status + " " + r.body);
  return r.body ? json(r.body) : null;
}

var token = pedir("POST", "/auth/login", { email: EMAIL_PROF, password: SENHA }).tokens.access_token;
var pendentes = pedir("GET", "/attendances/cut-requests", null, token);
if (!pendentes || pendentes.length === 0) throw new Error("nenhum pedido de corte pendente para o profissional");
pendentes.sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
pedir("PATCH", "/attendances/cut-requests/" + pendentes[0].id + "/" + ACAO, null, token);
output.PEDIDO_ID = pendentes[0].id;
