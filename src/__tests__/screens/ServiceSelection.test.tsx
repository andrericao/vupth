import { Alert, Linking, StyleSheet } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { ServiceSelection } from '@screens/ServiceSelection';
import { establishmentService } from '@services/establishmentService';
import { swapOfferService } from '@services/swapOfferService';
import { cutRequestService } from '@services/cutRequestService';
import { useAuthStore } from '@stores/authStore';
import { dataISO } from '@domain/establishment/horarios';

const mockNavigate = jest.fn();

const OPEN_PARAMS = {
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  establishmentName: 'Barbearia',
  estimatedWaitMinutes: 20,
};
// Mutável: o mock do useRoute lê daqui (loja aberta x fechada por teste).
const mockRouteParams: Record<string, unknown> = { ...OPEN_PARAMS };

let mockInset = 0;
let mockCupons: unknown[] = [];
jest.mock('@hooks/useMeusCupons', () => ({ useMeusCupons: () => mockCupons }));
jest.mock('@hooks/usePagamentoAdiantado', () => ({ ...jest.requireActual('@hooks/usePagamentoAdiantado'), usePagamentoAdiantado: () => false }));
jest.mock('@hooks/useTabBarInset', () => ({ useTabBarInset: () => mockInset }));
jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));
jest.mock('@services/establishmentService', () => ({
  establishmentService: {
    getServiceItemsByProfessional: jest.fn(),
    // A escolha do horario do corte (ScheduleModal) le o horario da loja.
    getHours: jest.fn(() => Promise.resolve({ data: null })),
  },
}));
jest.mock('@services/intentionsService', () => ({
  intentionsService: { getPublicAgenda: jest.fn(() => Promise.resolve({ data: null })), create: jest.fn() },
}));
// O snapshot da loja (WS) vem do cache do react-query, que a tela da loja
// mantem; aqui nao ha loja atras — sem snapshot.
let mockSnapshot: unknown = undefined;
jest.mock('@hooks/useEstablishments', () => ({
  useSnapshotDaLoja: () => mockSnapshot,
}));
jest.mock('@services/swapOfferService', () => ({
  swapOfferService: { create: jest.fn() },
}));
let mockMultas: unknown[] = [];
jest.mock('@services/penaltyService', () => ({
  penaltyService: { listPending: jest.fn(() => Promise.resolve({ data: { total: 0, penalties: mockMultas } })) },
}));
let mockPagamentos: unknown[] = [];
jest.mock('@services/paymentService', () => ({
  paymentService: { pendentes: jest.fn(() => Promise.resolve({ data: { count: 0, total: 0, items: mockPagamentos } })) },
}));
jest.mock('@services/cutRequestService', () => ({
  cutRequestService: { create: jest.fn() },
}));

const mockGetServices = establishmentService.getServiceItemsByProfessional as jest.Mock;
const mockCreateOffer = swapOfferService.create as jest.Mock;
const mockCreateCut = cutRequestService.create as jest.Mock;
const mockGetHours = establishmentService.getHours as jest.Mock;

function setRouteParams(params: Record<string, unknown>) {
  Object.keys(mockRouteParams).forEach((k) => delete mockRouteParams[k]);
  Object.assign(mockRouteParams, params);
}

// Render de tela com GluestackUIProvider é pesado sob o jest (a 1ª montagem
// carrega o build inteiro do gluestack). O default de 5s não cobre o 1º teste.
// ⏱️ 90s, e nao 30s: o portao de pre-push do Andre falhou aqui em 19/09 com
// "Exceeded timeout of 30000 ms" — nao por regressao, mas por CARGA. A maquina
// roda varias sessoes ao mesmo tempo (tres repositorios, cada um com a sua
// suite), e o primeiro mount do Gluestack, que ja e o mais caro do projeto,
// passou dos 30s. Teste que falha por concorrencia nao esta medindo o codigo:
// da tempo folgado e deixa o portao dizer a verdade.
jest.setTimeout(90000);

