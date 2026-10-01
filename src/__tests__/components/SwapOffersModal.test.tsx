import { waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { SwapOffersModal } from '@components/SwapOffersModal';
import { swapOfferService } from '@services/swapOfferService';
import { queueService } from '@services/queueService';
import { useAuthStore } from '@stores/authStore';

// Andre, 26/09: o pedido de troca mostra o lugar e o horário de quem pediu.

jest.mock('expo-secure-store');
jest.mock('@services/swapOfferService', () => ({
  swapOfferService: { listAcceptable: jest.fn(), listMine: jest.fn(), accept: jest.fn(), cancel: jest.fn() },
}));
jest.mock('@services/queueService', () => ({ queueService: { getQueue: jest.fn() } }));

const oferta = { id: 'of1', status: 'OPEN', direction: 'LATER', requesterAttendanceId: 'b', requesterClientId: null,
  professionalId: 'p1', establishmentId: 'e1', serviceItemIds: [], resultingAttendanceId: null, createdAt: '', respondedAt: null };

// Primeira montagem do Gluestack é pesada sob carga (ver ServiceSelection.test).
jest.setTimeout(90000);

describe('SwapOffersModal — o lugar e o horário da troca', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: 'tk' });
    (swapOfferService.listAcceptable as jest.Mock).mockResolvedValue({ data: [oferta] });
    (swapOfferService.listMine as jest.Mock).mockResolvedValue({ data: [] });
  });

  it('com a loja, cada oferta diz o lugar e o horário da vaga', async () => {
    (queueService.getQueue as jest.Mock).mockResolvedValue({
      data: { totalRemainingMinutes: 30, attendancesInQueue: [
        { id: 'a', status: 'SCHEDULED', estimatedMinutes: 20 },
        { id: 'b', status: 'SCHEDULED', estimatedMinutes: 10 },
      ] },
    });
    const { findByTestId } = renderWithProviders(
      <SwapOffersModal visible professionalId="p1" establishmentId="e1" onClose={jest.fn()} onChanged={jest.fn()} />,
    );
    const linha = await findByTestId('vaga-of1', {}, { timeout: 15000 });
    const texto = [].concat(linha.props.children).join('');
    expect(texto).toMatch(/Você vai para o 2º lugar, por volta de /);
    expect(texto).toMatch(/\d{2}:\d{2}$/);
    expect(queueService.getQueue).toHaveBeenCalledWith('p1', 'e1', 'tk');
  });

  it('sem a loja (ou a fila falhando), a oferta aparece como antes, sem horário', async () => {
    (queueService.getQueue as jest.Mock).mockRejectedValue(new Error('x'));
    const { findByText, queryByTestId } = renderWithProviders(
      <SwapOffersModal visible professionalId="p1" establishmentId="e1" onClose={jest.fn()} onChanged={jest.fn()} />,
    );
    expect(await findByText(/Aceitar troca/, {}, { timeout: 15000 })).toBeTruthy();
    await waitFor(() => expect(queryByTestId('vaga-of1')).toBeNull());
  });
});
