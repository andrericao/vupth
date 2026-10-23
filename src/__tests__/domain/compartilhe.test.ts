import { contadorDoLink, ehCampanhaDeLink, ganhoAguardando, mensagemDoLink, mensagemDoParticipar } from '@domain/compartilhe';

// compartilhe-e-ganhe (CLI-30, DEC-113): os textos curtos de "Indique e ganhe".

describe('compartilhe-e-ganhe', () => {
  it('só REFERRAL_BONUS é campanha de link', () => {
    expect(ehCampanhaDeLink('REFERRAL_BONUS')).toBe(true);
    expect(ehCampanhaDeLink('COUPON')).toBe(false);
    expect(ehCampanhaDeLink(null)).toBe(false);
  });

  it('o contador diz indicados e com ganho', () => {
    expect(contadorDoLink({ referred: 1, credited: 0 })).toBe('1 indicado · 0 com ganho');
    expect(contadorDoLink({ referred: 3, credited: 2 })).toBe('3 indicados · 2 com ganho');
  });

  it('o ganho a liberar só aparece com valor', () => {
    expect(ganhoAguardando({ pending_release: 12.5 })).toBe('R$ 12,50 a liberar');
    expect(ganhoAguardando({ pending_release: 0 })).toBe('');
    expect(ganhoAguardando({ pending_release: null })).toBe('');
    expect(ganhoAguardando(null)).toBe('');
  });

  it('a mensagem do compartilhar leva o nome e o link', () => {
    expect(mensagemDoLink({ name: 'Indique', link: 'https://x/i/A?c=1' })).toBe('Indique: entre no Vupth por este link https://x/i/A?c=1');
    expect(mensagemDoLink({ link: 'https://x' })).toBe('entre no Vupth por este link https://x');
  });

  it('as recusas do participar saem em uma frase', () => {
    const e = (status: number) => ({ response: { status } });
    expect(mensagemDoParticipar(e(404))).toMatch(/não está mais/);
    expect(mensagemDoParticipar(e(409))).toMatch(/já participa/);
    expect(mensagemDoParticipar(e(403))).toMatch(/não é para você/);
    expect(mensagemDoParticipar(new Error('rede'))).toMatch(/Tente de novo/);
  });
});
