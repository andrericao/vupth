// Fecha a fila do profissional de teste pela API (o "fechar fila" do Partner):
// ele continua trabalhando, mas nao aceita cliente novo.
//
// Fila VAZIA fechada vira OFF (regra do Andre de 22/07, Backend 4f817a0): o
// profissional sai do expediente e a loja fecha. Com alguem na fila ele segue
// WORKING ("Fila fechada") ate o ultimo atendimento. Por isso, antes de fechar,
// um segundo cliente (fila_c<TAG>, so pela API) entra na fila dele.
//
// Entradas (env do runScript): API, SENHA, EMAIL_PROF, TAG, PROF_ID, LOJA_ID, SERVICO_ID

function pedir(metodo, url, corpo, token) {
  var headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  var r = http.request(API + url, { method: metodo, headers: headers, body: corpo ? JSON.stringify(corpo) : undefined });
  if (r.status >= 300) throw new Error(metodo + " " + url + " -> " + r.status + " " + r.body);
  return r.body ? json(r.body) : null;
}

var emailFila = "fila_c" + TAG + "@teste.com";
pedir("POST", "/auth/register", { email: emailFila, password: SENHA });
var tokenFila = pedir("POST", "/auth/login", { email: emailFila, password: SENHA }).tokens.access_token;
pedir("PATCH", "/profile/general-infos", { first_name: "Na fila" }, tokenFila);
pedir("POST", "/attendances", { professionalId: PROF_ID, establishmentId: LOJA_ID, serviceItemIds: [SERVICO_ID] }, tokenFila);

var token = pedir("POST", "/auth/login", { email: EMAIL_PROF, password: SENHA }).tokens.access_token;
pedir("PATCH", "/professional/me/accepting-new", { value: false }, token);
