import { useEffect, useState } from "react";

// aguardando-cronometro-e-vez (DEC-149): o tempo estimado conta os SEGUNDOS na tela Aguardando. A previsão é a mesma
// do resto do app (entrada na fila + minutos estimados); só o relógio da tela anda de 1 em 1 segundo.
/** Segundos até a vez, ou `null` enquanto o servidor não disse a previsão. Nunca fica negativo. */
export function segundosAteAVez(
  fila: { enteredAt: number; estimatedMinutes?: number | null } | null | undefined,
  agora: number,
): number | null {
  if (!fila || fila.estimatedMinutes == null) return null;
  const alvo = fila.enteredAt + fila.estimatedMinutes * 60000;
  return Math.max(0, Math.ceil((alvo - agora) / 1000));
}

export function useCronometroDaVez(
  fila: { enteredAt: number; estimatedMinutes?: number | null } | null | undefined,
  ativo: boolean,
): number | null {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ativo]);
  return segundosAteAVez(fila, agora);
}
