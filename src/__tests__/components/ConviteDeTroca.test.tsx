import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

import { ConviteDeTroca } from '@components/ConviteDeTroca';
import { swapOfferService, SwapOfferResponse } from '@services/swapOfferService';
import { useConviteDeTrocaStore } from '@stores/conviteDeTrocaStore';
import { useAuthStore } from '@stores/authStore';
import { ofertasNovas, textoDoConvite, DURACAO_DO_CONVITE_MS } from '@domain/queue/conviteDeTroca';

// D16 (Andre, 24/09) e o teste de 25/09: "pedi pra mudar minha vez, mas logado
// com outro cliente não consigo encontrar a solicitação".

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@services/swapOfferService', () => ({ swapOfferService: { accept: jest.fn() } }));

const mockAccept = swapOfferService.accept as jest.Mock;

const oferta = (over: Partial<SwapOfferResponse> = {}): SwapOfferResponse => ({
  id: 'of1', status: 'OPEN', direction: 'LATER', requesterClientId: null, requesterAttendanceId: 'x',
  professionalId: 'p1', establishmentId: 'e1', serviceItemIds: [], resultingAttendanceId: null,
  createdAt: '', respondedAt: null, ...over,
});

describe('o convite de troca (D16)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useAuthStore.setState({ accessToken: 'tk' });
    useConviteDeTrocaStore.setState({ atual: null, jaMostradas: [] });
  });
  afterEach(() => jest.useRealTimers());

  it('aparece com Aceitar, e some sozinho em 5 segundos', () => {
    act(() => useConviteDeTrocaStore.getState().mostrar(oferta()));
    const { getByTestId, queryByTestId } = render(<ConviteDeTroca />);
    expect(getByTestId('convite-aceitar')).toBeTruthy();
    act(() => jest.advanceTimersByTime(DURACAO_DO_CONVITE_MS));
    expect(queryByTestId('convite-de-troca')).toBeNull();
  });

  // Andre, 26/09: "algo visual que demonstre os 5 segundos sendo contados".
  it('a barra do tempo começa cheia e esvazia junto com os 5 segundos', () => {
    act(() => useConviteDeTrocaStore.getState().mostrar(oferta()));
    const { getByTestId } = render(<ConviteDeTroca />);
    const barra = () => getByTestId('convite-tempo').props.children;
    const largura = () => {
      const { StyleSheet } = jest.requireActual('react-native');
      const w = StyleSheet.flatten(barra().props.style).width;
      // Animado: a largura é uma interpolação; o valor corrente sai de __getValue.
      return typeof w === 'string' ? w : String(w.__getValue());
    };
    expect(getByTestId('convite-tempo')).toBeTruthy();
    expect(largura()).toBe('100%');
    act(() => jest.advanceTimersByTime(DURACAO_DO_CONVITE_MS / 2));
    expect(parseFloat(largura())).toBeLessThan(100);
  });

  it('o X e o toque fora fecham', () => {
    act(() => useConviteDeTrocaStore.getState().mostrar(oferta()));
    const { getByTestId, queryByTestId, rerender } = render(<ConviteDeTroca />);
    fireEvent.press(getByTestId('convite-fechar'));
    expect(queryByTestId('convite-de-troca')).toBeNull();

    act(() => useConviteDeTrocaStore.getState().mostrar(oferta({ id: 'of2' })));
    rerender(<ConviteDeTroca />);
    fireEvent.press(getByTestId('convite-fundo'));
    expect(queryByTestId('convite-de-troca')).toBeNull();
  });

  it('Aceitar troca de lugar e avisa', async () => {
    mockAccept.mockResolvedValue({});
    act(() => useConviteDeTrocaStore.getState().mostrar(oferta()));
    const { getByTestId } = render(<ConviteDeTroca />);
    await act(async () => {
      fireEvent.press(getByTestId('convite-aceitar'));
    });
    expect(mockAccept).toHaveBeenCalledWith('of1', 'tk');
    expect(Alert.alert).toHaveBeenCalledWith('Troca feita', expect.any(String));
  });

  it('a mesma oferta não vira popup duas vezes na sessão', () => {
    const store = useConviteDeTrocaStore.getState();
    act(() => store.mostrar(oferta()));
    act(() => useConviteDeTrocaStore.getState().fechar());
    expect(ofertasNovas([oferta()], useConviteDeTrocaStore.getState().jaMostradas)).toEqual([]);
  });
});

describe('o texto do convite', () => {
  it('diz o que acontece com quem aceita — e não quem pediu', () => {
    expect(textoDoConvite('LATER').mensagem).toMatch(/você passa à frente/);
    expect(textoDoConvite('EARLIER').mensagem).toMatch(/você fica com a vez dela/);
  });
});

describe('o convite de troca — aceitando (cobertura-98)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useAuthStore.setState({ accessToken: 'tk' });
    useConviteDeTrocaStore.setState({ atual: null, jaMostradas: [] });
  });
  afterEach(() => jest.useRealTimers());

  it('aceitando: o tempo não fecha, o segundo toque não repete, e a recusa do servidor avisa', async () => {
    let recusar: (e: unknown) => void = () => {};
    mockAccept.mockImplementationOnce(() => new Promise((_res, rej) => (recusar = rej)));
    act(() => useConviteDeTrocaStore.getState().mostrar(oferta()));
    const { getByTestId, getByText, queryByTestId } = render(<ConviteDeTroca />);

    fireEvent.press(getByTestId('convite-de-troca'));
    expect(getByTestId('convite-de-troca')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('convite-aceitar'));
    });
    expect(getByText('Aceitando...')).toBeTruthy();
    fireEvent.press(getByTestId('convite-aceitar'));
    expect(mockAccept).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(DURACAO_DO_CONVITE_MS));
    expect(getByTestId('convite-de-troca')).toBeTruthy();

    await act(async () => {
      recusar({ response: { data: { code: 'OFFER_NOT_OPEN' } } });
    });
    expect(queryByTestId('convite-de-troca')).toBeNull();
    expect(Alert.alert).toHaveBeenCalledWith('Não foi possível aceitar', expect.any(String));
  });

  it('sem sessão, Aceitar não chama o servidor', () => {
    useAuthStore.setState({ accessToken: null });
    act(() => useConviteDeTrocaStore.getState().mostrar(oferta()));
    const { getByTestId } = render(<ConviteDeTroca />);
    fireEvent.press(getByTestId('convite-aceitar'));
    expect(mockAccept).not.toHaveBeenCalled();
  });
});

