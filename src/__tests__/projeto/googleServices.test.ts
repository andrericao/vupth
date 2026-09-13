import fs from 'fs';
import path from 'path';

// O `google-services.json` e o que permite ao app pedir o token de push ao FCM.
// Ele vive DENTRO do binario — nao sai por OTA —, entao todo erro aqui so
// aparece depois de um build, num aparelho, sem mensagem que aponte a causa.
//
// Dois erros ja aconteceram de verdade montando este arquivo (11/09):
//
//   · baixar com UM app registrado. O arquivo traz TODOS os apps do projeto, e
//     baixar cedo produz um que cobre so a producao — o `dev` e o `preview`,
//     que e onde se testa, ficariam mudos.
//   · digitar `com.vutph.partner.dev` no lugar de `com.vupth.partner.dev`.
//     Mesmas letras, ordem trocada; sobrevive a qualquer leitura rapida.
//
// Por isso a conferencia e automatica: os packages do arquivo tem de ser
// exatamente os que o `app.config.js` gera.

const RAIZ = path.resolve(__dirname, '../../..');

function packagesDoArquivo(): string[] {
  const bruto = JSON.parse(fs.readFileSync(path.join(RAIZ, 'google-services.json'), 'utf8'));
  return bruto.client.map(
    (c: { client_info: { android_client_info: { package_name: string } } }) =>
      c.client_info.android_client_info.package_name,
  );
}

function packagesEsperados(): string[] {
  const base = JSON.parse(fs.readFileSync(path.join(RAIZ, 'app.json'), 'utf8')).expo.android.package;
  const sufixos = [...fs.readFileSync(path.join(RAIZ, 'app.config.js'), 'utf8').matchAll(/sufixo: "(\.[a-z]+)"/g)].map(
    (m) => m[1],
  );
  return [base, ...sufixos.map((s) => base + s)];
}

describe('o google-services.json cobre todos os apps deste repo', () => {
  it('existe na raiz — sem ele o build sai sem push', () => {
    expect(fs.existsSync(path.join(RAIZ, 'google-services.json'))).toBe(true);
  });

  it('o app.json aponta para ele', () => {
    const app = JSON.parse(fs.readFileSync(path.join(RAIZ, 'app.json'), 'utf8')).expo;
    expect(app.android.googleServicesFile).toBe('./google-services.json');
  });

  it('cobre o package de producao E o de cada variante de teste', () => {
    // A falha que isto pega: arquivo baixado antes de registrar as variantes.
    // O build passa, o app instala, e so o push some — no ambiente de teste.
    const noArquivo = packagesDoArquivo();
    for (const esperado of packagesEsperados()) {
      expect(noArquivo).toContain(esperado);
    }
  });

  it('nenhum package do arquivo tem erro de digitacao no dominio', () => {
    // `com.vutph.partner.dev` passou por aqui em 11/09.
    const suspeitos = packagesDoArquivo().filter((p) => !p.startsWith('com.vupth.'));
    expect(suspeitos).toEqual([]);
  });

  it('o projeto do Firebase e o mesmo para todos', () => {
    const bruto = JSON.parse(fs.readFileSync(path.join(RAIZ, 'google-services.json'), 'utf8'));
    expect(bruto.project_info.project_id).toBeTruthy();
  });
});
