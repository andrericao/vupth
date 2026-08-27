import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// O que a pessoa JA viu uma vez. Duas coisas separadas de proposito:
//
// - `onboardingSeen`: a apresentacao do app (tela 02). Some depois da primeira
//   vez e nunca mais volta.
// - `pushAsked`: se ja mostramos a tela que EXPLICA a notificacao antes de
//   pedir a permissao ao sistema (tela 10). Guardado porque o alerta do
//   sistema so aparece UMA vez: se a pessoa nega ali, o app nunca mais pode
//   perguntar. Entao a tela de contexto tem de vir antes, e so uma vez.
const ONBOARDING_KEY = 'vupth_onboarding_seen';
const PUSH_ASKED_KEY = 'vupth_push_asked';

interface FirstRunState {
  onboardingSeen: boolean;
  pushAsked: boolean;
  /** false ate o SecureStore responder — evita piscar o onboarding no boot. */
  restored: boolean;
  markOnboardingSeen: () => Promise<void>;
  markPushAsked: () => Promise<void>;
  restoreFirstRun: () => Promise<void>;
}

export const useFirstRunStore = create<FirstRunState>((set) => ({
  onboardingSeen: false,
  pushAsked: false,
  restored: false,

  markOnboardingSeen: async () => {
    set({ onboardingSeen: true });
    try {
      await SecureStore.setItemAsync(ONBOARDING_KEY, '1');
    } catch {}
  },

  markPushAsked: async () => {
    set({ pushAsked: true });
    try {
      await SecureStore.setItemAsync(PUSH_ASKED_KEY, '1');
    } catch {}
  },

  restoreFirstRun: async () => {
    try {
      const [onboarding, push] = await Promise.all([
        SecureStore.getItemAsync(ONBOARDING_KEY),
        SecureStore.getItemAsync(PUSH_ASKED_KEY),
      ]);
      set({ onboardingSeen: onboarding === '1', pushAsked: push === '1', restored: true });
    } catch {
      // Falha ao ler nao pode prender a pessoa numa tela de abertura eterna:
      // segue como "ja viu" em vez de repetir o onboarding a cada abertura.
      set({ onboardingSeen: true, pushAsked: true, restored: true });
    }
  },
}));