// aviso-de-chegada-na-entrada (André, 22/10): com menos de 1 h de espera, "Entrar na
// fila" abre o aviso "Esteja na loja às …"; o Confirmar é que segue.
function confirmarChegada(alerta: jest.SpyInstance) {
  const botoes = alerta.mock.calls[alerta.mock.calls.length - 1][2] as { text: string; onPress?: () => void }[];
  botoes.find((b) => b.text === 'Confirmar')!.onPress!();
}

describe('ServiceSelection — portão de auth (modo visitante)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setRouteParams({ ...OPEN_PARAMS });
    mockGetServices.mockResolvedValue({
      data: [{ id: 's1', customName: 'Corte', price: 30, weeklyAverageDurationInMinutes: 30 }],
    });
  });

  it('VISITANTE: confirmar manda pro login levando a seleção (redirectTo queueStatus)', async () => {
    useAuthStore.setState({ isAuthenticated: false });
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);

    // findByTestId default é 1s; o 1º mount do Gluestack pode passar disso sob
    // carga (flaky) — dá 15s (jest.setTimeout acima cobre).
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    fireEvent.press(getByTestId('primary-queue'));
    confirmarChegada(alerta);
    alerta.mockRestore();

    expect(mockNavigate).toHaveBeenCalledWith(
      'login',
      expect.objectContaining({
        redirectTo: 'queueStatus',
        professionalId: 'p1',
        serviceItemIds: ['s1'],
      }),
    );
  });

  // aviso-de-chegada-na-entrada (André, 22/10).
  it('Entrar na fila com menos de 1 h: avisa o horário; Cancelar não entra, Confirmar entra', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    fireEvent.press(getByTestId('primary-queue'));
    const [titulo, mensagem, botoes] = alerta.mock.calls[0] as [string, string, { text: string; style?: string; onPress?: () => void }[]];
    expect(titulo).toBe('Esteja na loja');
    expect(mensagem).toMatch(/^Esteja na loja às \d{2}:\d{2}\.$/);
    expect(botoes.map((b) => b.text)).toEqual(['Cancelar', 'Confirmar']);
    expect(mockNavigate).not.toHaveBeenCalledWith('queueStatus', expect.anything());
    confirmarChegada(alerta);
    expect(mockNavigate).toHaveBeenCalledWith('queueStatus', expect.objectContaining({ professionalId: 'p1' }));
    alerta.mockRestore();
  });

  // modal-sem-fila-5-minutos (André, 24/10): fila livre, só "em 5 minutos".
  it('Entrar numa fila livre: o aviso diz só "Esteja na loja em 5 minutos."', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    setRouteParams({ ...OPEN_PARAMS, estimatedWaitMinutes: 0 });
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    fireEvent.press(getByTestId('primary-queue'));
    const [titulo, mensagem] = alerta.mock.calls[0] as [string, string];
    expect(titulo).toBe('Esteja na loja');
    expect(mensagem).toBe('Esteja na loja em 5 minutos.');
    alerta.mockRestore();
  });

  it('com serviço escolhido, o resumo não fala de multa nem da saída sem custo (DEC-1, Andre 05/10)', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    const { queryByTestId, queryByText, findByTestId } = renderWithProviders(<ServiceSelection />);
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    expect(queryByTestId('regra-da-multa')).toBeNull();
    expect(queryByText(/multa|sem custo/i)).toBeNull();
  });

  // politica-de-preco-saiba-mais (DEC-91, Andre 18/10): onde o preço aparece, o
  // "Saiba mais" leva ao artigo do Suporte. Sem serviço marcado não há preço a explicar.
  it('com serviço escolhido, o resumo traz o Saiba mais do preço, que abre o artigo do Suporte', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { queryByTestId, getByTestId, getByText, findByTestId } = renderWithProviders(<ServiceSelection />);
    await findByTestId('service-s1', {}, { timeout: 15000 });
    expect(queryByTestId('preco-saiba-mais')).toBeNull();
    fireEvent.press(getByTestId('service-s1'));
    // detalhes-do-pagamento (André, 24/10): o rotulo e "Detalhes do pagamento"; o Saiba mais explica
    // a taxa e que abatimento em multa nao conta em campanha, e dai vai ao artigo.
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    expect(getByText('Detalhes do pagamento')).toBeTruthy();
    fireEvent.press(getByTestId('preco-saiba-mais'));
    const [titulo, mensagem, botoes] = alerta.mock.calls[0] as [string, string, { text: string; onPress?: () => void }[]];
    expect(titulo).toBe('Detalhes do pagamento');
    expect(mensagem).toMatch(/taxa de pagamento/);
    expect(mensagem).toMatch(/Abatimentos em multas não são considerados em campanhas/);
    botoes.find((b) => b.text === 'Ver artigo')!.onPress!();
    expect(abrir).toHaveBeenCalledWith('https://vupth-support.pages.dev/artigos/cliente/por-que-o-preco-muda.html');
    alerta.mockRestore();
    abrir.mockRestore();
  });

  // cupom-abate-no-resumo (André, 24/10): o resumo mostra o total dos servicos sem a multa; o toggle
  // "usar cupom" fica abaixo do card; ligado, o valor cheio e riscado, "Valor com cupom" aparece e o
  // botao usa servicos - cupom (+ multa, que nunca entra no desconto).
  it('o cupom abate no resumo e no botão ao ligar o toggle', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    mockCupons = [{ id: 'c1', name: 'Dez', value_amount: 10 }];
    const { getByTestId, queryByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);
    await findByTestId('service-s1', {}, { timeout: 15000 });
    fireEvent.press(getByTestId('service-s1'));
    expect(getByTestId('servicos-valor-cheio')).toBeTruthy();
    expect(queryByTestId('valor-com-cupom')).toBeNull();
    expect(getByTestId('primary-queue')).toHaveTextContent('Entrar na fila · R$ 30,00');
    fireEvent(getByTestId('usar-cupom-c1'), 'valueChange', true);
    expect(getByTestId('valor-com-cupom')).toBeTruthy();
    expect(getByTestId('valor-com-cupom')).toHaveTextContent(/Valor com cupom\s*R\$ 20,00/);
    expect(getByTestId('servicos-valor-cheio')).toHaveTextContent('R$ 30,00');
    expect(getByTestId('primary-queue')).toHaveTextContent('Entrar na fila · R$ 20,00');
    fireEvent(getByTestId('usar-cupom-c1'), 'valueChange', false);
    expect(queryByTestId('valor-com-cupom')).toBeNull();
    expect(getByTestId('primary-queue')).toHaveTextContent('Entrar na fila · R$ 30,00');
    mockCupons = [];
  });

  it('LOGADO: confirmar vai direto pra queueStatus', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);

    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    fireEvent.press(getByTestId('primary-queue'));
    confirmarChegada(alerta);
    alerta.mockRestore();

    expect(mockNavigate).toHaveBeenCalledWith(
      'queueStatus',
      expect.objectContaining({ professionalId: 'p1', serviceItemIds: ['s1'] }),
    );
    expect(mockNavigate).not.toHaveBeenCalledWith('login', expect.anything());
  });
});

