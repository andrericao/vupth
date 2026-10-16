import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Promocoes } from '@screens/Promocoes';
import { useAuthStore } from '@stores/authStore';

// cupom-no-app (15/10): digitar o cupom, a recusa curta e a lista dos aceitos.

const mockRedeem = jest.fn();
const mockListMine = jest.fn();
jest.mock('@services/campaignService', () => ({
  campaignService: {
    redeem: (...a: unknown[]) => mockRedeem(...a),
    listMine: (...a: unknown[]) => mockListMine(...a),
  },
}));
jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useFocusEffect: (fn: () => void) => useEffect(fn, [fn]),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.setTimeout(60000);

let alerta: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useAuthStore.setState({ accessToken: 'tk' } as never);
  mockListMine.mockResolvedValue({ data: [] });
  mockRedeem.mockResolvedValue({ data: { id: 'c1', name: 'Lançamento' } });
});

afterEach(() => alerta.mockRestore());

describe('Promoções', () => {
  it('usa o cupom digitado e mostra a lista de novo', async () => {
    mockListMine.mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [{ id: 'c1', name: 'Lançamento' }] });
    const { getByTestId, findByText } = renderWithProviders(<Promocoes />);
    fireEvent.changeText(getByTestId('cupom-campo'), ' vupth10 ');
    await act(async () => {
      fireEvent.press(getByTestId('cupom-usar'));
    });
    expect(mockRedeem).toHaveBeenCalledWith('vupth10', 'tk');
    expect(alerta).toHaveBeenCalledWith('Cupom ativado', 'Lançamento');
    expect(await findByText('Lançamento')).toBeTruthy();
  });

  it('a recusa vem numa frase curta', async () => {
    mockRedeem.mockRejectedValue({ response: { data: { code: 'CAMPAIGN_ALREADY_REDEEMED' } } });
    const { getByTestId } = renderWithProviders(<Promocoes />);
    fireEvent.changeText(getByTestId('cupom-campo'), 'X');
    await act(async () => {
      fireEvent.press(getByTestId('cupom-usar'));
    });
    expect(alerta).toHaveBeenCalledWith('Cupom', 'Você já usou este cupom.');
  });

  it('sem cupom digitado, ou sem login, não envia', async () => {
    const { getByTestId } = renderWithProviders(<Promocoes />);
    await act(async () => {
      fireEvent.press(getByTestId('cupom-usar'));
    });
    useAuthStore.setState({ accessToken: null } as never);
    fireEvent.changeText(getByTestId('cupom-campo'), 'X');
    await act(async () => {
      fireEvent.press(getByTestId('cupom-usar'));
    });
    expect(mockRedeem).not.toHaveBeenCalled();
  });

  it('a lista falhando, ou vindo fora do formato, a tela segue', async () => {
    mockListMine.mockRejectedValueOnce(new Error('x'));
    const { queryByTestId, unmount } = renderWithProviders(<Promocoes />);
    await waitFor(() => expect(mockListMine).toHaveBeenCalled());
    expect(queryByTestId('cupons-meus')).toBeNull();
    unmount();
    mockListMine.mockResolvedValueOnce({ data: null });
    const outra = renderWithProviders(<Promocoes />);
    await waitFor(() => expect(mockListMine).toHaveBeenCalledTimes(2));
    expect(outra.queryByTestId('cupons-meus')).toBeNull();
  });
});
