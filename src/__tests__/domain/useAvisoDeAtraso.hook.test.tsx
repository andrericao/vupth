import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';

import { useAvisoDeAtraso } from '@hooks/useAvisoDeAtraso';
import { useCienciaStore } from '@stores/cienciaStore';
import { useQueueStore } from '@stores/queueStore';

// "Não podemos agir na surdina" (Andre, 18/09). O aviso do atraso espera o
// TOQUE — e o toque é o registro de que o cliente soube.

jest.mock('expo-secure-store');
const mockAbrir = jest.fn();
jest.mock('@routes/navigationRef', () => ({ abrirMudarMinhaVez: (f: unknown) => mockAbrir(f) }));

function porNaFila(status: string, attendanceId = 'a1') {
  useQueueStore.setState({
    activeQueue: {
      attendanceId,
      professionalId: 'p1',
      professionalName: 'Carlos',
      establishmentId: 'e1',
      establishmentName: 'Barbearia',
      enteredAt: Date.now(),
      estimatedMinutes: null,
      status,
    } as never,
  });
}

describe('useAvisoDeAtraso', () => {
  let alerta: jest.SpyInstance;

  beforeEach(() => {
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useCienciaStore.setState({ ids: [] });
    useQueueStore.setState({ activeQueue: null } as never);
  });

  afterEach(() => alerta.mockRestore());

  it('atrasou: avisa, e a caixa NÃO fecha por fora — clicar ao lado não vale por "eu soube"', () => {
    porNaFila('LATE');
    renderHook(() => useAvisoDeAtraso());

    expect(alerta).toHaveBeenCalledTimes(1);
    const [titulo, mensagem, botoes, opcoes] = alerta.mock.calls[0] as [
      string, string, { text: string; onPress?: () => void }[], { cancelable?: boolean },
    ];
    // Esboço de 26/09: tom positivo e "Adiar minha vez" no mesmo aviso.
    expect(titulo).toBe('Não se atrase — evite a multa');
    expect(mensagem).toMatch(/continua na fila/);
    expect(botoes.map((b) => b.text)).toEqual(['Adiar minha vez', 'Entendi']);
    expect(opcoes.cancelable).toBe(false);
  });

  it('o toque registra a ciência — e o aviso não volta', async () => {
    porNaFila('LATE');
    const { rerender } = renderHook(() => useAvisoDeAtraso());
    const [, , botoes] = alerta.mock.calls[0] as [string, string, { onPress?: () => void }[]];

    await act(async () => {
      botoes[botoes.length - 1].onPress!();
    });
    expect(useCienciaStore.getState().ids).toEqual(['a1']);

    alerta.mockClear();
    rerender({});
    expect(alerta).not.toHaveBeenCalled();
  });

  it('quem já soube não é avisado de novo nem ao reabrir o app', () => {
    useCienciaStore.setState({ ids: ['a1'] });
    porNaFila('LATE');
    renderHook(() => useAvisoDeAtraso());
    expect(alerta).not.toHaveBeenCalled();
  });

  it('fila normal não avisa nada', () => {
    porNaFila('SCHEDULED');
    renderHook(() => useAvisoDeAtraso());
    expect(alerta).not.toHaveBeenCalled();
  });

  it('atraso de OUTRO atendimento avisa de novo — a ciência é por atendimento', async () => {
    useCienciaStore.setState({ ids: ['a1'] });
    porNaFila('LATE', 'a2');
    renderHook(() => useAvisoDeAtraso());
    expect(alerta).toHaveBeenCalledTimes(1);
  });

  it('"Adiar minha vez" registra a ciência e abre o Mudar minha vez da fila', async () => {
    porNaFila('LATE');
    renderHook(() => useAvisoDeAtraso());
    const [, , botoes] = alerta.mock.calls[0] as [string, string, { text: string; onPress?: () => void }[]];
    await act(async () => {
      botoes.find((b) => b.text === 'Adiar minha vez')!.onPress!();
    });
    expect(useCienciaStore.getState().ids).toEqual(['a1']);
    expect(mockAbrir).toHaveBeenCalledWith(expect.objectContaining({ professionalId: 'p1', establishmentId: 'e1' }));
  });
});
