import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

// Atendimentos cujo aviso de ATRASO o cliente já tocou.
//
// "Não podemos agir na surdina" (Andre, 18/09): o toque é o registro de que ele
// soube. Guardar isso é o que impede o poll de 30s repetir a caixa a cada volta
// — e aviso que reaparece sozinho deixa de ser aviso, vira ruído.
//
// Persistido de propósito: fechar o app não pode "desavisar" ninguém, nem
// fazer a caixa voltar na próxima abertura.
//
// ⚠️ Hoje isto vive só no aparelho. Quando o backend expuser a ciência (pedido
// de 18/09, junto da contagem de atrasos), este store vira cache da fonte da
// verdade — do mesmo jeito que o `ratedStore` espera o `rated` do `client/me`.
const CIENCIA_KEY = 'vupth_ciencia_atraso';

interface CienciaState {
  ids: string[];
  jaSoube: (attendanceId: string) => boolean;
  registrarCiencia: (attendanceId: string) => Promise<void>;
  restoreCiencia: () => Promise<void>;
}

export const useCienciaStore = create<CienciaState>((set, get) => ({
  ids: [],

  jaSoube: (attendanceId) => get().ids.includes(attendanceId),

  registrarCiencia: async (attendanceId) => {
    if (get().ids.includes(attendanceId)) return;
    const ids = [...get().ids, attendanceId];
    set({ ids });
    try {
      await SecureStore.setItemAsync(CIENCIA_KEY, JSON.stringify(ids));
    } catch {
      // Sem disco, o aviso não volta nesta sessão — melhor que não avisar.
    }
  },

  restoreCiencia: async () => {
    try {
      const json = await SecureStore.getItemAsync(CIENCIA_KEY);
      if (json) set({ ids: JSON.parse(json) as string[] });
    } catch {
      // Primeira abertura, ou disco bloqueado.
    }
  },
}));
