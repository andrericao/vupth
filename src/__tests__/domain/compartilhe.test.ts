import { contadorDoLink, ehCampanhaDeLink, ganhoAguardando, linkCompleto, mensagemDoLink, mensagemDoParticipar } from '@domain/compartilhe';

// compartilhe-e-ganhe (CLI-30, DEC-113): os textos curtos de "Indique e ganhe".

describe('compartilhe-e-ganhe', () => {
  it('só REFERRAL_BONUS é campanha de link', () => {
    expect(ehCampanhaDeLink('REFERRAL_BONUS')).toBe(true);
    expect(ehCampanhaDeLink('COUPON')).toBe(false);
    expect(ehCampanhaDeLink(null)).toBe(false);
  });

  it('o contador diz indicados e com ganho', () => {
    expect(contadorDoLink({ referred_clients: 1, credited_clients: 0 })).toBe('1 indicado · 0 com ganho');
    expect(contadorDoLink({ referred_clients: 3, credited_clients: 2 })).toBe('3 indicados · 2 com ganho');
  });

  // promocoes-do-profissional-com-link (André, 24/10): nunca "undefined indicados · undefined com ganho".
  it('campo que falta vale 0, nunca "undefined"', () => {
    expect(contadorDoLink({})).toBe('0 indicados · 0 com ganho');
    expect(contadorDoLink({ referred_clients: null, credited_clients: undefined })).toBe('0 indicados · 0 com ganho');
  });

  // Sem https:// o navegador trata o link como busca (André, 24/10).
  it('o link sempre sai com https://', () => {
    expect(linkCompleto('vupth.pages.dev/i/ABC?c=1')).toBe('https://vupth.pages.dev/i/ABC?c=1');
    expect(linkCompleto('https://vupth.pages.dev/i/ABC')).toBe('https://vupth.pages.dev/i/ABC');
    expect(linkCompleto('HTTP://x.dev/i/A')).toBe('HTTP://x.dev/i/A');
    expect(linkCompleto('  /vupth.pages.dev/i/A ')).toBe('https://vupth.pages.dev/i/A');
    expect(linkCompleto(null)).toBe('');
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
