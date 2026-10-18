import { renderWithProviders } from '../utils/renderWithProviders';
import { VersaoDoApp } from '@components/VersaoDoApp';
import { Onboarding } from '@screens/Onboarding';

// Andre, 03/10 (commit-sem-flag): sem login ele não via o commit. A versão
// com o commit fica no rodapé das telas de entrada, sem toque.

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('expo-updates', () => ({
  runtimeVersion: '1.0.3',
  createdAt: new Date(2026, 9, 3, 12, 0),
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { commit: 'C65338E7F00D' } } },
}));
let mockEnv = 'staging';
jest.mock('@services/api', () => ({
  get API_ENV() {
    return mockEnv;
  },
}));
jest.mock('@routes/navigationRef', () => ({ goToLoginAfterOnboarding: jest.fn() }));
jest.mock('@hooks/useEstablishments', () => ({ useEstablishments: () => ({ data: [] }) }));

describe('VersaoDoApp', () => {
  beforeEach(() => {
    mockEnv = 'staging';
  });

  it('mostra a versão, a data do OTA e o commit, com o testID pedido', () => {
    const { getByTestId } = renderWithProviders(<VersaoDoApp testID="versao-x" />);
    expect(getByTestId('versao-x').props.children).toBe('Versão 1.0.3 · 03/10/2026 · c65338e7');
  });

  it('no build de produção a versão some das telas de entrada (versao-so-nas-configuracoes)', () => {
    mockEnv = 'prod';
    const { queryByTestId } = renderWithProviders(<VersaoDoApp testID="versao-x" />);
    expect(queryByTestId('versao-x')).toBeNull();
    const onboarding = renderWithProviders(<Onboarding />);
    expect(onboarding.queryByTestId('versao-entrada')).toBeNull();
  });

  it('as Boas-vindas mostram a versão com o commit, sem login', () => {
    const { getByTestId } = renderWithProviders(<Onboarding />);
    expect(getByTestId('versao-entrada').props.children).toContain('c65338e7');
  });
});
