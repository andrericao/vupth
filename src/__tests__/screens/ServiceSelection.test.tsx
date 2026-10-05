import { Alert, Linking } from 'react-native';
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
    const { getByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);

    // findByTestId default é 1s; o 1º mount do Gluestack pode passar disso sob
    // carga (flaky) — dá 15s (jest.setTimeout acima cobre).
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    fireEvent.press(getByTestId('primary-queue'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'login',
      expect.objectContaining({
        redirectTo: 'queueStatus',
        professionalId: 'p1',
        serviceItemIds: ['s1'],
      }),
    );
  });

  it('com serviço escolhido, o resumo não fala de multa nem da saída sem custo (DEC-1, Andre 05/10)', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    const { queryByTestId, queryByText, findByTestId } = renderWithProviders(<ServiceSelection />);
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    expect(queryByTestId('regra-da-multa')).toBeNull();
    expect(queryByText(/multa|sem custo/i)).toBeNull();
  });

  it('LOGADO: confirmar vai direto pra queueStatus', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    const { getByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);

    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    fireEvent.press(getByTestId('primary-queue'));

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

  it('LOJA FECHADA: primária é agendar e o "Solicitar corte" mora no menu', async () => {
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

    it('servidor recusando o corte com a loja aberta: diz que o profissional está fora — não manda entrar na fila', async () => {
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
      expect(mensagem).toMatch(/está fora agora/);
      expect(mensagem).not.toMatch(/entrar na fila normalmente/);
      alerta.mockRestore();
    });
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
      expect(getByText(/Entrar na fila · R\$ 35\.00/)).toBeTruthy();
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

// CLI-10 (Backend 02dd5ef): o contato que o profissional expoe. null = nada.
describe('ServiceSelection — contato do profissional', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServices.mockResolvedValue({
      data: [{ id: 's1', customName: 'Corte', price: 30, weeklyAverageDurationInMinutes: 30 }],
    });
  });

  it('com contact_phone: mostra o número, e Ligar e WhatsApp abrem o link certo', async () => {
    setRouteParams({ ...OPEN_PARAMS, contactPhone: '+55 (11) 98888-7777' });
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { findByTestId, getByText } = renderWithProviders(<ServiceSelection />);
    await findByTestId('contato-do-profissional', {}, { timeout: 15000 });
    expect(getByText('+55 (11) 98888-7777')).toBeTruthy();
    fireEvent.press(getByText('Ligar'));
    fireEvent.press(getByText('WhatsApp'));
    expect(abrir).toHaveBeenNthCalledWith(1, 'tel:+5511988887777');
    expect(abrir).toHaveBeenNthCalledWith(2, 'https://wa.me/5511988887777');
    abrir.mockRestore();
  });

  it('sem contact_phone (null): nenhum contato na tela', async () => {
    setRouteParams({ ...OPEN_PARAMS, contactPhone: null });
    const { findByTestId, queryByTestId } = renderWithProviders(<ServiceSelection />);
    await findByTestId('service-s1', {}, { timeout: 15000 });
    expect(queryByTestId('contato-do-profissional')).toBeNull();
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
    expect(alerta).toHaveBeenCalledWith('Pedido enviado! ⏳', expect.stringMatching(/amanhã às 09:30/));
    expect(mockNavigate).toHaveBeenCalledWith('home');
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
