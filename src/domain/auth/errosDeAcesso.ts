// Erros do login, do cadastro e do "esqueci a senha" (CONTRATO NOVO do Backend,
// 03/10 — BAK email-nao-cadastrado, fd9a3af):
//   - login com e-mail sem conta → 401 EMAIL_NOT_FOUND (senha errada segue
//     401 BAD_CREDENTIALS);
//   - forgot-password sem conta → 404 EMAIL_NOT_FOUND, sem codigo nem e-mail;
//   - login, register e forgot: acima de 10 por minuto, 429 TOO_MANY_REQUESTS
//     com o header Retry-After.
// Antes o esqueci respondia 200 sempre e a tela seguia para o passo do codigo
// com um e-mail sem conta — esperando um codigo que nunca chegaria (C23).

type ErroHttp = {
  response?: {
    status?: number;
    data?: { code?: string; message?: string };
    headers?: Record<string, unknown>;
  };
  message?: string;
};

export type ErroDeAcesso =
  | { tipo: 'sem-conta' }
  | { tipo: 'muitas-tentativas'; titulo: string; mensagem: string }
  | { tipo: 'outro'; mensagem: string };

/**
 * Segundos do `Retry-After`: o numero, ou uma data HTTP (o padrao aceita os
 * dois). Sem header, ilegivel ou ja passado: null.
 */
export function segundosDeEspera(erro: unknown, agora: number = Date.now()): number | null {
  const headers = (erro as ErroHttp)?.response?.headers ?? {};
  const bruto = headers['retry-after'] ?? headers['Retry-After'];
  if (bruto == null) return null;
  const texto = String(bruto).trim();
  if (/^\d+$/.test(texto)) {
    const n = Number(texto);
    return n > 0 ? n : null;
  }
  const quando = Date.parse(texto);
  if (Number.isNaN(quando)) return null;
  const s = Math.ceil((quando - agora) / 1000);
  return s > 0 ? s : null;
}

/** "Tente de novo em 40 s" / "em 2 min" / "em instantes". */
export function mensagemDeMuitasTentativas(segundos: number | null): string {
  if (segundos == null) return 'Muitas tentativas seguidas. Tente de novo em instantes.';
  if (segundos < 60) return `Muitas tentativas seguidas. Tente de novo em ${segundos} s.`;
  return `Muitas tentativas seguidas. Tente de novo em ${Math.ceil(segundos / 60)} min.`;
}

function muitasTentativas(erro: ErroHttp): boolean {
  return erro?.response?.status === 429 || erro?.response?.data?.code === 'TOO_MANY_REQUESTS';
}

function semConta(erro: ErroHttp): boolean {
  return erro?.response?.data?.code === 'EMAIL_NOT_FOUND';
}

/** O que a tela faz com o erro. `padrao` e a mensagem quando o servidor nao manda nenhuma. */
export function erroDeAcesso(erro: unknown, padrao: string, agora: number = Date.now()): ErroDeAcesso {
  const e = (erro ?? {}) as ErroHttp;
  if (muitasTentativas(e)) {
    return {
      tipo: 'muitas-tentativas',
      titulo: 'Muitas tentativas',
      mensagem: mensagemDeMuitasTentativas(segundosDeEspera(e, agora)),
    };
  }
  if (semConta(e)) return { tipo: 'sem-conta' };
  return { tipo: 'outro', mensagem: e.response?.data?.message || e.message || padrao };
}

/** O aviso do e-mail sem conta — o mesmo no login e no esqueci. */
export const AVISO_SEM_CONTA = {
  titulo: 'E-mail sem conta',
  mensagem: 'Não achamos uma conta com este e-mail. Confira se digitou certo ou crie uma conta.',
  corrigir: 'Corrigir',
  criar: 'Criar conta',
} as const;
