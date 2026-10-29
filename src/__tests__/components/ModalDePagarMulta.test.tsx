import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { ModalDePagarMulta } from '@components/ModalDePagarMulta';
import { useAuthStore } from '@stores/authStore';
import { useMultaStore } from '@stores/multaStore';

const mockPay = jest.fn();
const mockPayment = jest.fn();
jest.mock('@services/penaltyService', () => ({
  penaltyService: { pay: (...a: unknown[]) => mockPay(...a), payment: (...a: unknown[]) => mockPayment(...a) },
}));
const mockCopiar = jest.fn();
jest.mock('@utils/copiar', () => ({ copiarTexto: (...a: unknown[]) => mockCopiar(...a) }));
jest.mock('react-native-qrcode-svg', () => 'QRCode');

const pagamento = (status: string) => ({ data: { id: 'p1', amount: '8.00', status, pix_copy_paste: '000201pix', holder_name: 'Vupth' } });

describe('ModalDePagarMulta (pagar-multa-avulso)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tk' });
    act(() => useMultaStore.getState().fechar());
  });

  it('fechado, nada aparece e nada é pedido', () => {
    const t = renderWithProviders(<ModalDePagarMulta />);
    expect(t.queryByTestId('pagar-multa')).toBeNull();
    expect(mockPay).not.toHaveBeenCalled();
  });

  it('ao abrir gera o Pix, mostra o valor e copia o código', async () => {
    mockPay.mockResolvedValue(pagamento('PENDING'));
    mockCopiar.mockResolvedValue(true);
    const t = renderWithProviders(<ModalDePagarMulta />);
    act(() => useMultaStore.getState().abrir());
    expect(await t.findByTestId('pagar-multa-valor')).toHaveTextContent('R$ 8,00');
    expect(mockPay).toHaveBeenCalledWith('tk');
    fireEvent.press(t.getByTestId('pagar-multa-copiar'));
    await waitFor(() => expect(mockCopiar).toHaveBeenCalledWith('000201pix'));
    expect(await t.findByText('Copiado')).toBeTruthy();
  });

  it('acompanha o pagamento e confirma quando cai', async () => {
    jest.useFakeTimers();
    mockPay.mockResolvedValue(pagamento('PENDING'));
    mockPayment.mockResolvedValue(pagamento('PAID'));
    const t = renderWithProviders(<ModalDePagarMulta />);
    act(() => useMultaStore.getState().abrir());
    await t.findByTestId('pagar-multa-valor');
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockPayment).toHaveBeenCalledWith('p1', 'tk');
    expect(await t.findByTestId('pagar-multa-paga')).toBeTruthy();
    jest.useRealTimers();
  });

  it('Pix vencido pede para gerar outro; erro ao gerar mostra o motivo; Fechar fecha', async () => {
    mockPay.mockResolvedValueOnce(pagamento('EXPIRED'));
    const t = renderWithProviders(<ModalDePagarMulta />);
    act(() => useMultaStore.getState().abrir());
    expect(await t.findByTestId('pagar-multa-expirou')).toBeTruthy();
    fireEvent.press(t.getByTestId('pagar-multa-fechar'));
    expect(useMultaStore.getState().aberta).toBe(false);

    mockPay.mockRejectedValueOnce({ response: { status: 503, data: { code: 'PENALTY_PIX_NOT_CONFIGURED' } } });
    act(() => useMultaStore.getState().abrir());
    expect(await t.findByTestId('pagar-multa-erro')).toBeTruthy();
  });
});
