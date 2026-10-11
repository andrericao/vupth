// Poe o profissional de teste em "Fora" pela API (as pills de status do
// Partner): a loja fecha, e o cliente so pode pedir o corte (DEC-27).
//
// Entradas (env do runScript): API, SENHA, EMAIL_PROF

function pedir(metodo, url, corpo, token) {
  var headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  // 429 do staging (limite de logins, baterias seguidas — Partner, 11/10): espera
  // o tempo que ele pede ("try again in N s") e tenta de novo, ate 3 vezes.
  var r = null;
  for (var vez = 0; vez < 4; vez++) {
    r = http.request(API + url, { method: metodo, headers: headers, body: corpo ? JSON.stringify(corpo) : undefined });
    if (r.status !== 429 || vez === 3) break;
    var n = /in (\d+) s/.exec(r.body || "");
    var ate = Date.now() + ((n ? parseInt(n[1], 10) : 30) + 2) * 1000;
    while (Date.now() < ate) {}
  }
  if (r.status >= 300) throw new Error(metodo + " " + url + " -> " + r.status + " " + r.body);
  return r.body ? json(r.body) : null;
}

var token = pedir("POST", "/auth/login", { email: EMAIL_PROF, password: SENHA }).tokens.access_token;
pedir("PATCH", "/professional/me/status", { status: "OFF" }, token);
