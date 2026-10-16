import * as SecureStore from 'expo-secure-store';

import { useCienciaStore } from '@stores/cienciaStore';

// cobertura-98: a ciência do aviso de atraso fica no aparelho e não repete.

jest.mock('expo-secure-store');

const getItem = SecureStore.getItemAsync as jest.Mock;
const setItem = SecureStore.setItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useCienciaStore.setState({ ids: [] });
});

describe('cienciaStore', () => {
  it('registrar grava uma vez; o mesmo atendimento não grava de novo', async () => {
    setItem.mockResolvedValue(undefined);
    await useCienciaStore.getState().registrarCiencia('a1');
    await useCienciaStore.getState().registrarCiencia('a1');

    expect(useCienciaStore.getState().jaSoube('a1')).toBe(true);
    expect(useCienciaStore.getState().jaSoube('a2')).toBe(false);
    expect(setItem).toHaveBeenCalledTimes(1);
  });

  it('sem disco, a ciência fica na memória da sessão', async () => {
    setItem.mockRejectedValue(new Error('cheio'));
    await useCienciaStore.getState().registrarCiencia('a1');

    expect(useCienciaStore.getState().ids).toEqual(['a1']);
  });

  it('restaurar lê o salvo; vazio ou cofre quebrado não muda nada', async () => {
    getItem.mockResolvedValueOnce(JSON.stringify(['a3']));
    await useCienciaStore.getState().restoreCiencia();
    expect(useCienciaStore.getState().ids).toEqual(['a3']);

    getItem.mockResolvedValueOnce(null);
    await useCienciaStore.getState().restoreCiencia();
    getItem.mockRejectedValueOnce(new Error('bloqueado'));
    await useCienciaStore.getState().restoreCiencia();
    expect(useCienciaStore.getState().ids).toEqual(['a3']);
  });
});
