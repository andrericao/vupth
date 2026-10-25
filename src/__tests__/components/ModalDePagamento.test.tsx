import { StyleSheet } from 'react-native';
import { ReactNode } from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GluestackUIProvider } from '@gluestack-ui/themed';

import { config } from '../../../config/gluestack-ui.config';

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
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <GluestackUIProvider config={config}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </GluestackUIProvider>
  );
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
    // pagar-ao-finalizar-corte (André, 24/10): o Pix e o QR ficam recolhidos; "Já paguei" e "Fechar" a vista
    expect(tela.queryByTestId('pix-codigo')).toBeNull();
    expect(tela.queryByTestId('pix-qr')).toBeNull();
    expect(tela.getByTestId('pix-ja-paguei')).toBeTruthy();
    expect(tela.getByTestId('pix-ok')).toBeTruthy();
    fireEvent.press(tela.getByTestId('pix-dropdown'));
    expect(tela.getByTestId('pix-codigo').props.children).toBe('000201pix');
    expect(tela.getByTestId('pix-qr')).toBeTruthy();
    // politica-de-preco-saiba-mais (DEC-91): o total leva ao artigo do Suporte.
    expect(tela.getByTestId('preco-saiba-mais')).toBeTruthy();

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

  // pix-do-profissional-ao-concluir (André, 22/10): a chave em texto junto do QR e do Copiar.
  it('com a chave Pix do profissional: mostra em texto, junto do QR', async () => {
    get.mockResolvedValue({ data: { ...PIX, pix_key: 'carlos@barbearia.com' } });
    act(() => usePendenciaStore.getState().pagar('a1'));
    const tela = montar();
    fireEvent.press(await tela.findByTestId('pix-dropdown'));
    expect(await tela.findByText('carlos@barbearia.com')).toBeTruthy();
    expect(tela.getByTestId('pix-chave')).toBeTruthy();
    expect(tela.getByTestId('pix-qr')).toBeTruthy();
    expect(tela.getByTestId('pix-copiar')).toBeTruthy();
  });

  // pagar-sempre-disponivel (André, 25/10): a opcao de pagar nunca some.
  it('sem nenhum Pix (gateway fora e profissional sem chave): o modal FICA, diz que o pagamento é combinado e mantém o Já paguei', async () => {
    get.mockResolvedValue({ data: { status: 'PENDING', amount: 10, pix_copy_paste: null } });
    act(() => usePendenciaStore.getState().pagar('a1'));
    const tela = montar();
    expect(await tela.findByTestId('pix-combinado')).toBeTruthy();
    expect(tela.getByText('Sem Pix cadastrado. O pagamento é combinado com o profissional (dinheiro).')).toBeTruthy();
    expect(tela.getByTestId('pix-ja-paguei')).toBeTruthy();
    expect(tela.getByTestId('pix-ok')).toBeTruthy();
    expect(tela.queryByTestId('pix-dropdown')).toBeNull();
    expect(usePendenciaStore.getState().pagando).toBe('a1');
  });

  it('só a chave Pix do profissional (sem copia-e-cola): mostra a chave e copia a chave', async () => {
    get.mockResolvedValue({ data: { status: 'PENDING', amount: 10, pix_key: 'carlos@barbearia.com', pix_copy_paste: null } });
    act(() => usePendenciaStore.getState().pagar('a1'));
    const tela = montar();
    expect(await tela.findByTestId('pix-ja-paguei')).toBeTruthy();
    expect(tela.queryByTestId('pix-combinado')).toBeNull();
    expect(tela.getByText('Chave Pix')).toBeTruthy(); // o drop down, sem QR
    fireEvent.press(tela.getByTestId('pix-dropdown'));
    expect(tela.getByTestId('pix-chave')).toBeTruthy();
    expect(tela.queryByTestId('pix-qr')).toBeNull();
    await act(async () => {
      fireEvent.press(tela.getByTestId('pix-copiar'));
    });
    expect(mockCopiar).toHaveBeenCalledWith('carlos@barbearia.com');
    expect(tela.getByText('Copiado')).toBeTruthy();
  });

  it('com o gateway, o Pix dele; a chave do profissional não aparece junto', async () => {
    get.mockResolvedValue({ data: { ...PIX, pix_key: 'chave@prof.com', gateway: { provider: 'ASAAS', mode: 'REAL', pix_copy_paste: '000201asaas' } } });
    act(() => usePendenciaStore.getState().pagar('a1'));
    const tela = montar();
    fireEvent.press(await tela.findByTestId('pix-dropdown'));
    expect(tela.getByTestId('pix-codigo').props.children).toBe('000201asaas');
    expect(tela.queryByTestId('pix-chave')).toBeNull();
  });

  it('sem serviço/multa/quem/código; copiar falhando não marca', async () => {
    get.mockResolvedValue({ data: { status: 'PENDING', amount: 10, pix_copy_paste: 'p' } });
    mockCopiar.mockResolvedValue(false);
    act(() => usePendenciaStore.getState().pagar('a1'));
    const tela = montar();
    expect(await tela.findByText('R$ 10,00')).toBeTruthy();
    expect(tela.queryByText(/^Para:/)).toBeNull();
    fireEvent.press(tela.getByTestId('pix-dropdown'));
    await act(async () => {
      fireEvent.press(tela.getByTestId('pix-copiar'));
    });
    expect(tela.getByText('Copiar')).toBeTruthy();
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

// pagamento-pelo-asaas (DEC-119, Backend dea2d00): com `gateway` o Pix e o do Asaas; sem ele, o de hoje.
describe('ModalDePagamento — pelo Asaas', () => {
  const ASAAS = {
    ...PIX,
    pix_key: 'chave@prof.com',
    gateway: { provider: 'ASAAS', mode: 'SANDBOX', status: 'PENDING', pix_copy_paste: '000201asaas' },
  };

  it('com gateway: mostra o Pix do Asaas, sem a chave do profissional, com o "Já paguei" (as duas vias quitam) e a confirmação automática', async () => {
    get.mockResolvedValue({ data: ASAAS });
    act(() => usePendenciaStore.getState().pagar('a1'));
    const tela = montar();
    fireEvent.press(await tela.findByTestId('pix-dropdown'));
    expect(await tela.findByTestId('pix-codigo')).toBeTruthy();
    expect(tela.getByTestId('pix-codigo').props.children).toBe('000201asaas');
    expect(tela.queryByTestId('pix-chave')).toBeNull();
    expect(tela.getByTestId('pix-ja-paguei')).toBeTruthy();
    expect(tela.getByText('A confirmação é automática.')).toBeTruthy();
    expect(tela.getByTestId('pix-ok')).toBeTruthy();
  });

  it('sandbox: a faixa "Pagamento de teste" e "Sem dinheiro real."; no modo real, nada disso', async () => {
    get.mockResolvedValue({ data: ASAAS });
    act(() => usePendenciaStore.getState().pagar('a1'));
    const teste = montar();
    expect(await teste.findByTestId('pagamento-de-teste')).toBeTruthy();
    expect(teste.getByText('Pagamento de teste')).toBeTruthy();
    expect(teste.getByText('Sem dinheiro real.')).toBeTruthy();
    teste.unmount();

    get.mockResolvedValue({ data: { ...ASAAS, gateway: { ...ASAAS.gateway, mode: 'REAL' } } });
    const real = montar();
    fireEvent.press(await real.findByTestId('pix-dropdown'));
    expect(await real.findByTestId('pix-codigo')).toBeTruthy();
    expect(real.queryByTestId('pagamento-de-teste')).toBeNull();
  });

  it('gateway sem o copia-e-cola, só com a imagem do QR: mostra a imagem e o modal não fecha', async () => {
    get.mockResolvedValue({
      data: { status: 'PENDING', amount: 45, gateway: { provider: 'ASAAS', mode: 'REAL', pix_qr_image: 'iVBORw0KGgo=' } },
    });
    act(() => usePendenciaStore.getState().pagar('a1'));
    const tela = montar();
    fireEvent.press(await tela.findByTestId('pix-dropdown'));
    const img = await tela.findByTestId('pix-qr-imagem');
    expect(img.props.source.uri).toBe('data:image/png;base64,iVBORw0KGgo=');
    expect(tela.queryByTestId('pix-codigo')).toBeNull();
    expect(usePendenciaStore.getState().pagando).toBe('a1');
  });

  it('o webhook quita sozinho: o modal confere de 5 em 5 s e mostra "Pago"', async () => {
    jest.useFakeTimers();
    try {
      get.mockResolvedValueOnce({ data: ASAAS }).mockResolvedValue({ data: { ...ASAAS, status: 'PAID' } });
      act(() => usePendenciaStore.getState().pagar('a1'));
      const tela = montar();
      await act(async () => {});
      expect(tela.getByTestId('pix-status').props.children).toBe('Pagamento pendente');
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(tela.getByTestId('pix-status').props.children).toBe('Pago');
      expect(tela.queryByText('A confirmação é automática.')).toBeNull();
      // o Asaas quitou: o "Já paguei" some
      expect(tela.queryByTestId('pix-ja-paguei')).toBeNull();
      get.mockClear();
      await act(async () => {
        jest.advanceTimersByTime(15000);
      });
      expect(get).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('o profissional recusa o "Já paguei": o modal confere, volta a pendente e avisa para conferir o pagamento', async () => {
    jest.useFakeTimers();
    try {
      get.mockResolvedValueOnce({ data: PIX }).mockResolvedValue({ data: { ...PIX, status: 'PENDING' } });
      claim.mockResolvedValue({ data: { status: 'AWAITING_CONFIRMATION' } });
      act(() => usePendenciaStore.getState().pagar('a1'));
      const tela = montar();
      await act(async () => {});
      await act(async () => {
        fireEvent.press(tela.getByTestId('pix-ja-paguei'));
      });
      expect(tela.queryByTestId('pix-ja-paguei')).toBeNull();
      expect(tela.queryByTestId('pix-recusado')).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(tela.getByTestId('pix-recusado')).toBeTruthy();
      expect(tela.getByText('O profissional não confirmou o pagamento. Confira se ele saiu da sua conta.')).toBeTruthy();
      expect(tela.getByTestId('pix-ja-paguei')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('aberto pelo push PAYMENT_REFUSED: já mostra o aviso e o "Já paguei"', async () => {
    get.mockResolvedValue({ data: { ...PIX, status: 'PENDING' } });
    act(() => usePendenciaStore.getState().pagar('a1', true));
    const tela = montar();
    expect(await tela.findByTestId('pix-recusado')).toBeTruthy();
    expect(tela.getByTestId('pix-ja-paguei')).toBeTruthy();
  });

  it('sem gateway: o fluxo de hoje (chave, "Já paguei")', async () => {
    get.mockResolvedValue({ data: { ...PIX, pix_key: 'chave@prof.com' } });
    act(() => usePendenciaStore.getState().pagar('a1'));
    const tela = montar();
    expect(await tela.findByTestId('pix-ja-paguei')).toBeTruthy();
    fireEvent.press(tela.getByTestId('pix-dropdown'));
    expect(tela.getByTestId('pix-chave')).toBeTruthy();
    expect(tela.queryByTestId('pagamento-de-teste')).toBeNull();
  });
});
