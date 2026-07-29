import { mock } from './setup';
import { swapOfferService } from '../../services/swapOfferService';

const offer = {
  id: 'off-1',
  status: 'OPEN',
  direction: 'EARLIER',
  requesterClientId: 'cli-2',
  requesterAttendanceId: 'att-2',
  professionalId: 'prof-1',
  establishmentId: 'est-1',
  serviceItemIds: ['s1'],
  resultingAttendanceId: null,
  createdAt: '2026-07-24T12:00:00.000Z',
  respondedAt: null,
};

describe('SwapOfferService', () => {
  it('create envia POST /swap-offers { attendanceId, direction } + Bearer', async () => {
    mock.onPost('/swap-offers').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer tok');
      expect(JSON.parse(config.data)).toEqual({ attendanceId: 'att-1', direction: 'EARLIER' });
      return [201, offer];
    });

    const res = await swapOfferService.create({ attendanceId: 'att-1', direction: 'EARLIER' }, 'tok');
    expect(res.status).toBe(201);
    expect(res.data.status).toBe('OPEN');
  });

  it('create propaga 422 QUEUE_SWAP_OFFER_NOT_ALLOWED (não SCHEDULED)', async () => {
    mock.onPost('/swap-offers').reply(422, { code: 'QUEUE_SWAP_OFFER_NOT_ALLOWED' });
    await expect(
      swapOfferService.create({ attendanceId: 'att-1', direction: 'LATER' }, 'tok'),
    ).rejects.toMatchObject({ response: { status: 422, data: { code: 'QUEUE_SWAP_OFFER_NOT_ALLOWED' } } });
  });

  // Fatia 2 — solicitante FORA da fila: manda professionalId + serviceItemIds e
  // recebe a oferta com requesterAttendanceId nulo (o atendimento só nasce no aceite).
  it('create fora da fila envia { professionalId, serviceItemIds, direction: EARLIER }', async () => {
    mock.onPost('/swap-offers').reply((config) => {
      expect(JSON.parse(config.data)).toEqual({
        professionalId: 'prof-1',
        serviceItemIds: ['s1', 's2'],
        direction: 'EARLIER',
      });
      return [201, { ...offer, requesterAttendanceId: null, serviceItemIds: ['s1', 's2'] }];
    });

    const res = await swapOfferService.create(
      { professionalId: 'prof-1', serviceItemIds: ['s1', 's2'], direction: 'EARLIER' },
      'tok',
    );
    expect(res.status).toBe(201);
    expect(res.data.requesterAttendanceId).toBeNull();
  });

  it('create fora da fila propaga 422 SERVICE_ITEM_NOT_OF_PROFESSIONAL', async () => {
    mock.onPost('/swap-offers').reply(422, { code: 'SERVICE_ITEM_NOT_OF_PROFESSIONAL' });
    await expect(
      swapOfferService.create(
        { professionalId: 'prof-1', serviceItemIds: ['s9'], direction: 'EARLIER' },
        'tok',
      ),
    ).rejects.toMatchObject({
      response: { status: 422, data: { code: 'SERVICE_ITEM_NOT_OF_PROFESSIONAL' } },
    });
  });

  it('listAcceptable busca GET /swap-offers?professionalId=', async () => {
    mock.onGet('/swap-offers').reply((config) => {
      expect(config.params).toEqual({ professionalId: 'prof-1' });
      return [200, [offer]];
    });

    const res = await swapOfferService.listAcceptable('prof-1', 'tok');
    expect(res.data).toHaveLength(1);
    expect(res.data[0].direction).toBe('EARLIER');
  });

  it('listMine busca GET /swap-offers/me', async () => {
    mock.onGet('/swap-offers/me').reply(200, [offer]);
    const res = await swapOfferService.listMine('tok');
    expect(res.data[0].id).toBe('off-1');
  });

  it('accept envia PATCH /swap-offers/{id}/accept', async () => {
    mock.onPatch('/swap-offers/off-1/accept').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer tok');
      return [200, { ...offer, status: 'ACCEPTED', respondedAt: '2026-07-24T12:05:00.000Z' }];
    });

    const res = await swapOfferService.accept('off-1', 'tok');
    expect(res.data.status).toBe('ACCEPTED');
  });

  it('accept propaga 422 (não elegível / já consumida)', async () => {
    mock.onPatch('/swap-offers/off-1/accept').reply(422, { code: 'SWAP_OFFER_NOT_ACCEPTABLE' });
    await expect(swapOfferService.accept('off-1', 'tok')).rejects.toMatchObject({
      response: { status: 422 },
    });
  });

  it('cancel envia DELETE /swap-offers/{id}', async () => {
    mock.onDelete('/swap-offers/off-1').reply(204);
    const res = await swapOfferService.cancel('off-1', 'tok');
    expect(res.status).toBe(204);
  });
});
