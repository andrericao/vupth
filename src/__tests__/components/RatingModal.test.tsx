import { Alert, Modal } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { RatingModal } from '@components/RatingModal';
import { ratingService } from '@services/ratingService';
import { useAuthStore } from '@stores/authStore';
import { useFeedbackStore } from '@stores/feedbackStore';
import { useRatedStore } from '@stores/ratedStore';

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => ({ Star: () => null }));
jest.mock('@services/ratingService', () => ({ ratingService: { submit: jest.fn() } }));

const mockSubmit = ratingService.submit as jest.Mock;

describe('RatingModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: 'tok-1' });
    useRatedStore.setState({ ids: [] });
    useFeedbackStore.setState({ aberto: false, ultimoPedido: null, ultimoEnvio: null });
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  function renderModal() {
    return renderWithProviders(
      <RatingModal visible attendanceId="att-1" professionalName="Carlos" onClose={onClose} />,
    );
  }

  it('não mostra o campo de comentário (SHOW_COMMENT=false)', () => {
    const { queryByPlaceholderText } = renderModal();
    expect(queryByPlaceholderText('Comentário (opcional)')).toBeNull();
  });

  it('sem estrela escolhida: alerta e não envia', () => {
    const { getByText } = renderModal();
    fireEvent.press(getByText('Enviar avaliação'));
    expect(Alert.alert).toHaveBeenCalledWith('Avaliação', 'Escolha de 1 a 5 estrelas.');
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('com estrela: envia, marca no ratedStore e fecha com true', async () => {
    mockSubmit.mockResolvedValueOnce({});
    const { getByText, getByTestId } = renderModal();

    fireEvent.press(getByTestId('star-4'));
    fireEvent.press(getByText('Enviar avaliação'));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith('att-1', { score: 4 }, 'tok-1'));
    expect(useRatedStore.getState().ids).toContain('att-1');
    expect(onClose).toHaveBeenCalledWith(true);
    // pedido-de-feedback (CLI-34): depois de avaliar, a caixa abre.
    expect(useFeedbackStore.getState().aberto).toBe(true);
  });

  it('409 (já avaliado): marca no ratedStore e fecha com true', async () => {
    mockSubmit.mockRejectedValueOnce({ response: { status: 409 } });
    const { getByText, getByTestId } = renderModal();

    fireEvent.press(getByTestId('star-5'));
    fireEvent.press(getByText('Enviar avaliação'));

    await waitFor(() => expect(useRatedStore.getState().ids).toContain('att-1'));
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it('outro erro: mostra a mensagem do servidor (ou a nossa) e não fecha', async () => {
    mockSubmit.mockRejectedValueOnce({ response: { status: 500, data: { message: 'Fora do ar' } } });
    const { getByText, getByTestId } = renderModal();
    fireEvent.press(getByTestId('star-3'));
    fireEvent.press(getByText('Enviar avaliação'));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Avaliação', 'Fora do ar'));

    mockSubmit.mockRejectedValueOnce(new Error('rede'));
    fireEvent.press(getByText('Enviar avaliação'));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith('Avaliação', 'Não foi possível enviar a avaliação. Tente mais tarde.'),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(useRatedStore.getState().ids).not.toContain('att-1');
  });

  it('sem sessão, não envia', () => {
    useAuthStore.setState({ accessToken: null });
    const { getByText, getByTestId } = renderModal();
    fireEvent.press(getByTestId('star-2'));
    fireEvent.press(getByText('Enviar avaliação'));
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('"Agora não" e o voltar do Android fecham com false', () => {
    const { getByText, UNSAFE_getByType } = renderModal();
    fireEvent.press(getByText('Agora não'));
    UNSAFE_getByType(Modal).props.onRequestClose();
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalledWith(false);
  });
});

