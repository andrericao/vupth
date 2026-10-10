// cobertura-98 (08/10): as navegacoes de fora da arvore — o toque no push
// esperando a navegacao montar, o login depois do onboarding e o "Adiar minha vez".
import {
  navigationRef,
  navigateFromNotification,
  goToLoginAfterOnboarding,
  abrirMudarMinhaVez,
  guardarEstadoDaNavegacao,
  estadoDaNavegacao,
} from '@routes/navigationRef';
import { useQueueStore } from '@stores/queueStore';

jest.mock('expo-secure-store');

const navigate = jest.fn();
let pronto = false;
let rotasDaRaiz: string[] | undefined;

beforeEach(() => {
  jest.clearAllMocks();
  pronto = false;
  jest.spyOn(navigationRef, 'isReady').mockImplementation(() => pronto);
  rotasDaRaiz = undefined;
  jest.spyOn(navigationRef, 'getRootState').mockImplementation(
    () => (rotasDaRaiz ? { routeNames: rotasDaRaiz } : undefined) as never,
  );
  (navigationRef as unknown as { navigate: unknown }).navigate = navigate;
  useQueueStore.setState({ activeQueue: null } as never);
});

describe('navigateFromNotification', () => {
  it('sem rota, nada', () => {
    pronto = true;
    navigateFromNotification(null);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('espera a navegação montar e então abre Atendimentos', () => {
    const esperas: (() => void)[] = [];
    navigateFromNotification('attendances' as never, 0, (fn) => esperas.push(fn));
    expect(navigate).not.toHaveBeenCalled();
    pronto = true;
    esperas[0]();
    expect(navigate).toHaveBeenCalledWith('atendimentosTab', { screen: 'attendances', pop: true });
  });

  it('desiste depois de ~15 s', () => {
    const espera = jest.fn();
    navigateFromNotification('attendances' as never, 75, espera);
    expect(espera).not.toHaveBeenCalled();
  });

  it('"fila" com a fila no aparelho abre a tela dela', () => {
    pronto = true;
    useQueueStore.setState({
      activeQueue: { professionalId: 'p1', establishmentId: 'e1', professionalName: 'C', establishmentName: 'B', estimatedMinutes: 5 },
    } as never);
    navigateFromNotification('fila' as never);
    expect(navigate).toHaveBeenCalledWith('homeTab', expect.objectContaining({ screen: 'queueStatus', pop: true }));
  });
});

describe('goToLoginAfterOnboarding', () => {
  it('pronto: vai ao Entrar na hora', () => {
    pronto = true;
    goToLoginAfterOnboarding();
    expect(navigate).toHaveBeenCalledWith('homeTab', { screen: 'login', params: {}, pop: true });
  });

  it('espera o mount e desiste em ~1 s', () => {
    jest.useFakeTimers();
    try {
      goToLoginAfterOnboarding();
      jest.advanceTimersByTime(200);
      pronto = true;
      jest.advanceTimersByTime(50);
      expect(navigate).toHaveBeenCalledTimes(1);

      navigate.mockClear();
      pronto = false;
      goToLoginAfterOnboarding();
      jest.advanceTimersByTime(2000);
      expect(navigate).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('com a entrada ainda na tela (navegador próprio), espera as abas montarem', () => {
    jest.useFakeTimers();
    try {
      pronto = true;
      rotasDaRaiz = ['entrada'];
      goToLoginAfterOnboarding();
      expect(navigate).not.toHaveBeenCalled();
      rotasDaRaiz = ['homeTab', 'attendancesTab', 'profileTab'];
      jest.advanceTimersByTime(50);
      expect(navigate).toHaveBeenCalledWith('homeTab', { screen: 'login', params: {}, pop: true });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('abrirMudarMinhaVez', () => {
  it('sem navegação, nada', () => {
    abrirMudarMinhaVez({ professionalId: 'p1', establishmentId: 'e1' });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('abre a fila já no Mudar minha vez', () => {
    pronto = true;
    abrirMudarMinhaVez({ professionalId: 'p1', establishmentId: 'e1' });
    expect(navigate).toHaveBeenCalledWith('homeTab', {
      screen: 'queueStatus',
      pop: true,
      params: { professionalId: 'p1', establishmentId: 'e1', serviceItemIds: [], abrirMudarVez: true },
    });
  });
});

describe('estado guardado', () => {
  it('guarda e devolve', () => {
    guardarEstadoDaNavegacao({ index: 1 });
    expect(estadoDaNavegacao()).toEqual({ index: 1 });
  });
});
