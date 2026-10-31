import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { ModalDeQuedaBrusca } from '@components/ModalDeQuedaBrusca';
import { useAuthStore } from '@stores/authStore';
import { useQuedaBruscaStore } from '@stores/quedaBruscaStore';

const mockAck = jest.fn();
const mockNeed = jest.fn();
const mockPass = jest.fn();
jest.mock('@services/suddenDropService', () => ({
  suddenDropService: {
    ack: (...a: unknown[]) => mockAck(...a),
    needTime: (...a: unknown[]) => mockNeed(...a),
    passTurn: (...a: unknown[]) => mockPass(...a),
  },
}));
jest.mock('@routes/navigationRef', () => ({
  abrirMudarMinhaVez: jest.fn(),
  navigateFromNotification: jest.fn(),
}));

const abrir = (janelaAte: number | null) =>
  act(() => {
    useQuedaBruscaStore.getState().abrir({ attendanceId: 'a1', horario: '14:40', janelaAte });
  });

describe('ModalDeQuedaBrusca (DEC-128)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' });
    act(() => useQuedaBruscaStore.getState().fechar());
  });

  it('sem queda aberta, nada aparece', () => {
    const t = renderWithProviders(<ModalDeQuedaBrusca />);
    expect(t.queryByTestId('queda-brusca-popup')).toBeNull();
  });

  it('o popup é enxuto: só o horário, o Ok e o Preciso de mais tempo', () => {
    const t = renderWithProviders(<ModalDeQuedaBrusca />);
    abrir(Date.now() + 20 * 60_000);
    expect(t.getByTestId('queda-brusca-titulo')).toHaveTextContent('Sua vez adiantou para 14:40!');
    expect(t.getByTestId('queda-brusca-ok')).toBeTruthy();
    expect(t.getByTestId('queda-brusca-mais-tempo')).toBeTruthy();
    expect(t.queryByText(/20 min/)).toBeNull();
  });

  it('Ok confirma o horário pela API e fecha', async () => {
    mockAck.mockResolvedValue({ data: {} });
    const t = renderWithProviders(<ModalDeQuedaBrusca />);
    abrir(null);
    fireEvent.press(t.getByTestId('queda-brusca-ok'));
    await waitFor(() => expect(mockAck).toHaveBeenCalledWith('a1', 'tk'));
    await waitFor(() => expect(useQuedaBruscaStore.getState().queda).toBeNull());
  });

  it('Preciso de mais tempo abre as 4 opções, com o cronômetro da janela', async () => {
    mockNeed.mockResolvedValue({ data: { attendance_id: 'a1', window_until: new Date(Date.now() + 19 * 60_000 + 30_000).toISOString(), options: [] } });
    const t = renderWithProviders(<ModalDeQuedaBrusca />);
    abrir(null);
    fireEvent.press(t.getByTestId('queda-brusca-mais-tempo'));
    expect(await t.findByTestId('more-option-trocar')).toBeTruthy();
    expect(t.getByTestId('more-option-passar')).toBeTruthy();
    expect(t.getByTestId('more-option-final')).toBeTruthy();
    expect(t.getByTestId('more-option-sair')).toBeTruthy();
    expect(t.getByText(/Decida em até 19:/)).toBeTruthy();
  });

  it('sem janela (espera nova de 1 h ou mais): sem cronômetro e sem a promessa de ficar sem multa', async () => {
    mockNeed.mockResolvedValue({ data: { attendance_id: 'a1', window_until: null, options: [] } });
    const t = renderWithProviders(<ModalDeQuedaBrusca />);
    abrir(null);
    fireEvent.press(t.getByTestId('queda-brusca-mais-tempo'));
    await t.findByTestId('more-option-sair');
    expect(t.queryByText(/Decida em até/)).toBeNull();
    expect(t.queryByText(/Sem multa dentro da janela/)).toBeNull();
    expect(t.getByText('Você perde a sua vez')).toBeTruthy();
  });

  it('Passar a vez propõe a troca ao próximo e avisa que ele precisa aceitar', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockNeed.mockResolvedValue({ data: { attendance_id: 'a1', window_until: null, options: [] } });
    mockPass.mockResolvedValue({ data: {} });
    const t = renderWithProviders(<ModalDeQuedaBrusca />);
    abrir(null);
    fireEvent.press(t.getByTestId('queda-brusca-mais-tempo'));
    fireEvent.press(await t.findByTestId('more-option-passar'));
    await waitFor(() => expect(mockPass).toHaveBeenCalledWith('a1', 'tk'));
    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Pedido enviado', expect.stringContaining('precisa aceitar')));
    expect(useQuedaBruscaStore.getState().queda).toBeNull();
    alerta.mockRestore();
  });

  it('erro ao confirmar avisa e mantém o popup aberto', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockAck.mockRejectedValue(new Error('x'));
    const t = renderWithProviders(<ModalDeQuedaBrusca />);
    abrir(null);
    fireEvent.press(t.getByTestId('queda-brusca-ok'));
    await waitFor(() => expect(alerta).toHaveBeenCalled());
    expect(useQuedaBruscaStore.getState().queda).not.toBeNull();
    alerta.mockRestore();
  });
});
