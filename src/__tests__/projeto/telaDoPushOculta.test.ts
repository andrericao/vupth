import { readFileSync } from 'fs';
import { join } from 'path';

// aguardando-cronometro-e-vez (DEC-149): a tela 10 fica oculta atras de uma constante; o Maestro 24 acompanha.
describe('tela 10 (pode fechar o app) oculta', () => {
  it('a constante esta desligada e o codigo da tela segue no projeto', () => {
    const fonte = readFileSync(join(__dirname, '../../hooks/ofertaDePush.ts'), 'utf8');
    expect(fonte).toMatch(/export const TELA_DO_PUSH_VISIVEL = false;/);
    expect(readFileSync(join(__dirname, '../../screens/PushPermission.tsx'), 'utf8')).toContain('PODE FECHAR O APP');
  });
  it('o fluxo 24 nao espera mais a tela 10 nem toca em "Avisar"', () => {
    const y = readFileSync(join(__dirname, '../../../.maestro/etapas/24_tela_do_push.yaml'), 'utf8');
    expect(y).not.toContain('push-accept');
    expect(y).not.toMatch(/visible: "PODE FECHAR O APP"/);
    expect(y).toContain('Início estimado');
  });
});