// F8 fatia 2 — a tela principal fica só com a ação primária; corte e troca vão
// pro menu "Mais opções" (decisão Andre 2026-08-01).
describe('ServiceSelection — menu "Mais opções" + entrar por troca (F8 fatia 2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setRouteParams({ ...OPEN_PARAMS });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetServices.mockResolvedValue({
      data: [{ id: 's1', customName: 'Corte', price: 30, weeklyAverageDurationInMinutes: 30 }],
    });
  });

  async function selectServiceAndOpenMenu() {
    const screen = renderWithProviders(<ServiceSelection />);
    fireEvent.press(await screen.findByTestId('service-s1', {}, { timeout: 15000 }));
    fireEvent.press(screen.getByTestId('more-options'));
    return screen;
  }

  it('LOGADO: "Entrar por troca" publica a oferta EARLIER com os serviços escolhidos', async () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    mockCreateOffer.mockResolvedValue({ data: { id: 'off-1' } });

    const { getByTestId } = await selectServiceAndOpenMenu();
    fireEvent.press(getByTestId('more-option-swap'));

    await waitFor(() =>
      expect(mockCreateOffer).toHaveBeenCalledWith(
        { professionalId: 'p1', serviceItemIds: ['s1'], direction: 'EARLIER' },
        'tok',
      ),
    );
  });

  it('LOGADO: 422 de "já está na fila" vira mensagem específica', async () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    mockCreateOffer.mockRejectedValue({
      response: { status: 422, data: { code: 'QUEUE_SWAP_OFFER_NOT_ALLOWED' } },
    });

    const { getByTestId } = await selectServiceAndOpenMenu();
    fireEvent.press(getByTestId('more-option-swap'));

    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        'Não foi possível publicar',
        expect.stringMatching(/já está na fila desse profissional/),
      ),
    );
  });

  it('VISITANTE: "Entrar por troca" manda pro login e VOLTA pra seleção (não pra fila)', async () => {
    useAuthStore.setState({ isAuthenticated: false, accessToken: null });

    const { getByTestId } = await selectServiceAndOpenMenu();
    fireEvent.press(getByTestId('more-option-swap'));

    expect(mockCreateOffer).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(
      'login',
      expect.objectContaining({
        redirectTo: 'serviceSelection',
        professionalId: 'p1',
        serviceItemIds: ['s1'],
      }),
    );
  });

  it('LOJA FECHADA: primária é agendar e o "Pedir corte" mora no menu', async () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    setRouteParams({ ...OPEN_PARAMS, establishmentOpen: false });
    mockCreateCut.mockResolvedValue({ data: { id: 'cut-1' } });

    const { getByTestId, queryByTestId, findByTestId } = renderWithProviders(
      <ServiceSelection />,
    );
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));

    // Por testID, nao pelo texto: o rotulo carrega o preco ("Agendar para
    // depois · R$ 50") e mudou junto com o desenho novo — o que o teste
    // garante e QUAL acao e a primaria, nao como ela se chama.
    expect(getByTestId('primary-schedule')).toBeTruthy();
    expect(queryByTestId('primary-queue')).toBeNull();

    fireEvent.press(getByTestId('more-options'));
    fireEvent.press(getByTestId('more-option-cut'));
    // S26: o menu abre a escolha de quando; "Assim que abrir" = sem horario.
    fireEvent.press(await findByTestId('corte-assim-que-abrir'));

    await waitFor(() =>
      expect(mockCreateCut).toHaveBeenCalledWith(
        { professionalId: 'p1', establishmentId: 'e1', serviceItemIds: ['s1'] },
        'tok',
      ),
    );
  });

  // cupom-ativado-nao-computado (André, 24/10): o pedido de corte leva o cupom do toggle.
  it('LOJA FECHADA: o pedido de corte leva o cupom ligado no toggle; sem o toggle, sai sem ele', async () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    setRouteParams({ ...OPEN_PARAMS, establishmentOpen: false });
    mockCreateCut.mockResolvedValue({ data: { id: 'cut-1' } });
    mockCupons = [{ id: 'c1', name: 'Dez', value_amount: 10 }];
    const { getByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    fireEvent(getByTestId('usar-cupom-c1'), 'valueChange', true);
    fireEvent.press(getByTestId('more-options'));
    fireEvent.press(getByTestId('more-option-cut'));
    fireEvent.press(await findByTestId('corte-assim-que-abrir'));
    await waitFor(() =>
      expect(mockCreateCut).toHaveBeenCalledWith(
        { professionalId: 'p1', establishmentId: 'e1', serviceItemIds: ['s1'], coupon_campaign_id: 'c1' },
        'tok',
      ),
    );
    mockCupons = [];
  });

  it('LOJA FECHADA: cupom recusado no pedido de corte (COUPON_NOT_ACTIVE) avisa e tira o cupom da escolha', async () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    setRouteParams({ ...OPEN_PARAMS, establishmentOpen: false });
    mockCreateCut.mockRejectedValue({ response: { status: 422, data: { code: 'COUPON_NOT_ACTIVE' } } });
    mockCupons = [{ id: 'c1', name: 'Dez', value_amount: 10 }];
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, queryByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    fireEvent(getByTestId('usar-cupom-c1'), 'valueChange', true);
    expect(queryByTestId('valor-com-cupom')).toBeTruthy();
    fireEvent.press(getByTestId('more-options'));
    fireEvent.press(getByTestId('more-option-cut'));
    fireEvent.press(await findByTestId('corte-assim-que-abrir'));
    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Cupom', expect.any(String)));
    expect(queryByTestId('valor-com-cupom')).toBeNull();
    alerta.mockRestore();
    mockCupons = [];
  });

  it('fila aberta: as duas portas na tela — entrar agora e agendar; o menu fica só com a troca (C20)', async () => {
    const { getByTestId, queryByTestId } = await selectServiceAndOpenMenu();

    expect(getByTestId('primary-queue')).toBeTruthy();
    expect(getByTestId('second-door-schedule')).toBeTruthy();
    expect(queryByTestId('more-option-schedule')).toBeNull();
    expect(getByTestId('more-option-swap')).toBeTruthy();
  });

  it('restaura a seleção que voltou do portão de auth (serviceItemIds na rota)', async () => {
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    setRouteParams({ ...OPEN_PARAMS, serviceItemIds: ['s1'] });
    mockCreateOffer.mockResolvedValue({ data: { id: 'off-1' } });

    const { getByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);
    // Sem tocar em nenhum serviço: o rodapé já aparece com a seleção restaurada.
    fireEvent.press(await findByTestId('more-options', {}, { timeout: 15000 }));
    fireEvent.press(getByTestId('more-option-swap'));

    await waitFor(() =>
      expect(mockCreateOffer).toHaveBeenCalledWith(
        expect.objectContaining({ serviceItemIds: ['s1'] }),
        'tok',
      ),
    );
  });

  describe('profissional em "Fora" (Andre, 24/09)', () => {
    // Loja aberta, profissional fora do expediente e fila fechada: o app não
    // pode oferecer a entrada — só o pedido de corte, e o profissional decide.
    beforeEach(() => {
      setRouteParams({ ...OPEN_PARAMS, profissionalFora: true });
      useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    });

    // DEC-6 (02/10): só "Agendar" e "Mais opções" — o corte mora no menu.
    it('a ação principal é "Agendar"; o menu tem só o pedido de corte — nunca "Entrar na fila"', async () => {
      const { getByTestId, queryByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);
      fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
      expect(getByTestId('primary-schedule')).toBeTruthy();
      expect(queryByTestId('primary-queue')).toBeNull();
      expect(queryByTestId('primary-cut')).toBeNull();
      expect(queryByTestId('second-door-schedule')).toBeNull();
      fireEvent.press(getByTestId('more-options'));
      expect(getByTestId('more-option-cut')).toBeTruthy();
      expect(queryByTestId('more-option-swap')).toBeNull();
      expect(queryByTestId('more-option-schedule')).toBeNull();
      // Nem posição, nem previsão, nem regra de saída de uma fila em que ele não entra.
      expect(queryByTestId('regra-da-multa')).toBeNull();
    });

    it('backend anterior recusando o corte (409): diz que ele não recebe pedidos agora — não manda entrar na fila (DEC-27)', async () => {
      mockCreateCut.mockRejectedValue(
        Object.assign(new Error('409'), { response: { status: 409, data: { code: 'CUT_REQUEST_NOT_ALLOWED' } } }),
      );
      const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      const { getByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);
      fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
      fireEvent.press(getByTestId('more-options'));
      fireEvent.press(getByTestId('more-option-cut'));
      await act(async () => {
        fireEvent.press(getByTestId('corte-assim-que-abrir'));
      });
      const [, mensagem] = alerta.mock.calls[0] as [string, string];
      expect(mensagem).toMatch(/não está recebendo pedidos agora/);
      expect(mensagem).not.toMatch(/entrar na fila/);
      alerta.mockRestore();
    });
  });

  // DEC-27 (Backend d8039b5): pedido para outro dia vem sem prazo (expires_at nulo).
  it('pedido aceito pelo servidor sem prazo: avisa que ele responde quando abrir a agenda', async () => {
    setRouteParams({ ...OPEN_PARAMS, profissionalFora: true });
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    mockGetServices.mockResolvedValue({
      data: [{ id: 's1', customName: 'Corte', price: 30, weeklyAverageDurationInMinutes: 30 }],
    });
    mockCreateCut.mockResolvedValue({ data: { id: 'cr1', created_at: null, expires_at: null } });
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    fireEvent.press(getByTestId('more-options'));
    fireEvent.press(getByTestId('more-option-cut'));
    await act(async () => {
      fireEvent.press(getByTestId('corte-assim-que-abrir'));
    });
    const [, mensagem] = alerta.mock.calls[0] as [string, string];
    expect(mensagem).toMatch(/responde quando abrir a agenda/);
    expect(mensagem).not.toMatch(/5 minutos/);
    alerta.mockRestore();
  });

  describe('profissional "só agenda" (Backend 8e6c00f)', () => {
    beforeEach(() => {
      setRouteParams({ ...OPEN_PARAMS, soAgenda: true });
      useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    });

    it('com a loja aberta, a única ação é agendar — sem fila, sem corte, sem menu', async () => {
      const { getByTestId, queryByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);
      fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
      expect(getByTestId('primary-schedule')).toBeTruthy();
      expect(queryByTestId('primary-queue')).toBeNull();
      expect(queryByTestId('primary-cut')).toBeNull();
      expect(queryByTestId('more-options')).toBeNull();
      expect(queryByTestId('regra-da-multa')).toBeNull();
      expect(getByTestId('so-agenda')).toBeTruthy();
    });
  });

  // mais-opcoes-cortado (André, 22/10): os botões do rodapé ficam acima da barra de abas.
  describe('rodapé acima da barra de abas', () => {
    beforeEach(() => {
      setRouteParams({ ...OPEN_PARAMS });
      useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    });

    it('sem barra de abas, fica a 30 do fundo; com ela, 16 acima da barra', async () => {
      mockInset = 0;
      const sem = renderWithProviders(<ServiceSelection />);
      fireEvent.press(await sem.findByTestId('service-s1', {}, { timeout: 15000 }));
      expect(StyleSheet.flatten(sem.getByTestId('rodape-da-escolha').props.style).bottom).toBe(30);
      sem.unmount();

      mockInset = 90;
      const com = renderWithProviders(<ServiceSelection />);
      fireEvent.press(await com.findByTestId('service-s1', {}, { timeout: 15000 }));
      expect(StyleSheet.flatten(com.getByTestId('rodape-da-escolha').props.style).bottom).toBe(106);
      mockInset = 0;
    });
  });

  describe('multas pendentes na conta (Backend 389a152)', () => {
    beforeEach(() => {
      setRouteParams({ ...OPEN_PARAMS });
      useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    });
    afterEach(() => {
      mockMultas = [];
    });

    // DEC-1 (01/10): nada de lista na escolha — uma linha somada ao total e o link.
    it('com multa pendente: uma linha "+ R$" no total, o botão soma, e o link explica cada uma', async () => {
      mockMultas = [{ penaltyId: 'm1', type: 'LATE_CANCEL', amount: 5, originProfessionalName: 'Carlos' }];
      const { findByTestId, getByTestId, getByText, queryByText } = renderWithProviders(<ServiceSelection />);
      fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
      expect(await findByTestId('multas-pendentes', {}, { timeout: 15000 })).toBeTruthy();
      expect(getByText('+ R$ 5,00')).toBeTruthy();
      expect(queryByText(/Saiu da fila · Carlos/)).toBeNull();
      expect(getByText(/Entrar na fila · R\$ 35,00/)).toBeTruthy();
      fireEvent.press(getByTestId('ver-multas'));
      expect(getByText('Saiu da fila · Carlos')).toBeTruthy();
    });

    it('sem multa, a conta fica como sempre', async () => {
      const { findByTestId, queryByTestId } = renderWithProviders(<ServiceSelection />);
      fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
      expect(queryByTestId('multas-pendentes')).toBeNull();
    });
  });
});

