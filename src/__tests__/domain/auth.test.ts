import { validateLogin, validateSignUp } from '@domain/auth/validateAuth';
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

    it('deve falhar com senha curta', () => {
      const result = validateLogin('user@test.com', '123');
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Senha deve ter pelo menos 6 caracteres');
    });

    it('deve falhar com senha de 5 caracteres (limite)', () => {
      const result = validateLogin('user@test.com', '12345');
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Senha deve ter pelo menos 6 caracteres');
    });

    it('deve passar com senha de 6 caracteres (limite)', () => {
      const result = validateLogin('user@test.com', '123456');
      expect(result.isValid).toBe(true);
    });

    it('deve passar com dados válidos', () => {
      const result = validateLogin('user@test.com', '123456');
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
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
    it('deve falhar com todos os campos vazios', () => {
      const result = validateSignUp('', '', '');
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBe(3);
    });

    it('deve falhar quando senhas não conferem', () => {
      const result = validateSignUp('user@test.com', '123456', '654321');
      expect(result.isValid).toBe(false);
      expect(result.errors.confirmPassword).toBe('Senhas não conferem');
    });

    it('deve falhar com confirmação vazia', () => {
      const result = validateSignUp('user@test.com', '123456', '');
      expect(result.isValid).toBe(false);
      expect(result.errors.confirmPassword).toBe('Confirme a senha');
    });

    it('deve falhar com email inválido mesmo com senhas corretas', () => {
      const result = validateSignUp('invalido', '123456', '123456');
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeUndefined();
      expect(result.errors.confirmPassword).toBeUndefined();
    });

    it('deve falhar com senha curta mesmo com confirmação igual', () => {
      const result = validateSignUp('user@test.com', '123', '123');
      expect(result.isValid).toBe(false);
      expect(result.errors.password).toBe('Senha deve ter pelo menos 6 caracteres');
    });

    it('deve passar com dados válidos e senhas iguais', () => {
      const result = validateSignUp('user@test.com', '123456', '123456');
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
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
