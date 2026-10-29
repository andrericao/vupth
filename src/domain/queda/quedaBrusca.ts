import { formatClockTime } from '@domain/queue/types';

// Queda brusca da estimativa (DEC-128, André, 29/10; contrato do Backend 028748a e 59ee957).
// O push SUDDEN_DROP traz `newTime`, `previousTime` e `windowUntil` (texto; "null" quando não há). Sem janela (espera
// nova de 1 h ou mais), o popup mostra só o horário e as opções, sem o cronômetro e sem a promessa de ficar sem multa.

export type QuedaBrusca = {
  attendanceId: string;
  /** O horário novo, "HH:mm"; null quando o push não trouxe um válido. */
  horario: string | null;
  /** Até quando vale a janela sem multa (ms); null = sem janela. */
  janelaAte: number | null;
};

/** O texto do push vira ms; "null", vazio ou inválido = null. */
export function msDoTexto(valor: unknown): number | null {
  if (typeof valor !== 'string' || valor === '' || valor === 'null' || valor === 'None') return null;
  const ms = Date.parse(valor);
  return Number.isNaN(ms) ? null : ms;
}

/** O `data` do push SUDDEN_DROP; qualquer outro tipo (ou sem atendimento) = null. */
export function quedaBruscaDoPush(data: unknown): QuedaBrusca | null {
  const d = (data ?? {}) as { type?: unknown; attendanceId?: unknown; newTime?: unknown; windowUntil?: unknown };
  if (d.type !== 'SUDDEN_DROP' || typeof d.attendanceId !== 'string' || !d.attendanceId) return null;
  const novo = msDoTexto(d.newTime);
  return {
    attendanceId: d.attendanceId,
    horario: novo == null ? null : formatClockTime(new Date(novo)),
    janelaAte: msDoTexto(d.windowUntil),
  };
}

/** O título do popup: "Sua vez adiantou para 14:40!" (ou sem o horário, se não veio). */
export function tituloDaQueda(horario: string | null): string {
  return horario ? `Sua vez adiantou para ${horario}!` : 'Sua vez adiantou!';
}

/** O cronômetro "mm:ss" do que falta da janela; 00:00 depois que acabou. */
export function cronometroDaJanela(janelaAte: number, agora: number): string {
  const total = Math.max(0, Math.floor((janelaAte - agora) / 1000));
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}
