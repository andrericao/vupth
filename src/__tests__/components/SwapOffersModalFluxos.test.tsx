import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { SwapOffersModal } from '@components/SwapOffersModal';
import { swapOfferService } from '@services/swapOfferService';
import { useAuthStore } from '@stores/authStore';

// cobertura-98 (08/10): aceitar e cancelar uma troca, com os erros, e a lista vazia.

jest.mock('expo-secure-store');
jest.mock('@services/swapOfferService', () => ({
  swapOfferService: { listAcceptable: jest.fn(), listMine: jest.fn(), accept: jest.fn(), cancel: jest.fn() },
}));
jest.mock('@services/queueService', () => ({ queueService: { getQueue: jest.fn().mockRejectedValue(new Error('x')) } }));

jest.setTimeout(90000);

const svc = swapOfferService as unknown as Record<string, jest.Mock>;
const oferta = { id: 'of1', status: 'OPEN', direction: 'LATER', requesterAttendanceId: 'b' };
const minha = { id: 'm1', status: 'OPEN', direction: 'EARLIER', requesterAttendanceId: 'a' };

let alertSpy: jest.SpyInstance;
const onClose = jest.fn();
const onChanged = jest.fn();

function montar(establishmentId: string | null = 'e1') {
  return renderWithProviders(
    <SwapOffersModal visible professionalId="p1" establishmentId={establishmentId} onClose={onClose} onChanged={onChanged} />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useAuthStore.setState({ accessToken: 'tk' });
  svc.listAcceptable.mockResolvedValue({ data: [oferta] });
  svc.listMine.mockResolvedValue({ data: [minha] });
  svc.accept.mockResolvedValue({});
  svc.cancel.mockResolvedValue({});
});

describe('SwapOffersModal — aceitar', () => {
  it('aceita, avisa, atualiza e fecha', async () => {
    const { findByText } = montar();
    const botao = await findByText('Aceitar troca');
    await act(async () => {
      fireEvent.press(botao);
    });
    expect(svc.accept).toHaveBeenCalledWith('of1', 'tk');
    expect(alertSpy).toHaveBeenCalledWith('Troca feita', 'Sua posição na fila foi atualizada.');
    expect(onChanged).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('erro ao aceitar explica e recarrega', async () => {
    svc.accept.mockRejectedValue({ response: { data: { code: 'X' } } });
    const { findByText } = montar();
    const botao = await findByText('Aceitar troca');
    await act(async () => {
      fireEvent.press(botao);
    });
    expect(alertSpy).toHaveBeenCalledWith('Não foi possível aceitar', expect.any(String));
    await waitFor(() => expect(svc.listAcceptable).toHaveBeenCalledTimes(2));
  });
});

describe('SwapOffersModal — meus pedidos', () => {
  it('cancela, avisa a tela e recarrega', async () => {
    const { findByText } = montar(null);
    const botao = await findByText('Cancelar');
    await act(async () => {
      fireEvent.press(botao);
    });
    expect(svc.cancel).toHaveBeenCalledWith('m1', 'tk');
    expect(onChanged).toHaveBeenCalled();
  });

  it('erro ao cancelar avisa', async () => {
    svc.cancel.mockRejectedValue(new Error('x'));
    const { findByText } = montar();
    const botao = await findByText('Cancelar');
    await act(async () => {
      fireEvent.press(botao);
    });
    expect(alertSpy).toHaveBeenCalledWith('Erro', 'Não foi possível cancelar o pedido.');
  });
});

describe('SwapOffersModal — vazio', () => {
  it('sem ofertas, convida a publicar', async () => {
    svc.listAcceptable.mockResolvedValue({ data: [] });
    svc.listMine.mockResolvedValue({ data: [] });
    const { findByText } = montar();
    expect(await findByText(/Nenhuma oferta de troca no momento/)).toBeTruthy();
  });

  it('a lista falhando também fica vazia', async () => {
    svc.listAcceptable.mockRejectedValue(new Error('x'));
    const { findByText } = montar();
    expect(await findByText(/Nenhuma oferta de troca no momento/)).toBeTruthy();
  });

  it('Fechar', async () => {
    const { findByText } = montar();
    fireEvent.press(await findByText('Fechar'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('SwapOffersModal — o que sobra (cobertura-98)', () => {
  it('ocupado: o botão diz "Aceitando..." e um segundo toque não repete', async () => {
    let soltar: () => void = () => {};
    svc.accept.mockImplementation(() => new Promise<void>((r) => (soltar = r)));
    const { findByText, getByText } = montar();
    const botao = await findByText('Aceitar troca');
    await act(async () => {
      fireEvent.press(botao);
    });
    expect(getByText('Aceitando...')).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByText('Aceitando...'));
      fireEvent.press(getByText('Cancelar'));
    });
    expect(svc.accept).toHaveBeenCalledTimes(1);
    expect(svc.cancel).not.toHaveBeenCalled();
    await act(async () => soltar());
  });

  it('sem a loja, não lê a fila; sem sessão ou fechado, não busca nada', async () => {
    const { queueService } = jest.requireMock('@services/queueService');
    const { findByText, unmount } = montar(null);
    await findByText('Aceitar troca');
    expect(queueService.getQueue).not.toHaveBeenCalled();
    unmount();

    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: null });
    montar();
    renderWithProviders(
      <SwapOffersModal visible={false} professionalId="p1" establishmentId="e1" onClose={onClose} onChanged={onChanged} />,
    );
    await waitFor(() => expect(svc.listAcceptable).not.toHaveBeenCalled());
  });
});
