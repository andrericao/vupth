import { usePendingSwapStore, PendingSwapContext } from '@stores/pendingSwapStore';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const PENDING_SWAP_KEY = 'vupth_pending_swap_offers';

const ctx: PendingSwapContext = {
  offerId: 'off-1',
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  establishmentName: 'Barbearia',
  estimatedWaitMinutes: 25,
};

describe('PendingSwapStore (ofertas publicadas de fora da fila)', () => {
  beforeEach(() => {
    usePendingSwapStore.setState({ offers: [] });
    jest.clearAllMocks();
  });

  it('addPending guarda o contexto e persiste', async () => {
    await usePendingSwapStore.getState().addPending(ctx);

    expect(usePendingSwapStore.getState().offers).toEqual([ctx]);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      PENDING_SWAP_KEY,
      JSON.stringify([ctx]),
    );
  });

  it('addPending do mesmo offerId substitui (não duplica)', async () => {
    await usePendingSwapStore.getState().addPending(ctx);
    await usePendingSwapStore.getState().addPending({ ...ctx, professionalName: 'Novo' });

    const { offers } = usePendingSwapStore.getState();
    expect(offers).toHaveLength(1);
    expect(offers[0].professionalName).toBe('Novo');
  });

  it('removePending tira o pedido e persiste', async () => {
    await usePendingSwapStore.getState().addPending(ctx);
    jest.clearAllMocks();

    await usePendingSwapStore.getState().removePending('off-1');

    expect(usePendingSwapStore.getState().offers).toEqual([]);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(PENDING_SWAP_KEY, '[]');
  });

  it('removePending de id desconhecido não persiste nada', async () => {
    await usePendingSwapStore.getState().removePending('nao-existe');

    expect(mockSecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('restorePending carrega do SecureStore', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify([ctx]));

    await usePendingSwapStore.getState().restorePending();

    expect(usePendingSwapStore.getState().offers).toEqual([ctx]);
  });

  it('restorePending com JSON inválido mantém a lista vazia', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce('{quebrado');

    await usePendingSwapStore.getState().restorePending();

    expect(usePendingSwapStore.getState().offers).toEqual([]);
  });
});
