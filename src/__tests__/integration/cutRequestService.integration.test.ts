import { mock } from './setup';
import { cutRequestService } from '../../services/cutRequestService';

describe('CutRequestService', () => {
  it('create envia POST /attendances/cut-requests com corpo e Bearer token', async () => {
    mock.onPost('/attendances/cut-requests').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer my-token');
      expect(JSON.parse(config.data)).toEqual({
        professionalId: 'prof-1',
        establishmentId: 'est-1',
        serviceItemIds: ['s1'],
      });
      return [
        201,
        {
          id: 'cut-1',
          status: 'PENDING',
          professional_id: 'prof-1',
          establishment_id: 'est-1',
          client_id: 'cli-1',
          service_item_ids: ['s1'],
          expires_at: '2026-07-22T12:05:00.000Z',
          created_at: '2026-07-22T12:00:00.000Z',
          resulting_attendance_id: null,
        },
      ];
    });

    const response = await cutRequestService.create(
      { professionalId: 'prof-1', establishmentId: 'est-1', serviceItemIds: ['s1'] },
      'my-token',
    );

    expect(response.status).toBe(201);
    expect(response.data.status).toBe('PENDING');
    expect(response.data.expires_at).toBeTruthy();
  });

  it('create propaga 409 CUT_REQUEST_NOT_ALLOWED (loja aberta agora)', async () => {
    mock.onPost('/attendances/cut-requests').reply(409, { code: 'CUT_REQUEST_NOT_ALLOWED' });

    await expect(
      cutRequestService.create(
        { professionalId: 'prof-1', establishmentId: 'est-1', serviceItemIds: ['s1'] },
        'my-token',
      ),
    ).rejects.toMatchObject({ response: { status: 409, data: { code: 'CUT_REQUEST_NOT_ALLOWED' } } });
  });
});
