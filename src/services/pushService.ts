import { api } from './api';
import { DevicePlatform, deviceDeletePath } from '@domain/push';

// Registro de device para notificações push (backend PRONTO). O token vem do
// expo-notifications (via usePushRegistration, nativo). Estas chamadas são puras
// (só HTTP) e OTA-safe. `POST /devices` é idempotente por token (upsert).
export const pushService = {
  registerDevice(token: string, platform: DevicePlatform, accessToken: string) {
    return api.post('/devices', { token, platform }, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  // Remove no logout. Idempotente (204 mesmo se não existir). Token url-encodado.
  unregisterDevice(token: string, accessToken: string) {
    return api.delete(deviceDeletePath(token), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
