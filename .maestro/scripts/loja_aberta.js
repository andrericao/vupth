// Monta, pela API do staging, uma loja ABERTA com um profissional TRABALHANDO
// e um servico — o papel do app do Partner, para a bateria do client nao
// depender dele. Solo shop: o dono e o proprio profissional.
//
// Entradas (env do runScript): API, SENHA, TAG
// Saidas: output.LOJA, output.LOJA_ID, output.PROF, output.PROF_ID,
//         output.SERVICO_ID, output.EMAIL_PROF

function pedir(metodo, url, corpo, token) {
  var headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  var r = http.request(API + url, { method: metodo, headers: headers, body: corpo ? JSON.stringify(corpo) : undefined });
  if (r.status >= 300) throw new Error(metodo + " " + url + " -> " + r.status + " " + r.body);
  return r.body ? json(r.body) : null;
}

// Cada papel novo (OWNER, PROFESSIONAL) so vale no token depois do refresh.
function renovar(refresh) {
  return pedir("POST", "/auth/refresh", { refresh_token: refresh });
}

var loja = "Loja C" + TAG;
var prof = "Prof" + TAG;
var email = "prop_c" + TAG + "@teste.com";

pedir("POST", "/auth/register", { email: email, password: SENHA });
var sessao = pedir("POST", "/auth/login", { email: email, password: SENHA }).tokens;

var est = pedir("POST", "/establishment/quick-create", { name: loja, serviceType: "BARBER" }, sessao.access_token);
sessao = renovar(sessao.refresh_token);

// Sem horario a loja nao abre (422 ESTABLISHMENT_HOURS_REQUIRED). O dia todo,
// para a bateria rodar a qualquer hora — menos perto da meia-noite.
pedir("PATCH", "/establishment/" + est.id + "/general-infos", { opening_time: "00:00", closing_time: "23:59" }, sessao.access_token);

var p = pedir("POST", "/professional/quick-create", { name: prof, establishmentId: est.id, specialty: "Corte" }, sessao.access_token);
sessao = renovar(sessao.refresh_token);

var servico = pedir("POST", "/establishment/" + est.id + "/service-items", {
  establishmentId: est.id,
  serviceItemType: "CORTE_MAQUINA",
  customName: "Corte " + TAG,
  price: 40.0,
  estimatedMinutes: 30
}, sessao.access_token);

// Trabalhando: a loja abre sozinha (open_status derivado, S1 fatia 2).
pedir("PATCH", "/professional/me/status", { status: "WORKING" }, sessao.access_token);

output.LOJA = loja;
output.LOJA_ID = est.id;
output.PROF = prof;
output.PROF_ID = p.id;
output.SERVICO_ID = servico.id;
output.EMAIL_PROF = email;
