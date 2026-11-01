import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppState } from "react-native";
import { focusManager, onlineManager } from "@tanstack/react-query";

// `isConnected` pode ser null (desconhecido) — tratamos como ONLINE (otimista)
// para nao mostrar "offline" indevidamente.
const isUp = (connected: boolean | null) => connected !== false;

let configured = false;

/**
 * Integra o React Query com a conectividade real (netinfo). Offline: pausa as
 * queries (para de tentar/gastar bateria). Ao reconectar: retoma e
 * re-sincroniza automaticamente. Chamar 1x no boot do app.
 */
export function setupOnlineManager() {
  if (configured) return;
  configured = true;
  // Defensivo: netinfo e modulo NATIVO. Se o build atual nao o inclui (ex.: OTA
  // sobre um APK antigo, runtimeVersion=appVersion), chamar o nativo lanca —
  // engolimos e seguimos assumindo online. A deteccao ativa no proximo EAS build.
  try {
    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) => setOnline(isUp(state.isConnected))),
    );
  } catch {
    // sem netinfo nativo -> mantem o comportamento padrao (sempre online)
  }
}

let focusConfigured = false;

/**
 * estudo-desempenho (DEC-145/146): no React Native o React Query nao sabe quando o app vai ao segundo plano
 * nem quando volta (o "foco da janela" e do navegador). Ligado ao AppState: em segundo plano o polling
 * (refetchInterval) para de gastar rede e bateria, e ao voltar as queries velhas (alem do staleTime)
 * refazem sozinhas — a fila e as ofertas aparecem frescas, sem esperar o proximo ciclo. Chamar 1x no boot.
 */
export function setupFocusManager() {
  if (focusConfigured) return;
  focusConfigured = true;
  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener("change", (estado) => handleFocus(estado === "active"));
    return () => sub.remove();
  });
}

/** true quando ha conexao (otimista quando o estado e desconhecido/sem netinfo). */
export function useIsOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    try {
      const unsub = NetInfo.addEventListener((s) => setOnline(isUp(s.isConnected)));
      return unsub;
    } catch {
      return undefined; // sem netinfo nativo -> fica online
    }
  }, []);
  return online;
}
