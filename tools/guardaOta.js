// ota-so-compativel (DEC-152): o guarda que roda ANTES de cada `eas update`.
// Compara o fingerprint nativo do projeto com o do build instalado (fingerprint-do-build.json) e, se mudou, NAO deixa
// publicar: o OTA iria para um app sem o modulo nativo dele (tela branca). Falha fechado: se nao consegue comparar,
// tambem nao publica.
//
// Uso:   node tools/guardaOta.js            (sai 0 = pode publicar; 1 = mudou o nativo; 2 = nao consegui comparar)
// Build novo? Instale-o, gere a base e commite:   node tools/guardaOta.js --atualizar-base <id-do-build>
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const BASE = path.join(RAIZ, 'fingerprint-do-build.json');

/** {tipo:chave -> hash} a partir da lista `sources` do @expo/fingerprint. */
function mapaDeFontes(sources) {
  const mapa = {};
  for (const s of sources) {
    mapa[`${s.type}:${s.filePath || s.id || s.name}`] = s.hash;
  }
  return mapa;
}

/** O que mudou entre a base (do build instalado) e o projeto de agora. */
function diferencas(base, atual) {
  const mudou = [];
  for (const k of Object.keys(atual)) {
    if (!(k in base)) mudou.push(`novo: ${k}`);
    else if (base[k] !== atual[k]) mudou.push(`mudou: ${k}`);
  }
  for (const k of Object.keys(base)) if (!(k in atual)) mudou.push(`saiu: ${k}`);
  return mudou.sort();
}

/** Decide: { ok, motivo, mudancas }. Falha fechado em qualquer entrada invalida. */
function decidir(base, atualFingerprint) {
  if (!base || typeof base.hash !== 'string' || !base.fontes) {
    return { ok: false, codigo: 2, motivo: 'sem base do build (fingerprint-do-build.json invalido ou ausente)', mudancas: [] };
  }
  if (!atualFingerprint || typeof atualFingerprint.hash !== 'string' || !Array.isArray(atualFingerprint.sources)) {
    return { ok: false, codigo: 2, motivo: 'nao consegui gerar o fingerprint do projeto', mudancas: [] };
  }
  if (atualFingerprint.hash === base.hash) return { ok: true, codigo: 0, motivo: 'o nativo e o mesmo do build instalado', mudancas: [] };
  const mudancas = diferencas(base.fontes, mapaDeFontes(atualFingerprint.sources));
  return {
    ok: false,
    codigo: 1,
    motivo: 'o projeto nativo mudou desde o build instalado: o OTA NAO sera publicado, falta um build novo',
    mudancas,
  };
}

function gerarFingerprint() {
  const bin = path.join(RAIZ, 'node_modules', '.bin', 'fingerprint');
  const saida = execFileSync(bin, ['fingerprint:generate', '--platform', 'android'], { cwd: RAIZ, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(saida);
}

function principal(argv) {
  try {
    if (argv[0] === '--atualizar-base') {
      const fp = gerarFingerprint();
      const base = { hash: fp.hash, buildId: argv[1] || null, geradoEm: new Date().toISOString(), fontes: mapaDeFontes(fp.sources) };
      fs.writeFileSync(BASE, JSON.stringify(base, null, 2) + '\n');
      console.log(`base gravada: ${fp.hash} (build ${base.buildId ?? '?'})`);
      return 0;
    }
    let base = null;
    try {
      base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
    } catch {
      base = null;
    }
    let fp = null;
    try {
      fp = gerarFingerprint();
    } catch {
      fp = null;
    }
    const r = decidir(base, fp);
    if (r.ok) console.log(`OK: ${r.motivo}.`);
    else {
      console.error(`BLOQUEADO: ${r.motivo}.`);
      for (const m of r.mudancas) console.error(`  - ${m}`);
    }
    return r.codigo;
  } catch (e) {
    console.error(`BLOQUEADO: erro inesperado (${e && e.message}).`);
    return 2;
  }
}

module.exports = { mapaDeFontes, diferencas, decidir };
if (require.main === module) process.exit(principal(process.argv.slice(2)));
