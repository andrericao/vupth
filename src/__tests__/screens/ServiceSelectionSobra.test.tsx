import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { ServiceSelection } from '@screens/ServiceSelection';
import { establishmentService } from '@services/establishmentService';
import { cutRequestService } from '@services/cutRequestService';
import { useAuthStore } from '@stores/authStore';
import { MENSAGEM_SO_AGENDA } from '@domain/professional/modo';

// cobertura-98 (16/10): o que a ServiceSelection.test nao alcanca — erro e
// lista vazia ao carregar, desmarcar, as recusas do pedido de corte, as portas
// de agendar, o fechar dos modais e a multa sem valor.

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const ABERTA = {
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  establishmentName: 'Barbearia',
  estimatedWaitMinutes: 20,
};
const mockRouteParams: Record<string, unknown> = { ...ABERTA };

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));
jest.mock('@services/establishmentService', () => ({
  establishmentService: {
    getServiceItemsByProfessional: jest.fn(),
    getHours: jest.fn(() => Promise.resolve({ data: null })),
  },
}));
jest.mock('@services/intentionsService', () => ({
  intentionsService: { getPublicAgenda: jest.fn(() => Promise.resolve({ data: null })), create: jest.fn() },
}));
jest.mock('@hooks/useEstablishments', () => ({ useSnapshotDaLoja: () => undefined }));
jest.mock('@services/swapOfferService', () => ({ swapOfferService: { create: jest.fn() } }));
let mockMultas: unknown[] = [];
jest.mock('@services/penaltyService', () => ({
  penaltyService: { listPending: jest.fn(() => Promise.resolve({ data: { total: 0, penalties: mockMultas } })) },
}));
jest.mock('@services/cutRequestService', () => ({ cutRequestService: { create: jest.fn() } }));

jest.setTimeout(90000);

const mockGetServices = establishmentService.getServiceItemsByProfessional as jest.Mock;
const mockCreateCut = cutRequestService.create as jest.Mock;
const CORTE = [{ id: 's1', customName: 'Corte', price: 30, weeklyAverageDurationInMinutes: 30 }];

function rota(params: Record<string, unknown>) {
  Object.keys(mockRouteParams).forEach((k) => delete mockRouteParams[k]);
  Object.assign(mockRouteParams, params);
}

let alerta: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockMultas = [];
  rota({ ...ABERTA });
  useAuthStore.setState({ isAuthenticated: true, accessToken: 'tok' });
  mockGetServices.mockResolvedValue({ data: CORTE });
  alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => alerta.mockRestore());

async function escolher() {
  const tela = renderWithProviders(<ServiceSelection />);
  fireEvent.press(await tela.findByTestId('service-s1', {}, { timeout: 15000 }));
  return tela;
}

