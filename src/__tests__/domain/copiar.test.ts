import { copiarTexto, carregarClipboard } from '@utils/copiar';
import { raizDoSite, linkParaCompartilhar } from '@routes/linking';

// Andre, 26/09: botão de copiar — base da indicação. O módulo é nativo e não
// existe no APK anterior ao build: copiar tem de falhar em silêncio, nunca derrubar.

describe('copiar para a área de transferência', () => {
  it('copia com o módulo presente', async () => {
    const setStringAsync = jest.fn().mockResolvedValue(true);
    expect(await copiarTexto('link', { setStringAsync })).toBe(true);
    expect(setStringAsync).toHaveBeenCalledWith('link');
  });

  it('sem o módulo (APK antigo) devolve false — quem chama cai no compartilhar', async () => {
    expect(await copiarTexto('link', null)).toBe(false);
  });

  it('módulo que falha ou recusa devolve false', async () => {
    expect(await copiarTexto('link', { setStringAsync: jest.fn().mockRejectedValue(new Error('x')) })).toBe(false);
    expect(await copiarTexto('link', { setStringAsync: jest.fn().mockResolvedValue(false) })).toBe(false);
  });

  it('o carregamento protegido acha o expo-clipboard instalado', () => {
    expect(typeof carregarClipboard()?.setStringAsync).toBe('function');
  });

  it('o carregamento protegido não quebra quando o módulo some', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-clipboard', () => {
        throw new Error('Cannot find native module ExpoClipboard');
      });
      const { carregarClipboard: carregar } = require('@utils/copiar');
      expect(carregar()).toBeNull();
    });
  });
});

describe('o módulo carregado por padrão', () => {
  it('sem passar o módulo, usa o que o carregamento acha', async () => {
    await jest.isolateModulesAsync(async () => {
      const setStringAsync = jest.fn().mockResolvedValue(true);
      jest.doMock('expo-clipboard', () => ({ setStringAsync }));
      const { copiarTexto: copiar } = require('@utils/copiar');
      expect(await copiar('link')).toBe(true);
      expect(setStringAsync).toHaveBeenCalledWith('link');
    });
  });

  it('módulo sem setStringAsync conta como ausente', () => {
    jest.isolateModules(() => {
      jest.doMock('expo-clipboard', () => ({}));
      const { carregarClipboard: carregar } = require('@utils/copiar');
      expect(carregar()).toBeNull();
    });
  });

  it('setStringAsync sem retorno (void) conta como copiado', async () => {
    expect(await copiarTexto('link', { setStringAsync: jest.fn().mockResolvedValue(undefined) })).toBe(true);
  });
});

describe('o link copiado', () => {
  it('produção aponta para o site de produção; o resto, para o de staging', () => {
    expect(raizDoSite('prod')).toBe('https://vupth.pages.dev');
    expect(raizDoSite('staging')).toBe('https://dev.vupth.pages.dev');
    expect(raizDoSite('dev')).toBe('https://dev.vupth.pages.dev');
  });

  it('é o link público da loja', () => {
    expect(linkParaCompartilhar(raizDoSite('prod'), 'e1')).toBe('https://vupth.pages.dev/loja/e1');
  });
});
