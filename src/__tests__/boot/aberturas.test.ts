import * as SecureStore from 'expo-secure-store';
import {
  CHAVE_DE_ABERTURAS,
  confirmarAbertura,
  decidirAbertura,
  forcarModoSeguro,
  iniciarAbertura,
  lerEstado,
  reiniciarAberturaParaTeste,
} from '../../boot/aberturas';
import { useModoSeguroStore } from '@stores/modoSeguroStore';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn() }));
const get = SecureStore.getItemAsync as jest.Mock;
const set = SecureStore.setItemAsync as jest.Mock;

describe('lerEstado', () => {
  it('le o numero de quedas e trata lixo como zero', () => {
    expect(lerEstado('{"pendentes":2}')).toEqual({ pendentes: 2 });
    expect(lerEstado(null)).toEqual({ pendentes: 0 });
    expect(lerEstado('lixo')).toEqual({ pendentes: 0 });
    expect(lerEstado('{"pendentes":-3}')).toEqual({ pendentes: 0 });
    expect(lerEstado('{"pendentes":"x"}')).toEqual({ pendentes: 0 });
    expect(lerEstado('{"pendentes":99}').pendentes).toBeLessThanOrEqual(9);
  });
});

describe('decidirAbertura (laco de queda)', () => {
  it('sem quedas ou com uma: abertura normal, e a marca sobe', () => {
    expect(decidirAbertura({ pendentes: 0 })).toEqual({ seguro: false, quedas: 0, proximo: { pendentes: 1 } });
    expect(decidirAbertura({ pendentes: 1 })).toMatchObject({ seguro: false, proximo: { pendentes: 2 } });
  });
  it('duas quedas seguidas: modo seguro', () => {
    expect(decidirAbertura({ pendentes: 2 })).toMatchObject({ seguro: true, quedas: 2 });
    expect(decidirAbertura({ pendentes: 5 }).seguro).toBe(true);
  });
});

describe('iniciarAbertura', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reiniciarAberturaParaTeste();
    useModoSeguroStore.setState({ lido: false, seguro: false, quedas: 0 });
    set.mockResolvedValue(undefined);
  });

  it('abertura normal: grava a marca e avisa o store (lido, nao seguro)', async () => {
    get.mockResolvedValue(null);
    expect(await iniciarAbertura()).toEqual({ seguro: false, quedas: 0 });
    expect(set).toHaveBeenCalledWith(CHAVE_DE_ABERTURAS, '{"pendentes":1}');
    expect(useModoSeguroStore.getState()).toMatchObject({ lido: true, seguro: false });
  });

  it('a marca de duas aberturas sem confirmar sobe em modo seguro', async () => {
    get.mockResolvedValue('{"pendentes":2}');
    expect(await iniciarAbertura()).toEqual({ seguro: true, quedas: 2 });
    expect(useModoSeguroStore.getState()).toMatchObject({ lido: true, seguro: true, quedas: 2 });
  });

  it('roda uma vez por abertura (memoizado)', async () => {
    get.mockResolvedValue(null);
    await iniciarAbertura();
    await iniciarAbertura();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('o aparelho falha ao ler ou gravar: abre normal, nunca derruba a abertura', async () => {
    get.mockRejectedValue(new Error('keystore'));
    set.mockRejectedValue(new Error('keystore'));
    await expect(iniciarAbertura()).resolves.toEqual({ seguro: false, quedas: 0 });
    expect(useModoSeguroStore.getState().lido).toBe(true);
  });

  it('o aparelho demora demais: a abertura nao espera (teto), e segue normal', async () => {
    jest.useFakeTimers();
    get.mockReturnValue(new Promise(() => {}));
    const p = iniciarAbertura();
    await jest.advanceTimersByTimeAsync(1600);
    await expect(p).resolves.toEqual({ seguro: false, quedas: 0 });
    jest.useRealTimers();
  });

  it('confirmar apaga a contagem; forcar o modo seguro grava as duas quedas', async () => {
    set.mockResolvedValue(undefined);
    await confirmarAbertura();
    expect(set).toHaveBeenLastCalledWith(CHAVE_DE_ABERTURAS, '{"pendentes":0}');
    await forcarModoSeguro();
    expect(set).toHaveBeenLastCalledWith(CHAVE_DE_ABERTURAS, '{"pendentes":2}');
  });

  it('confirmar com o aparelho falhando nao lanca', async () => {
    set.mockRejectedValue(new Error('x'));
    await expect(confirmarAbertura()).resolves.toBeUndefined();
  });
});
