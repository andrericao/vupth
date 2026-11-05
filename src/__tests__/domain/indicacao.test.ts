import { caminhoDoLink, campanhaDoCaminho, codigoDoCaminho, descartarDepoisDaRecusa } from '@domain/indicacao';

// entrada-por-link (CLI-34, Backend 3fdcec1).

describe('codigoDoCaminho', () => {
  it('lê o código de /i/<código>, com ou sem barra e query', () => {
    expect(codigoDoCaminho('/i/K7M2QX')).toBe('K7M2QX');
    expect(codigoDoCaminho('/i/K7M2QX/')).toBe('K7M2QX');
    expect(codigoDoCaminho('i/K7M2QX?utm=zap#x')).toBe('K7M2QX');
  });

  it('outro caminho, ou código vazio/estranho, não é indicação', () => {
    expect(codigoDoCaminho('/')).toBeNull();
    expect(codigoDoCaminho('/loja/e1')).toBeNull();
    expect(codigoDoCaminho('/i/')).toBeNull();
    expect(codigoDoCaminho('/i/a b')).toBeNull();
    expect(codigoDoCaminho('/i/K7/extra')).toBeNull();
  });
});

describe('descartarDepoisDaRecusa', () => {
  it('404, 409 e 422 não mudam tentando de novo: o código sai', () => {
    for (const status of [404, 409, 422]) {
      expect(descartarDepoisDaRecusa({ response: { status } })).toBe(true);
    }
  });

  it('sem rede, servidor fora ou erro sem resposta: guarda para a próxima', () => {
    expect(descartarDepoisDaRecusa({ response: { status: 503 } })).toBe(false);
    expect(descartarDepoisDaRecusa(new Error('Network Error'))).toBe(false);
    expect(descartarDepoisDaRecusa(null)).toBe(false);
  });
});

describe('campanhaDoCaminho', () => {
  it('lê a campanha de ?c=, também entre outros parâmetros', () => {
    expect(campanhaDoCaminho('/i/K7M2QX?c=camp-1')).toBe('camp-1');
    expect(campanhaDoCaminho('/i/K7M2QX?utm=zap&c=abc_9#x')).toBe('abc_9');
  });

  it('sem ?c= (ou vazio), não há campanha', () => {
    expect(campanhaDoCaminho('/i/K7M2QX')).toBeNull();
    expect(campanhaDoCaminho('/i/K7M2QX?c=')).toBeNull();
    expect(campanhaDoCaminho('/i/K7M2QX?cc=1')).toBeNull();
  });
});

// teste-link-de-participacao (CLI-3): no aparelho o link chega inteiro; vira o caminho que a web le.
describe('caminhoDoLink', () => {
  it('o esquema do app e o dominio viram o caminho, com a query', () => {
    expect(caminhoDoLink('vupth://i/K7M2QX?c=camp-1')).toBe('/i/K7M2QX?c=camp-1');
    expect(caminhoDoLink('vupth:///i/K7M2QX')).toBe('/i/K7M2QX');
    expect(caminhoDoLink('https://app.vupth.com/i/K7M2QX?c=camp-1')).toBe('/i/K7M2QX?c=camp-1');
    expect(caminhoDoLink('https://app.vupth.com')).toBe('/');
  });

  it('outro endereco, vazio ou nulo: nada', () => {
    expect(caminhoDoLink('https://outro.com/i/K7M2QX')).toBe('');
    expect(caminhoDoLink('exp://192.168.0.16:8081')).toBe('');
    expect(caminhoDoLink('')).toBe('');
    expect(caminhoDoLink(null)).toBe('');
    expect(caminhoDoLink(undefined)).toBe('');
  });

  it('com o caminho, o codigo e a campanha saem como na web', () => {
    const caminho = caminhoDoLink('vupth://i/PROF77?c=camp-9');
    expect(codigoDoCaminho(caminho)).toBe('PROF77');
    expect(campanhaDoCaminho(caminho)).toBe('camp-9');
  });
});
