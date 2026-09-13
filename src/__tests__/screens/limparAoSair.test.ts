import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Feedback de device (Andre 2026-09-09): "se o usuario comeca a digitar um
// formulario das configuracoes e sai pra ir em outra tela, sem terminar, esse
// dado nao some ao voltar".
//
// O React Navigation mantem a tela MONTADA ao navegar para outra — e isso e
// proposital. O efeito colateral e que o que foi digitado e nao salvo continua
// vivo no `useState` depois de o usuario ter ido embora.
//
// ⚠️ O ganho maior nao e memoria, sao poucas strings: e que `EditPassword`
// guardava TRES senhas em texto, e elas ficavam la sem nada apagando.
//
// Montar cada tela exigiria mockar navegacao, servicos e nativos. Esta
// varredura custa milissegundos e pega o caso que importa: tela de formulario
// NOVA que nasca sem a limpeza.

const SCREENS_DIR = join(__dirname, '../../screens');

// Telas de formulario das Configuracoes. Uma tela nova entra aqui — e se
// esquecerem, o teste abaixo que varre `Edit*` pega sozinho.
const FORMULARIOS = ['EditPassword', 'EditEmail', 'EditProfile', 'EditAddress'];

describe('formulario abandonado nao sobrevive a saida da tela', () => {
  it.each(FORMULARIOS)('%s limpa ao perder o foco', (tela) => {
    const fonte = readFileSync(join(SCREENS_DIR, `${tela}.tsx`), 'utf8');
    expect(fonte).toMatch(/useLimparAoSair\(/);
  });

  it('toda tela Edit* das configuracoes esta coberta', () => {
    // Guarda contra tela nova: se alguem criar `EditTelefone.tsx` e esquecer a
    // limpeza, isto falha sem ninguem precisar lembrar de atualizar a lista.
    const edits = readdirSync(SCREENS_DIR)
      .filter((f) => /^Edit.*\.tsx$/.test(f))
      .map((f) => f.replace('.tsx', ''));
    const semLimpeza = edits.filter(
      (t) => !readFileSync(join(SCREENS_DIR, `${t}.tsx`), 'utf8').includes('useLimparAoSair'),
    );
    expect(semLimpeza).toEqual([]);
  });

  it('a senha volta a VAZIO; as telas que nascem preenchidas voltam ao valor do usuario', () => {
    // A distincao importa: esvaziar o EditEmail deixaria o campo em branco como
    // se o usuario nao tivesse e-mail.
    const senha = readFileSync(join(SCREENS_DIR, 'EditPassword.tsx'), 'utf8');
    const bloco = senha.slice(senha.indexOf('useLimparAoSair('), senha.indexOf('useLimparAoSair(') + 300);
    expect(bloco).toMatch(/setCurrentPassword\(""\)/);
    expect(bloco).toMatch(/setPassword\(""\)/);
    expect(bloco).toMatch(/setConfirmPassword\(""\)/);

    const email = readFileSync(join(SCREENS_DIR, 'EditEmail.tsx'), 'utf8');
    expect(email).toMatch(/useLimparAoSair\(\(\) => setEmail\(user\?\.email/);
  });
});
