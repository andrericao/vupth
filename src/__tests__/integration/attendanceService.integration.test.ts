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
});
