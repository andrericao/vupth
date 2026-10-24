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
jest.mock('@components/SeuLinkDeIndicacao', () => ({ SeuLinkDeIndicacao: () => null }));
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
    expect(alerta).toHaveBeenCalledWith('Cupom ativado', 'Lançamento', undefined);
    expect(await findByText('Lançamento')).toBeTruthy();
  });

  // campanha-encerrada-esgotada-e-validade (DEC-124): o prazo na ativacao e o Saiba mais.
  it('ao ativar, mostra "válido até" e o Saiba mais traz dias e prazo', async () => {
    mockRedeem.mockResolvedValue({
      data: { id: 'c1', name: 'Terça', value_percent: 10, weekdays: 'TUESDAY,WEDNESDAY', ends_at: '2026-11-05T21:30:00' },
    });
    const { getByTestId } = renderWithProviders(<Promocoes />);
    fireEvent.changeText(getByTestId('cupom-campo'), 'terca');
    await act(async () => {
      fireEvent.press(getByTestId('cupom-usar'));
    });
    const [titulo, msg, botoes] = alerta.mock.calls[0];
    expect(titulo).toBe('Cupom ativado');
    expect(msg).toBe('Terça\nVálido até 05/11 às 21:30.');
    expect(botoes.map((b: { text: string }) => b.text)).toEqual(['Saiba mais', 'Ok']);
    botoes[0].onPress();
    expect(alerta).toHaveBeenLastCalledWith('Terça', '10% de desconto\nVale para qualquer serviço.\nDias: terça, quarta.\nPrazo: até 05/11 às 21:30.');
  });

  it('lista os ativos com regra e validade, e os usados e vencidos à parte', async () => {
    mockListMine.mockResolvedValue({
      data: [
        { id: 'a', name: 'Lançamento', status: 'ACTIVE', value_percent: 10, ends_at: '2026-11-05T12:00:00' },
        { id: 'b', name: 'Antigo', status: 'USED', value_amount: 5 },
        { id: 'c', name: 'Velho', status: 'EXPIRED' },
      ],
    });
    const { findByTestId, getByTestId, getByText, queryByText } = renderWithProviders(<Promocoes />);
    await findByTestId('cupons-meus');
    expect(getByTestId('cupom-a')).toBeTruthy();
    // card-ticket-pontilhado (André, 24/10): o valor grande, o nome e a validade no ticket
    expect(getByTestId('cupom-a-valor')).toHaveTextContent('10%');
    expect(getByText('10% de desconto')).toBeTruthy();
    expect(getByText('Válido até 05/11 às 12:00')).toBeTruthy();
    expect(getByTestId('cupom-a-picote-esquerdo')).toBeTruthy();
    expect(getByTestId('cupom-a-picote-direito')).toBeTruthy();
    expect(getByTestId('cupons-encerrados')).toBeTruthy();
    expect(getByText('Usado')).toBeTruthy();
    expect(getByText('Vencido')).toBeTruthy();
    expect(queryByText('Velho')).toBeTruthy();
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

  // DEC-124: cupom encerrado ou esgotado abre o modal certo (formato dos alertas do app).
  it.each([
    ['CAMPAIGN_ENDED', 'Promoção encerrada'],
    ['CAMPAIGN_SOLD_OUT', 'Promoção esgotada'],
  ])('recusa %s mostra o modal %s', async (code, titulo) => {
    mockRedeem.mockRejectedValue({ response: { status: 409, data: { code } } });
    const { getByTestId } = renderWithProviders(<Promocoes />);
    fireEvent.changeText(getByTestId('cupom-campo'), 'x');
    await act(async () => {
      fireEvent.press(getByTestId('cupom-usar'));
    });
    expect(alerta).toHaveBeenLastCalledWith(titulo, expect.any(String), expect.any(Array), expect.anything());
  });
});
