import { StyleSheet } from 'react-native';
import { ReactNode } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ModalDePagamento } from '@components/ModalDePagamento';
import { paymentService } from '@services/paymentService';
import { useAuthStore } from '@stores/authStore';
import { usePendenciaStore } from '@stores/pendenciaStore';

// pendencia-de-pagamento (CLI-30): o aviso do 409 com o "Pagar" e o Pix.

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@services/paymentService', () => ({ paymentService: { get: jest.fn(), claim: jest.fn() } }));
const mockCopiar = jest.fn();
jest.mock('@utils/copiar', () => ({ copiarTexto: (...a: unknown[]) => mockCopiar(...a) }));

const get = paymentService.get as jest.Mock;
const claim = paymentService.claim as jest.Mock;

const PIX = {
  status: 'PENDING',
  services_value: 40,
  penalties_value: 5,
  amount: 45,
  pix_copy_paste: '000201pix',
  holder_name: 'Carlos Lima',
};

let client: QueryClient;
function montar() {
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return render(<ModalDePagamento />, { wrapper: Wrapper });
}

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  useAuthStore.setState({ accessToken: 'tk' });
  usePendenciaStore.getState().fechar();
  get.mockResolvedValue({ data: PIX });
  claim.mockResolvedValue({ data: { status: 'AWAITING_CONFIRMATION' } });
  mockCopiar.mockResolvedValue(true);
});

