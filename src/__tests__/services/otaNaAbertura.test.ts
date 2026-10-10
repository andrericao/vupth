import { Platform } from 'react-native';

import { aplicarOtaNaAbertura } from '@services/otaNaAbertura';

// card-oscila (Andre, 10/10): a primeira abertura depois de instalar ou limpar
// os dados roda o bundle do APK; com OTA novo, baixa e recomeca nele na hora.

jest.mock('expo-updates', () => ({
  isEnabled: true,
  isEmbeddedLaunch: true,
  checkForUpdateAsync: jest.fn(),
  fetchUpdateAsync: jest.fn(),
  reloadAsync: jest.fn(),
}));

const mockUpdates = jest.requireMock('expo-updates') as {
  isEnabled: boolean;
  isEmbeddedLaunch: boolean;
  checkForUpdateAsync: jest.Mock;
  fetchUpdateAsync: jest.Mock;
  reloadAsync: jest.Mock;
};

const plataforma = Platform.OS;
const dev = (global as { __DEV__?: boolean }).__DEV__;

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
  (global as { __DEV__?: boolean }).__DEV__ = false;
  mockUpdates.isEnabled = true;
  mockUpdates.isEmbeddedLaunch = true;
  mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: true });
  mockUpdates.fetchUpdateAsync.mockResolvedValue({ isNew: true });
  mockUpdates.reloadAsync.mockResolvedValue(undefined);
});

afterAll(() => {
  Platform.OS = plataforma;
  (global as { __DEV__?: boolean }).__DEV__ = dev;
});

describe('aplicarOtaNaAbertura', () => {
  it('no bundle do APK, com OTA novo: baixa e recomeça nele', async () => {
    expect(await aplicarOtaNaAbertura()).toBe(true);
    expect(mockUpdates.fetchUpdateAsync).toHaveBeenCalled();
    expect(mockUpdates.reloadAsync).toHaveBeenCalled();
  });

  it('quem já roda um OTA não reinicia sozinho', async () => {
    mockUpdates.isEmbeddedLaunch = false;
    expect(await aplicarOtaNaAbertura()).toBe(false);
    expect(mockUpdates.checkForUpdateAsync).not.toHaveBeenCalled();
  });

  it('sem OTA novo, segue no APK', async () => {
    mockUpdates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false });
    expect(await aplicarOtaNaAbertura()).toBe(false);
    expect(mockUpdates.fetchUpdateAsync).not.toHaveBeenCalled();
  });

  it('baixou o que já tinha: não recomeça', async () => {
    mockUpdates.fetchUpdateAsync.mockResolvedValue({ isNew: false });
    expect(await aplicarOtaNaAbertura()).toBe(false);
    expect(mockUpdates.reloadAsync).not.toHaveBeenCalled();
  });

  it('sem rede: não quebra a abertura', async () => {
    mockUpdates.checkForUpdateAsync.mockRejectedValue(new Error('offline'));
    expect(await aplicarOtaNaAbertura()).toBe(false);
  });

  it('updates desligado (build de desenvolvimento): nada', async () => {
    mockUpdates.isEnabled = false;
    expect(await aplicarOtaNaAbertura()).toBe(false);
  });

  it('na web e no __DEV__: nada', async () => {
    Platform.OS = 'web';
    expect(await aplicarOtaNaAbertura()).toBe(false);
    Platform.OS = 'android';
    (global as { __DEV__?: boolean }).__DEV__ = true;
    expect(await aplicarOtaNaAbertura()).toBe(false);
    expect(mockUpdates.checkForUpdateAsync).not.toHaveBeenCalled();
  });
});
