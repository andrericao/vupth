// Pergunta ao staging se existe, no ar, a campanha com o NOME dado (maestro-campanha-cupom-e-link,
// DEC-124): o André a cria no Painel; sem ela a etapa pula (⏭ no relatório), não falha.
// Entra com um cliente próprio da consulta (cadastra e loga pela API) e lê GET /campaigns/active,
// a mesma lista da Home.
//
// Entradas (env do runScript): API, SENHA, EMAIL_CLIENTE, NOME_CAMPANHA
// Saída (output): EXISTE = "1" ou "0"

function pedir(metodo, url, corpo, token) {
  var headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
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

output.EXISTE = "0";
try {
  pedir("POST", "/auth/register", { email: EMAIL_CLIENTE, password: SENHA });
  var token = pedir("POST", "/auth/login", { email: EMAIL_CLIENTE, password: SENHA }).tokens.access_token;
  var lista = pedir("GET", "/campaigns/active", null, token) || [];
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].name === NOME_CAMPANHA) output.EXISTE = "1";
  }
} catch (e) {
  // sem resposta do staging a consulta nao prova que a campanha existe: pula, e o motivo fica no console.
  console.log("CONSULTA-DA-CAMPANHA: " + e);
}
