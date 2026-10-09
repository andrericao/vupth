#!/usr/bin/env node
// Catraca da cobertura (DEC-7, Andre 02/10): depois do `npm run test:coverage`,
// o minimo do coverageThreshold sobe para o valor medido (arredondado para
// baixo) e NUNCA desce. Le coverage/coverage-summary.json (reporter
// json-summary) e reescreve o jest.coverageThreshold.global do package.json.
//
//   npm run test:coverage && npm run coverage:catraca

const fs = require('fs');
const path = require('path');

const METRICAS = ['lines', 'branches', 'functions', 'statements'];

/** O novo minimo: o maior entre o atual e o medido (inteiro, para baixo). */
function subirCatraca(atual, medido) {
  const novo = {};
  for (const m of METRICAS) {
    const antes = Number(atual?.[m] ?? 0);
    const agora = Math.floor(Number(medido?.[m]?.pct ?? 0));
    novo[m] = Math.max(antes, agora);
  }
  return novo;
}

function main(raiz = path.join(__dirname, '..')) {
  const resumo = path.join(raiz, 'coverage', 'coverage-summary.json');
  if (!fs.existsSync(resumo)) {
    console.error('Sem coverage/coverage-summary.json — rode antes: npm run test:coverage');
    process.exit(1);
  }
  const medido = JSON.parse(fs.readFileSync(resumo, 'utf8')).total;
  const pkgPath = path.join(raiz, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const atual = pkg.jest.coverageThreshold?.global ?? {};
  const novo = subirCatraca(atual, medido);
  pkg.jest.coverageThreshold = { global: novo };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  for (const m of METRICAS) {
    console.log(`${m.padEnd(10)} medido ${String(medido[m].pct).padStart(6)}%  minimo ${atual[m] ?? 0} -> ${novo[m]}`);
  }
}

if (require.main === module) main();

module.exports = { subirCatraca, METRICAS, main };
