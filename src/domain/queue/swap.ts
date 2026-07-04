// Item #42 — Troca de posição na fila por consentimento mútuo (cliente↔cliente).
// Helpers puros (testáveis) para classificar propostas e listar candidatos.

export type SwapRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

// Espelha o SwapRequestResponse do backend (só ids — a fila é anônima).
export interface SwapRequest {
  id: string;
  status: SwapRequestStatus;
  proposerAttendanceId: string;
  proposerClientId: string | null;
  targetAttendanceId: string;
  targetClientId: string | null;
  establishmentId: string | null;
  professionalId: string | null;
  createdAt: string;
  respondedAt: string | null;
}

// Forma mínima de um membro da fila (subconjunto de AttendanceInQueueResponse).
export interface QueueMemberLike {
  id: string;
  status: string;
}

export interface SwapCandidate {
  attendanceId: string;
  position: number; // 1-based na fila de espera
}

/**
 * Divide as propostas PENDING (de `GET /swap-requests/me`) em **recebidas**
 * (sou o alvo → mostro aceitar/recusar) e **enviadas** (sou o proponente →
 * aguardo resposta).
 */
export function classifySwaps(
  list: SwapRequest[],
  myClientId: string | null,
): { received: SwapRequest[]; sent: SwapRequest[] } {
  const pending = list.filter((s) => s.status === 'PENDING');
  return {
    received: pending.filter((s) => !!myClientId && s.targetClientId === myClientId),
    sent: pending.filter((s) => !!myClientId && s.proposerClientId === myClientId),
  };
}

/**
 * Candidatos a troca: os OUTROS atendimentos que aguardam (SCHEDULED) na fila,
 * com a posição 1-based. Exclui o próprio atendimento.
 */
export function swapCandidates(
  queue: QueueMemberLike[],
  myAttendanceId: string | null,
): SwapCandidate[] {
  const waiting = queue.filter((a) => a.status === 'SCHEDULED');
  return waiting
    .map((a, i) => ({ attendanceId: a.id, position: i + 1 }))
    .filter((c) => c.attendanceId !== myAttendanceId);
}

/** Posição (1-based) de um atendimento na fila de espera, ou null se não achar. */
export function positionOf(queue: QueueMemberLike[], attendanceId: string | null): number | null {
  if (!attendanceId) return null;
  const waiting = queue.filter((a) => a.status === 'SCHEDULED');
  const idx = waiting.findIndex((a) => a.id === attendanceId);
  return idx >= 0 ? idx + 1 : null;
}

/** Mensagem amigável para os erros do propor troca (#42). */
export function swapErrorMessage(status?: number): string {
  if (status === 409) return 'Já existe uma proposta de troca em aberto com este cliente.';
  if (status === 422) return 'Não é possível trocar com esse cliente agora (fila diferente ou já atendido).';
  if (status === 403) return 'Você não pode propor essa troca.';
  return 'Não foi possível enviar a proposta. Tente novamente.';
}
