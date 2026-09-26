import { mock } from './setup';
import { attendanceService } from '../../services/attendanceService';

describe('AttendanceService', () => {
  it('create deve enviar dados e Bearer token', async () => {
    mock.onPost('/attendances').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      return [201, { id: 'att-1', status: 'SCHEDULED' }];
    });

    const response = await attendanceService.create(
      { professionalId: 'prof-1', establishmentId: 'est-1', serviceItemIds: ['s1'] },
      'my-token',
    );

    expect(response.status).toBe(201);
    expect(response.data.status).toBe('SCHEDULED');
  });

  it('cancel deve enviar PUT com Bearer token', async () => {
    mock.onPut('/attendances/att-1/cancel').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      return [200, { id: 'att-1', status: 'CANCELLED' }];
    });

    const response = await attendanceService.cancel('att-1', 'my-token');

    expect(response.status).toBe(200);
    expect(response.data.status).toBe('CANCELLED');
  });

  it('cancel leva a ciência da multa: o valor confirmado vai em acknowledgedPenalty', async () => {
    mock.onPut('/attendances/att-1/cancel').reply((config) => [200, { params: config.params ?? null }]);

    const comMulta = await attendanceService.cancel('att-1', 'my-token', 5);
    expect((comMulta.data as any).params).toEqual({ acknowledgedPenalty: '5.00' });

    const semMulta = await attendanceService.cancel('att-1', 'my-token');
    expect((semMulta.data as any).params).toBeNull();

    const zero = await attendanceService.cancel('att-1', 'my-token', 0);
    expect((zero.data as any).params).toBeNull();
  });

  it('listClientHistory deve buscar GET /attendances/client/me com Bearer token', async () => {
    mock.onGet('/attendances/client/me').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      return [
        200,
        [
          {
            id: 'att-1',
            clientId: 'cli-1',
            clientName: 'Joao',
            professionalId: 'prof-1',
            professionalName: 'Carlos',
            establishmentId: 'est-1',
            services: [{ id: 's1', customName: 'Corte', estimatedMinutes: 30 }],
            status: 'FINISHED',
            totalValue: 35,
            scheduledTime: '2026-06-01T14:00:00Z',
            startTime: '2026-06-01T14:02:00Z',
            endTime: '2026-06-01T14:28:00Z',
            durationInMinutes: 26,
          },
        ],
      ];
    });

    const response = await attendanceService.listClientHistory('my-token');

    expect(response.data).toHaveLength(1);
    expect(response.data[0].status).toBe('FINISHED');
    expect(response.data[0].professionalName).toBe('Carlos');
  });

  it('listClientHistory deve repassar filtros como query params', async () => {
    mock.onGet('/attendances/client/me').reply((config) => {
      expect(config.params).toEqual({ status: 'FINISHED' });
      return [200, []];
    });

    const response = await attendanceService.listClientHistory('my-token', {
      status: 'FINISHED',
    });

    expect(response.data).toEqual([]);
  });

  // Item 16 — remanejar cliente com espera longa
  it('reschedule deve enviar PATCH com targetTime no query + Bearer token', async () => {
    mock.onPatch('/attendances/att-1/reschedule').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      expect(config.params).toEqual({ targetTime: '2026-07-03T11:00:00.000Z' });
      return [200, { id: 'att-1', status: 'SCHEDULED', isIntent: true, targetTime: '2026-07-03T11:00:00.000Z' }];
    });

    const response = await attendanceService.reschedule(
      'att-1',
      '2026-07-03T11:00:00.000Z',
      'my-token',
    );

    expect(response.status).toBe(200);
    expect(response.data.isIntent).toBe(true);
    expect(response.data.targetTime).toBe('2026-07-03T11:00:00.000Z');
  });

  it('reschedule deve propagar 422 (alvo inviável)', async () => {
    mock.onPatch('/attendances/att-1/reschedule').reply(422, { code: 'QUEUE_TARGET_NOT_FEASIBLE' });

    await expect(
      attendanceService.reschedule('att-1', '2026-07-03T11:00:00.000Z', 'my-token'),
    ).rejects.toMatchObject({ response: { status: 422 } });
  });

  it('moveToEnd deve enviar PATCH com Bearer token', async () => {
    mock.onPatch('/attendances/att-1/move-to-end').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      return [200, { id: 'att-1', status: 'SCHEDULED' }];
    });

    const response = await attendanceService.moveToEnd('att-1', 'my-token');

    expect(response.status).toBe(200);
    expect(response.data.status).toBe('SCHEDULED');
  });
});
