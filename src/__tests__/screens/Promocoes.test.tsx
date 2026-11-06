import { Alert } from 'react-native';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { Promocoes } from '@screens/Promocoes';
import { useAuthStore } from '@stores/authStore';

// cupom-no-app (15/10): digitar o cupom, a recusa curta e a lista dos aceitos.

const mockRedeem = jest.fn();
const mockListMine = jest.fn();
const mockListActive = jest.fn();
const mockJoin = jest.fn();
jest.mock('@services/campaignService', () => ({
  campaignService: {
    redeem: (...a: unknown[]) => mockRedeem(...a),
    listMine: (...a: unknown[]) => mockListMine(...a),
    listActive: (...a: unknown[]) => mockListActive(...a),
    join: (...a: unknown[]) => mockJoin(...a),
  },
}));
const mockMe = jest.fn();
jest.mock('@services/referralService', () => ({ referralService: { me: (...a: unknown[]) => mockMe(...a) } }));
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
  mockListActive.mockResolvedValue({ data: [] });
  mockMe.mockResolvedValue({ data: { campaigns: [] } });
  mockJoin.mockResolvedValue({ data: {} });
  mockRedeem.mockResolvedValue({ data: { id: 'c1', name: 'Lançamento' } });
});

afterEach(() => alerta.mockRestore());

