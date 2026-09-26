import { Alert, Share } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { EstablishmentDetail } from '@screens/EstablishmentDetail';
import { copiarTexto } from '@utils/copiar';

// Andre, 26/09: botão de copiar o link da loja — base da indicação.
// (mocks iguais aos de LinkDaLoja)

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { establishmentId: 'e1' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@hooks/useQueueSocket', () => ({ useQueueSocket: jest.fn() }));
jest.mock('@stores/favoritesStore', () => ({
  useFavoritesStore: (sel: (s: unknown) => unknown) => sel({ ids: [], toggle: jest.fn() }),
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 't', isAuthenticated: true, user: null }),
}));
jest.mock('@hooks/useEstablishments', () => ({
  useEstablishment: () => ({
    data: { id: 'e1', name: 'Barbearia', open_status: 'OPEN', is_open: true, services: [], ownerId: 'o1', urlImage: null, status: 'ACTIVE' },
    isLoading: false,
    isError: false,
  }),
  useProfessionalsWithQueue: () => ({ data: [] }),
  useEstablishmentHours: () => ({ data: undefined }),
}));
jest.mock('@utils/copiar', () => ({ copiarTexto: jest.fn() }));

const mockCopiar = copiarTexto as jest.Mock;

describe('EstablishmentDetail — copiar o link da loja', () => {
  beforeEach(() => jest.clearAllMocks());

  it('copia o link público da loja e avisa', async () => {
    mockCopiar.mockResolvedValue(true);
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId } = renderWithProviders(<EstablishmentDetail />);
    await act(async () => {
      fireEvent.press(getByTestId('copiar-link'));
    });
    expect(mockCopiar).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/(dev\.)?vupth\.pages\.dev\/loja\/e1$/));
    expect(alerta).toHaveBeenCalledWith('Link copiado', expect.any(String));
    alerta.mockRestore();
  });

  it('sem o módulo nativo (APK antigo), abre o compartilhar do sistema com o link', async () => {
    mockCopiar.mockResolvedValue(false);
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    const { getByTestId } = renderWithProviders(<EstablishmentDetail />);
    await act(async () => {
      fireEvent.press(getByTestId('copiar-link'));
    });
    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('/loja/e1') });
    share.mockRestore();
  });
});
