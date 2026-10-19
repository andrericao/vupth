import { Text } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

import { TEMAS, conferir, estilo, fundoDe, fundosDa, icones, montar } from '../utils/lerTema';
import { CardDaLoja } from '@components/CardDaLoja';
import { LinhaDaLojaFechada } from '@components/LinhaDaLojaFechada';
import { BadgeAgendar } from '@components/BadgeAgendar';
import { FaixaBaixarApp } from '@components/FaixaBaixarApp';
import { FaixaAvaliar } from '@components/FaixaAvaliar';
import { PushDiagnostics } from '@components/PushDiagnostics';
import { WsDiagnostics } from '@components/WsDiagnostics';
import { AtualizarNoNavegador } from '@components/AtualizarNoNavegador';
import { DaySelector } from '@components/DaySelector';
import { FaixaDaTolerancia } from '@components/FaixaDaTolerancia';
import { FotoAmpliada } from '@components/FotoAmpliada';
import { NotaDaLoja } from '@components/NotaDaLoja';
import { OfflineBanner } from '@components/OfflineBanner';
import { HeaderIconButton, ScreenHeader } from '@components/ScreenHeader';
import { Grupo, MenuItem } from '@components/MenuDoPerfil';
import { PreparingServer } from '@components/PreparingServer';
import { SaibaMais } from '@components/SaibaMais';
import { SaibaMaisDoPreco } from '@components/SaibaMaisDoPreco';
import { TabLabel, TabPill, coresDaBarraDeAbas, divisorDaBarraDeAbas } from '@components/TabPill';
import { URGENCY_COLORS } from '@hooks/useQueueCountdown';
import { useAuthStore } from '@stores/authStore';
import { useQueueStore } from '@stores/queueStore';
import { useRatedStore } from '@stores/ratedStore';
import { useTemaStore } from '@stores/temaStore';
import { usePushDiagnosticsStore } from '@stores/pushDiagnosticsStore';
import { useWsDiagnosticsStore } from '@stores/wsDiagnosticsStore';
import { useClientAttendances } from '@hooks/useAttendances';
import { buildDayOptions } from '@domain/schedule/days';
import { resolveRating } from '@domain/establishment/rating';
import { statusTag } from '@domain/establishment/statusTag';
import type { Establishment } from '@domain/establishment/types';
import { coresDoTema } from '@domain/tema';
import { contraste } from '@domain/contrast';

// modo escuro (DEC-75): os componentes menores leem o tema. Cada um e renderizado
// dentro do `TemaDoApp` nos dois temas e o teste le a cor RESOLVIDA do texto e do
// fundo em que ele esta (ver ../utils/lerTema). No claro cada token vale o hex que
// o componente escrevia antes. O que NAO troca de tema de proposito leva
// `tema-fixo` no codigo, e aqui um teste confere que ele de fato nao troca.

jest.mock('expo-secure-store');
// Um icone vira um no `Icone` que leva as props: da para ler a cor que o componente deu a ele.
jest.mock('lucide-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return new Proxy({}, { get: (_alvo, nome) => (props: object) => React.createElement('Icone', { ...props, nome: String(nome) }) });
});
jest.mock('@theme/liberacao', () => ({ ESCURO_LIBERADO: true }));
let mockNoNavegador = true;
jest.mock('@utils/ehNavegador', () => ({ ehNavegador: () => mockNoNavegador }));
jest.mock('@services/api', () => ({ ...jest.requireActual('@services/api'), API_ENV: 'prod' }));
let mockOnline = false;
jest.mock('@hooks/useNetwork', () => ({ useIsOnline: () => mockOnline }));
jest.mock('@hooks/useAttendances', () => ({ useClientAttendances: jest.fn() }));
jest.mock('@routes/navigationRef', () => ({ abrirAvaliacao: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn() }),
}));
jest.setTimeout(90000);

afterAll(() => act(() => useTemaStore.setState({ preferencia: 'claro' })));

