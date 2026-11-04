import { api } from '@services/api';
import { openWatchService } from '@services/openWatchService';

jest.mock('@services/api', () => ({ api: { post: jest.fn(), get: jest.fn(), delete: jest.fn() } }));

// avisar-quando-abrir, fatia 1 (BAK-8, Backend 5cca738): POST /open-watches, GET /open-watches/me, DELETE /open-watches/{id}.
describe('openWatchService', () => {
  const auth = { headers: { Authorization: 'Bearer tk' } };
  beforeEach(() => jest.clearAllMocks());

  it('pedir manda a loja, o profissional (opcional) e o tipo', () => {
    openWatchService.pedir({ establishment_id: 'e1', kind: 'NOTIFY_OPEN' }, 'tk');
    expect(api.post).toHaveBeenCalledWith('/open-watches', { establishment_id: 'e1', kind: 'NOTIFY_OPEN' }, auth);
    openWatchService.pedir({ establishment_id: 'e1', professional_id: 'p1', kind: 'QUEUE_MOVING' }, 'tk');
    expect(api.post).toHaveBeenLastCalledWith(
      '/open-watches',
      { establishment_id: 'e1', professional_id: 'p1', kind: 'QUEUE_MOVING' },
      auth,
    );
  });

  it('deHoje lista os meus e cancelar apaga pelo id', () => {
    openWatchService.deHoje('tk');
    expect(api.get).toHaveBeenCalledWith('/open-watches/me', auth);
    openWatchService.cancelar('w1', 'tk');
    expect(api.delete).toHaveBeenCalledWith('/open-watches/w1', auth);
  });
});
