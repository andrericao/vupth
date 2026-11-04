import { Platform } from 'react-native';
import { AxiosHeaders } from 'axios';

import { lerCookie, modoCookieWeb, prepararPedidoPorCookie } from '@services/modoCookieWeb';

// token-web-httponly (DEC-172/179): o modo cookie da web, atrás da chave local desligada.
const plataforma = Platform.OS;
afterEach(() => {
  Object.defineProperty(Platform, 'OS', { value: plataforma, configurable: true });
  delete process.env.EXPO_PUBLIC_WEB_AUTH_COOKIE;
});
const naWeb = () => Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

describe('a chave do modo cookie', () => {
  it('desligada por padrão, inclusive na web', () => {
    expect(modoCookieWeb()).toBe(false);
    naWeb();
    expect(modoCookieWeb()).toBe(false);
  });
  it('liga só na web com EXPO_PUBLIC_WEB_AUTH_COOKIE=1; o nativo nunca', () => {
    process.env.EXPO_PUBLIC_WEB_AUTH_COOKIE = '1';
    expect(modoCookieWeb()).toBe(false);
    naWeb();
    expect(modoCookieWeb()).toBe(true);
  });
});

describe('o cookie do CSRF', () => {
  it('acha pelo nome, decodifica e ignora os outros', () => {
    expect(lerCookie('vupth_csrf', 'a=1; vupth_csrf=ab%3Dc; b=2')).toBe('ab=c');
    expect(lerCookie('vupth_csrf', 'a=1')).toBeNull();
    expect(lerCookie('vupth_csrf', '')).toBeNull();
  });
});

describe('o pedido no modo cookie', () => {
  it('escrita: credentials, sem Authorization e com o X-CSRF-Token', () => {
    const headers = new AxiosHeaders({ Authorization: 'Bearer x' });
    const c = prepararPedidoPorCookie({ method: 'post', headers }, 'vupth_csrf=tok');
    expect(c.withCredentials).toBe(true);
    expect(headers.has('Authorization')).toBe(false);
    expect(headers.get('X-CSRF-Token')).toBe('tok');
  });
  it('leitura: credentials, sem CSRF; sem o cookie, a escrita vai sem o cabeçalho', () => {
    const leitura = prepararPedidoPorCookie({ method: 'get', headers: { Authorization: 'Bearer x' } as Record<string, unknown> }, 'vupth_csrf=tok');
    expect(leitura.withCredentials).toBe(true);
    expect(leitura.headers.Authorization).toBeUndefined();
    expect(leitura.headers['X-CSRF-Token']).toBeUndefined();
    const semCookie = prepararPedidoPorCookie({ method: 'DELETE', headers: {} as Record<string, unknown> }, '');
    expect(semCookie.headers['X-CSRF-Token']).toBeUndefined();
    const semMetodo = prepararPedidoPorCookie({ headers: {} as Record<string, unknown> }, 'vupth_csrf=tok');
    expect(semMetodo.headers['X-CSRF-Token']).toBeUndefined();
  });
});
