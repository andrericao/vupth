import { Linking, Platform, StatusBar, StyleSheet } from 'react-native';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { Onboarding, bordasDaEntrada, PISO_BARRA_DE_NAVEGACAO } from '@screens/Onboarding';
import { linkLegal } from '@components/LinksLegais';

// O Onboarding fica fora do navegador: ninguem reserva a barra de navegacao do
// celular. Sem a inset de baixo, o "Entrar" nascia atras dela e nao dava para
// tocar (Andre, 05/10, no aparelho).

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('expo-updates', () => ({ runtimeVersion: '1.0.3', createdAt: new Date(2026, 9, 3, 12, 0) }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { commit: 'C65338E7F00D' } } } }));
const mockGoToLogin = jest.fn();
let mockLojas: { open_status: string; is_open?: boolean }[] | undefined = [];
jest.mock('@routes/navigationRef', () => ({ goToLoginAfterOnboarding: () => mockGoToLogin() }));
jest.mock('@hooks/useEstablishments', () => ({ useEstablishments: () => ({ data: mockLojas }) }));
const mockMarcarVisto = jest.fn().mockResolvedValue(undefined);
jest.mock('@stores/firstRunStore', () => ({
  useFirstRunStore: (sel: (s: { markOnboardingSeen: () => Promise<void> }) => unknown) =>
    sel({ markOnboardingSeen: mockMarcarVisto }),
}));