// O `Text` e o `Heading` do Gluestack sem `color` pegam o cinza padrao do Gluestack
// (#525252 e #262626), que nao troca de tema. Aqui sao 2, no WsDiagnostics (o titulo
// da secao e o nome de cada canal). Nao pus cor neles porque mudaria o cinza do claro;
// a correcao e de uma linha no config (textLight700 e textLight900 em `themes.escuro`)
// e e da fundacao, nao desta PR.
it.todo('o texto sem cor propria do WsDiagnostics acompanha o tema (depende do ajuste em config/gluestack-ui.config.ts)');

function loja(extra: Partial<Establishment> = {}): Establishment {
  return {
    id: 'e1',
    name: 'Barbearia do Zé',
    ownerId: 'o1',
    urlImage: null,
    serviceType: 'BARBER',
    open_status: 'OPEN',
    is_open: true,
    status: 'ACTIVE',
    services: [],
    estimated_wait_minutes: 0,
    ...extra,
  } as Establishment;
}

describe.each(TEMAS)('lista de lojas no tema %s', (tema) => {
  it('CardDaLoja: nome, pilula aberta no par do green, avatar, nota, distancia e ponto', async () => {
    const c = coresDoTema(tema);
    const tela = montar(
      tema,
      <CardDaLoja establishment={loja({ rating_best: 4.8 })} distanceKm={1.25} onPress={jest.fn()} />,
    );
    await tela.findByText('4.8', {}, { timeout: 30000 });
    conferir(tela, tema, [
      ['Barbearia do Zé', 'textPrimary', 'surface'],
      [statusTag(loja()).label, 'onGreen', 'green'],
      ['BD', 'onGreenTint', 'greenTint'],
      ['Barbearia', 'textSecondary', 'surface'],
      ['1,3 km', 'textSecondary', 'surface'],
      ['4.8', 'textPrimary', 'surface'],
    ]);
    // o ponto ao vivo esta sobre o green: onGreen. O icone de distancia e a estrela, no texto do tema.
    expect(fundosDa(tela.toJSON())).toContain(c.onGreen);
    expect(icones(tela, 'MapPin')[0].props.color).toBe(c.textPrimary);
    expect(icones(tela, 'Star')[0].props.color).toBe(c.textPrimary);
    expect(icones(tela, 'Star')[0].props.fill).toBe(c.textPrimary);
  });

  it('CardDaLoja fechada e LinhaDaLojaFechada: o selo AGENDAR e o par do pessego, e o nome fica no texto do tema', async () => {
    const fechada = loja({ is_open: false, open_status: 'CLOSED' });
    const card = montar(tema, <CardDaLoja establishment={fechada} distanceKm={null} onPress={jest.fn()} />);
    await card.findByText('AGENDAR', {}, { timeout: 30000 });
    conferir(card, tema, [
      ['AGENDAR', 'onAccentPeach', 'warning'],
      ['Barbearia do Zé', 'textPrimary', 'surface'],
    ]);
    card.unmount();
    const linha = montar(tema, <LinhaDaLojaFechada establishment={fechada} onPress={jest.fn()} />);
    await linha.findByText('AGENDAR', {}, { timeout: 30000 });
    conferir(linha, tema, [
      ['AGENDAR', 'onAccentPeach', 'warning'],
      ['Barbearia do Zé', 'textPrimary', 'surface'],
      ['Barbearia', 'textSecondary', 'surface'],
    ]);
  });

  it('BadgeAgendar pequeno: o mesmo par', () => {
    const tela = montar(tema, <BadgeAgendar pequeno />);
    conferir(tela, tema, [['AGENDAR', 'onAccentPeach', 'warning']]);
  });

  it('NotaDaLoja: a estrela cheia e "Novo" levam a cor que a tela passa', () => {
    const c = coresDoTema(tema);
    const tela = montar(tema, <NotaDaLoja rating={resolveRating(4.2, 3)} starSize={14} color="$brandTextPrimary" />);
    expect(icones(tela, 'Star')[0].props).toMatchObject({ color: c.textPrimary, fill: c.textPrimary });
    expect(estilo(tela.getByText('4.2')).color).toBe(c.textPrimary);
    tela.unmount();
    const novo = montar(tema, <NotaDaLoja rating={resolveRating(null, 0)} starSize={14} color="$brandTextPrimary" />);
    expect(novo.getByText('Novo')).toBeTruthy();
    expect(icones(novo, 'Star')).toHaveLength(0);
  });
});

