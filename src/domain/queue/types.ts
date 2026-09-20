export type AttendanceStatus =
  | 'SCHEDULED'
  // Chamado e não apareceu. Existe no backend desde sempre (o `leave.ts` e o
  // `swap.ts` já o tratavam como fila ocupada), mas faltava aqui — e sem o
  // status no tipo não havia como avisar o cliente do próprio atraso.
  | 'LATE'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'FINISHED'
  | 'CANCELLED';

export interface Attendance {
  id: string;
  clientId: string;
  professionalId: string;
  establishmentId: string;
  serviceItemIds: string[];
  scheduledTime: string;
  status: AttendanceStatus;
}

export interface QueuePosition {
  attendanceId: string;
  position: number;
  estimatedWaitMinutes: number;
  professionalName: string;
  establishmentName: string;
  status: AttendanceStatus;
}

export type QueueNotificationType =
  | 'ATTENDANCE_STARTED'
  | 'ATTENDANCE_FINISHED'
  // Profissional removeu da fila (BUG9) — o client limpa a fila ativa na hora.
  | 'ATTENDANCE_CANCELLED'
  // INTENÇÃO promovida a SCHEDULED (entrou na fila viva — backend 2026-07-22).
  | 'ATTENDANCE_PROMOTED'
  // Solicitar corte (BUG5 C2): resposta do profissional / expiração em 5min.
  | 'CUT_ACCEPTED'
  | 'CUT_REFUSED'
  | 'CUT_EXPIRED'
  // Troca aberta (C13): a oferta foi aceita — chega aos DOIS lados, cada um com
  // o próprio attendanceId; o app só recarrega a posição.
  | 'SWAP_OFFER_ACCEPTED';

export interface QueueNotification {
  type: QueueNotificationType;
  attendanceId: string;
  establishmentId: string;
  message: string;
  timestamp: string;
  // CUT_*: id do pedido de corte viaja em campo próprio (CUT_ACCEPTED também
  // preenche attendanceId com o atendimento gerado).
  cutRequestId?: string | null;
}

export function canCancelAttendance(status: AttendanceStatus): boolean {
  return status === 'SCHEDULED';
}

/**
 * Decide se a tela de fila deve CRIAR um atendimento novo.
 * Só cria no fluxo "entrar na fila" (veio com serviços selecionados).
 * Re-entrar na tela (banner da Home/Atendimentos, sem serviços) nunca cria —
 * evita o erro "no service found" e filas-fantasma sem attendanceId.
 */
/**
 * A fila guardada no aparelho já ACABOU? Então ela não representa mais nada —
 * é histórico, e histórico não bloqueia atendimento novo.
 */
export function filaEncerrada(status?: string | null): boolean {
  return status === 'FINISHED' || status === 'CANCELLED';
}

export function shouldCreateAttendance(params: {
  alreadyCreated: boolean;
  hasAttendanceId: boolean;
  hasToken: boolean;
  serviceItemIds?: string[];
  /** Status da fila que o aparelho tem guardada, se houver. */
  localStatus?: string | null;
}): boolean {
  const { alreadyCreated, hasAttendanceId, hasToken, serviceItemIds, localStatus } = params;
  if (alreadyCreated || !hasToken) return false;
  // 🔴 Andre, 19/09: "não consigo marcar o corte... se ele fugiu do popup de
  // avaliar e marcar de novo com o mesmo profissional, é encaminhado à tela de
  // avaliação". A fila local ficava com o atendimento TERMINADO até alguém
  // tocar em "Concluir" — e quem fecha o app na tela da avaliação nunca toca.
  // Daí em diante toda tentativa caía naquela tela, porque havia `attendanceId`.
  //
  // Atendimento encerrado NÃO é fila: pode marcar de novo. A avaliação continua
  // disponível na aba Atendimentos, que é onde ela não atrapalha.
  if (hasAttendanceId && !filaEncerrada(localStatus)) return false;
  return (serviceItemIds?.length ?? 0) > 0;
}

/**
 * Reconcilia o countdown local com a estimativa do servidor mantendo-o
 * MONOTÔNICO (nunca pula pra cima a cada poll — o que causava o "tempo volta
 * pra 1h"). Retorna o novo âncora { enteredAt, estimatedMinutes } a aplicar, ou
 * `null` para manter como está (segue descontando localmente).
 *
 * - servidor indica MENOS tempo (fila andou) → re-ancora pra baixo.
 * - servidor indica MAIS tempo mas já zeramos localmente → re-ancora pra cima
 *   (evita mostrar "Agora" indevidamente quando ainda há espera real).
 * - servidor indica um pouco mais e ainda estamos descontando → ignora (sem pulo).
 * O sinal autoritativo de "é a sua vez" vem do WebSocket, não do zero local.
 */
