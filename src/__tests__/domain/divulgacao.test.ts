import { textoDeDivulgacao, ehIOS, linkDeBaixar } from '@domain/divulgacao';
import { linkParaCompartilhar } from '../../routes/linking';

describe('link-de-divulgacao', () => {
  it('o texto com o profissional, e sem ele so a loja', () => {
    expect(textoDeDivulgacao({ loja: 'Barbearia do Zé', profissional: 'Carlos', link: 'https://x/loja/e1?profissional=p1' })).toBe(
      'Conheça o Carlos na Barbearia do Zé — veja a fila e os serviços no VUPTH: https://x/loja/e1?profissional=p1',
    );
    expect(textoDeDivulgacao({ loja: 'Barbearia do Zé', link: 'https://x/loja/e1' })).toBe(
      'Conheça a Barbearia do Zé no VUPTH: https://x/loja/e1',
    );
  });

  it('o link leva o profissional e, quando houver, o ref de quem indicou', () => {
    expect(linkParaCompartilhar('https://vupth.pages.dev/', 'e1')).toBe('https://vupth.pages.dev/loja/e1');
    expect(linkParaCompartilhar('https://vupth.pages.dev', 'e1', 'p1')).toBe('https://vupth.pages.dev/loja/e1?profissional=p1');
    expect(linkParaCompartilhar('https://vupth.pages.dev', 'e1', 'p1', 'AB12CD')).toBe(
      'https://vupth.pages.dev/loja/e1?profissional=p1&ref=AB12CD',
    );
    expect(linkParaCompartilhar('https://vupth.pages.dev', 'e1', undefined, 'AB12CD')).toBe(
      'https://vupth.pages.dev/loja/e1?ref=AB12CD',
    );
  });

  it('iPhone e iPad nao recebem a faixa de baixar; Android e computador recebem', () => {
    expect(ehIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe(true);
    expect(ehIOS('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true);
    expect(ehIOS('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe(false);
    expect(ehIOS(undefined)).toBe(false);
  });

  it('o /baixar fica na raiz do site', () => {
    expect(linkDeBaixar('https://vupth.pages.dev/')).toBe('https://vupth.pages.dev/baixar');
  });
});
