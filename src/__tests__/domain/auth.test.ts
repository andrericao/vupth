import { validateLogin, validateSignUp, getPasswordRules } from '@domain/auth/validateAuth';
import { isAuthenticated, setAuthenticated } from '@domain/auth/authState';

describe('Auth Domain', () => {
  describe('validateLogin', () => {
    it('deve falhar com email e senha vazios', () => {
      const result = validateLogin('', '');
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('E-mail é obrigatório');
      expect(result.errors.password).toBe('Senha é obrigatória');
    });

    it('deve falhar com email inválido', () => {
      const result = validateLogin('invalido', '123456');
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('E-mail inválido');
    });

    it('deve falhar com email sem domínio', () => {
      const result = validateLogin('user@', '123456');
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('E-mail inválido');
    });

    it('deve falhar com email sem @', () => {
      const result = validateLogin('usertest.com', '123456');
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('E-mail inválido');
    });

    it('deve passar com dados válidos (login não valida força da senha)', () => {
      const result = validateLogin('user@test.com', '123456');
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });

    it('deve falhar com senha vazia', () => {
      const result = validateLogin('user@test.com', '');
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Senha é obrigatória');
    });

    it('deve rejeitar email com espaços', () => {
      const result = validateLogin('   ', '123456');
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('E-mail é obrigatório');
    });

    it('deve retornar exatamente 2 erros quando ambos campos inválidos', () => {
      const result = validateLogin('', '');
      expect(Object.keys(result.errors)).toHaveLength(2);
    });

    it('deve retornar exatamente 1 erro quando só email inválido', () => {
      const result = validateLogin('invalido', '123456');
      expect(Object.keys(result.errors)).toHaveLength(1);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeUndefined();
    });
  });

  describe('validateSignUp', () => {
    const strongPassword = 'Teste@123';

    it('deve falhar com todos os campos vazios', () => {
      const result = validateSignUp('', '', '');
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBe(3);
    });

    it('deve falhar quando senhas não conferem', () => {
      const result = validateSignUp('user@test.com', strongPassword, 'Outro@123');
      expect(result.isValid).toBe(false);
      expect(result.errors.confirmPassword).toBe('Senhas não conferem');
    });

    it('deve falhar com confirmação vazia', () => {
      const result = validateSignUp('user@test.com', strongPassword, '');
      expect(result.isValid).toBe(false);
      expect(result.errors.confirmPassword).toBe('Confirme a senha');
    });

    it('deve falhar com email inválido mesmo com senhas corretas', () => {
      const result = validateSignUp('invalido', strongPassword, strongPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeUndefined();
      expect(result.errors.confirmPassword).toBeUndefined();
    });

    it('deve falhar com senha fraca (sem maiúscula)', () => {
      const result = validateSignUp('user@test.com', 'teste@123', 'teste@123');
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Senha não atende os requisitos');
    });

    it('deve falhar com senha fraca (sem especial)', () => {
      const result = validateSignUp('user@test.com', 'Teste123', 'Teste123');
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Senha não atende os requisitos');
    });

    it('deve falhar com senha fraca (sem minúscula)', () => {
      const result = validateSignUp('user@test.com', 'TESTE@123', 'TESTE@123');
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Senha não atende os requisitos');
    });

    it('deve falhar com senha curta mesmo com todos os tipos', () => {
      const result = validateSignUp('user@test.com', 'Ab@1', 'Ab@1');
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Senha não atende os requisitos');
    });

    it('deve passar com dados válidos e senha forte', () => {
      const result = validateSignUp('user@test.com', strongPassword, strongPassword);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });
  });

  describe('getPasswordRules', () => {
    it('deve retornar todas as regras falhando para senha vazia', () => {
      const rules = getPasswordRules('');
      expect(rules).toHaveLength(4);
      rules.forEach((r) => expect(r.passed).toBe(false));
    });

    it('deve passar mínimo de caracteres com 6+', () => {
      const rules = getPasswordRules('abcdef');
      expect(rules.find((r) => r.label === 'De 6 a 64 caracteres')?.passed).toBe(true);
    });

    it('DEC-79: mais de 64 caracteres não passa', () => {
      expect(getPasswordRules('a'.repeat(64)).find((r) => r.label === 'De 6 a 64 caracteres')?.passed).toBe(true);
      expect(getPasswordRules('a'.repeat(65)).find((r) => r.label === 'De 6 a 64 caracteres')?.passed).toBe(false);
    });

    it('deve detectar maiúscula', () => {
      const rules = getPasswordRules('A');
      expect(rules.find((r) => r.label === 'Letra maiúscula')?.passed).toBe(true);
    });

    it('deve detectar minúscula', () => {
      const rules = getPasswordRules('a');
      expect(rules.find((r) => r.label === 'Letra minúscula')?.passed).toBe(true);
    });

    it('deve detectar caractere especial', () => {
      const rules = getPasswordRules('@');
      expect(rules.find((r) => r.label.startsWith('Caractere especial'))?.passed).toBe(true);
    });

    it('deve passar todas com senha forte', () => {
      const rules = getPasswordRules('Teste@123');
      rules.forEach((r) => expect(r.passed).toBe(true));
    });
  });

  describe('authState', () => {
    beforeEach(() => {
      setAuthenticated(false);
    });

    it('deve iniciar como não autenticado', () => {
      expect(isAuthenticated()).toBe(false);
    });

    it('deve mudar para autenticado', () => {
      setAuthenticated(true);
      expect(isAuthenticated()).toBe(true);
    });

    it('deve voltar a não autenticado', () => {
      setAuthenticated(true);
      setAuthenticated(false);
      expect(isAuthenticated()).toBe(false);
    });
  });
});
