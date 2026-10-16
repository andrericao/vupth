import * as SecureStore from 'expo-secure-store';

import { useAuthStore } from '@stores/authStore';
import { pushService } from '@services/pushService';
import { registerAuthStore } from '@services/api';

// cobertura-98: o logout desregistra o push do aparelho, e o interceptor de
// rede atualiza o store pelo setter registrado.

jest.mock('expo-secure-store');
jest.mock('@services/authService', () => ({ authService: { logout: jest.fn().mockResolvedValue({}) } }));
jest.mock('@services/pushService', () => ({ pushService: { unregisterDevice: jest.fn() } }));
jest.mock('@services/api', () => ({ registerAuthStore: jest.fn() }));

// Capturado antes do clearAllMocks: o store registra o setter ao ser importado.
const setter = (registerAuthStore as jest.Mock).mock.calls[0][0];

const getItem = SecureStore.getItemAsync as jest.Mock;
const deleteItem = SecureStore.deleteItemAsync as jest.Mock;
const unregister = pushService.unregisterDevice as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  deleteItem.mockResolvedValue(undefined);
  useAuthStore.setState({ accessToken: 'a', isAuthenticated: true });
});

it('com token de push, o logout o desregistra e apaga', async () => {
  getItem.mockResolvedValue('push-1');
  unregister.mockResolvedValue(undefined);

  await useAuthStore.getState().logout();

  expect(unregister).toHaveBeenCalledWith('push-1', 'a');
  expect(deleteItem).toHaveBeenCalledWith('vupth_push_token');
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});

it('o desregistro que falha não impede o logout', async () => {
  getItem.mockResolvedValue('push-1');
  unregister.mockRejectedValue(new Error('rede'));

  await useAuthStore.getState().logout();

  expect(useAuthStore.getState().isAuthenticated).toBe(false);
});

it('o setter registrado na rede escreve no store', () => {
  setter({ accessToken: 'novo' });
  expect(useAuthStore.getState().accessToken).toBe('novo');
});
