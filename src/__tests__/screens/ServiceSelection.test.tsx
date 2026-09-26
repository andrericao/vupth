import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { ServiceSelection } from '@screens/ServiceSelection';
import { establishmentService } from '@services/establishmentService';
import { swapOfferService } from '@services/swapOfferService';
import { cutRequestService } from '@services/cutRequestService';
import { useAuthStore } from '@stores/authStore';

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
  establishmentService: { getServiceItemsByProfessional: jest.fn() },
}));
jest.mock('@services/swapOfferService', () => ({
  swapOfferService: { create: jest.fn() },
}));
jest.mock('@services/cutRequestService', () => ({
  cutRequestService: { create: jest.fn() },
}));

const mockGetServices = establishmentService.getServiceItemsByProfessional as jest.Mock;
const mockCreateOffer = swapOfferService.create as jest.Mock;
const mockCreateCut = cutRequestService.create as jest.Mock;

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

  it('com serviço escolhido, o resumo diz a regra da multa ANTES de entrar (CDC)', async () => {
    useAuthStore.setState({ isAuthenticated: true });
    const { getByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);
    fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
    expect(getByTestId('regra-da-multa')).toBeTruthy();
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

    await waitFor(() =>
      expect(mockCreateCut).toHaveBeenCalledWith(
        { professionalId: 'p1', establishmentId: 'e1', serviceItemIds: ['s1'] },
        'tok',
      ),
    );
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

    it('a ação principal é "Solicitar corte" — não há "Entrar na fila"', async () => {
      const { getByTestId, queryByTestId, findByTestId } = renderWithProviders(<ServiceSelection />);
      fireEvent.press(await findByTestId('service-s1', {}, { timeout: 15000 }));
      expect(getByTestId('primary-cut')).toBeTruthy();
      expect(queryByTestId('primary-queue')).toBeNull();
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
      await act(async () => {
        fireEvent.press(getByTestId('primary-cut'));
      });
      const [, mensagem] = alerta.mock.calls[0] as [string, string];
      expect(mensagem).toMatch(/está fora agora/);
      expect(mensagem).not.toMatch(/entrar na fila normalmente/);
      alerta.mockRestore();
    });
  });
});
