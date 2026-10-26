import { computeAvailableSlots, OccupiedBlock } from './slots';
import { HorariosDaLoja, horarioDeHoje } from '@domain/establishment/horarios';

// Barra de encaixe (F5) — o agendamento de ponta a ponta (Andre, 26/09: "temos
// que incluir essa funcionalidade"). O servidor manda a agenda PUBLICA do
// profissional (Backend 03fafb9, em producao): o piso da fila viva de hoje e os
// horarios ja reservados, anonimos. O horario de cada dia vem da agenda da loja.
// Os blocos sao o mesmo "reservado" que o servidor considera ao aceitar a
// intencao — o que a barra mostra livre e o que ele aceita.

export interface DiaDaAgenda {
  /** YYYY-MM-DD (data local). */
  date: string;
  closed?: boolean;
  /** A loja abre neste dia (ou não configurou o horário). false = a loja nunca abre. */
  store_open?: boolean;
  /** A agenda do próprio profissional não fecha o dia. false com a loja aberta = pede Solicitar. */
  agenda_released?: boolean;
}

export interface AgendaPublica {
  frame: { projectedQueueEnd?: string | null } | null;
  blocks: { start: string; durationMinutes: number }[];
  /** agenda-publica-dias-liberados (Backend 481c56c): um item por dia, com os dois booleanos. */
  days?: DiaDaAgenda[];
}

/**
 * agenda-da-semana-nao-liberada (24/10): o que o dia pede. `fechado` = a loja nunca abre (o dia some);
 * `solicitar` = a loja abre e o profissional não liberou (o cliente solicita); `livre` = agenda direto.
 * Sem o item do dia (Backend anterior), `null`: o app decide pelo horário da loja, como antes.
 */
export function situacaoDoDia(agenda: AgendaPublica | null | undefined, dia: Date): 'fechado' | 'solicitar' | 'livre' | null {
  const iso = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`;
  const d = agenda?.days?.find((x) => x.date === iso);
  if (!d) return null;
  if (d.store_open === false) return 'fechado';
  if (d.agenda_released === false) return 'solicitar';
  return 'livre';
}

/** "08:30" no dia de `dia` (ou `diasDepois` dias adiante), no relogio do aparelho. */
function naHora(dia: Date, hhmm: string | null | undefined, diasDepois = 0): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + diasDepois, h, m, 0, 0).getTime();
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
  let fecha = naHora(p.dia, faixa.closes);
  if (abre == null || fecha == null) return { tipo: 'sem-horario' };
  // Fecha na mesma hora em que abre = 24 horas; fecha ANTES de abrir = a janela
  // vira o dia ("22:00 as 02:00"). A tela da loja ja le as duas assim
  // (`textoDaFaixa`); sem isto o fim caia antes do comeco e todo dia dava
  // "Nao ha horario livre" (agendar-amanha-com-fila-aberta, 18/10).
  if (fecha <= abre) fecha = naHora(p.dia, faixa.closes, 1) as number;

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