describe('ModalDePagamento', () => {
  it('fechado: nada', () => {
    expect(montar().toJSON()).toBeNull();
  });

  it('o aviso do 409: o total, com quem, e o "Pagar" abre o Pix dele', async () => {
    act(() => usePendenciaStore.getState().avisar([{ attendance_id: 'a1', status: 'PENDING', amount: 45, professional_name: 'Carlos' }]));
    const tela = montar();
    expect(tela.getByText('R$ 45,00 com Carlos.')).toBeTruthy();
    fireEvent.press(tela.getByTestId('pendencia-pagar'));
    expect(usePendenciaStore.getState().pagando).toBe('a1');
    expect(await tela.findByText('R$ 45,00', {}, { timeout: 15000 })).toBeTruthy();
  });

  // Aviso de pendencia = dinheiro: a faixa e o selo dizem isso antes do texto. O Pix
  // em si e a tela de pagar, nao um aviso, e nao ganha selo.
  it('o aviso de pendência é dinheiro: faixa forte e selo "Pagamento"; o Pix não tem selo', async () => {
    act(() => usePendenciaStore.getState().avisar([{ attendance_id: 'a1', status: 'PENDING', amount: 45, professional_name: 'Carlos' }]));
    const aviso = montar();
    expect(aviso.getByTestId('selo-do-tipo')).toBeTruthy();
    expect(aviso.getByText('Pagamento')).toBeTruthy();
    expect(StyleSheet.flatten(aviso.getByTestId('faixa-do-tipo').props.style).backgroundColor).toBe('#B3261E');
    aviso.unmount();

    act(() => usePendenciaStore.getState().pagar('a1'));
    const pix = montar();
    expect(await pix.findByText('R$ 40,00')).toBeTruthy();
    expect(pix.queryByTestId('selo-do-tipo')).toBeNull();
    expect(pix.queryByTestId('faixa-do-tipo')).toBeNull();
  });

  it('o aviso sem itens só tem o "Agora não", que fecha', () => {
    act(() => usePendenciaStore.getState().avisar([]));
    const tela = montar();
    expect(tela.queryByTestId('pendencia-pagar')).toBeNull();
    fireEvent.press(tela.getByTestId('pendencia-agora-nao'));
    expect(usePendenciaStore.getState().aviso).toBeNull();
  });

  it('o Pix: serviço, multa, total, para quem, copiar e "Já paguei"', async () => {
    act(() => usePendenciaStore.getState().pagar('a1'));
    const tela = montar();
    expect(tela.getByText('Carregando...')).toBeTruthy();
    expect(await tela.findByText('R$ 40,00')).toBeTruthy();
    expect(tela.getByText('R$ 5,00')).toBeTruthy();
    expect(tela.getByText('Para: Carlos Lima')).toBeTruthy();
    expect(tela.getByTestId('pix-codigo').props.children).toBe('000201pix');
    expect(tela.getByTestId('pix-qr')).toBeTruthy();

    expect(tela.queryByTestId('pix-copiado-check')).toBeNull();
    await act(async () => {
      fireEvent.press(tela.getByTestId('pix-copiar'));
    });
    expect(mockCopiar).toHaveBeenCalledWith('000201pix');
    expect(tela.getByText('Copiado')).toBeTruthy();
    // Quem copia um codigo Pix precisa ter certeza de que copiou: alem do texto, o check.
    expect(tela.getByTestId('pix-copiado-check')).toBeTruthy();

    const invalidar = jest.spyOn(client, 'invalidateQueries');
    await act(async () => {
      fireEvent.press(tela.getByTestId('pix-ja-paguei'));
    });
    expect(claim).toHaveBeenCalledWith('a1', 'tk');
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['pagamentos-pendentes'] });
    expect(tela.getByTestId('pix-status').props.children).toBe('Aguardando o profissional confirmar');
    expect(tela.queryByTestId('pix-ja-paguei')).toBeNull();
    fireEvent.press(tela.getByTestId('pix-ok'));
    expect(usePendenciaStore.getState().pagando).toBeNull();
  });

  it('sem serviço/multa/quem/código; copiar falhando não marca', async () => {
    get.mockResolvedValue({ data: { status: 'PENDING', amount: 10, pix_copy_paste: 'p' } });
    mockCopiar.mockResolvedValue(false);
    act(() => usePendenciaStore.getState().pagar('a1'));
    const tela = montar();
    expect(await tela.findByText('R$ 10,00')).toBeTruthy();
    expect(tela.queryByText(/^Para:/)).toBeNull();
    await act(async () => {
      fireEvent.press(tela.getByTestId('pix-copiar'));
    });
    expect(tela.getByText('Copiar código Pix')).toBeTruthy();
  });

  it('o "Já paguei" sem status na resposta fica aguardando', async () => {
    claim.mockResolvedValue({ data: {} });
    act(() => usePendenciaStore.getState().pagar('a1'));
    const tela = montar();
    await tela.findByTestId('pix-ja-paguei');
    await act(async () => {
      fireEvent.press(tela.getByTestId('pix-ja-paguei'));
    });
    expect(tela.getByTestId('pix-status').props.children).toBe('Aguardando o profissional confirmar');
  });

  it('o "Já paguei" falhando ou o pagamento sem carregar: avisa', async () => {
    claim.mockRejectedValue(new Error('x'));
    act(() => usePendenciaStore.getState().pagar('a1'));
    const tela = montar();
    await tela.findByTestId('pix-ja-paguei');
    await act(async () => {
      fireEvent.press(tela.getByTestId('pix-ja-paguei'));
    });
    expect(tela.getByText('Não foi possível carregar o pagamento. Tente de novo.')).toBeTruthy();
  });

  it('erro ao carregar; o X fecha', async () => {
    get.mockRejectedValue(new Error('x'));
    act(() => usePendenciaStore.getState().pagar('a1'));
    const tela = montar();
    await waitFor(() => expect(tela.getByText('Não foi possível carregar o pagamento. Tente de novo.')).toBeTruthy());
    fireEvent.press(tela.getByTestId('pagamento-fechar'));
    expect(usePendenciaStore.getState().pagando).toBeNull();
  });

  it('já aguardando ou sem sessão: sem "Já paguei" e sem busca', async () => {
    get.mockResolvedValue({ data: { ...PIX, status: 'AWAITING_CONFIRMATION' } });
    act(() => usePendenciaStore.getState().pagar('a1'));
    const tela = montar();
    expect(await tela.findByTestId('pix-ok')).toBeTruthy();
    expect(tela.queryByTestId('pix-codigo')).toBeNull();
    tela.unmount();

    get.mockClear();
    useAuthStore.setState({ accessToken: null });
    act(() => usePendenciaStore.getState().pagar('a2'));
    montar();
    expect(get).not.toHaveBeenCalled();
  });
});
