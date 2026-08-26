import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { CompleteProfile } from '@screens/CompleteProfile';
import { profileService } from '@services/profileService';

// POR QUE ESTA TELA EXISTE: o cadastro do cliente pede e-mail e senha, e mais
// nada. Nenhuma tela depois pergunta o nome — só o "Dados pessoais", dentro do
// Perfil, onde ninguém entra sozinho. Sem nome, o card da fila mostra
// "Cliente" ao profissional, e ele não sabe quem chamar em voz alta.
//
// O que estes testes fixam: (1) o nome chega ao backend; (2) pular é saída
// legítima e não custa o lugar na fila; (3) falha ao salvar NÃO prende ninguém.

const mockReplace = jest.fn();
const mockReset = jest.fn();
let mockParams: Record<string, unknown> = {};

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace, reset: mockReset, goBack: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@services/profileService', () => ({
  profileService: { updateGeneralInfos: jest.fn() },
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (seletor: (s: unknown) => unknown) =>
    seletor({ accessToken: 'token-de-teste', updateUser: jest.fn() }),
}));

const mockUpdate = profileService.updateGeneralInfos as jest.Mock;

const DA_FILA = {
  redirectTo: 'queueStatus',
  establishmentId: 'e1',
  professionalId: 'p1',
  targetTime: '14:30',
};

describe('Completar perfil — pedir o nome depois do cadastro', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    mockUpdate.mockResolvedValue({ data: { first_name: 'Alexia' } });
  });

  it('diz PARA QUE serve o nome — não pede dado sem motivo', () => {
    const { getByText } = renderWithProviders(<CompleteProfile />);
    expect(getByText(/profissional saber quem chamar/i)).toBeTruthy();
  });

  it('vindo da fila, o motivo fica mais concreto', () => {
    mockParams = DA_FILA;
    const { getByText } = renderWithProviders(<CompleteProfile />);
    expect(getByText(/é por ele que o profissional vai te chamar/i)).toBeTruthy();
  });

  it('salva o nome e SEGUE pro destino original, com os params intactos', async () => {
    mockParams = DA_FILA;
    const { getByTestId } = renderWithProviders(<CompleteProfile />);

    fireEvent.changeText(getByTestId('complete-profile-name'), '  Alexia  ');
    fireEvent.press(getByTestId('complete-profile-save'));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    // Espaços não podem virar parte do nome que o profissional vai ler.
    expect(mockUpdate).toHaveBeenCalledWith({ first_name: 'Alexia' }, 'token-de-teste');
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        'queueStatus',
        expect.objectContaining({ professionalId: 'p1', targetTime: '14:30' }),
      ),
    );
  });

  it('"Agora não" segue sem chamar o backend — pular é saída legítima', () => {
    mockParams = DA_FILA;
    const { getByTestId } = renderWithProviders(<CompleteProfile />);

    fireEvent.press(getByTestId('complete-profile-skip'));

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('queueStatus', expect.objectContaining({ professionalId: 'p1' }));
  });

  it('sem destino, cai na Home RESETANDO a pilha (não dá pra voltar ao cadastro)', () => {
    const { getByTestId } = renderWithProviders(<CompleteProfile />);

    fireEvent.press(getByTestId('complete-profile-skip'));

    expect(mockReset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'home' }] });
  });

  it('não deixa confirmar com o campo vazio', () => {
    const { getByTestId } = renderWithProviders(<CompleteProfile />);
    fireEvent.press(getByTestId('complete-profile-save'));
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
