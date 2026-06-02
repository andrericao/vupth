import { useQueueStore } from '@stores/queueStore';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

const QUEUE_KEY = 'vupth_active_queue';

const sampleQueue = {
  attendanceId: 'att-1',
  professionalId: 'prof-1',
  professionalName: 'Carlos',
  establishmentId: 'est-1',
  establishmentName: 'Barbearia Top',
};

describe('QueueStore', () => {
  beforeEach(() => {
    useQueueStore.setState({ activeQueue: null });
    jest.clearAllMocks();
  });

  it('deve iniciar sem fila ativa', () => {
    const { activeQueue } = useQueueStore.getState();
    expect(activeQueue).toBeNull();
  });

  it('joinQueue deve salvar fila ativa no state e SecureStore', async () => {
    await useQueueStore.getState().joinQueue(sampleQueue);

    const { activeQueue } = useQueueStore.getState();
    expect(activeQueue).toEqual(sampleQueue);
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      QUEUE_KEY,
      JSON.stringify(sampleQueue)
    );
  });

  it('leaveQueue deve limpar fila ativa e SecureStore', async () => {
    await useQueueStore.getState().joinQueue(sampleQueue);
    await useQueueStore.getState().leaveQueue();

    const { activeQueue } = useQueueStore.getState();
    expect(activeQueue).toBeNull();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(QUEUE_KEY);
  });

  it('restoreQueue deve restaurar fila do SecureStore', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify(sampleQueue));

    await useQueueStore.getState().restoreQueue();

    const { activeQueue } = useQueueStore.getState();
    expect(activeQueue).toEqual(sampleQueue);
  });

  it('restoreQueue sem dados deve manter null', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

    await useQueueStore.getState().restoreQueue();

    const { activeQueue } = useQueueStore.getState();
    expect(activeQueue).toBeNull();
  });

  it('restoreQueue com erro deve manter null', async () => {
    mockSecureStore.getItemAsync.mockRejectedValueOnce(new Error('fail'));

    await useQueueStore.getState().restoreQueue();

    const { activeQueue } = useQueueStore.getState();
    expect(activeQueue).toBeNull();
  });

  it('joinQueue deve sobrescrever fila anterior', async () => {
    await useQueueStore.getState().joinQueue(sampleQueue);

    const newQueue = { ...sampleQueue, professionalName: 'Pedro' };
    await useQueueStore.getState().joinQueue(newQueue);

    const { activeQueue } = useQueueStore.getState();
    expect(activeQueue?.professionalName).toBe('Pedro');
  });
});
