import {
  expiracaoDoToken,
  MARGEM_DE_RENOVACAO_MS,
  precisaRenovar,
  tokenRecusado,
} from '../../domain/ws/socketAuth';

// C16 (renovar-token-no-ws, 03/10): o token vencido entrava no CONNECT e o
// servidor aceitava como anônimo — canal pessoal mudo, sem erro.

const b64url = (o: object) =>
  btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const jwt = (payload: object) => `${b64url({ alg: 'HS256' })}.${b64url(payload)}.assinatura`;

const AGORA = 1_800_000_000_000;

describe('expiracaoDoToken', () => {
  it('lê o exp do payload (base64url)', () => {
    expect(expiracaoDoToken(jwt({ sub: 'u1', exp: 123 }))).toBe(123);
  });

  it('token ilegível ou sem exp → null', () => {
    expect(expiracaoDoToken('lixo')).toBeNull();
    expect(expiracaoDoToken(jwt({ sub: 'u1' }))).toBeNull();
  });
});

describe('precisaRenovar', () => {
  it('sem token (visitante) não renova — conecta anônimo', () => {
    expect(precisaRenovar(null, AGORA)).toBe(false);
    expect(precisaRenovar(undefined, AGORA)).toBe(false);
  });

  it('vencido ou vencendo dentro da margem de 2 min → renova', () => {
    expect(precisaRenovar(jwt({ exp: AGORA / 1000 - 10 }), AGORA)).toBe(true);
    expect(precisaRenovar(jwt({ exp: (AGORA + MARGEM_DE_RENOVACAO_MS) / 1000 }), AGORA)).toBe(true);
  });

  it('com folga, não renova', () => {
    expect(precisaRenovar(jwt({ exp: AGORA / 1000 + 3600 }), AGORA)).toBe(false);
  });

  it('ilegível → renova', () => {
    expect(precisaRenovar('lixo', AGORA)).toBe(true);
  });
});

describe('tokenRecusado', () => {
  it('só o ERROR com INVALID_TOKEN', () => {
    expect(tokenRecusado('INVALID_TOKEN')).toBe(true);
    expect(tokenRecusado('Erro: INVALID_TOKEN (expirado)')).toBe(true);
    expect(tokenRecusado('outra coisa')).toBe(false);
    expect(tokenRecusado(undefined)).toBe(false);
  });
});
