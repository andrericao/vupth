import Constants from "expo-constants";

import { resolveApiEnv } from "../services/apiEnv";
import { iniciarSentry } from "../utils/sentry";

// log-de-falha-na-abertura (DEC-152): o Sentry sobe ANTES do App (o index.js importa este arquivo primeiro). Assim o
// erro ao carregar o bundle e nos primeiros segundos tambem e visto; o crash nativo o SDK nativo ja pega. O erro de
// import do proprio App passa por aqui antes de existir.
//
// Cada evento leva a versao, o runtime e o OTA em execucao (a tela Sistema mostra os mesmos), para ligar a queda ao
// OTA. Sem DSN no ambiente, ou sem o modulo nativo no binario, fica inerte.

function doExpoUpdates(): { channel?: string | null; updateId?: string | null; runtimeVersion?: string | null } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Updates = require("expo-updates");
    return { channel: Updates.channel, updateId: Updates.updateId, runtimeVersion: Updates.runtimeVersion };
  } catch {
    return {};
  }
}

const u = doExpoUpdates();
const extra = Constants.expoConfig?.extra as { commit?: unknown } | undefined;
const commit = typeof extra?.commit === "string" ? extra.commit : null;

export const sentryLigadoCedo = iniciarSentry({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  ambiente: resolveApiEnv(u.channel ?? null, process.env.EXPO_PUBLIC_API_ENV),
  commit,
  emTeste: !!process.env.JEST_WORKER_ID,
  tags: {
    updateId: u.updateId,
    runtimeVersion: u.runtimeVersion,
    versao: Constants.expoConfig?.version ?? null,
    commit,
  },
});
