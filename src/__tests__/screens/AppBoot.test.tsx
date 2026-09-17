import { render, waitFor } from '@testing-library/react-native';

import App, { queryClient } from '../../../App';

// Regressão real (2026-08-01): `useOutOfQueueSwap` (React Query) era chamado no
// corpo do App, ACIMA do QueryClientProvider — o `useQuery` estourava "No
// QueryClient set" e o app fechava no boot / ficava com tela branca. O jest não
// pegou porque os testes de hook montam o provider por conta. Este smoke monta o
// App de verdade: qualquer hook app-wide fora do seu provider derruba aqui.
jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@routes/index', () => ({ Routes: () => null }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'denied' }),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
jest.mock('@services/healthService', () => ({
  waitForBackend: jest.fn().mockResolvedValue(true),
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
jest.setTimeout(30000);

describe('App — boot', () => {
  // O cliente do App usa `gcTime` de 24h (exigencia da persistencia), e cada
  // query deixa um timer desse tamanho. Sem limpar, o jest terminava os testes e
  // ficava parado: "Jest did not exit one second after the test run".
  afterAll(() => queryClient.clear());

  it('monta sem estourar (todo hook app-wide dentro do seu provider)', async () => {
    const { unmount } = render(<App />);

    // Deixa o efeito do readiness resolver antes de desmontar, senão o setState
    // pós-unmount vira warning de act.
    await waitFor(() => expect(true).toBe(true));

    unmount();
  });
});