describe('Onboarding — o rodapé acima da barra do sistema', () => {
  it('o bloco do "Entrar" soma a inset de baixo (34) ao respiro de 32', () => {
    const { getByTestId } = renderWithProviders(<Onboarding />);
    const estilo = StyleSheet.flatten(getByTestId('onboarding-rodape').props.style);
    expect(estilo.paddingBottom).toBe(34 + 32);
    expect(getByTestId('onboarding-login')).toBeTruthy();
  });

  it('o rodapé fica fixo, fora da rolagem (entrar-atras-da-barra, 09/10)', () => {
    const { getByTestId } = renderWithProviders(<Onboarding />);
    const rolagem = getByTestId('onboarding-rolagem');
    expect(within(rolagem).queryByTestId('onboarding-rodape')).toBeNull();
    expect(within(rolagem).queryByTestId('onboarding-login')).toBeNull();
    expect(getByTestId('onboarding-rodape')).toBeTruthy();
  });

  // tela-de-entrada do Client (design-entrada, 17/10): "Ver filas" e "Entrar"
  // sao o mesmo par de pilulas do Partner; o link de 14 px virou botao.
  describe('o par de botões e os termos no rodapé', () => {
    it('o primário diz "Ver filas" e o secundário é o botão "Entrar", não um link', () => {
      const { getByTestId, getByText, queryByText } = renderWithProviders(<Onboarding />);
      expect(within(getByTestId('onboarding-start')).getByText('Ver filas')).toBeTruthy();
      expect(within(getByTestId('onboarding-login')).getByText('Entrar')).toBeTruthy();
      expect(getByTestId('onboarding-login').props.accessibilityRole).not.toBe('link');
      expect(queryByText('Ver filas perto de mim')).toBeNull();
      expect(queryByText('Já tem conta?')).toBeNull();
      expect(getByText('Ver filas')).toBeTruthy();
    });

    it('os dois botões têm a mesma altura mínima (54) e o mesmo raio de pílula', () => {
      const { getByTestId } = renderWithProviders(<Onboarding />);
      const [a, b] = ['onboarding-start', 'onboarding-login'].map((id) =>
        StyleSheet.flatten(getByTestId(id).props.style)
      );
      expect(a.minHeight).toBe(54);
      expect(b.minHeight).toBe(54);
      expect(a.borderRadius).toBe(b.borderRadius);
      expect(a.width).toBe(b.width);
    });

    it('o "Entrar" não é a pílula verde: fundo surface, sem contorno', () => {
      const { getByTestId } = renderWithProviders(<Onboarding />);
      const primario = StyleSheet.flatten(getByTestId('onboarding-start').props.style);
      const secundario = StyleSheet.flatten(getByTestId('onboarding-login').props.style);
      expect(secundario.backgroundColor).toBe('#F3F5F1');
      expect(secundario.backgroundColor).not.toBe(primario.backgroundColor);
      expect(secundario.borderWidth ?? 0).toBe(0);
    });

    it('Termos de uso e Política de privacidade ficam no rodapé fixo, fora da rolagem', async () => {
      const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
      const { getByTestId } = renderWithProviders(<Onboarding />);
      const rodape = within(getByTestId('onboarding-rodape'));
      expect(rodape.getByTestId('link-termos')).toBeTruthy();
      expect(rodape.getByTestId('link-privacidade')).toBeTruthy();
      expect(within(getByTestId('onboarding-rolagem')).queryByTestId('links-legais')).toBeNull();

      fireEvent.press(getByTestId('link-termos'));
      await waitFor(() => expect(abrir).toHaveBeenLastCalledWith(linkLegal('termos')));
      fireEvent.press(getByTestId('link-privacidade'));
      await waitFor(() => expect(abrir).toHaveBeenLastCalledWith(linkLegal('privacidade')));
      abrir.mockRestore();
    });
  });

  describe('bordasDaEntrada — insets zeradas na primeira abertura (bateria 09/10 23:42)', () => {
    const original = Platform.OS;
    afterEach(() => { Platform.OS = original; });

    it('no Android, inset zerada ganha o piso: barra de status e barra de navegação', () => {
      Platform.OS = 'android';
      (StatusBar as { currentHeight?: number }).currentHeight = 24;
      expect(bordasDaEntrada({ top: 0, bottom: 0 })).toEqual({ top: 24, bottom: PISO_BARRA_DE_NAVEGACAO });
    });

    it('no Android, inset maior que o piso vale ela mesma', () => {
      Platform.OS = 'android';
      (StatusBar as { currentHeight?: number }).currentHeight = undefined;
      expect(bordasDaEntrada({ top: 40, bottom: 60 })).toEqual({ top: 40, bottom: 60 });
      expect(bordasDaEntrada({ top: 0, bottom: 0 }).top).toBe(0);
    });

    it('fora do Android, as insets passam como vieram', () => {
      Platform.OS = 'ios';
      expect(bordasDaEntrada({ top: 0, bottom: 0 })).toEqual({ top: 0, bottom: 0 });
    });
  });

  describe('os botões e a prova social', () => {
    beforeEach(() => {
      mockGoToLogin.mockClear();
      mockMarcarVisto.mockClear();
      mockLojas = [];
    });

    it('"Ver filas" marca a abertura como vista e não vai ao login', async () => {
      const { getByTestId } = renderWithProviders(<Onboarding />);
      fireEvent.press(getByTestId('onboarding-start'));
      await waitFor(() => expect(mockMarcarVisto).toHaveBeenCalled());
      expect(mockGoToLogin).not.toHaveBeenCalled();
    });

    it('"Entrar" marca a abertura como vista e segue para o login', async () => {
      const { getByTestId } = renderWithProviders(<Onboarding />);
      fireEvent.press(getByTestId('onboarding-login'));
      await waitFor(() => expect(mockGoToLogin).toHaveBeenCalled());
      expect(mockMarcarVisto).toHaveBeenCalled();
    });

    it('sem loja aberta, a linha some', () => {
      mockLojas = [{ open_status: 'CLOSED' }];
      const { queryByText } = renderWithProviders(<Onboarding />);
      expect(queryByText(/aberto/)).toBeNull();
    });

    it('uma loja aberta: no singular', () => {
      mockLojas = [{ open_status: 'OPEN' }, { open_status: 'OPEN', is_open: false }];
      const { getByText } = renderWithProviders(<Onboarding />);
      expect(getByText('1 lugar aberto agora perto de você')).toBeTruthy();
    });

    it('várias abertas: no plural', () => {
      mockLojas = [{ open_status: 'OPEN' }, { open_status: 'CLOSED', is_open: true }];
      const { getByText } = renderWithProviders(<Onboarding />);
      expect(getByText('2 lugares abertos agora perto de você')).toBeTruthy();
    });

    it('sem a lista ainda, a linha some', () => {
      mockLojas = undefined;
      const { queryByText } = renderWithProviders(<Onboarding />);
      expect(queryByText(/aberto/)).toBeNull();
    });
  });
});
