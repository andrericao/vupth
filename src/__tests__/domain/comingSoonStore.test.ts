import { useComingSoonStore } from '@stores/comingSoonStore';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const KEY = 'vupth_coming_soon_taps';

describe('ComingSoonStore', () => {
  beforeEach(() => {
    useComingSoonStore.setState({ counts: {} });
    jest.clearAllMocks();
  });

  it('tap incrementa a contagem e persiste', async () => {
    await useComingSoonStore.getState().tap('agendar_hoje');

    expect(useComingSoonStore.getState().counts).toEqual({ agendar_hoje: 1 });
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      KEY,
      JSON.stringify({ agendar_hoje: 1 }),
    );
  });

  it('tap acumula por feature', async () => {
    await useComingSoonStore.getState().tap('esqueci_senha');
    await useComingSoonStore.getState().tap('esqueci_senha');
    await useComingSoonStore.getState().tap('agendar_outro_dia');

    expect(useComingSoonStore.getState().counts).toEqual({
      esqueci_senha: 2,
      agendar_outro_dia: 1,
    });
  });

  it('restore carrega as contagens do SecureStore', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce(JSON.stringify({ trocar_posicao: 5 }));

    await useComingSoonStore.getState().restore();

    expect(useComingSoonStore.getState().counts).toEqual({ trocar_posicao: 5 });
  });

  it('restore sem dados mantém vazio', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

    await useComingSoonStore.getState().restore();

    expect(useComingSoonStore.getState().counts).toEqual({});
  });

  it('restore com JSON inválido não quebra', async () => {
    mockSecureStore.getItemAsync.mockResolvedValueOnce('{quebrado');

    await useComingSoonStore.getState().restore();

    expect(useComingSoonStore.getState().counts).toEqual({});
  });
});
