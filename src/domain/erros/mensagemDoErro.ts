// erros-em-portugues (CLI-1, Andre 17/10): o Backend responde `message` em
// ingles ("E-mail not registered") e o app jogava isso na tela. A mensagem que
// a pessoa le sai do CODIGO estavel do erro; sem codigo conhecido, so passa o
// texto do servidor se ele ja estiver em portugues — ingles nunca chega a tela.

type ErroHttp = {
  response?: { data?: { code?: string; message?: string } };
  message?: string;
};

/** Codigo do Backend (GlobalExceptionHandler) → o que a pessoa le. */
export const MENSAGEM_POR_CODIGO: Record<string, string> = {
  EMAIL_NOT_FOUND: 'Este e-mail não está cadastrado. Confira ou crie uma conta.',
  BAD_CREDENTIALS: 'E-mail ou senha incorretos.',
  ACCOUNT_DISABLED: 'Esta conta está desativada.',
  ACCOUNT_DEACTIVATED: 'Esta conta foi desativada.',
  ACCOUNT_LOCKED: 'Esta conta está bloqueada. Tente de novo mais tarde.',
  CURRENT_PASSWORD_INVALID: 'A senha atual está incorreta.',
  RESET_CODE_INVALID: 'Código inválido. Confira e tente de novo.',
  RESET_CODE_EXPIRED: 'O código expirou. Peça um novo.',
  EMAIL_NOT_AVAILABLE: 'Este e-mail já está em uso.',
  EMAILS_ARE_THE_SAME: 'O novo e-mail é igual ao atual.',
  REFRESH_TOKEN_INVALID: 'Sua sessão expirou. Entre de novo.',
  REFRESH_TOKEN_NOT_FOUND: 'Sua sessão expirou. Entre de novo.',
  ACCESS_DENIED: 'Você não tem permissão para isso.',
  NOT_FOUND: 'Não encontramos o que você procura.',
  USER_NOT_FOUND: 'Não encontramos esta conta.',
  CLIENT_NOT_FOUND: 'Não encontramos o seu cadastro.',
  ESTABLISHMENT_NOT_FOUND: 'Não encontramos esta loja.',
  ESTABLISHMENT_UNAVAILABLE: 'Esta loja não está disponível agora.',
  ESTABLISHMENT_NOT_OPEN: 'A loja está fechada agora.',
  ESTABLISHMENT_NOBODY_WORKING: 'Nenhum profissional está atendendo agora.',
  PROFESSIONAL_NOT_FOUND: 'Não encontramos este profissional.',
  PROFESSIONAL_AGENDA_FULL: 'A agenda deste profissional está cheia.',
  PROFESSIONAL_AGENDA_ONLY: 'Este profissional atende só por agendamento.',
  PROFESSIONAL_NOT_ACCEPTING_NEW: 'Este profissional não está aceitando novos clientes agora.',
  PROFESSIONAL_HAS_NO_SERVICE: 'Este profissional ainda não tem serviços.',
  ATTENDANCE_NOT_FOUND: 'Não encontramos este atendimento.',
  ATTENDANCE_ALREADY_CANCELLED: 'Este atendimento já foi cancelado.',
  ATTENDANCE_ALREADY_IN_PROGRESS: 'Este atendimento já começou.',
  ATTENDANCE_ALREADY_RATED: 'Você já avaliou este atendimento.',
  ATTENDANCE_CANCEL_NOT_ALLOWED: 'Este atendimento não pode mais ser cancelado.',
  ATTENDANCE_INVALID_STATUS: 'Isso não é possível no estado atual do atendimento.',
  CLIENT_ALREADY_IN_QUEUE: 'Você já está em uma fila.',
  CLIENT_NOT_IN_QUEUE: 'Você não está na fila.',
  CUT_REQUEST_EXPIRED: 'O pedido de corte expirou.',
  CUT_REQUEST_NOT_PENDING: 'Este pedido de corte já foi respondido.',
  EXIT_PENALTY_NOT_ACKNOWLEDGED: 'Confirme que está ciente da multa para sair da fila.',
  INTENTION_BEFORE_QUEUE_END: 'Escolha um horário depois do fim da fila.',
  INTENTION_HORIZON_EXCEEDED: 'Este horário está longe demais. Escolha uma data mais próxima.',
  INTENTION_OUTSIDE_BUSINESS_HOURS: 'Este horário está fora do funcionamento da loja.',
  INTENTION_OUTSIDE_PROFESSIONAL_HOURS: 'Este horário está fora do expediente do profissional.',
  PAYMENT_PENDING: 'Você tem um pagamento pendente.',
  PAYMENT_NOT_AVAILABLE: 'O pagamento ainda não está disponível.',
  PAYMENT_INVALID_STATUS: 'Isso não é possível no estado atual do pagamento.',
  PIX_KEY_NOT_SET: 'O Pix deste profissional ainda não está disponível.',
  QUEUE_SWAP_ALREADY_PENDING: 'Já existe uma troca pendente.',
  QUEUE_SWAP_NOT_ALLOWED: 'A troca não é possível agora.',
  QUEUE_SWAP_NOT_FOUND: 'Não encontramos esta troca.',
  QUEUE_SWAP_OFFER_NOT_ALLOWED: 'Esta oferta de troca não é possível agora.',
  QUEUE_SWAP_OFFER_NOT_FOUND: 'Não encontramos esta oferta de troca.',
  QUEUE_SWAP_DURATION_INCOMPATIBLE: 'Os serviços têm durações incompatíveis para a troca.',
  QUEUE_TARGET_NOT_FEASIBLE: 'Não é possível ficar nesse horário.',
  INVALID_BIRTH_DATE: 'Data de nascimento inválida.',
  INVALID_PROFILE_PHOTO: 'Não foi possível usar esta foto.',
  ADDRESS_INVALID_COORDINATES: 'Não conseguimos localizar este endereço.',
  ADDRESS_INVALID_UF: 'Estado (UF) inválido.',
  GEOCODING_ADDRESS_NOT_FOUND: 'Não encontramos este endereço.',
  NO_FIELDS_TO_UPDATE: 'Nada para atualizar.',
  VALIDATION_ERROR: 'Confira os dados e tente de novo.',
  INVALID_ARGUMENT: 'Confira os dados e tente de novo.',
  INVALID_REQUEST_BODY: 'Confira os dados e tente de novo.',
  METHOD_NOT_ALLOWED: 'Isso não é possível agora.',
  TOO_MANY_REQUESTS: 'Muitas tentativas seguidas. Tente de novo em instantes.',
  INTERNAL_ERROR: 'Algo deu errado do nosso lado. Tente de novo em instantes.',
};