describe('ServiceSelection — tempo do serviço (tempo-do-servico)', () => {
  it('mostra o tempo configurado pelo profissional, não a média da semana', async () => {
    setRouteParams({ ...OPEN_PARAMS });
    mockGetServices.mockResolvedValue({
      data: [{ id: 's1', customName: 'Corte', price: 30, estimatedMinutes: 45, weeklyAverageDurationInMinutes: 30 }],
    });
    const { findByText, queryByText } = renderWithProviders(<ServiceSelection />);

    expect(await findByText('45 min', {}, { timeout: 15000 })).toBeTruthy();
    expect(queryByText('30 min')).toBeNull();
  });
});

// Informacoes do profissional (Andre, 05/10): o contato saiu da escolha do
// servico — sem Ligar e sem WhatsApp. O nome no topo leva a tela dele.
describe('ServiceSelection — o profissional no topo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setRouteParams({ ...OPEN_PARAMS });
    mockGetServices.mockResolvedValue({
      data: [{ id: 's1', customName: 'Corte', price: 30, weeklyAverageDurationInMinutes: 30 }],
    });
  });

  it('nao ha Ligar, WhatsApp nem contato na escolha do servico', async () => {
    const { findByTestId, queryByTestId, queryByText } = renderWithProviders(<ServiceSelection />);
    await findByTestId('service-s1', {}, { timeout: 15000 });
    expect(queryByTestId('contato-do-profissional')).toBeNull();
    expect(queryByText('Ligar')).toBeNull();
    expect(queryByText('WhatsApp')).toBeNull();
  });

  it('tocar no nome abre as informacoes do profissional', async () => {
    const { findByTestId } = renderWithProviders(<ServiceSelection />);
    fireEvent.press(await findByTestId('ver-profissional', {}, { timeout: 15000 }));
    expect(mockNavigate).toHaveBeenCalledWith('professionalInfo', {
      professionalId: 'p1',
      establishmentId: 'e1',
      professionalName: 'Carlos',
    });
  });
});