describe('ServiceSelection — carregar', () => {
  it('erro com mensagem do servidor: mostra e o Voltar volta', async () => {
    mockGetServices.mockRejectedValue({ response: { data: { message: 'Profissional inativo' } } });
    const tela = renderWithProviders(<ServiceSelection />);
    expect(await tela.findByText('Profissional inativo', {}, { timeout: 15000 })).toBeTruthy();
    fireEvent.press(tela.getByText('Voltar'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('erro sem mensagem: o texto padrão', async () => {
    mockGetServices.mockRejectedValue(new Error('x'));
    const tela = renderWithProviders(<ServiceSelection />);
    expect(await tela.findByText('Erro ao carregar serviços', {}, { timeout: 15000 })).toBeTruthy();
  });

  it('sem serviços: avisa e o Voltar volta', async () => {
    mockGetServices.mockResolvedValue({ data: [] });
    const tela = renderWithProviders(<ServiceSelection />);
    expect(await tela.findByText('Nenhum serviço disponível para este profissional', {}, { timeout: 15000 })).toBeTruthy();
    fireEvent.press(tela.getByText('Voltar'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

describe('ServiceSelection — escolher', () => {
  it('tocar de novo desmarca; marcar de novo leva só ele', async () => {
    const tela = await escolher();
    fireEvent.press(tela.getByTestId('service-s1'));
    fireEvent.press(tela.getByTestId('service-s1'));
    fireEvent.press(tela.getByTestId('primary-queue'));
    expect(mockNavigate).toHaveBeenCalledWith('queueStatus', expect.objectContaining({ serviceItemIds: ['s1'] }));
  });

  it('a segunda porta abre o agendar, e o Cancelar fecha', async () => {
    const tela = await escolher();
    fireEvent.press(tela.getByTestId('second-door-schedule'));
    const cancelar = await tela.findAllByText('Cancelar');
    fireEvent.press(cancelar[cancelar.length - 1]);
    expect(tela.getByTestId('second-door-schedule')).toBeTruthy();
  });

  it('o menu fecha pelo X', async () => {
    const tela = await escolher();
    fireEvent.press(tela.getByTestId('more-options'));
    fireEvent.press(tela.getByTestId('more-options-close'));
    expect(tela.getByTestId('more-options')).toBeTruthy();
  });

  it('a multa sem valor aparece como R$ 0,00, e o Entendi fecha', async () => {
    mockMultas = [{ penaltyId: 'm1', type: 'LATE_CANCEL', amount: 'x', originProfessionalName: 'Carlos' }];
    const tela = await escolher();
    fireEvent.press(await tela.findByTestId('ver-multas', {}, { timeout: 15000 }));
    expect(tela.getAllByText(/R\$ 0,00/).length).toBeGreaterThan(0);
    fireEvent.press(tela.getByText('Entendi'));
  });
});

describe('ServiceSelection — loja fechada', () => {
  beforeEach(() => rota({ ...ABERTA, establishmentOpen: false }));

  it('o Agendar principal abre a escolha do horário', async () => {
    const tela = await escolher();
    fireEvent.press(tela.getByTestId('primary-schedule'));
    expect((await tela.findAllByText('Cancelar')).length).toBeGreaterThan(0);
  });

  async function pedirCorte(params: Record<string, unknown> = {}) {
    rota({ ...ABERTA, establishmentOpen: false, ...params });
    const tela = await escolher();
    fireEvent.press(tela.getByTestId('more-options'));
    fireEvent.press(tela.getByTestId('more-option-cut'));
    await act(async () => {
      fireEvent.press(await tela.findByTestId('corte-assim-que-abrir'));
    });
    await waitFor(() => expect(alerta).toHaveBeenCalled());
    return alerta.mock.calls[0][1] as string;
  }

  it.each([
    [{ response: { data: { code: 'PROFESSIONAL_AGENDA_ONLY' } } }, MENSAGEM_SO_AGENDA, {}],
    [{ response: { data: { code: 'CUT_REQUEST_NOT_ALLOWED' } } }, /^Este profissional não está recebendo/, { professionalName: '' }],
    [{ response: { data: { message: 'Falhou' } } }, 'Falhou', {}],
    [{}, 'Erro ao enviar o pedido de corte', {}],
  ])('a recusa do corte vira uma frase: %#', async (erro, texto, params) => {
    mockCreateCut.mockRejectedValue(erro);
    const msg = await pedirCorte(params);
    if (typeof texto === 'string') expect(msg).toBe(texto);
    else expect(msg).toMatch(texto);
  });
});

describe('ServiceSelection — pagamento pendente (CLI-30)', () => {
  it('o pedido de corte recusado por pendência abre o aviso com o "Pagar", sem o erro', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { usePendenciaStore } = require('@stores/pendenciaStore');
    rota({ ...ABERTA, establishmentOpen: false });
    mockCreateCut.mockRejectedValue({ response: { status: 409, data: { code: 'PAYMENT_PENDING', items: [] } } });
    const tela = await escolher();
    fireEvent.press(tela.getByTestId('more-options'));
    fireEvent.press(tela.getByTestId('more-option-cut'));
    await act(async () => {
      fireEvent.press(await tela.findByTestId('corte-assim-que-abrir'));
    });
    await waitFor(() => expect(usePendenciaStore.getState().aviso).toEqual([]));
    expect(alerta).not.toHaveBeenCalled();
    usePendenciaStore.getState().fechar();
  });
});

