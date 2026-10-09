import { renderHook, act } from '@testing-library/react-native';
import NetInfo from '@react-native-community/netinfo';

import { useIsOnline } from '@hooks/useNetwork';

// cobertura-98 (08/10): a conectividade — o React Query pausa sem rede, e o
// hook diz online/offline; sem o modulo nativo, segue online.

type Ouvinte = (s: { isConnected: boolean | null }) => void;
let mockOuvinte: Ouvinte | undefined;
const mockSair = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn() },
}));

const add = (NetInfo as unknown as { addEventListener: jest.Mock }).addEventListener;

beforeEach(() => {
  jest.clearAllMocks();
  mockOuvinte = undefined;
  add.mockImplementation((fn: Ouvinte) => {
    mockOuvinte = fn;
    return mockSair;
  });
});

describe('useIsOnline', () => {
  it('começa online e segue o estado da rede (null conta como online)', () => {
    const { result, unmount } = renderHook(() => useIsOnline());
    expect(result.current).toBe(true);
    act(() => mockOuvinte?.({ isConnected: false }));
    expect(result.current).toBe(false);
    act(() => mockOuvinte?.({ isConnected: null }));
    expect(result.current).toBe(true);
    unmount();
    expect(mockSair).toHaveBeenCalled();
  });

  it('sem o módulo nativo, fica online', () => {
    add.mockImplementation(() => {
      throw new Error('sem netinfo');
    });
    const { result } = renderHook(() => useIsOnline());
    expect(result.current).toBe(true);
  });
});

describe('setupOnlineManager', () => {
  afterEach(() => jest.restoreAllMocks());
  it('liga o React Query na rede uma vez só', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const rq = require('@tanstack/react-query');
      const set = jest.spyOn(rq.onlineManager, 'setEventListener').mockImplementation((fn: unknown) => {
        (fn as (s: (b: boolean) => void) => void)(jest.fn());
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { setupOnlineManager } = require('@hooks/useNetwork');
      setupOnlineManager();
      setupOnlineManager();
      expect(set).toHaveBeenCalledTimes(1);
    });
    mockOuvinte?.({ isConnected: true });
  });

  it('sem o módulo nativo, não quebra', () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const rq = require('@tanstack/react-query');
      jest.spyOn(rq.onlineManager, 'setEventListener').mockImplementation(() => {
        throw new Error('sem netinfo');
      });
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { setupOnlineManager } = require('@hooks/useNetwork');
      expect(() => setupOnlineManager()).not.toThrow();
    });
  });
});
