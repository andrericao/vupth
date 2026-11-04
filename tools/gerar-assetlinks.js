// abrir-no-app-se-instalado (DEC-161/180): gera o /.well-known/assetlinks.json
// do site, que o Android confere (autoVerify) para abrir os links de
// https://app.vupth.com direto no app de producao.
//
// O SHA-256 do certificado NAO fica no repositorio: vem da variavel
// ASSETLINKS_SHA256 (um ou mais, separados por virgula), que o Andre poe no
// build web de producao (passo a passo na aba Dominio do vupth-docs). Sem a
// variavel, nao gera nada: o preview e o dev seguem sem o arquivo.
//
// Uso: node tools/gerar-assetlinks.js [pasta-de-saida]   (padrao: dist)
const fs = require("fs");
const path = require("path");

const PACOTE = "com.vupth.client";
const SHA256 = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

function digitais(valor) {
  const lista = (valor ?? "")
    .split(",")
    .map((d) => d.trim().toUpperCase())
    .filter(Boolean);
  const ruins = lista.filter((d) => !SHA256.test(d));
  if (ruins.length) throw new Error(`ASSETLINKS_SHA256 invalido: ${ruins.join(", ")}`);
  return lista;
}

function assetlinks(lista) {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: PACOTE, sha256_cert_fingerprints: lista },
    },
  ];
}

function gerar(saida, valor) {
  const lista = digitais(valor);
  if (!lista.length) return null;
  const pasta = path.join(saida, ".well-known");
  fs.mkdirSync(pasta, { recursive: true });
  const arquivo = path.join(pasta, "assetlinks.json");
  fs.writeFileSync(arquivo, `${JSON.stringify(assetlinks(lista), null, 2)}\n`);
  return arquivo;
}

module.exports = { digitais, assetlinks, gerar, PACOTE };

if (require.main === module) {
  const arquivo = gerar(process.argv[2] ?? "dist", process.env.ASSETLINKS_SHA256);
  console.log(arquivo ? `assetlinks: ${arquivo}` : "assetlinks: sem ASSETLINKS_SHA256, nada gerado");
}
