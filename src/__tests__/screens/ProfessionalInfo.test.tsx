import { Alert, Share } from 'react-native';
import { act, fireEvent, within } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderWithProviders } from '../utils/renderWithProviders';
import { ProfessionalInfo } from '@screens/ProfessionalInfo';
import { establishmentService } from '@services/establishmentService';

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { professionalId: 'p1', establishmentId: 'e1', professionalName: 'Carlos' } }),
}));
jest.mock('@services/establishmentService', () => ({
  establishmentService: {
    getById: jest.fn(),
    getProfessionalsWithQueue: jest.fn(),
    getServiceItemsByProfessional: jest.fn(),
  },
}));

const mockCopiar = jest.fn();
jest.mock('@utils/copiar', () => ({ copiarTexto: (...a: unknown[]) => mockCopiar(...a) }));

const mockGetById = establishmentService.getById as jest.Mock;
const mockGetProfs = establishmentService.getProfessionalsWithQueue as jest.Mock;
const mockGetServices = establishmentService.getServiceItemsByProfessional as jest.Mock;

// O 1º mount do Gluestack e caro sob carga (ver ServiceSelection.test).
jest.setTimeout(90000);

function profissional(extra: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Carlos Lima',
    specialty: 'Barbeiro',
    is_available: true,
    current_attendance: null,
    waiting_list: [],
    queue_count: 0,
    estimated_wait_minutes: 0,
    rating_average: 4.8,
    rating_count: 12,
    ...extra,
  };
}

function montar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return renderWithProviders(
    <QueryClientProvider client={client}>
      <ProfessionalInfo />
    </QueryClientProvider>,
  );
}

describe('ProfessionalInfo (informacoes-do-profissional)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetById.mockResolvedValue({ data: { id: 'e1', name: 'Barbearia do Zé' } });
    mockGetServices.mockResolvedValue({
      data: [{ id: 's1', customName: 'Corte', price: 30, estimatedMinutes: 40, weeklyAverageDurationInMinutes: 30 }],
    });
  });

  it('mostra nome, loja, nota, os servicos com preco e o telefone so como texto', async () => {
    mockGetProfs.mockResolvedValue({
      data: { professionals: [profissional({ contact_phone: '+55 (11) 98888-7777' })] },
    });
    const { findByText, getByTestId, queryByText } = montar();

    expect(await findByText('Carlos Lima', {}, { timeout: 15000 })).toBeTruthy();
    expect(await findByText('Barbearia do Zé')).toBeTruthy();
    expect(within(getByTestId('nota-do-profissional')).getByText('4.8')).toBeTruthy();
    expect(await findByText('Corte')).toBeTruthy();
    expect(await findByText('R$ 30,00')).toBeTruthy();
    expect(await findByText('40 min')).toBeTruthy();
    expect(await findByText('+55 (11) 98888-7777')).toBeTruthy();
    // Andre, 05/10: sem Ligar e sem WhatsApp.
    expect(queryByText('Ligar')).toBeNull();
    expect(queryByText('WhatsApp')).toBeNull();
  });

  it('sem contact_phone: nenhuma linha de contato', async () => {
    mockGetProfs.mockResolvedValue({ data: { professionals: [profissional({ contact_phone: null })] } });
    const { findByText, queryByTestId } = montar();
    await findByText('Corte', {}, { timeout: 15000 });
    expect(queryByTestId('contato-do-profissional')).toBeNull();
  });

  it('Compartilhar manda o texto com o link da loja ja abrindo o profissional, sem o telefone', async () => {
    mockGetProfs.mockResolvedValue({
      data: { professionals: [profissional({ contact_phone: '+55 (11) 98888-7777' })] },
    });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    const { findByText, getByTestId } = montar();
    await findByText('Barbearia do Zé', {}, { timeout: 15000 });
    fireEvent.press(getByTestId('compartilhar'));
    const { message } = share.mock.calls[0][0] as { message: string };
    expect(message).toMatch(/^Conheça o Carlos Lima na Barbearia do Zé — .*\/loja\/e1\?profissional=p1$/);
    expect(message).not.toContain('98888');
    share.mockRestore();
  });
});

describe('ProfessionalInfo — o que sobra (cobertura-98)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetById.mockResolvedValue({ data: { id: 'e1', name: 'Barbearia do Zé' } });
    mockGetProfs.mockResolvedValue({ data: { professionals: [profissional({ profile_image_url: 'https://foto/p1.jpg' })] } });
  });

  it('a foto amplia ao toque e fecha', async () => {
    mockGetServices.mockResolvedValue({ data: [] });
    const { findByTestId, getByTestId, findByText } = montar();
    expect(await findByText('Nenhum serviço cadastrado', {}, { timeout: 15000 })).toBeTruthy();
    fireEvent.press(await findByTestId('foto-do-profissional'));
    expect(getByTestId('foto-ampliada-imagem')).toBeTruthy();
    fireEvent.press(getByTestId('foto-ampliada'));
  });

  it('sem o compartilhar do sistema, copia; sem copiar, não avisa; sem a loja, diz "loja"', async () => {
    mockGetById.mockRejectedValue(new Error('x'));
    mockGetServices.mockReturnValue(new Promise(() => {}));
    const share = jest.spyOn(Share, 'share').mockRejectedValue(new Error('sem share'));
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { findByText, getByTestId } = montar();
    await findByText('Carlos Lima', {}, { timeout: 15000 });

    mockCopiar.mockResolvedValueOnce(true);
    await act(async () => {
      fireEvent.press(getByTestId('compartilhar'));
    });
    expect(mockCopiar).toHaveBeenCalledWith(expect.stringMatching(/na loja — /));
    expect(alerta).toHaveBeenCalledWith('Link copiado', expect.any(String));

    alerta.mockClear();
    mockCopiar.mockResolvedValueOnce(false);
    await act(async () => {
      fireEvent.press(getByTestId('compartilhar'));
    });
    expect(alerta).not.toHaveBeenCalled();
    share.mockRestore();
    alerta.mockRestore();
  });
});