/** Textos em ingles do Backend/axios que chegam sem codigo conhecido. */
const MENSAGEM_POR_TEXTO: [RegExp, string][] = [
  [/e-?mail not registered/i, MENSAGEM_POR_CODIGO.EMAIL_NOT_FOUND],
  [/invalid email or password/i, MENSAGEM_POR_CODIGO.BAD_CREDENTIALS],
  [/^network error$/i, 'Sem conexão com o servidor. Confira a sua internet.'],
  [/timeout of \d+ms exceeded|^timeout$/i, 'A conexão demorou demais. Tente de novo.'],
  [/request failed with status code 5\d\d/i, MENSAGEM_POR_CODIGO.INTERNAL_ERROR],
];

// Palavras que so aparecem em ingles. Sem acento e sem estas, o texto passa.
const PALAVRAS_EM_INGLES =
  /\b(the|not|only|your|you|cannot|must|is|are|was|invalid|found|already|failed|error|request|code|with|exists?|denied|expired|required|must|please|try|again|can)\b/i;

/** O texto parece ingles? (acento = portugues; palavra tipica = ingles). */
export function pareceIngles(texto: string): boolean {
  if (/[À-ÿ]/.test(texto)) return false;
  return PALAVRAS_EM_INGLES.test(texto);
}

function traduzirConhecido(texto: string): string | null {
  for (const [re, pt] of MENSAGEM_POR_TEXTO) if (re.test(texto)) return pt;
  return null;
}

function traduzirTexto(texto: string | undefined): string | null {
  const t = (texto ?? '').trim();
  if (!t) return null;
  return traduzirConhecido(t) ?? (pareceIngles(t) ? null : t);
}

/**
 * A mensagem de um erro de API para a tela, sempre em portugues.
 * Ordem: codigo do Backend → texto do servidor (so se ja for portugues) →
 * erro de rede/tempo/5xx do axios → `padrao`.
 */
export function mensagemDoErro(erro: unknown, padrao: string): string {
  const e = (erro ?? {}) as ErroHttp;
  const porCodigo = MENSAGEM_POR_CODIGO[e.response?.data?.code ?? ''];
  if (porCodigo) return porCodigo;
  // O `message` do proprio erro (axios/JS) so vale se for um que conhecemos
  // (sem rede, tempo esgotado, 5xx): o resto e texto tecnico, nunca vai a tela.
  return traduzirTexto(e.response?.data?.message) ?? traduzirConhecido((e.message ?? '').trim()) ?? padrao;
}
