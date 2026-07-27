import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { ServiceSelection } from '@screens/ServiceSelection';
import { establishmentService } from '@services/establishmentService';
import { useAuthStore } from '@stores/authStore';

const mockNavigate = jest.fn();

jest.mock('expo-secure-store');
jest.mock('phosphor-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({
    params: {
      professionalId: 'p1',
      professionalName: 'Carlos',
      establishmentId: 'e1',
      establishmentName: 'Barbearia',
      estimatedWaitMinutes: 20,
    },
  }),
}));
jest.mock('@services/establishmentService', () => ({
  establishmentService: { getServiceItemsByProfessional: jest.fn() },
}));

const mockGetServices = establishmentService.getServiceItemsByProfessional as jest.Mock;

// Render de tela com GluestackUIProvider é pesado sob o jest (a 1ª montagem
// carrega o build inteiro do gluestack). O default de 5s não cobre o 1º teste.
jest.setTimeout(30000);

describe('ServiceSelection — portão de auth (modo visitante)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServices.mockResolvedValue({
      data: [{ id: 's1', customName: 'Corte', price: 30, weeklyAverageDurationInMinutes: 30 }],
    });
  });

  it('VISITANTE: confirmar manda pro login levando a seleção (redirectTo queueStatus)', async () => {
    useAuthStore.setState({ isAuthenticated: false });
    const { getByText, findByTestId } = renderWithProviders(<ServiceSelection />);

    // findByTestId default é 1s; o 1º mount do Gluestack pode passar disso sob
    // carga (flaky) — dá 15s (jest.setTimeout acima cobre).
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    fireEvent.press(getByText('Confirmar e entrar na fila'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'login',
      expect.objectContaining({
        redirectTo: 'queueStatus',
        professionalId: 'p1',
        serviceItemIds: ['s1'],
      }),
    );
  });

  it('LOGADO: confirmar vai direto pra queueStatus', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    const { getByText, findByTestId } = renderWithProviders(<ServiceSelection />);

    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    fireEvent.press(getByText('Confirmar e entrar na fila'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'queueStatus',
      expect.objectContaining({ professionalId: 'p1', serviceItemIds: ['s1'] }),
    );
    expect(mockNavigate).not.toHaveBeenCalledWith('login', expect.anything());
  });
});
