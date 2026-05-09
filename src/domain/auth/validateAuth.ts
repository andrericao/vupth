export type ValidationResult = {
  isValid: boolean;
  errors: Record<string, string>;
};

export function validateLogin(email: string, password: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!email.trim()) {
    errors.email = 'E-mail é obrigatório';
  } else if (!/\S+@\S+\.\S+/.test(email)) {
    errors.email = 'E-mail inválido';
  }

  if (!password) {
    errors.password = 'Senha é obrigatória';
  } else if (password.length < 6) {
    errors.password = 'Senha deve ter pelo menos 6 caracteres';
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
  } else if (password.length < 6) {
    errors.password = 'Senha deve ter pelo menos 6 caracteres';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Confirme a senha';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Senhas não conferem';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
