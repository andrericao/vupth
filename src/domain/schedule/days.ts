// Gera a faixa de dias do seletor de "Agendar" (Item ② — Agendar = INTENÇÃO).
// UX (Andre 2026-07-15): um único "Agendar" mostra "Hoje" e depois os números
// dos dias seguintes. O horizonte casa com o do backend (intenção até 30 dias).

export interface DayOption {
  date: Date; // meia-noite local do dia
  isToday: boolean;
  dayNumber: number; // dia do mês (1-31)
  weekday: string; // abreviação PT-BR (dom..sáb)
  label: string; // "Hoje" no primeiro; senão o número do dia
}

const WEEKDAYS_PT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// Horizonte de agendamento (dias, incluindo hoje). Casa com o teto de 30 dias do
// backend (422 INTENTION_HORIZON_EXCEEDED).
export const SCHEDULE_HORIZON_DAYS = 30;

/**
 * Lista os dias agendáveis a partir de `from` (inclusive), começando na meia-noite
 * local. O primeiro é "Hoje". Usa construção por (ano, mês, dia+i) para normalizar
 * viradas de mês/ano corretamente.
 */
export function buildDayOptions(from: Date, count: number = SCHEDULE_HORIZON_DAYS): DayOption[] {
  const options: DayOption[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const isToday = i === 0;
    options.push({
      date,
      isToday,
      dayNumber: date.getDate(),
      weekday: WEEKDAYS_PT[date.getDay()],
      label: isToday ? 'Hoje' : String(date.getDate()),
    });
  }
  return options;
}

/** Dois dias são o mesmo dia do calendário (local)? Usado pra marcar o selecionado. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
