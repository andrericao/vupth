import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { EditAddress } from '@screens/EditAddress';
import { addressService } from '@services/addressService';
import { useDeviceLocation } from '@hooks/useDeviceLocation';
import { useAuthStore } from '@stores/authStore';

// Feedback device (Andre 2026-08-05): "quando o usuário for editar ou incluir o
// endereço deve-se pedir para pegar a localização por GPS". O botão manual já
// existia, mas era passivo — abrir o formulário agora OFERECE o GPS.

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
  // A tela usa `useLimparAoSair`, que limpa o formulario ao PERDER o foco
  // (09/09). Sem isto aqui o mock fica incompleto e a tela nem monta:
  // "useFocusEffect is not a function".
  //
  // O mock roda o efeito e DESCARTA o cleanup de proposito: nestes testes a
  // tela nunca perde o foco, entao a limpeza nao deve acontecer — se
  // acontecesse, apagaria o formulario no meio das asserções.
  useFocusEffect: (efeito: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react');
    useEffect(() => {
      efeito();
    }, [efeito]);
  },
}));
jest.mock('@services/addressService', () => ({
  addressService: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    setMain: jest.fn(),
  },
}));
jest.mock('@hooks/useDeviceLocation', () => ({ useDeviceLocation: jest.fn() }));

const mockList = addressService.list as jest.Mock;
const mockUseDeviceLocation = useDeviceLocation as jest.Mock;
const mockCapture = jest.fn();

jest.setTimeout(30000);

/** Aciona o botão do Alert com este texto (o Alert é nativo: só espionamos). */
function pressAlertButton(alertSpy: jest.SpyInstance, text: string) {
  const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
  const button = buttons.find((b) => b.text === text);
  if (!button) throw new Error(`Alert sem o botão "${text}"`);
  return button.onPress?.();
}

describe('EditAddress — oferta de GPS ao abrir o formulário', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: 'token' });
    mockList.mockResolvedValue({ data: [] });
    mockUseDeviceLocation.mockReturnValue({
      captureDeviceAddress: mockCapture,
      requestDeviceLocation: jest.fn(),
    });
  });

  it('oferece o GPS ao criar um endereço novo', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { findByText } = renderWithProviders(<EditAddress />);

    fireEvent.press(await findByText('Adicionar endereço'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(alertSpy.mock.calls[0][0]).toBe('Usar sua localização?');
  });

  it('aceitar a oferta preenche o formulário e guarda as coordenadas', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockCapture.mockResolvedValue({
      coords: { latitude: -23.55, longitude: -46.63 },
      draft: {
        street: 'Avenida Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310100',
      },
    });

    const { findByText, getByDisplayValue } = renderWithProviders(<EditAddress />);
    fireEvent.press(await findByText('Adicionar endereço'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());

    await act(async () => {
      await pressAlertButton(alertSpy, 'Usar GPS');
    });

    expect(mockCapture).toHaveBeenCalled();
    expect(getByDisplayValue('Avenida Paulista')).toBeTruthy();
    // O CEP entra mascarado no campo — é assim que o formulário o valida.
    expect(getByDisplayValue('01310-100')).toBeTruthy();
  });

  it('recusar a oferta deixa o formulário em branco para digitar', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { findByText } = renderWithProviders(<EditAddress />);

    fireEvent.press(await findByText('Adicionar endereço'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());

    await act(async () => {
      await pressAlertButton(alertSpy, 'Prefiro digitar');
    });

    expect(mockCapture).not.toHaveBeenCalled();
    // Titulo em CAIXA ALTA desde o redesenho ("NOVO ENDERECO"); o que o teste
    // garante e que a tela ficou no FORMULARIO depois de recusar o GPS.
    expect(await findByText(/novo endere/i)).toBeTruthy();
  });
});
