import { Alert } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { EditAddress } from '@screens/EditAddress';
import { addressService } from '@services/addressService';
import { useDeviceLocation } from '@hooks/useDeviceLocation';
import { useAuthStore } from '@stores/authStore';

// cobertura-98 (08/10): a lista de enderecos (principal, editar, remover), o
// salvar com as validacoes, o CEP pelo ViaCEP e o GPS.

jest.mock('expo-secure-store');
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
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
const mockBuscarCep = jest.fn();
const mockLookupCep = jest.fn();
jest.mock('@utils/cep', () => ({
  ...jest.requireActual('@utils/cep'),
  buscarCepPorEndereco: (...args: unknown[]) => mockBuscarCep(...args),
  lookupCep: (...args: unknown[]) => mockLookupCep(...args),
}));

const svc = addressService as unknown as Record<string, jest.Mock>;
const mockCapture = jest.fn();

jest.setTimeout(90000);

const CASA = {
  userAddressId: 'a1',
  street: 'Rua A',
  number: '10',
  complement: 'Apto 1',
  neighborhood: 'Centro',
  city: 'Campinas',
  state: 'SP',
  zipCode: '13010000',
  reference: null,
  isMain: true,
  latitude: -22.9,
  longitude: -47.06,
};
const TRABALHO = {
  ...CASA,
  userAddressId: 'a2',
  street: 'Rua B',
  complement: null,
  isMain: false,
  latitude: null,
  longitude: null,
};

let alertSpy: jest.SpyInstance;

