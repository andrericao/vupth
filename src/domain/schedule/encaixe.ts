import { computeAvailableSlots, OccupiedBlock } from './slots';
import { HorariosDaLoja, horarioDeHoje } from '@domain/establishment/horarios';

// Barra de encaixe (F5) — o agendamento de ponta a ponta (Andre, 26/09: "temos
// que incluir essa funcionalidade"). O servidor manda a agenda PUBLICA do
// profissional (Backend 03fafb9, em producao): o piso da fila viva de hoje e os
// horarios ja reservados, anonimos. O horario de cada dia vem da agenda da loja.
// Os blocos sao o mesmo "reservado" que o servidor considera ao aceitar a
// intencao — o que a barra mostra livre e o que ele aceita.

export interface AgendaPublica {
  frame: { projectedQueueEnd?: string | null } | null;
  blocks: { start: string; durationMinutes: number }[];
}

/** "08:30" no dia de `dia`, no relogio do aparelho. */
function naHora(dia: Date, hhmm: string | null | undefined): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, m, 0, 0).getTime();
}

const mesmoDia = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export type HorariosDoDia =
  | { tipo: 'livres'; horarios: Date[] }
  | { tipo: 'fechada' }
  | { tipo: 'sem-horario' }
  | { tipo: 'cheio' };

/**
 * Os horarios de INICIO em que o servico cabe naquele dia: dentro do expediente,
 * depois de agora (e, hoje, depois do fim projetado da fila), sem cruzar um
 * horario ja reservado. Grade de 30 min.
 */
export function horariosDoDia(p: {
  dia: Date;
  agoraMs: number;
  horarios: HorariosDaLoja | null | undefined;
  agenda: AgendaPublica | null | undefined;
  minutosDoServico: number;
}): HorariosDoDia {
  const faixa = horarioDeHoje(p.horarios, p.dia);
  if (!faixa) return { tipo: 'sem-horario' };
  if (faixa.closed) return { tipo: 'fechada' };
  const abre = naHora(p.dia, faixa.opens);
  const fecha = naHora(p.dia, faixa.closes);
  if (abre == null || fecha == null) return { tipo: 'sem-horario' };

  let piso = Math.max(abre, p.agoraMs);
  if (mesmoDia(p.dia, new Date(p.agoraMs))) {
    const fimDaFila = p.agenda?.frame?.projectedQueueEnd ? Date.parse(p.agenda.frame.projectedQueueEnd) : NaN;
    if (!Number.isNaN(fimDaFila)) piso = Math.max(piso, fimDaFila);
  }
  const blocos: OccupiedBlock[] = (p.agenda?.blocks ?? [])
    .map((b) => ({ startMs: Date.parse(b.start), durationMinutes: b.durationMinutes }))
    .filter((b) => !Number.isNaN(b.startMs));

  const livres = computeAvailableSlots({
    floorMs: piso,
    closingMs: fecha,
    blocks: blocos,
    serviceMinutes: Math.max(1, p.minutosDoServico),
  });
  return livres.length ? { tipo: 'livres', horarios: livres } : { tipo: 'cheio' };
}

/** A mensagem de cada recusa do servidor ao criar o agendamento. */
export function mensagemDoAgendamento(status?: number, code?: string): string {
  switch (code) {
    case 'INTENTION_OUTSIDE_BUSINESS_HOURS':
      return 'Esse horário está fora do expediente. Escolha outro.';
    case 'INTENTION_HORIZON_EXCEEDED':
      return 'Dá para agendar até 30 dias à frente.';
    case 'INTENTION_BEFORE_QUEUE_END':
      return 'A fila de hoje já vai além desse horário. Escolha um mais tarde.';
    case 'PROFESSIONAL_AGENDA_FULL':
      return 'Esse horário acabou de ser ocupado. Escolha outro.';
  }
  if (status === 400) return 'Esse horário já passou. Escolha outro.';
  return 'Não foi possível agendar. Tente de novo.';
}