describe.each(TEMAS)('faixas no tema %s', (tema) => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNoNavegador = true;
    mockOnline = false;
    Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)' }, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null, setItem: () => undefined }, configurable: true });
  });

  it('FaixaBaixarApp: forest com texto branco e botao green nos dois temas (tema-fixo)', () => {
    const c = coresDoTema(tema);
    const tela = montar(tema, <FaixaBaixarApp apkNoAr />);
    for (const texto of ['O VUPTH é melhor no app.', 'Continuar na web']) {
      const no = tela.getByText(texto);
      expect(estilo(no).color).toBe('#FFFFFF');
      expect(fundoDe(no)).toBe('#163300');
      expect(contraste('#FFFFFF', '#163300')).toBeGreaterThanOrEqual(4.5);
    }
    // o forest da faixa nao e a surface do escuro por acaso: vale o mesmo hex nos dois temas
    expect(c.forest).toBe('#163300');
    conferir(tela, tema, [['Baixar o app', 'onGreen', 'green']]);
  });

  it('FaixaAvaliar: o par do greenTint em texto e icones', async () => {
    (useClientAttendances as jest.Mock).mockReturnValue({
      data: [
        { id: 'r1', professionalId: 'p1', professionalName: 'Carlos', establishmentId: 'e1', status: 'FINISHED', scheduledTime: '2026-10-16T14:00:00Z', services: [] },
      ],
    });
    useAuthStore.setState({ isAuthenticated: true });
    useQueueStore.setState({ activeQueue: null } as never);
    useRatedStore.setState({ ids: [] } as never);
    const c = coresDoTema(tema);
    const tela = montar(tema, <FaixaAvaliar />);
    await tela.findByText('Como foi com Carlos?', {}, { timeout: 30000 });
    conferir(tela, tema, [
      ['Como foi com Carlos?', 'onGreenTint', 'greenTint'],
      ['Toque para avaliar', 'onGreenTint', 'greenTint'],
    ]);
    expect(icones(tela, 'Star')[0].props.color).toBe(c.onGreenTint);
    expect(icones(tela, 'X')[0].props.color).toBe(c.onGreenTint);
    expect(contraste(c.onGreenTint, c.greenTint)).toBeGreaterThanOrEqual(4.5);
  });

  it('FaixaDaTolerancia: texto e icone no texto do tema, sobre o background', () => {
    const c = coresDoTema(tema);
    const tela = montar(tema, <FaixaDaTolerancia ate={Date.now() + 60_000} />);
    expect(fundosDa(tela.toJSON())).toContain(c.background);
    const texto = tela.getByText(/sem custo até/);
    expect(estilo(texto).color).toBe(c.textPrimary);
    expect(contraste(c.textPrimary, fundoDe(texto))).toBeGreaterThanOrEqual(4.5);
    expect(icones(tela, 'Info')[0].props.color).toBe(c.textPrimary);
    tela.unmount();
  });

  it('OfflineBanner: o danger do tema com o onDanger por cima', () => {
    const tela = montar(tema, <OfflineBanner />);
    conferir(tela, tema, [['Sem conexão — os dados podem estar desatualizados', 'onDanger', 'danger']]);
  });

  it('AtualizarNoNavegador: botao sobre a surface, texto e icone no texto do tema', () => {
    const c = coresDoTema(tema);
    const tela = montar(tema, <AtualizarNoNavegador atualizando={false} onPress={jest.fn()} />);
    conferir(tela, tema, [['Atualizar', 'textPrimary', 'surface']]);
    expect(icones(tela, 'RefreshCw')[0].props.color).toBe(c.textPrimary);
  });
});

