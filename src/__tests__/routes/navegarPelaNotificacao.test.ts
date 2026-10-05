// O toque na notificação com o app FECHADO chega antes de a navegação montar:
// até 05/10 ele se perdia e o app abria na Home (Andre, no aparelho, com o
// "É quase a sua vez!"). Agora espera o mount e leva à fila.

import { navigateFromNotification, navigationRef } from '@routes/navigationRef';
import { useQueueStore } from '@stores/queueStore';

const mockRef = {
  isReady: jest.spyOn(navigationRef, 'isReady'),
  navigate: jest.spyOn(navigationRef, 'navigate').mockImplementation(() => {}),
};

const FILA = {
  professionalId: 'p1',
  establishmentId: 'e1',
  professionalName: 'Carlos',
  establishmentName: 'Barbearia do Zé',
  estimatedMinutes: 20,
};

beforeEach(() => {
  mockRef.isReady.mockReset();
  mockRef.navigate.mockClear();
  useQueueStore.setState({ activeQueue: null } as never);
});

describe('navigateFromNotification', () => {
  it('sem rota, não faz nada', () => {
    mockRef.isReady.mockReturnValue(true);
    navigateFromNotification(null);
    expect(mockRef.navigate).not.toHaveBeenCalled();
  });

  it('"fila" com a fila no aparelho abre a tela da fila', () => {
    mockRef.isReady.mockReturnValue(true);
    useQueueStore.setState({ activeQueue: FILA } as never);
    navigateFromNotification('fila');
    expect(mockRef.navigate).toHaveBeenCalledWith('homeTab', {
      screen: 'queueStatus',
      params: {
        professionalId: 'p1',
        establishmentId: 'e1',
        professionalName: 'Carlos',
        establishmentName: 'Barbearia do Zé',
        estimatedWaitMinutes: 20,
      },
    });
  });

  it('"fila" sem a fila no aparelho cai em Atendimentos, que a reconstrói pelo servidor', () => {
    mockRef.isReady.mockReturnValue(true);
    navigateFromNotification('fila');
    expect(mockRef.navigate).toHaveBeenCalledWith('atendimentosTab', { screen: 'attendances' });
  });

  it('"attendances" vai à aba Atendimentos', () => {
    mockRef.isReady.mockReturnValue(true);
    navigateFromNotification('attendances');
    expect(mockRef.navigate).toHaveBeenCalledWith('atendimentosTab', { screen: 'attendances' });
  });

  it('com a navegação ainda montando, espera e navega quando ela fica pronta', () => {
    mockRef.isReady.mockReturnValueOnce(false).mockReturnValueOnce(false).mockReturnValue(true);
    const pendentes: (() => void)[] = [];
    const espera = (fn: () => void) => { pendentes.push(fn); };
    navigateFromNotification('attendances', 0, espera);
    expect(mockRef.navigate).not.toHaveBeenCalled();
    pendentes.shift()!();
    expect(mockRef.navigate).not.toHaveBeenCalled();
    pendentes.shift()!();
    expect(mockRef.navigate).toHaveBeenCalledTimes(1);
  });

  it('desiste depois de ~15 s sem a navegação montar', () => {
    mockRef.isReady.mockReturnValue(false);
    let chamadas = 0;
    const espera = (fn: () => void) => { chamadas += 1; fn(); };
    navigateFromNotification('fila', 0, espera);
    expect(chamadas).toBe(75);
    expect(mockRef.navigate).not.toHaveBeenCalled();
  });
});
