// Núcleo do "Agendar" (F5, modelo Andre 2026-07-23): em vez de o cliente arrastar
// uma sombra numa barra, o app MOSTRA só os horários em que o serviço cabe. Ele
// escolhe um → vira INTENÇÃO (desiredTime).
//
// Regra (exemplo do Andre): fila vai até 14:00, já há corte agendado às 17:00, o
// cliente novo escolheu serviços que somam 1h → pode começar de 14:00 até 16:00
// (16:00 + 1h = 17:00, encosta sem invadir) OU depois que o corte das 17:00
// terminar. O serviço tem de caber INTEIRO num vão livre, sem cruzar bloco nem
// passar do fechamento.
//
// Puro (opera em ms) — o caller resolve dia + HH:mm → ms (evita fuso aqui). Os
// `blocks` (agendamentos de terceiros) vêm do backend B2; até lá a lista fica só
// com o piso→fechamento (o backend ainda valida no create).

export interface OccupiedBlock {
  startMs: number;
  durationMinutes: number;
}

export interface AvailableSlotsParams {
  // Primeiro instante agendável (piso): hoje = max(agora, projectedQueueEnd);
  // dia futuro = abertura do expediente daquele dia.
  floorMs: number;
  // Fim do expediente (teto) do dia.
  closingMs: number;
  // Agendamentos já ocupados no dia (INTENÇÕES congeladas). Podem vir fora de
  // ordem/sobrepostos — a função ordena e funde.
  blocks: OccupiedBlock[];
  // Soma das durações dos serviços escolhidos (min). O serviço cabe se
  // start + serviceMinutes <= fim do vão.
  serviceMinutes: number;
  // Granularidade dos horários oferecidos (min). Default 30.
  stepMinutes?: number;
}

const MIN = 60_000;

/** Arredonda `ms` para CIMA até a próxima marca de `stepMs` na grade do RELÓGIO
 *  LOCAL (14:00, 14:30…), independente do fuso (usa a meia-noite local do dia). */
function alignUpToLocalStep(ms: number, stepMs: number): number {
  const d = new Date(ms);
  const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const offset = ms - localMidnight;
  return localMidnight + Math.ceil(offset / stepMs) * stepMs;
}

/** Junta blocos ordenados+fundidos em intervalos [start,end] (ms). */
function mergedBlockIntervals(blocks: OccupiedBlock[]): [number, number][] {
  const intervals = blocks
    .filter((b) => b.durationMinutes > 0)
    .map((b) => [b.startMs, b.startMs + b.durationMinutes * MIN] as [number, number])
    .sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  for (const [s, e] of intervals) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) {
      last[1] = Math.max(last[1], e);
    } else {
      merged.push([s, e]);
    }
  }
  return merged;
}

/** Vãos livres em [floor, closing] tirando os blocos ocupados. */
export function freeIntervals(
  floorMs: number,
  closingMs: number,
  blocks: OccupiedBlock[],
): [number, number][] {
  if (closingMs <= floorMs) return [];
  const free: [number, number][] = [];
  let cursor = floorMs;
  for (const [bs, be] of mergedBlockIntervals(blocks)) {
    if (be <= cursor) continue; // bloco totalmente antes do cursor
    if (bs > cursor) free.push([cursor, Math.min(bs, closingMs)]);
    cursor = Math.max(cursor, be);
    if (cursor >= closingMs) break;
  }
  if (cursor < closingMs) free.push([cursor, closingMs]);
  return free.filter(([s, e]) => e > s);
}

/**
 * Horários de INÍCIO em que o serviço cabe inteiro (sem cruzar bloco nem passar
 * do fechamento), alinhados à grade de `stepMinutes` e >= piso. Ordenados.
 */
export function computeAvailableSlots(p: AvailableSlotsParams): Date[] {
  const step = (p.stepMinutes ?? 30) * MIN;
  const service = p.serviceMinutes * MIN;
  if (service <= 0 || step <= 0) return [];

  const slots: Date[] = [];
  for (const [a, b] of freeIntervals(p.floorMs, p.closingMs, p.blocks)) {
    // Primeiro início >= a alinhado à grade do relógio local (nunca antes do piso).
    let start = alignUpToLocalStep(a, step);
    // O serviço tem de terminar até o fim do vão.
    for (; start + service <= b; start += step) {
      slots.push(new Date(start));
    }
  }
  return slots;
}
