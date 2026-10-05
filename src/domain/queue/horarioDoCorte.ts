import { formatClockTime } from './types';

// Pedido de corte com dia e horario (S26, Backend 36c4359): o desiredTime vai
// em ISO-8601 COM o fuso do aparelho ("2026-10-05T14:30:00-03:00"), e nao em
// UTC — o horario que a pessoa escolheu e o que o card do Partner mostra.

const dois = (n: number) => String(n).padStart(2, '0');

/** "2026-10-05T14:30:00-03:00" — a hora local com o deslocamento do aparelho. */
export function comFuso(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sinal = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return (
    `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}` +
    `T${dois(d.getHours())}:${dois(d.getMinutes())}:${dois(d.getSeconds())}` +
    `${sinal}${dois(Math.floor(abs / 60))}:${dois(abs % 60)}`
  );
}

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function inicioDoDia(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "hoje às 14:30", "amanhã às 09:05" ou "qua, 07/10 às 18:00" — o mesmo texto do card do Partner. */
export function quandoDoPedido(horario: Date, agoraMs: number): string {
  const dias = Math.round((inicioDoDia(horario.getTime()) - inicioDoDia(agoraMs)) / 86_400_000);
  const dia =
    dias === 0
      ? 'hoje'
      : dias === 1
        ? 'amanhã'
        : `${DIAS[horario.getDay()]}, ${dois(horario.getDate())}/${dois(horario.getMonth() + 1)}`;
  return `${dia} às ${formatClockTime(horario)}`;
}
