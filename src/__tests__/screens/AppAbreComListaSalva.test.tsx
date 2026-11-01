import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import App, { queryClient } from '../../../App';
import { waitForBackend } from '@services/healthService';
import { useProntidaoStore, marcarServidorPronto } from '@services/prontidaoDoServidor';

// Regressão real (2026-08-01): `useOutOfQueueSwap` (React Query) era chamado no
// corpo do App, ACIMA do QueryClientProvider — o `useQuery` estourava "No
// QueryClient set" e o app fechava no boot / ficava com tela branca. O jest não
// pegou porque os testes de hook montam o provider por conta. Este smoke monta o
// App de verdade: qualquer hook app-wide fora do seu provider derruba aqui.
jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('@routes/index', () => ({ Routes: () => { const { Text: T } = require('react-native'); return <T testID="rotas">rotas</T>; } }));
// O SafeAreaProvider nativo so mostra os filhos depois de medir a tela; no jest isso nao acontece.
jest.mock('react-native-safe-area-context', () => {
  const real = jest.requireActual('react-native-safe-area-context');
  return { ...real, SafeAreaProvider: ({ children }: { children: unknown }) => children };
});
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
jest.mock('@services/healthService', () => ({
  waitForBackend: jest.fn(),
}));
// expo-notifications também é nativo e, só de ser importado, registra listeners
// de push e avisa que Expo Go não suporta mais push (poluía o log e podia
// segurar o processo). O registro em si é testado em `push.test.ts`.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  AndroidImportance: { DEFAULT: 3 },
}));
// netinfo é nativo: sem mock, o `setupOnlineManager()` do boot tenta sondar a
// internet de verdade (estoura em `isInternetReachable` e ainda deixa o jest
// pendurado). O listener devolve a função de unsubscribe, como no módulo real.
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(() => jest.fn()),
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
    configure: jest.fn(),
  },
}));

// O mount do Gluestack é pesado sob o jest.
jest.setTimeout(90000);

// abrir-com-lista-salva (DEC-148): com a lista de lojas salva em disco a Home abre SEM esperar o portão de readiness;
// sem cache (instalação nova, ou depois de sair da conta), o portão segura a abertura como sempre.

function cacheComLista() {
  const agora = Date.now();
  return JSON.stringify({
    timestamp: agora,
    buster: Constants.expoConfig?.version ?? '',
    clientState: {
      mutations: [],
      queries: [
        {
          queryKey: ['establishments-paginas', null, null],
          queryHash: JSON.stringify(['establishments-paginas', null, null]),
          state: {
            data: { pages: [{ items: [{ id: 'e1', name: 'Barbearia do Ricardo' }], page: 0, hasNext: false }], pageParams: [0] },
            dataUpdateCount: 1,
            dataUpdatedAt: agora,
            error: null,
            errorUpdateCount: 0,
            errorUpdatedAt: 0,
            fetchFailureCount: 0,
            fetchFailureReason: null,
            fetchMeta: null,
            isInvalidated: false,
            status: 'success',
            fetchStatus: 'idle',
          },
        },
      ],
    },
  });
}

const espera = waitForBackend as jest.Mock;

describe('App — abrir com a lista salva', () => {
  beforeEach(async () => {
    queryClient.clear();
    await AsyncStorage.clear();
    marcarServidorPronto();
  });
  afterAll(() => queryClient.clear());

  it('com a lista salva e o servidor ainda acordando: as rotas já abrem e as gravações esperam o servidor', async () => {
    await AsyncStorage.setItem('vupth_query_cache', cacheComLista());
    let acordou!: () => void;
    espera.mockReturnValue(new Promise<boolean>((r) => (acordou = () => r(true))));

    const { findByTestId, unmount } = render(<App />);
    expect(await findByTestId('rotas', {}, { timeout: 30000 })).toBeTruthy();
    expect(useProntidaoStore.getState().pronto).toBe(false);

    acordou();
    await waitFor(() => expect(useProntidaoStore.getState().pronto).toBe(true));
    unmount();
  });

  it('sem cache: o portão segura as rotas até o servidor responder', async () => {
    let acordou!: () => void;
    espera.mockReturnValue(new Promise<boolean>((r) => (acordou = () => r(true))));

    const { queryByTestId, findByTestId, unmount } = render(<App />);
    await new Promise((r) => setTimeout(r, 1500));
    expect(queryByTestId('rotas')).toBeNull();
    expect(useProntidaoStore.getState().pronto).toBe(true); // nada exigido: o portão da abertura já segura tudo

    acordou();
    expect(await findByTestId('rotas', {}, { timeout: 30000 })).toBeTruthy();
    unmount();
  });
});
