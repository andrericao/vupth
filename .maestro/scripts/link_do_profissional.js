// teste-link-de-participacao (CLI-3, 05/11): o profissional da loja de teste participa da campanha de link
// (o mesmo POST /campaigns/{id}/join do "Participar" do Partner) e devolve o link pessoal dele, no esquema do
// app (vupth://i/<codigo>?c=<campanha>), que o openLink do Maestro abre no Client.
// No fim da etapa, o mesmo script le o GET /referrals/me do profissional (ACAO=conferir).
//
// Entradas (env do runScript): API, SENHA, EMAIL_PROF, NOME_CAMPANHA, ACAO ("participar" | "conferir")
//   conferir: CAMPANHA_ID
// Saidas (output):
//   participar: EXISTE = "1" ou "0"; LINK; CAMPANHA_ID; INDICADOS_ANTES
//   conferir:   INDICADOS (os indicados do profissional nesta campanha)

function pedir(metodo, url, corpo, token) {
  var headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;
  var r = null;
  for (var vez = 0; vez < 4; vez++) {
    r = http.request(API + url, { method: metodo, headers: headers, body: corpo ? JSON.stringify(corpo) : (metodo === "GET" ? undefined : "{}") });
    if (r.status !== 429 || vez === 3) break;
    var n = /in (\d+) s/.exec(r.body || "");
    var ate = Date.now() + ((n ? parseInt(n[1], 10) : 30) + 2) * 1000;
    while (Date.now() < ate) {}
  }
  return r;
}

function corpoOk(r, oQue) {
  if (r.status >= 300) throw new Error(oQue + " -> " + r.status + " " + r.body);
  return r.body ? json(r.body) : null;
}

function campanhaNoMe(me, id) {
  var lista = (me && me.campaigns) || [];
  for (var i = 0; i < lista.length; i++) {
    if (lista[i].campaign_id === id) return lista[i];
  }
  return null;
}

var token = corpoOk(pedir("POST", "/auth/login", { email: EMAIL_PROF, password: SENHA }), "login do profissional").tokens.access_token;

if (ACAO === "participar") {
  output.EXISTE = "0";
  var ativas = corpoOk(pedir("GET", "/campaigns/active", null, token), "GET /campaigns/active") || [];
  var campanha = null;
  for (var i = 0; i < ativas.length; i++) {
    if (ativas[i].name === NOME_CAMPANHA) campanha = ativas[i];
  }
  if (campanha) {
    // 409 = ja participa: segue com o link que ja existe
    var entrou = pedir("POST", "/campaigns/" + campanha.id + "/join", null, token);
    if (entrou.status >= 300 && entrou.status !== 409) throw new Error("join -> " + entrou.status + " " + entrou.body);
    var me = corpoOk(pedir("GET", "/referrals/me", null, token), "GET /referrals/me");
    var doLink = campanhaNoMe(me, campanha.id);
    var codigo = /\/i\/([A-Za-z0-9_-]{3,64})/.exec((doLink && doLink.link) || (me && me.link) || "");
    if (!codigo && me && me.code) codigo = [null, me.code];
    if (!codigo) throw new Error("o profissional participa, mas o /referrals/me nao trouxe o link: " + JSON.stringify(me));
    output.EXISTE = "1";
    output.CAMPANHA_ID = campanha.id;
    output.LINK = "vupth://i/" + codigo[1] + "?c=" + campanha.id;
    output.INDICADOS_ANTES = String((doLink && doLink.referred_clients) || 0);
    console.log("LINK-DO-PROFISSIONAL: " + output.LINK + " (indicados antes: " + output.INDICADOS_ANTES + ")");
  } else {
    console.log("CAMPANHA-FORA-DO-AR: " + NOME_CAMPANHA);
  }
} else if (ACAO === "conferir") {
  // O claim do app e assincrono (sai logo depois do login): espera ate 45 s o indicado aparecer.
  var antes = parseInt(typeof INDICADOS_ANTES !== "undefined" && INDICADOS_ANTES ? INDICADOS_ANTES : "0", 10);
  var limite = Date.now() + 45000;
  var depois = null;
  var nela = null;
  do {
    depois = corpoOk(pedir("GET", "/referrals/me", null, token), "GET /referrals/me");
    nela = campanhaNoMe(depois, CAMPANHA_ID);
    if (((nela && nela.referred_clients) || 0) > antes) break;
    var pausa = Date.now() + 3000;
    while (Date.now() < pausa) {}
  } while (Date.now() < limite);
  output.INDICADOS = String((nela && nela.referred_clients) || 0);
  output.COM_GANHO = String((nela && nela.credited_clients) || 0);
  console.log("INDICACOES-DO-PROFISSIONAL: " + JSON.stringify(depois));
} else {
  throw new Error("ACAO deve ser participar ou conferir, veio: " + ACAO);
}
