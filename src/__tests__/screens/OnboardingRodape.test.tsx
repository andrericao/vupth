import { StyleSheet } from 'react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { Onboarding } from '@screens/Onboarding';

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
});
