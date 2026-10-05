// Cria, pela API do staging, a conta do cliente de uma etapa avulsa
// (bateria-nao-para): cada etapa roda sozinha e nao herda o cadastro da 02.
// Ja com o nome, para o login nao parar na tela "Como podemos te chamar?".
//
// Entradas (env do runScript): API, SENHA, EMAIL_CLIENTE, NOME_CLIENTE

function pedir(metodo, url, corpo, token) {
  var headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  var r = http.request(API + url, { method: metodo, headers: headers, body: corpo ? JSON.stringify(corpo) : undefined });
  if (r.status >= 300) throw new Error(metodo + " " + url + " -> " + r.status + " " + r.body);
  return r.body ? json(r.body) : null;
}

pedir("POST", "/auth/register", { email: EMAIL_CLIENTE, password: SENHA });
var token = pedir("POST", "/auth/login", { email: EMAIL_CLIENTE, password: SENHA }).tokens.access_token;
pedir("PATCH", "/profile/general-infos", { first_name: NOME_CLIENTE }, token);
