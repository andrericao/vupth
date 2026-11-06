import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { ModalDeContestarMulta } from '@components/ModalDeContestarMulta';
import { useAuthStore } from '@stores/authStore';

const mockContest = jest.fn();
jest.mock('@services/penaltyService', () => ({
  MOTIVO_MAX: 300,
  penaltyService: { contest: (...a: unknown[]) => mockContest(...a) },
}));

function montar() {
  const onFechar = jest.fn();
  const onContestada = jest.fn();
  const t = renderWithProviders(<ModalDeContestarMulta penaltyId="m1" onFechar={onFechar} onContestada={onContestada} />);
  return { t, onFechar, onContestada };
}

describe('ModalDeContestarMulta (contestar-multa)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' });
  });

  it('sem motivo o envio não sai', () => {
    const { t } = montar();
    fireEvent.press(t.getByTestId('contestar-multa-enviar'));
    fireEvent.changeText(t.getByTestId('contestar-multa-motivo'), '   ');
    fireEvent.press(t.getByTestId('contestar-multa-enviar'));
    expect(mockContest).not.toHaveBeenCalled();
  });

  it('envia o motivo, confirma e avisa o pai', async () => {
    mockContest.mockResolvedValue({ data: { penalty_id: 'm1', contested_at: 'x', reason: 'cheguei' } });
    const { t, onContestada, onFechar } = montar();
    fireEvent.changeText(t.getByTestId('contestar-multa-motivo'), '  cheguei no horário ');
    expect(t.getByTestId('contestar-multa-contagem')).toHaveTextContent('21/300');
    fireEvent.press(t.getByTestId('contestar-multa-enviar'));
    expect(await t.findByTestId('contestar-multa-enviada')).toBeTruthy();
    expect(mockContest).toHaveBeenCalledWith('m1', 'cheguei no horário', 'tk');
    expect(onContestada).toHaveBeenCalledTimes(1);
    fireEvent.press(t.getByTestId('contestar-multa-fechar'));
    expect(onFechar).toHaveBeenCalled();
  });

  it('mostra o erro do Backend e deixa tentar de novo', async () => {
    mockContest.mockRejectedValueOnce({ response: { data: { code: 'PENALTY_CONTEST_EXPIRED' } } });
    const { t, onContestada } = montar();
    fireEvent.changeText(t.getByTestId('contestar-multa-motivo'), 'motivo');
    fireEvent.press(t.getByTestId('contestar-multa-enviar'));
    expect(await t.findByTestId('contestar-multa-erro')).toHaveTextContent('prazo de 7 dias');
    expect(onContestada).not.toHaveBeenCalled();
    mockContest.mockResolvedValueOnce({ data: {} });
    fireEvent.press(t.getByTestId('contestar-multa-enviar'));
    await waitFor(() => expect(onContestada).toHaveBeenCalled());
  });

  it('sem sessão não envia', () => {
    useAuthStore.setState({ accessToken: null });
    const { t } = montar();
    fireEvent.changeText(t.getByTestId('contestar-multa-motivo'), 'x');
    fireEvent.press(t.getByTestId('contestar-multa-enviar'));
    expect(mockContest).not.toHaveBeenCalled();
  });
});
