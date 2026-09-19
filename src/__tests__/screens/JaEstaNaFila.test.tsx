import { Alert } from 'react-native';
import { waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { QueueStatus } from '@screens/QueueStatus';
import { attendanceService } from '@services/attendanceService';

// Andre, 18/09: "a tela de aviso de que já está na fila deveria ser um popup,
// não uma tela branca com log do backend". O backend confirmou o contrato em
// 19/09: 409 com code CLIENT_ALREADY_IN_QUEUE, e o corpo NÃO traz o id do
// atendimento que já existe — por isso o app o acha pelo profissional.

const mockGoBack = jest.fn();
const mockJoin = jest.fn();

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn().mockResolvedValue('1'), setItemAsync: jest.fn() }));
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
  useRoute: () => ({ params: { professionalId: 'p1', establishmentId: 'e1', serviceItemIds: ['s1'] } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@hooks/useQueueCountdown', () => ({
  useQueueCountdown: () => ({
    remaining: null, semPrevisao: true, elapsedSeconds: 0, color: '#163300',
    isInQueue: false, isBeingAttended: false, isPaused: false, isFinished: false,
    refresh: jest.fn(), activeQueue: null,
  }),
}));
jest.mock('@hooks/useSwapOffers', () => ({ useSwapOffers: () => ({ data: [] }) }));
jest.mock('@services/healthService', () => ({ waitForBackend: jest.fn().mockResolvedValue(true) }));
jest.mock('@services/attendanceService', () => ({
  attendanceService: { create: jest.fn(), listClientHistory: jest.fn() },
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 'tk', user: { id: 'u1' } }),
}));
jest.mock('@stores/ratedStore', () => ({ useRatedStore: (sel: (s: unknown) => unknown) => sel({ ids: [] }) }));
jest.mock('@stores/queueStore', () => {
  const estado = { leaveQueue: jest.fn(), updateQueue: jest.fn() };
  const useQueueStore = (sel: (s: unknown) => unknown) => sel(estado);
  useQueueStore.getState = () => ({ ...estado, joinQueue: mockJoin, activeQueue: null });
  return { useQueueStore };
});
jest.mock('@components/SwapOffersModal', () => ({ SwapOffersModal: () => null }));
jest.mock('@components/ChangeTurnModal', () => ({ ChangeTurnModal: () => null }));
jest.mock('@components/RescheduleModal', () => ({ RescheduleModal: () => null }));
jest.mock('@components/RatingModal', () => ({ RatingModal: () => null }));
jest.mock('@components/QueueDisclaimerModal', () => ({ QueueDisclaimerModal: () => null }));

const mockCreate = attendanceService.create as jest.Mock;
const mockHistory = attendanceService.listClientHistory as jest.Mock;

const conflito = (code: string) =>
  Object.assign(new Error('conflito'), {
    response: { status: 409, data: { code, message: 'Voce ja esta na fila deste profissional. Conclua ou cancele o atendimento atual antes de entrar de novo.' } },
  });

type BotaoDoAlert = { text: string; onPress?: () => unknown };

describe('Entrar na fila — recusas do backend viram diálogo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('já está na fila: diálogo, NÃO tela cheia com o texto do servidor', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockCreate.mockRejectedValue(conflito('CLIENT_ALREADY_IN_QUEUE'));

    const { queryByText } = renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(alerta).toHaveBeenCalled());

    const [titulo, mensagem, botoes] = alerta.mock.calls[0] as [string, string, BotaoDoAlert[]];
    expect(titulo).toBe('Você já está na fila');
    expect(mensagem).toMatch(/Ver minha fila/);
    expect(mensagem).not.toMatch(/Conclua ou cancele/);
    expect(botoes.map((b) => b.text)).toEqual(['Voltar', 'Ver minha fila']);
    expect(queryByText('NÃO DEU CERTO')).toBeNull();
    alerta.mockRestore();
  });

  it('"Ver minha fila" acha o atendimento pelo profissional e entra nele', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockCreate.mockRejectedValue(conflito('CLIENT_ALREADY_IN_QUEUE'));
    mockHistory.mockResolvedValue({
      data: [
        { id: 'a9', professionalId: 'p9', status: 'FINISHED', scheduledTime: '2026-09-18T10:00:00Z', services: [] },
        { id: 'a1', professionalId: 'p1', status: 'SCHEDULED', scheduledTime: '2026-09-19T10:00:00Z', services: [] },
      ],
    });

    renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(alerta).toHaveBeenCalled());
    const [, , botoes] = alerta.mock.calls[0] as [string, string, BotaoDoAlert[]];
    await botoes.find((b) => b.text === 'Ver minha fila')!.onPress!();

    expect(mockJoin).toHaveBeenCalledWith(expect.objectContaining({ attendanceId: 'a1' }));
    expect(mockGoBack).not.toHaveBeenCalled();
    alerta.mockRestore();
  });

  it('profissional sem aceitar novos: aviso e volta', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockCreate.mockRejectedValue(conflito('PROFESSIONAL_NOT_ACCEPTING_NEW'));

    renderWithProviders(<QueueStatus />);
    await waitFor(() => expect(alerta).toHaveBeenCalled());
    const [titulo, , botoes] = alerta.mock.calls[0] as [string, string, BotaoDoAlert[]];
    expect(titulo).toBe('Fila fechada');
    botoes[0].onPress!();
    expect(mockGoBack).toHaveBeenCalled();
    alerta.mockRestore();
  });

  it('loja fechada continua em TELA — ali existe o "Solicitar corte"', async () => {
    mockCreate.mockRejectedValue(conflito('ESTABLISHMENT_NOT_OPEN'));
    const { findByText } = renderWithProviders(<QueueStatus />);
    expect(await findByText('Solicitar corte')).toBeTruthy();
  });
});