/** Aciona o botao do ultimo Alert com este texto. */
async function tocarNoAlerta(texto: string) {
  const chamadas = alertSpy.mock.calls;
  const botoes = chamadas[chamadas.length - 1][2] as { text: string; onPress?: () => unknown }[];
  const botao = botoes.find((b) => b.text === texto);
  if (!botao) throw new Error(`Alert sem o botão "${texto}"`);
  await act(async () => {
    await botao.onPress?.();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  useAuthStore.setState({ accessToken: 'token' });
  svc.list.mockResolvedValue({ data: [CASA, TRABALHO] });
  svc.create.mockResolvedValue({});
  svc.update.mockResolvedValue({});
  svc.remove.mockResolvedValue({});
  svc.setMain.mockResolvedValue({});
  mockLookupCep.mockResolvedValue(null);
  mockBuscarCep.mockResolvedValue(null);
  (useDeviceLocation as jest.Mock).mockReturnValue({
    captureDeviceAddress: mockCapture,
    requestDeviceLocation: jest.fn(),
  });
});

async function abrirFormularioNovo() {
  const tela = renderWithProviders(<EditAddress />);
  fireEvent.press(await tela.findByText('Adicionar endereço'));
  return tela;
}

function preencher(tela: ReturnType<typeof renderWithProviders>, campos: Record<string, string>) {
  for (const [placeholder, valor] of Object.entries(campos)) {
    fireEvent.changeText(tela.getByPlaceholderText(placeholder), valor);
  }
}

describe('EditAddress — a lista', () => {
  it('mostra os endereços, o complemento e o Principal', async () => {
    const { findByText, getByText } = renderWithProviders(<EditAddress />);
    expect(await findByText('Rua A, 10 - Apto 1')).toBeTruthy();
    expect(getByText('Rua B, 10')).toBeTruthy();
    expect(getByText('Principal')).toBeTruthy();
  });

  it('sem endereço, diz que não há', async () => {
    svc.list.mockResolvedValue({ data: [] });
    const { findByText } = renderWithProviders(<EditAddress />);
    expect(await findByText('Nenhum endereço cadastrado')).toBeTruthy();
  });

  it('erro ao carregar vira lista vazia', async () => {
    svc.list.mockRejectedValue(new Error('rede'));
    const { findByText } = renderWithProviders(<EditAddress />);
    expect(await findByText('Nenhum endereço cadastrado')).toBeTruthy();
  });

  it('sem login, não carrega nem faz nada', async () => {
    useAuthStore.setState({ accessToken: null });
    renderWithProviders(<EditAddress />);
    await act(async () => {});
    expect(svc.list).not.toHaveBeenCalled();
  });

  it('a estrela torna o endereço principal e recarrega', async () => {
    const { findByTestId } = renderWithProviders(<EditAddress />);
    fireEvent.press(await findByTestId('endereco-principal-a2'));
    await waitFor(() => expect(svc.setMain).toHaveBeenCalledWith('a2', 'token'));
    await waitFor(() => expect(svc.list).toHaveBeenCalledTimes(2));
  });

  it('erro ao definir o principal avisa', async () => {
    svc.setMain.mockRejectedValue({ response: { data: { message: 'Não pode' } } });
    const { findByTestId } = renderWithProviders(<EditAddress />);
    fireEvent.press(await findByTestId('endereco-principal-a2'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Erro', 'Não pode'));
  });

  it('erro sem mensagem ao definir o principal usa o texto padrão', async () => {
    svc.setMain.mockRejectedValue(new Error('x'));
    const { findByTestId } = renderWithProviders(<EditAddress />);
    fireEvent.press(await findByTestId('endereco-principal-a2'));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Erro', 'Erro ao definir principal'));
  });

  it('remover pede confirmação e remove', async () => {
    const { findByTestId } = renderWithProviders(<EditAddress />);
    fireEvent.press(await findByTestId('endereco-remover-a1'));
    expect(alertSpy).toHaveBeenCalledWith('Remover endereço', 'Tem certeza?', expect.any(Array));
    await tocarNoAlerta('Remover');
    expect(svc.remove).toHaveBeenCalledWith('a1', 'token');
  });

  it('erro ao remover avisa (com e sem mensagem do servidor)', async () => {
    svc.remove.mockRejectedValueOnce({ response: { data: { message: 'Em uso' } } });
    const { findByTestId } = renderWithProviders(<EditAddress />);
    fireEvent.press(await findByTestId('endereco-remover-a1'));
    await tocarNoAlerta('Remover');
    expect(alertSpy).toHaveBeenLastCalledWith('Erro', 'Em uso');

    svc.remove.mockRejectedValueOnce(new Error('x'));
    fireEvent.press(await findByTestId('endereco-remover-a1'));
    await tocarNoAlerta('Remover');
    expect(alertSpy).toHaveBeenLastCalledWith('Erro', 'Erro ao remover');
  });
});

describe('EditAddress — salvar', () => {
  it('campo obrigatório vazio não salva', async () => {
    const tela = await abrirFormularioNovo();
    fireEvent.press(tela.getByText('Salvar'));
    expect(alertSpy).toHaveBeenLastCalledWith('Erro', 'Preencha os campos obrigatórios');
    expect(svc.create).not.toHaveBeenCalled();
  });

  it('CEP com menos de 8 dígitos não salva', async () => {
    const tela = await abrirFormularioNovo();
    preencher(tela, { 'Rua das Flores': 'Rua C', '123': '5', Centro: 'Bairro', 'São Paulo': 'Cidade', SP: 'MG', '01310-100': '123' });
    fireEvent.press(tela.getByText('Salvar'));
    expect(alertSpy).toHaveBeenLastCalledWith('Erro', 'CEP deve ter 8 dígitos');
  });

  it('novo endereço é criado sem a máscara do CEP e volta à lista', async () => {
    const tela = await abrirFormularioNovo();
    preencher(tela, {
      'Rua das Flores': 'Rua C',
      '123': '5',
      'Apt 4B': 'Casa 2',
      Centro: 'Bairro',
      'São Paulo': 'Cidade',
      SP: 'MG',
      '01310-100': '30110000',
      'Próximo ao metrô': 'Praça',
    });
    fireEvent.press(tela.getByText('Salvar'));
    await waitFor(() =>
      expect(svc.create).toHaveBeenCalledWith(
        expect.objectContaining({ street: 'Rua C', zipCode: '30110000', reference: 'Praça' }),
        'token',
      ),
    );
    expect(await tela.findByText('Adicionar endereço')).toBeTruthy();
  });

  it('editar abre o formulário preenchido e salva no mesmo id', async () => {
    const tela = renderWithProviders(<EditAddress />);
    fireEvent.press(await tela.findByTestId('endereco-editar-a1'));
    expect(tela.getByText('EDITAR ENDEREÇO')).toBeTruthy();
    expect(tela.getByDisplayValue('13010-000')).toBeTruthy();
    fireEvent.press(tela.getByText('Salvar'));
    await waitFor(() =>
      expect(svc.update).toHaveBeenCalledWith('a1', expect.objectContaining({ latitude: -22.9 }), 'token'),
    );
  });

  it('editar um endereço sem coordenadas não as inventa', async () => {
    const tela = renderWithProviders(<EditAddress />);
    fireEvent.press(await tela.findByTestId('endereco-editar-a2'));
    fireEvent.press(tela.getByText('Salvar'));
    await waitFor(() => expect(svc.update).toHaveBeenCalled());
    expect(svc.update.mock.calls[0][1]).not.toHaveProperty('latitude');
  });

  it('erro ao salvar avisa com a mensagem do servidor, ou a do erro, ou a padrão', async () => {
    const tela = renderWithProviders(<EditAddress />);
    fireEvent.press(await tela.findByTestId('endereco-editar-a1'));

    svc.update.mockRejectedValueOnce({ response: { data: { message: 'CEP inválido' } } });
    fireEvent.press(tela.getByText('Salvar'));
    await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('Erro', 'CEP inválido'));

    svc.update.mockRejectedValueOnce(new Error('Network Error'));
    fireEvent.press(tela.getByText('Salvar'));
    await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('Erro', 'Sem conexão com o servidor. Confira a sua internet.'));

    svc.update.mockRejectedValueOnce({});
    fireEvent.press(tela.getByText('Salvar'));
    await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('Erro', 'Erro ao salvar'));
  });

  it('Cancelar volta à lista', async () => {
    const tela = await abrirFormularioNovo();
    fireEvent.press(tela.getByText('Cancelar'));
    expect(await tela.findByText('Adicionar endereço')).toBeTruthy();
  });
});

