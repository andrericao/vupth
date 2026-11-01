import { persisterDaAbertura } from '@services/queryPersist';
import { iniciarAbertura, reiniciarAberturaParaTeste } from '../../boot/aberturas';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn().mockResolvedValue(undefined) }));
const cliente = { timestamp: 1, buster: '', clientState: { mutations: [], queries: [] } };

// log-de-falha-na-abertura: em modo seguro o cache salvo nao e lido nem gravado.
describe('persisterDaAbertura', () => {
  beforeEach(() => reiniciarAberturaParaTeste());

  it('modo seguro: nao restaura nem grava o cache', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('{"pendentes":2}');
    expect((await iniciarAbertura()).seguro).toBe(true);
    await expect(persisterDaAbertura.restoreClient()).resolves.toBeUndefined();
    await expect(persisterDaAbertura.persistClient(cliente as never)).resolves.toBeUndefined();
  });

  it('abertura normal: delega ao cache salvo', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    expect((await iniciarAbertura()).seguro).toBe(false);
    await expect(persisterDaAbertura.restoreClient()).resolves.toBeUndefined(); // sem nada salvo
    await expect(persisterDaAbertura.persistClient(cliente as never)).resolves.toBeUndefined();
  });
});
