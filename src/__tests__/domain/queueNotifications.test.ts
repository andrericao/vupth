import { handleQueueNotification } from '../../domain/queue/notifications';
import { QueueNotification } from '../../domain/queue/types';

function notif(type: QueueNotification['type'], attendanceId = 'att-1'): QueueNotification {
  return { type, attendanceId, establishmentId: 'est-1', message: 'msg', timestamp: 't' };
}

describe('handleQueueNotification', () => {
  const fx = () => ({
    updateQueue: jest.fn(),
    leaveQueue: jest.fn(),
    alert: jest.fn(),
    activeAttendanceId: 'att-1' as string | null,
  });

  it('ATTENDANCE_STARTED → status IN_PROGRESS + alerta "é a sua vez"', () => {
    const f = fx();
    handleQueueNotification(notif('ATTENDANCE_STARTED'), f);
    expect(f.updateQueue).toHaveBeenCalledWith({ status: 'IN_PROGRESS' });
    expect(f.alert).toHaveBeenCalledWith('É a sua vez! 🎉', 'msg');
  });

  it('ATTENDANCE_FINISHED → status FINISHED + alerta', () => {
    const f = fx();
    handleQueueNotification(notif('ATTENDANCE_FINISHED'), f);
    expect(f.updateQueue).toHaveBeenCalledWith({ status: 'FINISHED' });
    expect(f.alert).toHaveBeenCalledWith('Atendimento concluído', 'msg');
  });

  it('ATTENDANCE_PROMOTED → só alerta (intenção virou fila; sem fila ativa local)', () => {
    const f = fx();
    handleQueueNotification(notif('ATTENDANCE_PROMOTED'), f);
    expect(f.alert).toHaveBeenCalledWith('Você entrou na fila! 🎉', 'msg');
    expect(f.updateQueue).not.toHaveBeenCalled();
    expect(f.leaveQueue).not.toHaveBeenCalled();
  });

  it('ATTENDANCE_CANCELLED do attendance ativo → leaveQueue + alerta', () => {
    const f = fx();
    handleQueueNotification(notif('ATTENDANCE_CANCELLED', 'att-1'), f);
    expect(f.leaveQueue).toHaveBeenCalledTimes(1);
    expect(f.alert).toHaveBeenCalledWith('Atendimento cancelado', 'msg');
  });

  it('ATTENDANCE_CANCELLED de OUTRO attendance → alerta sem limpar a fila', () => {
    const f = fx();
    handleQueueNotification(notif('ATTENDANCE_CANCELLED', 'att-OUTRO'), f);
    expect(f.leaveQueue).not.toHaveBeenCalled();
    expect(f.alert).toHaveBeenCalled();
  });

  it('ATTENDANCE_CANCELLED sem fila ativa → não chama leaveQueue', () => {
    const f = { ...fx(), activeAttendanceId: null };
    handleQueueNotification(notif('ATTENDANCE_CANCELLED'), f);
    expect(f.leaveQueue).not.toHaveBeenCalled();
  });

  it.each([
    ['CUT_ACCEPTED', 'Pedido aceito! 🎉'],
    ['CUT_REFUSED', 'Pedido recusado'],
    ['CUT_EXPIRED', 'Pedido expirou'],
  ] as const)('%s → só alerta, sem mexer na fila', (type, title) => {
    const f = fx();
    handleQueueNotification(notif(type), f);
    expect(f.alert).toHaveBeenCalledWith(title, 'msg');
    expect(f.updateQueue).not.toHaveBeenCalled();
    expect(f.leaveQueue).not.toHaveBeenCalled();
  });
});
