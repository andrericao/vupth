import { fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { EditAddress } from '@screens/EditAddress';
import { ProfessionalInfo } from '@screens/ProfessionalInfo';
import { coresDoTema } from '@domain/tema';
import { TEMAS, corDe, fundoSobre, razao, renderNoTema, voltarAoClaro } from '../utils/nosDoisTemas';

// DEC-75: Enderecos e Informacoes do profissional nos dois temas. O erro que isto
// evita: os icones de editar e de principal eram forest/cinza fixos sobre o
// cartao surface (some no escuro), o nome e os precos em forest sobre a surface, e
// a lixeira num vermelho que no escuro nao chega a 3:1.

jest.mock('@theme/liberacao', () => ({ ESCURO_LIBERADO: true }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('lucide-react-native', () => {
  const { View } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return new Proxy(
    {},
    { get: (_t, nome) => (props: { color?: string; fill?: string }) =>
        createElement(View, { testID: `icone-${String(nome)}`, cor: props.color, preenchimento: props.fill }) },
  );
});
jest.mock('@components/FotoAmpliada', () => ({ FotoAmpliada: () => null }));
jest.mock('@components/NotaDaLoja', () => ({ NotaDaLoja: () => null }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { professionalId: 'p1', establishmentId: 'e1', professionalName: 'Carlos' } }),
  useFocusEffect: (efeito: () => void | (() => void)) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useEffect } = require('react');
    useEffect(() => {
      efeito();
    }, [efeito]);
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: 'tk' }),
}));
jest.mock('@hooks/useDeviceLocation', () => ({ useDeviceLocation: () => ({ captureDeviceAddress: jest.fn() }) }));
jest.mock('@services/addressService', () => ({
  addressService: {
    list: jest.fn().mockResolvedValue({
      data: [
        { userAddressId: 'a1', street: 'Rua Um', number: '10', neighborhood: 'Centro', city: 'Recife', state: 'PE', zipCode: '50000-000', isMain: true },
        { userAddressId: 'a2', street: 'Rua Dois', number: '20', neighborhood: 'Boa Vista', city: 'Recife', state: 'PE', zipCode: '50000-001', isMain: false },
      ],
    }),
  },
}));
jest.mock('@services/establishmentService', () => ({
  establishmentService: {
    getById: jest.fn().mockResolvedValue({ data: { id: 'e1', name: 'Barbearia do Ze' } }),
    getProfessionalsWithQueue: jest.fn().mockResolvedValue({
      data: {
        professionals: [
          { id: 'p1', name: 'Carlos Lima', specialty: 'Barbeiro', queue_count: 0, estimated_wait_minutes: 0, contact_phone: '+55 (11) 98888-7777' },
        ],
      },
    }),
    getServiceItemsByProfessional: jest.fn().mockResolvedValue({
      data: [{ id: 's1', customName: 'Corte', price: 30, estimatedMinutes: 40, weeklyAverageDurationInMinutes: 30 }],
    }),
  },
}));

jest.setTimeout(90000);

const cor = (tema: 'claro' | 'escuro') => coresDoTema(tema);

function profissional(tema: 'claro' | 'escuro') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return renderNoTema(
    tema,
    <QueryClientProvider client={client}>
      <ProfessionalInfo />
    </QueryClientProvider>,
  );
}