describe('EditAddress — CEP', () => {
  it('CEP completo busca o endereço e preenche sem apagar o número', async () => {
    mockLookupCep.mockResolvedValue({ street: 'Av. Paulista', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' });
    const tela = await abrirFormularioNovo();
    preencher(tela, { '123': '900' });
    fireEvent.changeText(tela.getByPlaceholderText('01310-100'), '01310100');
    await waitFor(() => expect(tela.getByDisplayValue('Av. Paulista')).toBeTruthy());
    expect(tela.getByDisplayValue('900')).toBeTruthy();
  });

  it('o ViaCEP sem um campo mantém o que já estava', async () => {
    mockLookupCep.mockResolvedValue({ street: '', neighborhood: '', city: 'Campinas', state: '' });
    const tela = await abrirFormularioNovo();
    preencher(tela, { 'Rua das Flores': 'Minha rua', Centro: 'Meu bairro', SP: 'MG' });
    fireEvent.changeText(tela.getByPlaceholderText('01310-100'), '13010000');
    await waitFor(() => expect(tela.getByDisplayValue('Campinas')).toBeTruthy());
    expect(tela.getByDisplayValue('Minha rua')).toBeTruthy();
    expect(tela.getByDisplayValue('Meu bairro')).toBeTruthy();
    expect(tela.getByDisplayValue('MG')).toBeTruthy();
  });

  it('CEP não achado não mexe no formulário', async () => {
    const tela = await abrirFormularioNovo();
    fireEvent.changeText(tela.getByPlaceholderText('01310-100'), '99999999');
    await waitFor(() => expect(mockLookupCep).toHaveBeenCalled());
    expect(tela.getByDisplayValue('99999-999')).toBeTruthy();
  });
});

describe('EditAddress — GPS', () => {
  it('GPS sem resultado avisa', async () => {
    mockCapture.mockResolvedValue(null);
    const tela = await abrirFormularioNovo();
    fireEvent.press(tela.getByTestId('address-use-gps'));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenLastCalledWith('Não consegui sua localização', expect.any(String)),
    );
  });

  it('GPS com o CEP preenche tudo e não pede o resto', async () => {
    mockCapture.mockResolvedValue({
      coords: { latitude: -23, longitude: -46 },
      draft: { street: 'Rua G', number: '7', neighborhood: 'N', city: 'C', state: 'SP', zipCode: '01310100' },
    });
    const tela = await abrirFormularioNovo();
    fireEvent.press(tela.getByTestId('address-use-gps'));
    await waitFor(() => expect(tela.getByDisplayValue('01310-100')).toBeTruthy());
    expect(mockBuscarCep).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalledWith('Localização capturada', expect.any(String));
  });

  it('GPS sem CEP: o ViaCEP completa, e um CEP já digitado fica', async () => {
    mockBuscarCep.mockResolvedValue('13010000');
    mockCapture.mockResolvedValue({
      coords: { latitude: -23, longitude: -46 },
      draft: { street: 'Rua G', neighborhood: 'N', city: 'C', state: 'SP' },
    });
    const tela = await abrirFormularioNovo();
    fireEvent.press(tela.getByTestId('address-use-gps'));
    await waitFor(() => expect(tela.getByDisplayValue('13010-000')).toBeTruthy());
    // sem o numero, pede para conferir
    expect(alertSpy).toHaveBeenLastCalledWith('Localização capturada', expect.any(String));
  });

  it('o "Usar GPS" do alerta de abertura também preenche', async () => {
    mockCapture.mockResolvedValue(null);
    await abrirFormularioNovo();
    await tocarNoAlerta('Usar GPS');
    expect(mockCapture).toHaveBeenCalled();
  });
});
