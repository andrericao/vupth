// Fecha a fila do profissional de teste pela API (o "fechar fila" do Partner):
// ele continua trabalhando, mas nao aceita cliente novo.
//
// Entradas (env do runScript): API, SENHA, EMAIL_PROF

function pedir(metodo, url, corpo, token) {
  var headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  var r = http.request(API + url, { method: metodo, headers: headers, body: corpo ? JSON.stringify(corpo) : undefined });
  if (r.status >= 300) throw new Error(metodo + " " + url + " -> " + r.status + " " + r.body);
  return r.body ? json(r.body) : null;
}

var token = pedir("POST", "/auth/login", { email: EMAIL_PROF, password: SENHA }).tokens.access_token;
pedir("PATCH", "/professional/me/accepting-new", { value: false }, token);
