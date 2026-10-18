import * as SecureStore from 'expo-secure-store';

import { useTemaStore, LIMITE_DA_LEITURA_MS } from '@stores/temaStore';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(async () => undefined),
}));
const store = SecureStore as jest.Mocked<typeof SecureStore>;

describe('temaStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTemaStore.setState({ preferencia: 'claro' });
  });

  it('o PADRAO e claro', () => {
    expect(useTemaStore.getState().preferencia).toBe('claro');
  });

  it('escolher guarda no aparelho; valor estranho cai no claro, nunca no escuro', async () => {
    await useTemaStore.getState().escolher('escuro');
    expect(store.setItemAsync).toHaveBeenCalledWith('vupth_tema', 'escuro');
    expect(useTemaStore.getState().preferencia).toBe('escuro');
    await useTemaStore.getState().escolher('noturno' as never);
    expect(store.setItemAsync).toHaveBeenLastCalledWith('vupth_tema', 'claro');
    expect(useTemaStore.getState().preferencia).toBe('claro');
  });

  it('restaurar le do aparelho', async () => {
    store.getItemAsync.mockResolvedValueOnce('automatico');
    await useTemaStore.getState().restaurar();
    expect(store.getItemAsync).toHaveBeenCalledWith('vupth_tema');
    expect(useTemaStore.getState()).toMatchObject({ preferencia: 'automatico' });
  });

  it.each([null, '', 'dark', 'ESCURO', '1'])('restaurar com %p guardado volta ao claro', async (guardado) => {
    useTemaStore.setState({ preferencia: 'escuro' });
    store.getItemAsync.mockResolvedValueOnce(guardado);
    await useTemaStore.getState().restaurar();
    expect(useTemaStore.getState()).toMatchObject({ preferencia: 'claro' });
  });

  it('falha do armazenamento nao quebra e o app segue no claro', async () => {
    store.getItemAsync.mockRejectedValueOnce(new Error('x'));
    await expect(useTemaStore.getState().restaurar()).resolves.toBeUndefined();
    expect(useTemaStore.getState().preferencia).toBe('claro');
    store.setItemAsync.mockRejectedValueOnce(new Error('x'));
    await expect(useTemaStore.getState().escolher('escuro')).resolves.toBeUndefined();
    expect(useTemaStore.getState().preferencia).toBe('escuro');
  });

  it('cofre que nao responde nao prende o app: passado o limite abre no claro', async () => {
    jest.useFakeTimers();
    try {
      store.getItemAsync.mockReturnValueOnce(new Promise(() => {}));
      useTemaStore.setState({ preferencia: 'escuro' });
      const leitura = useTemaStore.getState().restaurar();
      await jest.advanceTimersByTimeAsync(LIMITE_DA_LEITURA_MS);
      await leitura;
      expect(useTemaStore.getState()).toMatchObject({ preferencia: 'claro' });
    } finally {
      jest.useRealTimers();
    }
  });
});