describe.each(TEMAS)('painel de diagnostico no tema %s', (tema) => {
  it('PushDiagnostics: titulo, rotulos, ok, falha e o token inteiro sobre o background', () => {
    const c = coresDoTema(tema);
    usePushDiagnosticsStore.getState().reset();
    usePushDiagnosticsStore.getState().registrarTentativa({ motivo: 'ok', token: 'ExponentPushToken[abcdefgh12345678]' });
    usePushDiagnosticsStore.getState().registrarEnvio('falhou', 'Network Error');
    const tela = montar(tema, <PushDiagnostics />);
    conferir(tela, tema, [
      ['Push', 'textPrimary', 'surface'],
      ['token', 'textSecondary', 'surface'],
      ['token obtido', 'textPrimary', 'surface'],
      ['NÃO — envio falhou', 'danger', 'surface'],
    ]);
    fireEvent.press(tela.getByText('…12345678 · toque p/ ver'));
    const token = tela.getByText('ExponentPushToken[abcdefgh12345678]');
    expect(estilo(token).color).toBe(c.textPrimary);
    expect(fundoDe(token)).toBe(c.background);
    expect(contraste(c.textPrimary, c.background)).toBeGreaterThanOrEqual(4.5);
  });

  it('WsDiagnostics: a mensagem de cada nivel e o par do fundo dele', () => {
    const base = { status: 'idle', info: null, connects: 0, connectedAt: null, lastMessageAt: null, messages: 0, lastError: null, errors: 0 };
    const info = { heartBeat: '10000,10000', serverSendsMs: 10000, serverExpectsMs: 10000, userName: 'ana', authenticated: true };
    // bad (erro) + idle; depois ok + warn (conectado sem o frame CONNECTED)
    act(() =>
      useWsDiagnosticsStore.setState({
        personal: { ...base, status: 'error', lastError: 'handshake' } as never,
        public: { ...base } as never,
      }),
    );
    const a = montar(tema, <WsDiagnostics />);
    conferir(a, tema, [
      ['Falhou o handshake — nem chegou a conectar', 'textPrimary', 'dangerTint'],
      ['Sem conexão (nenhuma fila ativa)', 'textSecondary', 'surface'],
      ['handshake', 'danger', 'surface'],
    ]);
    a.unmount();
    act(() =>
      useWsDiagnosticsStore.setState({
        personal: { ...base, status: 'connected', info } as never,
        public: { ...base, status: 'connected', info: null } as never,
      }),
    );
    const b = montar(tema, <WsDiagnostics />);
    conferir(b, tema, [
      ['Conectado como ana, heartbeat de 10s', 'onGreenTint', 'greenTint'],
      ['Conectado, mas sem o frame CONNECTED', 'onAccentPeach', 'warning'],
    ]);
    act(() => useWsDiagnosticsStore.getState().reset());
  });
});

