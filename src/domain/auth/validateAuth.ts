export type ValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
};

export type PasswordRule = {
  label: string;
  passed: boolean;
};

/** DEC-79 (16/10): o mesmo intervalo em todos os apps e no Backend. */
export const SENHA_MIN = 6;
export const SENHA_MAX = 64;
/** O que o campo de senha mostra, sempre. */
export const DICA_DA_SENHA = `De ${SENHA_MIN} a ${SENHA_MAX} caracteres`;

export function getPasswordRules(password: string): PasswordRule[] {
  return [
    { label: DICA_DA_SENHA, passed: password.length >= SENHA_MIN && password.length <= SENHA_MAX },
    { label: 'Letra maiúscula', passed: /[A-Z]/.test(password) },
    { label: 'Letra minúscula', passed: /[a-z]/.test(password) },
    { label: 'Caractere especial (!@#$...)', passed: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isPasswordStrong(password: string): boolean {
  return getPasswordRules(password).every((r) => r.passed);
}

export function validateLogin(email: string, password: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!email.trim()) {
    errors.email = 'E-mail é obrigatório';
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.email = 'E-mail inválido';
  }

  if (!password) {
    errors.password = 'Senha é obrigatória';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateSignUp(
  email: string,
  password: string,
  confirmPassword: string
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!email.trim()) {
    errors.email = 'E-mail é obrigatório';
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.email = 'E-mail inválido';
  }

  if (!password) {
    errors.password = 'Senha é obrigatória';
  } else if (!isPasswordStrong(password)) {
    errors.password = 'Senha não atende os requisitos';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Confirme a senha';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Senhas não conferem';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
