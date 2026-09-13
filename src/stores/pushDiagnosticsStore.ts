import { create } from 'zustand';

import { MotivoPush } from '@domain/push';

/**
 * Estado do registro de push para o painel das Configurações.
 *
 * Existe pelo mesmo motivo do painel do WebSocket: num binário instalado, tudo
 * o que acontece aqui é invisível. O registro inteiro vive dentro de um
 * `catch {}` best-effort — o que é certo (push não pode derrubar o login) e ao
 * mesmo tempo apaga qualquer rastro.
 *
 * O relato de 2026-09-07 foi "não recebi nenhuma notificação, de input nenhum",
 * nos DOIS apps. Sem isto, esse relato é indistinguível de meia dúzia de causas
 * diferentes: emulador, permissão negada, projectId ausente, credencial de push
 * não configurada, ou o backend simplesmente não enviando.
 *
 * NÃO é persistido: é retrato da sessão.
 */

export type EnvioAoBackend = 'nao-tentado' | 'ok' | 'falhou';

export type PushDiagnostics = {
  motivo: MotivoPush | null;
  detalhe: string | null;
  /** Só o fim do token: identifica sem expor o valor inteiro na tela. */
  tokenSufixo: string | null;
  /**
   * O token INTEIRO, para o diagnóstico manual.
   *
   * Guardado a partir de 12/09, quando o push seguiu não chegando mesmo com
   * token obtido e backend avisado. Com o token em mãos dá para mandar uma
   * notificação pela ferramenta do Expo e separar dois culpados que hoje estão
   * empatados: o backend não enviar, ou o Expo não entregar.
   *
   * Fica só em memória (o store não é persistido) e a tela só o revela sob
   * toque — não é segredo forte, mas também não precisa ficar à mostra.
   */
  token: string | null;
  envio: EnvioAoBackend;
  erroEnvio: string | null;
  registradoEm: number | null;
};

type Store = PushDiagnostics & {
  registrarTentativa: (r: { motivo: MotivoPush; detalhe?: string; token?: string | null }) => void;
  registrarEnvio: (envio: EnvioAoBackend, erro?: string) => void;
  reset: () => void;
};

const INICIAL: PushDiagnostics = {
  motivo: null,
  detalhe: null,
  tokenSufixo: null,
  token: null,
  envio: 'nao-tentado',
  erroEnvio: null,
  registradoEm: null,
};

export function sufixoDoToken(token: string | null | undefined): string | null {
  if (!token) return null;
  // "ExponentPushToken[xxxxxxxx]" → os últimos 8 antes do colchete.
  const miolo = token.replace(/^ExponentPushToken\[/, '').replace(/\]$/, '');
  return miolo.slice(-8);
}

export const usePushDiagnosticsStore = create<Store>((set) => ({
  ...INICIAL,
  registrarTentativa: ({ motivo, detalhe, token }) =>
    set({
      motivo,
      detalhe: detalhe ?? null,
      tokenSufixo: sufixoDoToken(token),
      token: token ?? null,
      registradoEm: Date.now(),
    }),
  registrarEnvio: (envio, erro) => set({ envio, erroEnvio: erro ?? null }),
  reset: () => set(INICIAL),
}));
