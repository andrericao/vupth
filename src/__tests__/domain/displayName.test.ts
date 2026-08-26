import { primeiroNome, nomeDeExibicao } from '@domain/auth/displayName';

// O cadastro do cliente pede só e-mail e senha, então `first_name` vazio é o
// caso NORMAL. Antes, a Home caía em "Estabelecimentos" — o mesmo texto que o
// visitante vê —, e quem logava sem nome achava que o login tinha falhado.
describe('como o app chama a pessoa', () => {
  it('usa o primeiro nome quando existe', () => {
    expect(primeiroNome({ first_name: 'Alexia Maria', email: 'a@b.com' })).toBe('Alexia');
  });

  it('sem nome, cai no apelido do e-mail — nunca no texto de visitante', () => {
    expect(primeiroNome({ email: 'qa.visual@vupth.dev' })).toBe('qa.visual');
    expect(primeiroNome({ first_name: '   ', email: 'qa@vupth.dev' })).toBe('qa');
  });

  it('sem nada, devolve vazio — quem chama decide o que fazer', () => {
    expect(primeiroNome({})).toBe('');
    expect(primeiroNome(null)).toBe('');
  });

  it('o nome de exibição junta nome e sobrenome', () => {
    expect(nomeDeExibicao({ first_name: 'Alexia', last_name: 'Souza' })).toBe('Alexia Souza');
  });

  it('e NUNCA volta vazio — cabeçalho de identidade sem texto é pior que genérico', () => {
    expect(nomeDeExibicao({ email: 'qa@vupth.dev' })).toBe('qa');
    expect(nomeDeExibicao({})).toBe('Sua conta');
    expect(nomeDeExibicao(null)).toBe('Sua conta');
  });
});
