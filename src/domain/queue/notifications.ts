import { AttendanceStatus, QueueNotification } from './types';

// Efeitos que o handler pode disparar — injetados pelo hook (testável puro).
export interface QueueNotificationEffects {
  updateQueue: (partial: { status: AttendanceStatus }) => unknown;
  leaveQueue: () => unknown;
  alert: (title: string, message?: string) => void;
  // Attendance da fila ativa no momento da notificação (null/undefined = sem fila).
  activeAttendanceId?: string | null;
}

/**
 * Reage a uma notificação pessoal do WS `/user/queue/notifications`.
 *
 * - ATTENDANCE_STARTED/FINISHED: reflete o status na fila ativa + alerta.
 * - ATTENDANCE_PROMOTED (backend 2026-07-22): a INTENÇÃO virou SCHEDULED e entrou
 *   na fila viva — só alerta (não há fila ativa local para atualizar; a tela de
 *   Atendimentos reflete via poll). ⚠️ Entrega in-app é melhor-esforço: o WS só
 *   conecta com fila ativa e o client ainda não registra push token (follow-up).
 * - ATTENDANCE_CANCELLED (BUG9): profissional removeu — limpa a fila ativa
 *   quando o id bate (o poll também cobre, com atraso) + alerta.
 */
export function handleQueueNotification(
  notif: QueueNotification,
  fx: QueueNotificationEffects,
): void {
  switch (notif.type) {
    case 'ATTENDANCE_STARTED':
      fx.updateQueue({ status: 'IN_PROGRESS' });
      fx.alert('É a sua vez! 🎉', notif.message);
      break;
    case 'ATTENDANCE_FINISHED':
      fx.updateQueue({ status: 'FINISHED' });
      fx.alert('Atendimento concluído', notif.message);
      break;
    case 'ATTENDANCE_PROMOTED':
      fx.alert('Você entrou na fila! 🎉', notif.message);
      break;
    case 'ATTENDANCE_CANCELLED':
      if (fx.activeAttendanceId && notif.attendanceId === fx.activeAttendanceId) {
        fx.leaveQueue();
      }
      fx.alert('Atendimento cancelado', notif.message);
      break;
    // Solicitar corte (BUG5 C2): o atendimento aceito entra na fila (o poll de
    // Atendimentos reflete); recusado/expirado é só informação.
    case 'CUT_ACCEPTED':
      fx.alert('Pedido aceito! 🎉', notif.message);
      break;
    case 'CUT_REFUSED':
      fx.alert('Pedido recusado', notif.message);
      break;
    case 'CUT_EXPIRED':
      fx.alert('Pedido expirou', notif.message);
      break;
    // Troca aceita (C13): a posição na fila mudou. O poll da fila/QueueStatus
    // reflete; aqui só avisa.
    case 'SWAP_OFFER_ACCEPTED':
      fx.alert('Troca feita! 🔄', notif.message);
      break;
  }
}