describe.each(TEMAS)('seletor de dia e menu do perfil no tema %s', (tema) => {
  const from = new Date(2026, 6, 15, 9, 0);

  it('DaySelector: o dia marcado e selecionado/onSelecionado; os outros, sobrePainel', () => {
    const dias = buildDayOptions(from, 3);
    const tela = montar(tema, <DaySelector selectedDate={dias[1].date} onSelect={jest.fn()} from={from} count={3} />);
    conferir(tela, tema, [
      ['Hoje', 'textPrimary', 'sobrePainel'],
      [dias[0].weekday, 'textSecondary', 'sobrePainel'],
      [dias[1].label, 'onSelecionado', 'selecionado'],
      [dias[1].weekday, 'onSelecionado', 'selecionado'],
    ]);
  });

  it('MenuItem e Grupo: rotulo e valor no texto do tema sobre o cartao surface, seta em textSecondary', () => {
    const c = coresDoTema(tema);
    const tela = montar(
      tema,
      <Grupo label="Conta">
        <MenuItem icon={null} label="E-mail" value="ana@vupth.com" onPress={jest.fn()} />
      </Grupo>,
    );
    conferir(tela, tema, [
      ['E-mail', 'textSecondary', 'surface'],
      ['ana@vupth.com', 'textPrimary', 'surface'],
    ]);
    expect(estilo(tela.getByText('CONTA')).color).toBe(c.textSecondary);
    expect(icones(tela, 'ChevronRight')[0].props.color).toBe(c.textSecondary);
    // tira o cartao: o titulo do grupo fica sobre a tela (background)
    expect(contraste(c.textSecondary, c.background)).toBeGreaterThanOrEqual(4.5);
  });
});