// Decisão de 05/09 (Backend 35d57c0): o "Nº da fila" do resumo obedece ao
// interruptor do profissional, pela mesma fonte da QueueStatus e da Home.
describe('ServiceSelection — o interruptor da posição', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true });
    setRouteParams({ ...OPEN_PARAMS, queueCount: 2 });
    mockGetServices.mockResolvedValue({
      data: [{ id: 's1', customName: 'Corte', price: 30, weeklyAverageDurationInMinutes: 30 }],
    });
  });

  afterAll(() => {
    mockSnapshot = undefined;
  });

  it('liberada: o resumo diz "3º da fila"', async () => {
    mockSnapshot = [{ id: 'p1', show_position: true }];
    const { findByTestId, getByText } = renderWithProviders(<ServiceSelection />);
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    expect(getByText('3º da fila')).toBeTruthy();
  });

  it('escondida: sem a linha da posição — a previsão continua', async () => {
    mockSnapshot = [{ id: 'p1', show_position: false }];
    const { findByTestId, queryByText, getByText } = renderWithProviders(<ServiceSelection />);
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    expect(queryByText('Sua posição')).toBeNull();
    expect(queryByText(/º da fila/)).toBeNull();
    expect(getByText('Começa por volta de')).toBeTruthy();
  });
});

