import { IntentionResponse } from '@services/intentionsService';
import { isSameDay } from './days';

export interface IntentionDayGroup {
  // Rótulo do dia: "Hoje", "Amanhã" ou dd/mm.
  dayLabel: string;
  // Meia-noite local do dia (chave estável para keys/ordenação).
  day: Date;
  items: IntentionResponse[];
}

function dayLabelFor(date: Date, now: Date): string {
  if (isSameDay(date, now)) return 'Hoje';
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (isSameDay(date, tomorrow)) return 'Amanhã';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

/**
 * Agrupa as intenções por DIA do `desiredTime` (local), preservando a ordenação
 * por horário dentro do dia e ordenando os grupos cronologicamente.
 * Intenções com `desiredTime` inválido são ignoradas (defensivo).
 */
export function groupIntentionsByDay(
  intentions: IntentionResponse[],
  now: Date = new Date(),
): IntentionDayGroup[] {
  const groups: IntentionDayGroup[] = [];

  const sorted = [...intentions].sort(
    (a, b) => Date.parse(a.desiredTime) - Date.parse(b.desiredTime),
  );

  for (const intention of sorted) {
    const ms = Date.parse(intention.desiredTime);
    if (Number.isNaN(ms)) continue;
    const date = new Date(ms);
    const last = groups[groups.length - 1];
    if (last && isSameDay(last.day, date)) {
      last.items.push(intention);
    } else {
      groups.push({
        day: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        dayLabel: dayLabelFor(date, now),
        items: [intention],
      });
    }
  }

  return groups;
}