describe('EditAddress: a lista', () => {
  it.each(TEMAS)('%s: os icones de cada endereco e o "Principal" seguem o tema', async (tema) => {
    const { findByText, getByTestId, getAllByTestId, getByText } = renderNoTema(tema, <EditAddress />);
    await findByText('Principal');
    const principal = getByText('Principal');
    expect(corDe(principal)).toBe(cor(tema).textPrimary);
    expect(fundoSobre(principal)).toBe(cor(tema).surface);
    expect(razao(corDe(principal)!, cor(tema).surface)).toBeGreaterThanOrEqual(4.5);

    // a estrela do endereco principal enche com a mesma cor
    const estrelas = getAllByTestId('icone-Star');
    const cheia = estrelas.find((e) => e.props.preenchimento !== undefined)!;
    expect(cheia.props.cor).toBe(cor(tema).textPrimary);
    expect(cheia.props.preenchimento).toBe(cor(tema).textPrimary);
    // a estrela de "tornar principal" e secundaria
    expect(estrelas.find((e) => e.props.preenchimento === undefined)!.props.cor).toBe(cor(tema).textSecondary);

    const editar = getByTestId('endereco-editar-a1').findAll((n: { props: Record<string, unknown> }) => n.props.testID === 'icone-Pencil')[0];
    expect(editar.props.cor).toBe(cor(tema).textPrimary);
    const lixeira = getByTestId('endereco-remover-a1').findAll((n: { props: Record<string, unknown> }) => n.props.testID === 'icone-Trash2')[0];
    expect(lixeira.props.cor).toBe(cor(tema).danger);
    expect(razao(lixeira.props.cor as string, cor(tema).surface)).toBeGreaterThanOrEqual(4.5);
  });

  it('no claro e o que era: forest, cinza da marca e vermelho', async () => {
    const { findByText, getByTestId } = renderNoTema('claro', <EditAddress />);
    await findByText('Principal');
    const icone = (id: string, nome: string) =>
      getByTestId(id).findAll((n: { props: Record<string, unknown> }) => n.props.testID === nome)[0].props.cor;
    expect(icone('endereco-editar-a1', 'icone-Pencil')).toBe('#163300');
    expect(icone('endereco-principal-a2', 'icone-Star')).toBe('#454745');
    expect(icone('endereco-remover-a1', 'icone-Trash2')).toBe('#B3261E');
  });
});

describe('EditAddress: o GPS do formulario', () => {
  it.each(TEMAS)('%s: o pino do aviso e textSecondary', async (tema) => {
    const { findByText, getByText, getByTestId } = renderNoTema(tema, <EditAddress />);
    await findByText('Principal');
    fireEvent.press(getByText('Adicionar endereço'));
    expect(getByTestId('icone-MapPin').props.cor).toBe(cor(tema).textSecondary);
  });
});

describe('ProfessionalInfo', () => {
  it.each(TEMAS)('%s: nome, contato e servicos seguem o tema', async (tema) => {
    const { findByText, getByText, getByTestId } = profissional(tema);
    const nome = await findByText('Carlos Lima');
    expect(corDe(nome)).toBe(cor(tema).textPrimary);
    expect(razao(corDe(nome)!, cor(tema).background)).toBeGreaterThanOrEqual(4.5);

    const telefone = getByText('(11) 98888-7777', { exact: false });
    expect(corDe(telefone)).toBe(cor(tema).textPrimary);
    expect(fundoSobre(telefone)).toBe(cor(tema).surface);
    expect(getByTestId('icone-Phone').props.cor).toBe(cor(tema).textPrimary);

    const titulo = getByText('Serviços');
    expect(corDe(titulo)).toBe(cor(tema).textPrimary);

    const servico = await findByText('Corte');
    expect(corDe(servico)).toBe(cor(tema).textPrimary);
    expect(fundoSobre(servico)).toBe(cor(tema).surface);
    expect(corDe(getByText('R$ 30.00'))).toBe(cor(tema).textPrimary);
  });

  it.each(TEMAS)('%s: o icone de compartilhar e o par do botao greenTint', async (tema) => {
    const { findByText, getByTestId } = profissional(tema);
    await findByText('Carlos Lima');
    const icone = getByTestId('icone-Share2');
    expect(icone.props.cor).toBe(cor(tema).onGreenTint);
    expect(fundoSobre(icone)).toBe(cor(tema).greenTint);
    expect(razao(icone.props.cor, cor(tema).greenTint)).toBeGreaterThanOrEqual(4.5);
  });
});

afterAll(voltarAoClaro);
