import { mock } from './setup';
import { intentionsService } from '../../services/intentionsService';

const intentionResponse = {
  id: 'int-1',
  establishmentId: 'est-1',
  establishmentName: 'Barbearia',
  professionalId: 'prof-1',
  professionalName: 'Carlos',
  clientId: 'cli-1',
  clientName: 'Joao',
  services: [{ id: 's1', customName: 'Corte', estimatedMinutes: 30 }],
  status: 'INTENTION',
  totalValue: 35,
  estimatedMinutes: 30,
  desiredTime: '2026-07-20T17:00:00.000Z',
  estimatedStartTime: '2026-07-20T17:05:00.000Z',
};

describe('IntentionsService', () => {
  it('create deve enviar POST /attendances/intentions com corpo e Bearer token', async () => {
    mock.onPost('/attendances/intentions').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      expect(JSON.parse(config.data)).toEqual({
        professionalId: 'prof-1',
        serviceItemIds: ['s1'],
        desiredTime: '2026-07-20T17:00:00.000Z',
      });
      return [201, intentionResponse];
    });

    const response = await intentionsService.create(
      { professionalId: 'prof-1', serviceItemIds: ['s1'], desiredTime: '2026-07-20T17:00:00.000Z' },
      'my-token',
    );

    expect(response.status).toBe(201);
    expect(response.data.status).toBe('INTENTION');
    expect(response.data.estimatedStartTime).toBe('2026-07-20T17:05:00.000Z');
  });

  it('create deve propagar 422 (fora do expediente)', async () => {
    mock.onPost('/attendances/intentions').reply(422, { code: 'INTENTION_OUTSIDE_BUSINESS_HOURS' });

    await expect(
      intentionsService.create(
        { professionalId: 'prof-1', serviceItemIds: ['s1'], desiredTime: '2026-07-20T23:00:00.000Z' },
        'my-token',
      ),
    ).rejects.toMatchObject({ response: { status: 422 } });
  });

  it('create deve propagar 409 (agenda cheia)', async () => {
    mock.onPost('/attendances/intentions').reply(409, { code: 'PROFESSIONAL_AGENDA_FULL' });

    await expect(
      intentionsService.create(
        { professionalId: 'prof-1', serviceItemIds: ['s1'], desiredTime: '2026-07-20T17:00:00.000Z' },
        'my-token',
      ),
    ).rejects.toMatchObject({ response: { status: 409 } });
  });

  it('update deve enviar PATCH /attendances/intentions/{id} com novo desiredTime', async () => {
    mock.onPatch('/attendances/intentions/int-1').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      expect(JSON.parse(config.data)).toEqual({ desiredTime: '2026-07-20T18:00:00.000Z' });
      return [200, { ...intentionResponse, desiredTime: '2026-07-20T18:00:00.000Z' }];
    });

    const response = await intentionsService.update(
      'int-1',
      { desiredTime: '2026-07-20T18:00:00.000Z' },
      'my-token',
    );

    expect(response.status).toBe(200);
    expect(response.data.desiredTime).toBe('2026-07-20T18:00:00.000Z');
  });

  it('update deve propagar 403 (não é o dono)', async () => {
    mock.onPatch('/attendances/intentions/int-1').reply(403, {});

    await expect(
      intentionsService.update('int-1', { desiredTime: '2026-07-20T18:00:00.000Z' }, 'my-token'),
    ).rejects.toMatchObject({ response: { status: 403 } });
  });

  it('cancel deve enviar DELETE /attendances/intentions/{id} com Bearer token', async () => {
    mock.onDelete('/attendances/intentions/int-1').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      return [204];
    });

    const response = await intentionsService.cancel('int-1', 'my-token');

    expect(response.status).toBe(204);
  });

  it('cancel deve propagar 400 (já promovido/cancelado)', async () => {
    mock.onDelete('/attendances/intentions/int-1').reply(400, { code: 'ATTENDANCE_INVALID_STATUS' });

    await expect(intentionsService.cancel('int-1', 'my-token')).rejects.toMatchObject({
      response: { status: 400 },
    });
  });
});
