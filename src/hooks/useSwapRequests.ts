import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@stores/authStore';
import { swapService } from '@services/swapService';
import { classifySwaps, SwapRequest } from '@domain/queue/swap';

// Item #42 — enquanto o WebSocket não funciona no device, as propostas de troca
// chegam por polling de GET /swap-requests/me (recebidas = sou o alvo).
const POLL_MS = 20000;

export function useSwapRequests(active: boolean) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const myClientId = useAuthStore((s) => s.user?.id ?? null);
  const [requests, setRequests] = useState<SwapRequest[]>([]);

  const refresh = useCallback(async () => {
    if (!accessToken) return;
    try {
      const { data } = await swapService.listMine(accessToken);
      setRequests(data);
    } catch {
      // silencioso: polling volta na próxima janela
    }
  }, [accessToken]);

  useEffect(() => {
    if (!active || !accessToken) return;
    const immediate = setTimeout(refresh, 0); // fora do corpo do effect
    const id = setInterval(refresh, POLL_MS);
    return () => {
      clearTimeout(immediate);
      clearInterval(id);
    };
  }, [active, accessToken, refresh]);

  const { received, sent } = classifySwaps(requests, myClientId);
  return { received, sent, refresh };
}
