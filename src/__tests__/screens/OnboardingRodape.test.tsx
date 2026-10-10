import { Platform, StatusBar, StyleSheet } from 'react-native';
import { within } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { Onboarding, bordasDaEntrada, PISO_BARRA_DE_NAVEGACAO } from '@screens/Onboarding';

// O Onboarding fica fora do navegador: ninguem reserva a barra de navegacao do
// celular. Sem a inset de baixo, o "Já tem conta? Entrar" nascia atras dela e
// nao dava para tocar (Andre, 05/10, no aparelho).

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('expo-updates', () => ({ runtimeVersion: '1.0.3', createdAt: new Date(2026, 9, 3, 12, 0) }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { commit: 'C65338E7F00D' } } } }));
jest.mock('@routes/navigationRef', () => ({ goToLoginAfterOnboarding: jest.fn() }));
jest.mock('@hooks/useEstablishments', () => ({ useEstablishments: () => ({ data: [] }) }));

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
});