// S26 (Backend 36c4359): o pedido de corte leva o dia e o horário escolhidos.
describe('ServiceSelection — pedido de corte com dia e horário', () => {
  const amanha = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
    setRouteParams({ ...OPEN_PARAMS, establishmentOpen: false });
    mockGetServices.mockResolvedValue({
      data: [{ id: 's1', customName: 'Corte', price: 30, weeklyAverageDurationInMinutes: 30 }],
    });
    // Amanhã a loja abre das 09:00 às 11:00.
    mockGetHours.mockResolvedValue({
      data: {
        configured: true,
        weekly: [],
        exceptions: [],
        upcoming: [{ date: dataISO(amanha()), day: 'MONDAY', closed: false, opens: '09:00', closes: '11:00' }],
      },
    });
  });

  afterAll(() => mockGetHours.mockImplementation(() => Promise.resolve({ data: null })));

  async function escolherAmanhaAs0930() {
    const tela = renderWithProviders(<ServiceSelection />);
    fireEvent.press(await tela.findByTestId('service-s1', {}, { timeout: 15000 }));
    fireEvent.press(tela.getByTestId('more-options'));
    fireEvent.press(tela.getByTestId('more-option-cut'));
    await tela.findByTestId('corte-assim-que-abrir');
    await act(async () => {});
    // O modal e o ultimo a desenhar: o dia dele e o ultimo texto com o numero.
    const dias = tela.getAllByText(String(amanha().getDate()));
    fireEvent.press(dias[dias.length - 1]);
    fireEvent.press(await tela.findByTestId('horario-09:30'));
    await act(async () => {
      fireEvent.press(tela.getByTestId('confirmar-agendamento'));
    });
    return tela;
  }

  it('manda o desiredTime com o fuso e diz para quando foi o pedido', async () => {
    mockCreateCut.mockResolvedValue({ data: { id: 'cut-1', expires_at: new Date().toISOString() } });
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await escolherAmanhaAs0930();
    const [dados, token] = mockCreateCut.mock.calls[0];
    expect(token).toBe('tok');
    expect(dados).toEqual(
      expect.objectContaining({ professionalId: 'p1', establishmentId: 'e1', serviceItemIds: ['s1'] }),
    );
    expect(dados.desiredTime).toMatch(/T09:30:00[+-]\d{2}:\d{2}$/);
    expect(alerta).toHaveBeenCalledWith(
      'Pedido enviado',
      expect.stringMatching(/^Você pediu para amanhã às 09:30\. .* responde até \d{2}:\d{2}\.$/),
      [{ text: 'Ok' }],
    );
    expect(mockNavigate).toHaveBeenCalledWith('home', undefined, { pop: true });
    alerta.mockRestore();
  });

  it('horário que já passou (422 fieldErrors.desiredTime): pede outro', async () => {
    mockCreateCut.mockRejectedValue({
      response: { status: 422, data: { code: 'VALIDATION_ERROR', fieldErrors: { desiredTime: 'must be in the future' } } },
    });
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await escolherAmanhaAs0930();
    expect(alerta).toHaveBeenCalledWith('Erro', 'Esse horário já passou. Escolha outro.');
    alerta.mockRestore();
  });

  it('VISITANTE: o menu leva ao login antes de perguntar quando', async () => {
    useAuthStore.setState({ isAuthenticated: false, accessToken: null });
    const { getByTestId, findByTestId, queryByTestId } = renderWithProviders(<ServiceSelection />);
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    fireEvent.press(getByTestId('more-options'));
    fireEvent.press(getByTestId('more-option-cut'));
    expect(mockNavigate).toHaveBeenCalledWith('login', expect.anything());
    expect(queryByTestId('corte-assim-que-abrir')).toBeNull();
    expect(mockCreateCut).not.toHaveBeenCalled();
  });
});