describe('Promoções', () => {
  it('usa o cupom digitado e mostra a lista de novo', async () => {
    // a lista (da tela e de Disponíveis) passa a ter o cupom depois de ativar
    mockRedeem.mockImplementation(async () => {
      mockListMine.mockResolvedValue({ data: [{ id: 'c1', name: 'Lançamento' }] });
      return { data: { id: 'c1', name: 'Lançamento' } };
    });
    const { getByTestId, getByText, findByText } = renderWithProviders(<Promocoes />);
    // promocoes-ativar-e-codigo (24/10): o botão é "Ativar", não "Usar"
    expect(getByText('Ativar')).toBeTruthy();
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
    const { findByTestId, getByTestId, getByText, queryByText, queryByTestId } = renderWithProviders(<Promocoes />);
    await findByTestId('cupons-meus');
    expect(getByTestId('cupom-a')).toBeTruthy();
    // card-ticket-pontilhado (André, 24/10): o valor grande, o nome e a validade no ticket
    expect(getByTestId('cupom-a-valor')).toHaveTextContent('10%');
    // sem rotulo: o card padrao e valor, nome e validade
    expect(queryByText('10% de desconto')).toBeNull();
    expect(getByText('Válido até 05/11 às 12:00')).toBeTruthy();
    expect(getByTestId('cupom-a-picote-esquerdo')).toBeTruthy();
    expect(queryByTestId('cupom-a-picote-direito')).toBeNull();
    // promocoes-em-secoes (05/11): o usado e o vencido juntos em Passadas, cada um com o estado, sem contagem
    expect(getByText('Ativas')).toBeTruthy();
    expect(getByText('Passadas')).toBeTruthy();
    expect(within(getByTestId('promocoes-passadas')).getByText('Usado')).toBeTruthy();
    expect(within(getByTestId('promocoes-passadas')).getByText('Vencido')).toBeTruthy();
    expect(within(getByTestId('cupons-meus')).queryByText('Antigo')).toBeNull();
    expect(queryByText(/\d+ (ativ|dispon)/i)).toBeNull();
    expect(queryByText('Velho')).toBeTruthy();
  });

  // promocoes-ativas-clicaveis (André, 24/10): "Promoções ativas"; o cupom abre o código.
  it('o cupom ativo é um card clicável que mostra o código; o usado não abre', async () => {
    mockListMine.mockResolvedValue({
      data: [
        { id: 'a', name: 'Lançamento', code: 'VUPTH10', status: 'ACTIVE', value_percent: 10 },
        { id: 'b', name: 'Antigo', code: 'VELHO', status: 'USED', value_amount: 5 },
      ],
    });
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { findByTestId, getByTestId, getByText } = renderWithProviders(<Promocoes />);
    await findByTestId('cupons-meus');
    expect(getByText('Ativas')).toBeTruthy();
    // promocoes-ativar-e-codigo: cada ticket mostra o código do cupom
    expect(getByTestId('cupom-a-codigo')).toHaveTextContent('Código: VUPTH10');
    fireEvent.press(getByTestId('cupom-a'));
    expect(alerta).toHaveBeenLastCalledWith('Lançamento', 'Código: VUPTH10');
    alerta.mockClear();
    fireEvent.press(getByTestId('cupom-b'));
    expect(alerta).not.toHaveBeenCalled();
    alerta.mockRestore();
  });

  it('a recusa vem numa frase curta', async () => {
    mockRedeem.mockRejectedValue({ response: { data: { code: 'CAMPAIGN_ALREADY_REDEEMED' } } });
    const { getByTestId } = renderWithProviders(<Promocoes />);
    fireEvent.changeText(getByTestId('cupom-campo'), 'X');
    await act(async () => {
      fireEvent.press(getByTestId('cupom-usar'));
    });
    expect(alerta).toHaveBeenCalledWith('Cupom', 'Este cupom já está ativado.');
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
    mockListMine.mockRejectedValue(new Error('x'));
    const { queryByTestId, unmount } = renderWithProviders(<Promocoes />);
    await waitFor(() => expect(mockListMine).toHaveBeenCalled());
    await act(async () => {});
    expect(queryByTestId('cupons-meus')).toBeNull();
    unmount();
    mockListMine.mockClear();
    mockListMine.mockResolvedValue({ data: null });
    const outra = renderWithProviders(<Promocoes />);
    await waitFor(() => expect(mockListMine).toHaveBeenCalled());
    await act(async () => {});
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
  // promocoes-em-secoes (André, 05/11): Disponíveis = no ar e sem a pessoa; quem participa sai dela.
  it('Disponíveis mostra só as campanhas em que ainda não está; Participar tira a campanha de lá', async () => {
    mockListMine.mockResolvedValue({ data: [{ id: 'a', name: 'Lançamento', code: 'VUPTH10', status: 'ACTIVE' }] });
    mockListActive.mockResolvedValue({
      data: [
        { id: 'a', name: 'Lançamento', code: 'VUPTH10' },
        { id: 'l', name: 'Indique', type: 'REFERRAL_BONUS' },
        { id: 'j', name: 'Já estou', type: 'REFERRAL_BONUS' },
      ],
    });
    mockMe.mockResolvedValue({ data: { campaigns: [{ campaign_id: 'j', link: 'x' }] } });
    const { findByTestId, getByTestId, queryByTestId } = renderWithProviders(<Promocoes />);
    const secao = await findByTestId('promocoes-disponiveis');
    expect(within(secao).getByText('Disponíveis')).toBeTruthy();
    expect(within(secao).getByText('Indique')).toBeTruthy();
    expect(within(secao).queryByText('Lançamento')).toBeNull();
    expect(within(secao).queryByText('Já estou')).toBeNull();

    mockMe.mockResolvedValue({ data: { campaigns: [{ campaign_id: 'j', link: 'x' }, { campaign_id: 'l', link: 'y' }] } });
    await act(async () => {
      fireEvent.press(getByTestId('participar-l'));
    });
    expect(mockJoin).toHaveBeenCalledWith('l', 'tk');
    await waitFor(() => expect(queryByTestId('promocoes-disponiveis')).toBeNull());
  });

  it('sem nada no ar, Disponíveis não aparece', async () => {
    const { queryByTestId } = renderWithProviders(<Promocoes />);
    await waitFor(() => expect(mockListActive).toHaveBeenCalled());
    expect(queryByTestId('promocoes-disponiveis')).toBeNull();
    expect(queryByTestId('promocoes-passadas')).toBeNull();
  });
});
