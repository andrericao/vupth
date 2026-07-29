import { Alert } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { RatingModal } from '@components/RatingModal';
import { ratingService } from '@services/ratingService';
import { useAuthStore } from '@stores/authStore';
import { useRatedStore } from '@stores/ratedStore';

jest.mock('expo-secure-store');
jest.mock('phosphor-react-native', () => ({ Star: () => null }));
jest.mock('@services/ratingService', () => ({ ratingService: { submit: jest.fn() } }));

const mockSubmit = ratingService.submit as jest.Mock;

describe('RatingModal', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: 'tok-1' });
    useRatedStore.setState({ ids: [] });
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
  });

  it('409 (já avaliado): marca no ratedStore e fecha com true', async () => {
    mockSubmit.mockRejectedValueOnce({ response: { status: 409 } });
    const { getByText, getByTestId } = renderModal();

    fireEvent.press(getByTestId('star-5'));
    fireEvent.press(getByText('Enviar avaliação'));

    await waitFor(() => expect(useRatedStore.getState().ids).toContain('att-1'));
    expect(onClose).toHaveBeenCalledWith(true);
  });
});
