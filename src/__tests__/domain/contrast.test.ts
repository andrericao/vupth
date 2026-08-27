import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { contraste, passaEmTexto } from '@domain/contrast';

// A ESCALA CINZA DESTE APP E INVERTIDA, e essa e a armadilha que ja custou
// tres regressoes: `gray300` (#5C6265) e MAIS ESCURO que `gray400` (#B9BBBC),
// que e mais escuro que `gray500`. Quem escreve `$gray400` esperando "cinza
// medio" acerta um cinza que some no branco.
const INVISIVEIS_COMO_TEXTO = ['$gray400', '$gray500', '$gray600', '$gray700'];

// Único uso legítimo: borda de radio DESABILITADO. A WCAG isenta controle
// desabilitado, e o baixo contraste ali E o sinal de "indisponivel".
const ISENTOS = new Set(['ChangeTurnModal.tsx']);

const MARCA = {
  brandGreen: '#9FE870',
  forest: '#163300',
  greenTint: '#E2F6D5',
  background: '#FFFFFF',
  surface: '#F3F5F1',
  textSecondary: '#454745',
  danger: '#B3261E',
  dangerTint: '#F7E4E2',
  warning: '#FFC091',
};

describe('contraste: a conta', () => {
  it('leva o ALPHA em conta — ignorá-lo é como um #16330099 vira "forest"', () => {
    expect(contraste('#163300', MARCA.brandGreen)).toBeCloseTo(9.45, 1);
    expect(contraste('#16330099', MARCA.brandGreen)).toBeCloseTo(3.39, 1); // 60% — reprova
    expect(contraste('#163300BF', MARCA.brandGreen)).toBeCloseTo(4.96, 1); // 74% — passa
  });

  it('é simétrica e vale 1:1 para a cor sobre ela mesma', () => {
    expect(contraste(MARCA.forest, MARCA.background)).toBeCloseTo(
      contraste(MARCA.background, MARCA.forest), 5,
    );
    expect(contraste(MARCA.forest, MARCA.forest)).toBeCloseTo(1, 5);
  });
});

describe('os pares que a marca declara passam no AA', () => {
  const PARES: [string, string, string][] = [
    ['texto secundário no branco', MARCA.textSecondary, MARCA.background],
    ['texto secundário no surface', MARCA.textSecondary, MARCA.surface],
    ['forest no branco', MARCA.forest, MARCA.background],
    ['forest no brand-green', MARCA.forest, MARCA.brandGreen],
    ['forest no green-tint', MARCA.forest, MARCA.greenTint],
    ['forest no pêssego (aviso)', MARCA.forest, MARCA.warning],
    ['forest no tint de perigo', MARCA.forest, MARCA.dangerTint],
    // A regra invertida da marca: sobre forest o par é brand-green, NUNCA branco.
    ['brand-green sobre forest', MARCA.brandGreen, MARCA.forest],
    ['danger no branco', MARCA.danger, MARCA.background],
    ['danger no surface', MARCA.danger, MARCA.surface],
  ];

  it.each(PARES)('%s', (_nome, frente, fundo) => {
    expect(passaEmTexto(frente, fundo)).toBe(true);
  });
});

describe('nenhuma tela usa como TEXTO um cinza que some', () => {
  const RAIZ = join(__dirname, '..', '..');

  function varrer(dir: string, achados: string[] = []): string[] {
    for (const nome of readdirSync(dir)) {
      const full = join(dir, nome);
      if (statSync(full).isDirectory()) {
        if (nome !== '__tests__' && nome !== 'node_modules') varrer(full, achados);
        continue;
      }
      if (!nome.endsWith('.tsx') || ISENTOS.has(nome)) continue;
      const fonte = readFileSync(full, 'utf-8');
      for (const token of INVISIVEIS_COMO_TEXTO) {
        // só `color=` — o mesmo token como fundo ou borda é legítimo
        const re = new RegExp(`color=["{]\\s*["']?\\${token}`);
        if (re.test(fonte)) achados.push(`${nome}: color=${token}`);
      }
    }
    return achados;
  }

  it('a varredura não acha nenhum', () => {
    expect(varrer(RAIZ)).toEqual([]);
  });
});
