import { Alert, Share } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { SeuLinkDeIndicacao } from '@components/SeuLinkDeIndicacao';
import { useAuthStore } from '@stores/authStore';

// compartilhe-e-ganhe (CLI-30, DEC-113): o link pessoal com Copiar, Compartilhar, QR e contadores.

const mockMe = jest.fn();
jest.mock('@services/referralService', () => ({
  referralService: { me: (...a: unknown[]) => mockMe(...a) },
}));
const mockCopiar = jest.fn();
jest.mock('@utils/copiar', () => ({ copiarTexto: (...a: unknown[]) => mockCopiar(...a) }));
jest.mock('react-native-qrcode-svg', () => () => null);
jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
    useFocusEffect: (fn: () => void) => useEffect(fn, [fn]),
  };
});
jest.setTimeout(60000);

const dados = {
  campaigns: [{ campaign_id: 'c1', name: 'Indique', link: 'https://vupth.pages.dev/i/ABC?c=c1', referred: 2, credited: 1 }],
  pending_release: 8,
};

let alerta: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useAuthStore.setState({ accessToken: 'tk' } as never);
  mockMe.mockResolvedValue({ data: dados });
  mockCopiar.mockResolvedValue(true);
});

afterEach(() => alerta.mockRestore());

describe('SeuLinkDeIndicacao', () => {
  it('sem campanha de link, o bloco some', async () => {
    mockMe.mockResolvedValue({ data: { campaigns: [] } });
    const t = renderWithProviders(<SeuLinkDeIndicacao />);
    await act(async () => {});
    expect(t.queryByTestId('indique-e-ganhe')).toBeNull();
  });

  it('sem conta ou com falha de rede, o bloco some', async () => {
    mockMe.mockRejectedValue(new Error('rede'));
    const t = renderWithProviders(<SeuLinkDeIndicacao />);
    await act(async () => {});
    expect(t.queryByTestId('indique-e-ganhe')).toBeNull();
    useAuthStore.setState({ accessToken: null } as never);
    const sem = renderWithProviders(<SeuLinkDeIndicacao />);
    await act(async () => {});
    expect(sem.queryByTestId('indique-e-ganhe')).toBeNull();
  });

  it('mostra o link, o QR, os contadores e o ganho a liberar', async () => {
    const t = renderWithProviders(<SeuLinkDeIndicacao />);
    expect(await t.findByText('https://vupth.pages.dev/i/ABC?c=c1')).toBeTruthy();
    expect(t.getByTestId('link-qr-c1')).toBeTruthy();
    expect(t.getByText('2 indicados · 1 com ganho')).toBeTruthy();
    expect(t.getByText('R$ 8,00 a liberar')).toBeTruthy();
  });

  it('Copiar avisa; sem o módulo de copiar, mostra o link', async () => {
    const t = renderWithProviders(<SeuLinkDeIndicacao />);
    await t.findByTestId('link-copiar-c1');
    await act(async () => { fireEvent.press(t.getByTestId('link-copiar-c1')); });
    expect(mockCopiar).toHaveBeenCalledWith('https://vupth.pages.dev/i/ABC?c=c1');
    expect(alerta).toHaveBeenCalledWith('Link copiado', undefined);
    mockCopiar.mockResolvedValue(false);
    await act(async () => { fireEvent.press(t.getByTestId('link-copiar-c1')); });
    expect(alerta).toHaveBeenLastCalledWith('Link', 'https://vupth.pages.dev/i/ABC?c=c1');
  });

  it('Compartilhar abre o compartilhar do sistema; se falhar, mostra o link', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    const t = renderWithProviders(<SeuLinkDeIndicacao />);
    await t.findByTestId('link-compartilhar-c1');
    await act(async () => { fireEvent.press(t.getByTestId('link-compartilhar-c1')); });
    expect(share).toHaveBeenCalledWith({ message: expect.stringContaining('https://vupth.pages.dev/i/ABC?c=c1') });
    share.mockRejectedValue(new Error('x'));
    await act(async () => { fireEvent.press(t.getByTestId('link-compartilhar-c1')); });
    expect(alerta).toHaveBeenLastCalledWith('Link', 'https://vupth.pages.dev/i/ABC?c=c1');
    share.mockRestore();
  });
});
