import { renderHook } from '@testing-library/react-native';

import { useContextoDoSentry } from '@hooks/useContextoDoSentry';
import { useAuthStore } from '@stores/authStore';

const mockMarcar = jest.fn();
let mockOuvinte: (() => void) | null = null;
let mockRota: string | null = 'home';
const mockRemover = jest.fn();
jest.mock('@utils/sentry', () => ({ marcarContexto: (...a: unknown[]) => mockMarcar(...a) }));
jest.mock('@routes/navigationRef', () => ({
  navigationRef: {
    getCurrentRoute: () => (mockRota ? { name: mockRota } : undefined),
    addListener: (_: string, fn: () => void) => {
      mockOuvinte = fn;
      return mockRemover;
    },
  },
}));
jest.mock('expo-secure-store');

// sentry (24/10): cada evento leva o papel (cliente ou visitante) e a tela.
describe('useContextoDoSentry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRota = 'home';
    useAuthStore.setState({ isAuthenticated: false } as never);
  });

  it('visitante e a tela atual; ao navegar, marca a tela nova', () => {
    renderHook(() => useContextoDoSentry());
    expect(mockMarcar).toHaveBeenCalledWith({ papel: 'visitante' });
    expect(mockMarcar).toHaveBeenCalledWith({ tela: 'home' });
    mockRota = 'queueStatus';
    mockOuvinte?.();
    expect(mockMarcar).toHaveBeenLastCalledWith({ tela: 'queueStatus' });
  });

  it('logado: papel cliente; sem rota: tela nula; ao sair, solta o ouvinte', () => {
    useAuthStore.setState({ isAuthenticated: true } as never);
    mockRota = null;
    const { unmount } = renderHook(() => useContextoDoSentry());
    expect(mockMarcar).toHaveBeenCalledWith({ papel: 'cliente' });
    expect(mockMarcar).toHaveBeenCalledWith({ tela: null });
    unmount();
    expect(mockRemover).toHaveBeenCalled();
  });
});