describe.each(TEMAS)('cabecalho, links e abertura no tema %s', (tema) => {
  it('ScreenHeader: o titulo segue o fundo (textPrimary, onGreen no hero verde, forest na foto) e o botao tambem', () => {
    const c = coresDoTema(tema);
    const cor = (ground?: 'claro' | 'foto' | 'marca') => {
      const tela = montar(tema, <ScreenHeader title="Título" subtitle="Legenda" ground={ground} />);
      const titulo = estilo(tela.getByText('Título')).color;
      const botao = fundosDa(tela.toJSON());
      const legenda = estilo(tela.getByText('Legenda')).color;
      tela.unmount();
      return { titulo, botao, legenda };
    };
    expect(cor().titulo).toBe(c.textPrimary);
    expect(cor().legenda).toBe(c.textSecondary);
    expect(cor('claro').botao).toContain(c.greenTint);
    // sobre a foto e o hero verde, que sao os mesmos nos dois temas (tema-fixo)
    expect(cor('marca').titulo).toBe('#163300');
    expect(cor('marca').botao).toContain('#16330014');
    expect(cor('foto').titulo).toBe('#163300');
    expect(cor('foto').botao).toContain('#FFFFFFE6');
  });

  it('HeaderIconButton: o fundo do botao redondo e o greenTint do tema', () => {
    const tela = montar(tema, <HeaderIconButton onPress={jest.fn()} testID="b">{null}</HeaderIconButton>);
    expect(fundosDa(tela.toJSON())).toContain(coresDoTema(tema).greenTint);
  });

  it('SaibaMais e SaibaMaisDoPreco: o link padrao e o texto do tema, a 4,5:1 sobre o painel, o background e a surface', () => {
    const c = coresDoTema(tema);
    const a = montar(tema, <SaibaMais artigo="excluirConta" />);
    const b = montar(tema, <SaibaMaisDoPreco />);
    for (const tela of [a, b]) {
      const cor = estilo(tela.getByText('Saiba mais')).color as string;
      expect(cor).toBe(c.textPrimary);
      for (const fundo of [c.painel, c.background, c.surface]) expect(contraste(cor, fundo)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('SaibaMais: a cor que a tela passa vence o padrao (o link sobre o forest do resumo)', () => {
    const tela = montar(tema, <SaibaMaisDoPreco color="$brandGreen" />);
    expect(estilo(tela.getByText('Saiba mais')).color).toBe(coresDoTema(tema).green);
  });

  it('PreparingServer: a abertura tem o verde do splash nativo nos dois temas (tema-fixo)', () => {
    const tela = montar(tema, <PreparingServer />);
    expect(estilo(tela.getByTestId('abertura')).backgroundColor).toBe('#2E432F');
    tela.unmount();
  });

  it('FotoAmpliada: fundo preto a 90% e X branco nos dois temas (tema-fixo)', () => {
    const tela = montar(tema, <FotoAmpliada uri="https://img.com/x.jpg" onClose={jest.fn()} />);
    expect(estilo(tela.getByTestId('foto-ampliada')).backgroundColor).toBe('#000000E6');
    expect(icones(tela, 'X')[0].props.color).toBe('#FFFFFF');
    expect(contraste('#FFFFFF', '#000000')).toBeGreaterThanOrEqual(4.5);
  });
});

describe.each(TEMAS)('barra de abas no tema %s', (tema) => {
  const c = coresDoTema(tema);
  const barra = coresDaBarraDeAbas(c);

  it('coresDaBarraDeAbas: fundo da tela, icone ativo no par da pilula, inativo secundario; tudo a 4,5:1', () => {
    expect(barra).toEqual({ fundo: c.background, iconeAtivo: c.onGreenTint, rotuloAtivo: c.textPrimary, inativo: c.textSecondary });
    expect(contraste(barra.iconeAtivo, c.greenTint)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(barra.rotuloAtivo, barra.fundo)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(barra.inativo, barra.fundo)).toBeGreaterThanOrEqual(4.5);
  });

  it('TabPill e TabLabel: a pilula da aba ativa e o greenTint; o rotulo ativo e o inativo, no texto do tema', () => {
    const tela = montar(
      tema,
      <>
        <TabPill focused>
          <Text>ativa</Text>
        </TabPill>
        <TabPill focused={false}>
          <Text>inativa</Text>
        </TabPill>
        <TabLabel focused>Início</TabLabel>
        <TabLabel focused={false}>Perfil</TabLabel>
      </>,
    );
    expect(fundoDe(tela.getByText('ativa'))).toBe(c.greenTint);
    expect(estilo(tela.getByText('Início')).color).toBe(barra.rotuloAtivo);
    expect(estilo(tela.getByText('Perfil')).color).toBe(barra.inativo);
    expect(estilo(tela.getByText('Início')).fontWeight).toBe('700');
  });
});

describe('barra de abas no claro: os hex de antes', () => {
  it('fundo #FFFFFF, icone e rotulo ativos #163300, inativo #454745', () => {
    expect(coresDaBarraDeAbas(coresDoTema('claro'))).toEqual({
      fundo: '#FFFFFF',
      iconeAtivo: '#163300',
      rotuloAtivo: '#163300',
      inativo: '#454745',
    });
  });
});

describe('cores de urgencia da contagem (tema-fixo)', () => {
  it('sao as mesmas nos dois temas e, sobre a surface e o background do escuro, passam de 3:1 (texto grande, 36 px)', () => {
    const escuro = coresDoTema('escuro');
    for (const cor of Object.values(URGENCY_COLORS)) {
      expect(contraste(cor, escuro.surface)).toBeGreaterThanOrEqual(3);
      expect(contraste(cor, escuro.background)).toBeGreaterThanOrEqual(3);
    }
    expect(URGENCY_COLORS).toEqual({ normal: '#F59E0B', urgent: '#EF4444' });
  });
});

// Escolha da Design (19/10): no escuro a barra, da cor da tela e sem sombra visivel, ficava
// sem limite; ganha uma linha discreta (surfaceAlt, 1,5:1). No claro a sombra ja separa.
describe('divisor da barra de abas', () => {
  it('no claro nao ha linha', () => {
    expect(divisorDaBarraDeAbas(false, coresDoTema('claro'))).toEqual({ borderTopWidth: 0, borderTopColor: 'transparent' });
  });

  it('no escuro e uma linha de 1px em surfaceAlt, discreta: entre 1,3:1 e 2:1 com a tela', () => {
    const c = coresDoTema('escuro');
    const linha = divisorDaBarraDeAbas(true, c);
    expect(linha).toEqual({ borderTopWidth: 1, borderTopColor: '#1F3F0B' });
    const razao = contraste(linha.borderTopColor, c.background);
    expect(razao).toBeGreaterThanOrEqual(1.3);
    expect(razao).toBeLessThan(2);
  });
});
