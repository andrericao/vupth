import { mock } from './setup';
import { establishmentService } from '../../services/establishmentService';

describe('EstablishmentService', () => {
  it('getAll deve retornar lista de estabelecimentos', async () => {
    mock.onGet('/establishment').reply(200, [
      { id: 'est-1', name: 'Barbearia Top', ownerId: 'owner-1', urlImage: null, open_status: 'OPEN', status: 'ACTIVE', services: [] },
    ]);

    const response = await establishmentService.getAll();

    expect(response.data).toHaveLength(1);
    expect(response.data[0].name).toBe('Barbearia Top');
  });

  it('getPraOntem pede só as abertas agora e com profissional, com a coordenada em par', async () => {
    mock.onGet('/establishment').reply((config) => [200, [config.params]]);

    const comGps = await establishmentService.getPraOntem({ latitude: -22.9, longitude: -43.2 });
    expect(comGps.data[0]).toEqual({
      openNow: true,
      hasAvailability: true,
      sort: 'wait',
      lat: -22.9,
      lng: -43.2,
    });

    const semGps = await establishmentService.getPraOntem(null);
    expect(semGps.data[0]).toEqual({ openNow: true, hasAvailability: true, sort: 'wait' });
  });

  it('getById deve retornar estabelecimento específico', async () => {
    mock.onGet('/establishment/id/est-1').reply(200, {
      id: 'est-1',
      name: 'Barbearia Top',
      ownerId: 'owner-1',
      urlImage: null,
      open_status: 'OPEN',
      status: 'ACTIVE',
      services: [],
    });

    const response = await establishmentService.getById('est-1');

    expect(response.data.id).toBe('est-1');
  });

  it('getProfessionalsWithQueue deve retornar profissionais', async () => {
    mock.onGet('/establishment/id/est-1/professionals-with-queue').reply(200, {
      id: 'est-1',
      name: 'Barbearia',
      url_image: null,
      services: [],
      owner_id: 'owner-1',
      open_status: 'OPEN',
      total_in_queue: 0,
      available_professionals: 1,
      professionals: [
        { id: 'prof-1', name: 'Carlos', specialty: 'BARBER', isAvailable: true, estimatedWaitMinutes: 15, attendancesInQueue: [] },
      ],
    });

    const response = await establishmentService.getProfessionalsWithQueue('est-1');

    expect(response.data.professionals).toHaveLength(1);
    expect(response.data.professionals[0].name).toBe('Carlos');
  });
});
