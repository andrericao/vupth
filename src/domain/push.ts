// Notificações push (Expo) — LÓGICA PURA, sem importar módulos nativos
// (expo-notifications/expo-device). O wiring nativo vive em
// src/hooks/usePushRegistration (a criar quando houver `eas build` com o módulo).
// Contrato do backend (PRD_BACKEND "Notificações push"): POST /devices {token,
// platform}, DELETE /devices/{token} (token url-encodado por causa dos colchetes).

export type DevicePlatform = 'ios' | 'android' | 'web';

export function mapPlatform(os: string): DevicePlatform {
  if (os === 'ios' || os === 'android' || os === 'web') return os;
  return 'android';
}

// O token Expo vem como "ExponentPushToken[...]". Os colchetes crus no path são
// rejeitados pelo Tomcat (400); por isso encodamos o segmento no DELETE.
export function deviceDeletePath(token: string): string {
  return `/devices/${encodeURIComponent(token)}`;
}

// Roteia o toque na notificação pelo `data.type` que o backend manda no push.
// No app-cliente os tipos conhecidos levam para a aba Atendimentos (fila ao vivo +
// agendamentos); tipo desconhecido/ausente => null (não navega).
export function notificationRoute(data: unknown): string | null {
  const type = (data as { type?: unknown } | null | undefined)?.type;
  if (typeof type !== 'string') return null;
  const known =
    type === 'ATTENDANCE_STARTED' ||
    type === 'ATTENDANCE_FINISHED' ||
    type === 'ATTENDANCE_PROMOTED' ||
    type === 'ATTENDANCE_CANCELLED' ||
    type === 'QUEUE_NEXT_IN_LINE' ||
    type.startsWith('CUT_');
  return known ? 'attendances' : null;
}

// Dependências nativas injetadas (expo-notifications/expo-device) — mantém a
// máquina de permissão 100% testável sem tocar em módulo nativo.
export type PushEnv = {
  isDevice: boolean;
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getExpoPushTokenAsync: (opts: { projectId?: string }) => Promise<{ data: string }>;
  projectId?: string;
};

// Pede permissão (se preciso) e devolve o Expo Push Token, ou null quando não é
// device físico / permissão negada. Best-effort: nunca lança.
export async function acquireExpoPushToken(env: PushEnv): Promise<string | null> {
  // Emulador/web não recebem push remoto — nem pede permissão.
  if (!env.isDevice) return null;

  let { status } = await env.getPermissionsAsync();
  if (status !== 'granted') {
    status = (await env.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') return null;

  const { data } = await env.getExpoPushTokenAsync({ projectId: env.projectId });
  return data ?? null;
}