export function reconcileQueueEstimate(
  current: { enteredAt: number; estimatedMinutes: number },
  serverEstimateMinutes: number,
  now: number,
): { enteredAt: number; estimatedMinutes: number } | null {
  const elapsedMin = (now - current.enteredAt) / 60000;
  const currentRemaining = current.estimatedMinutes - elapsedMin;

  if (serverEstimateMinutes <= currentRemaining || currentRemaining <= 0) {
    return { enteredAt: now, estimatedMinutes: serverEstimateMinutes };
  }
  return null;
}

export function isActiveAttendance(status: AttendanceStatus): boolean {
  return status === 'SCHEDULED' || status === 'IN_PROGRESS' || status === 'PAUSED';
}

/**
 * Limiar (min) da multa: qualquer ação que VAGA um lugar perto do início —
 * sair, reagendar ou ir pro fim — prejudica quem se segue (é atendido antes do
 * previsto). Se falta MENOS que isso para ser atendido, gera multa.
 */
export const LATE_PENALTY_THRESHOLD_MINUTES = 60;

/** Valor da multa por vagar um lugar em espera curta (R$). */
export const CANCELLATION_PENALTY_VALUE = 3;

/**
 * Remanejar/sair (Item 16) — trocar de horário, ir pro fim ou sair — só faz
 * sentido enquanto o cliente aguarda (SCHEDULED). A TROCA por consentimento
 * mútuo (#42) é a única sempre sem multa (o tempo da fila não muda).
 */
export function canReshuffleQueue(status: AttendanceStatus): boolean {
  return status === 'SCHEDULED';
}

/**
 * Gera multa? Regra pelo TEMPO estimado (não pelo status): vagar um lugar com
 * MENOS de 1h para ser atendido prejudica quem se segue → multa. Vale para
 * sair da fila, reagendar e ir pro fim (a troca #42 não passa por aqui).
 */
export function incursLatePenalty(remainingMinutes: number): boolean {
  return remainingMinutes < LATE_PENALTY_THRESHOLD_MINUTES;
}

/**
 * Alvo (ms) para HOJE às HH:MM no relógio local, a partir do dia de `dayRefMs`.
 * O cliente digita o horário que deseja (Item 16 — formulário, sem sugestões).
 */
export function buildTargetFromTime(dayRefMs: number, hours: number, minutes: number): number {
  const d = new Date(dayRefMs);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

/**
 * Valida o horário digitado para reagendar. Retorna a mensagem de erro ou `null`
 * se ok. A validação de fechamento/refeição é AUTORITATIVA no backend; aqui só
 * cobrimos o básico (formato + não antes do fim da fila de hoje).
 */
export function validateRescheduleTime(
  hours: number,
  minutes: number,
  targetMs: number,
  floorMs: number,
): string | null {
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) return 'Hora inválida (00–23).';
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) return 'Minuto inválido (00–59).';
  if (targetMs < floorMs) return 'Escolha um horário após o fim da fila de hoje.';
  return null;
}

/** Mensagem amigável para os erros do reschedule (Item 16). */
export function rescheduleErrorMessage(status?: number, code?: string): string {
  if (status === 422 || code === 'QUEUE_TARGET_NOT_FEASIBLE') {
    return 'A fila já prevê te atender nesse horário ou depois. Escolha um horário mais adiante.';
  }
  if (status === 400) return 'Horário inválido. Escolha um horário no futuro.';
  if (status === 403) return 'Você não pode remanejar este atendimento.';
  return 'Não foi possível reagendar. Tente novamente.';
}

/** Mensagem amigável para os erros do move-to-end (Item 16). */
export function moveToEndErrorMessage(status?: number): string {
  if (status === 400) return 'Só é possível ir para o fim da fila enquanto você aguarda.';
  if (status === 403) return 'Você não pode remanejar este atendimento.';
  return 'Não foi possível ir para o fim da fila. Tente novamente.';
}

/** Formata um Date como HH:MM (relógio local, 24h). */
export function formatClockTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Horário previsto de início do atendimento = agora + tempo de espera restante.
 * Retorna "HH:MM". Minutos negativos são tratados como 0 (previsão = agora).
 */
export function estimatedStartTime(nowMs: number, remainingMinutes: number): string {
  const safeMinutes = Math.max(0, remainingMinutes);
  return formatClockTime(new Date(nowMs + safeMinutes * 60000));
}

/** Tempo decorrido em segundos → "m:ss" (ou "h:mm:ss" acima de 1h). */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function formatWaitTime(minutes: number): string {
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}min`;
}
