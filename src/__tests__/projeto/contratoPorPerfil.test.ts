import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

// ler-o-contrato-por-perfil (Backend 45d01eb, DEC-94): o relatório passou a sair
// por perfil. A lista do cliente (GET /attendances/client/me, /attendances?clientId=
// e /clients/me/pending-penalties) NÃO traz mais o que é de quem recebe: o valor do
// profissional, a taxa da empresa de pagamento e a parte do app, nem o corte
// delas em cada multa. Um tipo que ainda declara esses campos convida a tela a
// lê-los, e o que vier `undefined` vira "R$ NaN" ou um zero que parece verdade.
// O cliente vê só o total (totalValue) e a multa, que seguem iguais.

const SAIRAM = [
  'proReceives',
  'pro_receives',
  'intermediaryFee',
  'intermediary_fee',
  'platformFee',
  'platform_fee',
  'gatewayFee',
  'gateway_fee',
  'appShare',
  'app_share',
];

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : arquivos(p);
    return /\.tsx?$/.test(n) ? [p] : [];
  });
}

describe('o cliente não lê o que saiu da lista dele', () => {
  it('nenhum arquivo de src/ cita os campos do relatório de quem recebe', () => {
    const achados = arquivos(join(__dirname, '../..')).flatMap((f) => {
      const texto = readFileSync(f, 'utf8');
      return SAIRAM.filter((campo) => texto.includes(campo)).map((campo) => `${f}: ${campo}`);
    });
    expect(achados).toEqual([]);
  });
});
