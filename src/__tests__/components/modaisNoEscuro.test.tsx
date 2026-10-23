import { createElement } from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { TEMAS, conferir, conferirPainelEVeu, estilo, fundoDe, fundosDa, icones, montar, type No } from '../utils/lerTema';
import { DialogoVupth } from '@components/DialogoVupth';
import { AttendanceDetailModal } from '@components/AttendanceDetailModal';
import { ModalDePagamento } from '@components/ModalDePagamento';
import { ChangeTurnModal } from '@components/ChangeTurnModal';
import { ConviteDeTroca } from '@components/ConviteDeTroca';
import { ModalDeFeedback } from '@components/ModalDeFeedback';
import { RatingModal } from '@components/RatingModal';
import { RescheduleModal } from '@components/RescheduleModal';
import { MoreOptionsModal } from '@components/MoreOptionsModal';
import { QueueDisclaimerModal } from '@components/QueueDisclaimerModal';
import { ScheduleModal } from '@components/ScheduleModal';
import { SwapOffersModal } from '@components/SwapOffersModal';
import { DeleteAccountModal } from '@components/DeleteAccountModal';
import { FilterSheet } from '@components/FilterSheet';
import { LocationSelector } from '@components/LocationSelector';
import { abrirDialogo, useDialogoStore } from '@stores/dialogo.store';
import { usePendenciaStore } from '@stores/pendenciaStore';
import { useConviteDeTrocaStore } from '@stores/conviteDeTrocaStore';
import { useFeedbackStore } from '@stores/feedbackStore';
import { useAuthStore } from '@stores/authStore';
import { useTemaStore } from '@stores/temaStore';
import { paymentService } from '@services/paymentService';
import { swapOfferService } from '@services/swapOfferService';
import { queueService } from '@services/queueService';
import { intentionsService } from '@services/intentionsService';
import { establishmentService } from '@services/establishmentService';
import { dataISO } from '@domain/establishment/horarios';
import { textoDoConvite } from '@domain/queue/conviteDeTroca';
import { STATUS_DESCONHECIDO } from '@domain/queue/types';
import { SERVICE_TYPE_LABELS } from '@domain/establishment/serviceType';
import { coresDoTema, veuDoTema } from '@domain/tema';
import { contraste } from '@domain/contrast';

// modo escuro (DEC-75): as caixas leem o tema. Cada uma e renderizada dentro do
// `TemaDoApp` nos dois temas, e o teste le a cor RESOLVIDA (a que chegou ao no)
// do texto e do fundo em que ele esta, confere que e o token certo e mede o par
// em 4,5:1. No claro cada token vale o hex que a caixa escrevia antes.

jest.mock('expo-secure-store');
// Um icone vira um no `Icone` que leva as props: da para ler a cor que a caixa deu a ele.
jest.mock('lucide-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return new Proxy({}, { get: (_alvo, nome) => (props: object) => React.createElement('Icone', { ...props, nome: String(nome) }) });
});
jest.mock('@theme/liberacao', () => ({ ESCURO_LIBERADO: true }));
jest.mock('@hooks/usePagamentoAdiantado', () => ({ ...jest.requireActual('@hooks/usePagamentoAdiantado'), usePagamentoAdiantado: () => false }));
jest.mock('@services/paymentService', () => ({ paymentService: { get: jest.fn(), claim: jest.fn() } }));
jest.mock('@services/swapOfferService', () => ({
  swapOfferService: { listAcceptable: jest.fn(), listMine: jest.fn(), accept: jest.fn(), cancel: jest.fn() },
}));
jest.mock('@services/queueService', () => ({ queueService: { getQueue: jest.fn() } }));
jest.mock('@services/intentionsService', () => ({
  intentionsService: { getPublicAgenda: jest.fn(), create: jest.fn() },
}));
jest.mock('@services/establishmentService', () => ({ establishmentService: { getHours: jest.fn() } }));
jest.mock('@services/addressService', () => ({ addressService: { getMain: jest.fn() } }));
jest.mock('@utils/cep', () => ({ lookupCep: jest.fn() }));
jest.mock('@hooks/useDeviceLocation', () => ({ useDeviceLocation: () => ({ requestDeviceLocation: jest.fn() }) }));
jest.mock('@utils/copiar', () => ({ copiarTexto: jest.fn(async () => true) }));
jest.setTimeout(90000);

// O hex que cada papel valia no claro nas caixas, antes da conversao.
describe('no claro, cada papel e o hex que a caixa escrevia antes', () => {
  it.each([
    ['painel', '#FFFFFF'],
    ['sobrePainel', '#F3F5F1'],
    ['textPrimary', '#163300'],
    ['textSecondary', '#454745'],
    ['green', '#9FE870'],
    ['onGreen', '#163300'],
    ['danger', '#B3261E'],
    ['selecionado', '#163300'],
    ['onSelecionado', '#9FE870'],
    ['trilho', '#D7DDD3'],
  ] as const)('%s = %s', (papel, hex) => {
    expect(coresDoTema('claro')[papel]).toBe(hex);
  });

  it('o veu do claro e o do tokens.json (forest a 35%); o do escuro e preto a 55%', () => {
    expect(veuDoTema('claro')).toBe('rgba(22,51,0,.35)');
    expect(veuDoTema('escuro')).toBe('rgba(0,0,0,.55)');
  });
});

afterAll(() => act(() => useTemaStore.setState({ preferencia: 'claro' })));

// O `Text` e o `Heading` do Gluestack sem `color` pegam o cinza padrao do Gluestack
// (#525252 e #262626), que nao troca de tema. Aqui sao 7: o titulo de cada caixa de
// detalhe, avaliacao, agendar, trocas, excluir conta e localizacao, e o valor das
// linhas do detalhe. Nao pus cor neles porque mudaria o cinza do claro; a correcao e
// de uma linha no config (textLight700 e textLight900 em `themes.escuro`) e e da
// fundacao, nao desta PR. Quando entrar, estes titulos entram nos `conferir` acima.
it.todo('o texto sem cor propria das caixas acompanha o tema (depende do ajuste em config/gluestack-ui.config.ts)');

describe.each(TEMAS)('DialogoVupth no tema %s', (tema) => {
  beforeEach(() => useDialogoStore.setState({ atual: null, fila: [] }));

  function abrir(pedido: Parameters<typeof abrirDialogo>[0]) {
    const tela = montar(tema, <DialogoVupth />);
    act(() => void abrirDialogo(pedido));
    return tela;
  }

  it('dinheiro: selo danger sobre dangerTint, faixa danger, primario danger e cancelar sobre o painel', () => {
    const tela = abrir({
      titulo: 'Sair da fila',
      mensagem: 'R$ 3,00 de multa.',
      tipo: 'dinheiro',
      selo: 'Multa',
      botoes: [{ texto: 'Cancelar', estilo: 'cancel' }, { texto: 'Sair', estilo: 'destructive' }],
    });
    conferir(tela, tema, [
      ['Sair da fila', 'textPrimary', 'painel'],
      ['R$ 3,00 de multa.', 'textSecondary', 'painel'],
      ['Multa', 'danger', 'dangerTint'],
      ['Sair', 'onDanger', 'danger'],
      ['Cancelar', 'textPrimary', 'sobrePainel'],
    ]);
    expect(estilo(tela.getByTestId('dialogo-faixa')).backgroundColor).toBe(coresDoTema(tema).danger);
  });

  it('atencao: a faixa e o pessego nos dois temas, o selo inverte e o primario e o botao da marca', () => {
    const tela = abrir({
      titulo: 'Hora do almoço',
      mensagem: '60 min.',
      tipo: 'atencao',
      botoes: [{ texto: 'Agora não', estilo: 'cancel' }, { texto: 'Iniciar' }],
    });
    conferir(tela, tema, [
      ['Atenção', 'onAccentPeach', 'accentPeach'],
      ['Iniciar', 'onGreen', 'green'],
      ['Agora não', 'textPrimary', 'sobrePainel'],
    ]);
    expect(estilo(tela.getByTestId('dialogo-faixa')).backgroundColor).toBe('#FFC091');
  });

  it('informacao e erro: o par do selo', () => {
    const info = abrir({ titulo: 'Pedido enviado', mensagem: 'Ana responde.', tipo: 'informacao' });
    conferir(info, tema, [['Aviso', 'onGreenTint', 'greenTint']]);
    info.unmount();
    act(() => useDialogoStore.setState({ atual: null, fila: [] }));
    const erro = abrir({ titulo: 'Não deu', mensagem: 'Tente de novo.', tipo: 'erro' });
    conferir(erro, tema, [['Erro', 'danger', 'dangerTint']]);
    expect(erro.queryByTestId('dialogo-faixa')).toBeNull();
  });

  it('o veu do cartao com tipo e o do tema', () => {
    const tela = abrir({ titulo: 'Oi', mensagem: 'x', tipo: 'informacao' });
    expect(fundosDa(tela.toJSON())).toContain(veuDoTema(tema));
    expect(fundosDa(tela.toJSON())).toContain(coresDoTema(tema).painel);
  });

  it('sem tipo: painel, texto do tema; solido onGreen sobre green; vazado no texto do tema', () => {
    const tela = abrir({
      titulo: 'Fechar fila',
      mensagem: 'Ninguém novo entra.',
      botoes: [{ texto: 'Voltar', estilo: 'cancel' }, { texto: 'Fechar' }],
    });
    conferir(tela, tema, [
      ['Fechar fila', 'textPrimary', 'painel'],
      ['Ninguém novo entra.', 'textSecondary', 'painel'],
      ['Fechar', 'onGreen', 'green'],
      ['Voltar', 'textPrimary', 'painel'],
    ]);
    // a borda do vazado e o texto do tema: forest sobre o painel forest sumiria
    expect(estilo(tela.getByTestId('dialogo-botao-0')).borderColor).toBe(coresDoTema(tema).textPrimary);
  });

  it('sem tipo, com destrutivo: o rotulo vazado e o danger do tema', () => {
    const tela = abrir({
      titulo: 'Excluir conta',
      mensagem: 'Sem volta.',
      botoes: [{ texto: 'Voltar', estilo: 'cancel' }, { texto: 'Excluir', estilo: 'destructive' }],
    });
    conferir(tela, tema, [
      ['Excluir', 'danger', 'painel'],
      ['Voltar', 'onGreen', 'green'],
    ]);
  });

  it('sem tipo: o veu do claro e o do desenho antigo (forest a 45%); o do escuro e o do tokens', () => {
    const tela = abrir({ titulo: 'Oi', mensagem: 'x' });
    const fundos = fundosDa(tela.toJSON());
    expect(fundos).toContain(tema === 'claro' ? '#16330073' : veuDoTema('escuro'));
  });
});

const atendimento = (status: string) => ({
  id: 'a1',
  clientId: 'c1',
  clientName: 'André',
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  establishmentName: 'Barbearia do Zé',
  services: [],
  status,
  totalValue: 40,
  scheduledTime: '2026-09-24T14:00:00',
  startTime: null,
  endTime: null,
  durationInMinutes: null,
});

describe.each(TEMAS)('caixas no tema %s', (tema) => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: 'tk', isAuthenticated: true });
  });

  it('AttendanceDetailModal: o painel, o titulo, as linhas e a pilula de cada status', () => {
    const tela = montar(
      tema,
      <AttendanceDetailModal attendance={atendimento('FINISHED') as never} onClose={jest.fn()} onRate={jest.fn()} />,
    );
    conferirPainelEVeu(tela, tema);
    conferir(tela, tema, [
      ['Profissional', 'textSecondary', 'painel'],
      ['Concluído', 'onGreenTint', 'greenTint'],
      ['Fechar', 'textPrimary', 'painel'],
    ]);
    tela.unmount();
    for (const [status, rotulo, cor, fundo] of [
      ['CANCELLED', 'Cancelado', 'danger', 'sobrePainel'],
      ['REMOVED', 'Retirado pela loja', 'danger', 'sobrePainel'],
      ['LATE', 'Atrasado', 'onAccentPeach', 'accentPeach'],
      ['IN_PROGRESS', 'Em atendimento', 'onGreen', 'green'],
      ['SCHEDULED', 'Aguardando', 'textSecondary', 'sobrePainel'],
      ['OUTRO', STATUS_DESCONHECIDO, 'textSecondary', 'sobrePainel'],
    ] as const) {
      const outra = montar(
        tema,
        <AttendanceDetailModal attendance={atendimento(status) as never} onClose={jest.fn()} onRate={jest.fn()} />,
      );
      conferir(outra, tema, [[rotulo, cor, fundo]]);
      outra.unmount();
    }
  });

  it('ChangeTurnModal: painel, titulos e a opcao marcada (selecionado no radio, onGreenTint no titulo)', () => {
    const tela = montar(
      tema,
      <ChangeTurnModal
        visible
        tailEtaMs={null}
        isLast={false}
        onMoveToEnd={jest.fn()}
        onReschedule={jest.fn()}
        onCreateSwapOffer={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    conferirPainelEVeu(tela, tema);
    conferir(tela, tema, [
      ['Mudar minha vez', 'textPrimary', 'painel'],
      ['Escolha o que você quer fazer:', 'textSecondary', 'painel'],
      ['Mais cedo', 'textSecondary', 'painel'],
      ['Adiantar', 'textPrimary', 'painel'],
    ]);
    fireEvent.press(tela.getByTestId('change-turn-earlier'));
    conferir(tela, tema, [
      ['Adiantar', 'onGreenTint', 'greenTint'],
      ['Publicamos seu pedido para quem está à frente', 'textSecondary', 'greenTint'],
    ]);
    // o radio marcado e o papel `selecionado` (green no escuro; forest sobre o painel forest sumiria)
    const marcado = coresDoTema(tema).selecionado;
    const cores = fundosDa(tela.toJSON());
    expect(cores).toContain(marcado);
  });

  it('ConviteDeTroca: painel, textos, o botao da marca e o trilho da barra', () => {
    act(() =>
      useConviteDeTrocaStore.getState().mostrar({
        id: 'of1', status: 'OPEN', direction: 'LATER', requesterClientId: null, requesterAttendanceId: 'x',
        professionalId: 'p1', establishmentId: 'e1', serviceItemIds: [], resultingAttendanceId: null,
        createdAt: '', respondedAt: null,
      }),
    );
    const tela = montar(tema, <ConviteDeTroca />);
    conferirPainelEVeu(tela, tema);
    conferir(tela, tema, [
      ['Alguém quer adiar a vez', 'textPrimary', 'painel'],
      [textoDoConvite('LATER').mensagem, 'textSecondary', 'painel'],
      ['Aceitar', 'onGreen', 'green'],
    ]);
    const c = coresDoTema(tema);
    const barra = tela.getByTestId('convite-tempo');
    expect(estilo(barra).backgroundColor).toBe(c.trilho);
    expect(StyleSheet.flatten(barra.props.children.props.style).backgroundColor).toBe(c.textPrimary);
    tela.unmount();
    act(() => useConviteDeTrocaStore.getState().fechar());
  });

  it('ModalDeFeedback: painel, textos e os dois botoes', () => {
    act(() => useFeedbackStore.setState({ aberto: true }));
    const tela = montar(tema, <ModalDeFeedback />);
    conferirPainelEVeu(tela, tema);
    conferir(tela, tema, [
      ['Ajude a melhorar o app', 'textPrimary', 'painel'],
      ['Conta pra gente como foi usar o Vupth. Leva um minuto e ajuda muito.', 'textSecondary', 'painel'],
      ['Enviar feedback', 'onGreen', 'green'],
      ['Agora não', 'textPrimary', 'painel'],
    ]);
    tela.unmount();
    act(() => useFeedbackStore.setState({ aberto: false }));
  });

  it('RatingModal: painel, titulo e a estrela (cheia no texto do tema, vazia no border)', () => {
    const tela = montar(tema, <RatingModal visible attendanceId="a1" professionalName="Carlos" onClose={jest.fn()} />);
    conferirPainelEVeu(tela, tema);
    conferir(tela, tema, [
      ['Carlos', 'textSecondary', 'painel'],
      ['Enviar avaliação', 'onGreen', 'green'],
      ['Agora não', 'textPrimary', 'painel'],
    ]);
    const c = coresDoTema(tema);
    const estrelas = () => icones(tela, 'Star');
    expect(estrelas().map((s) => s.props.color)).toEqual(Array(5).fill(c.border));
    fireEvent.press(tela.getByTestId('star-3'));
    expect(estrelas().map((s) => [s.props.color, s.props.fill])).toEqual([
      [c.textPrimary, c.textPrimary],
      [c.textPrimary, c.textPrimary],
      [c.textPrimary, c.textPrimary],
      [c.border, 'none'],
      [c.border, 'none'],
    ]);
    // a estrela cheia carrega a nota: 3:1 sobre o painel, como componente grafico
    expect(contraste(c.textPrimary, c.painel)).toBeGreaterThanOrEqual(3);
  });

  it('RescheduleModal: painel, textos, aviso de multa e o campo de hora (placeholder a 4,5:1)', () => {
    const tela = montar(
      tema,
      <RescheduleModal visible baseMs={Date.now()} tailEtaMs={Date.now()} penalty loading={false} onConfirm={jest.fn()} onClose={jest.fn()} />,
    );
    conferirPainelEVeu(tela, tema);
    conferir(tela, tema, [
      ['Agendar minha vez', 'textPrimary', 'painel'],
      ['Escolha o horário — precisa estar dentro do funcionamento da loja.', 'textSecondary', 'painel'],
      [':', 'textPrimary', 'painel'],
      ['Agendar', 'onGreen', 'green'],
      ['Cancelar', 'textSecondary', 'painel'],
    ]);
    const aviso = tela.getByText(/Perto de ser atendido/);
    expect(estilo(aviso).color).toBe(coresDoTema(tema).danger);
    expect(fundoDe(aviso)).toBe(coresDoTema(tema).dangerTint);
    const campo = tela.getByPlaceholderText('HH');
    const c = coresDoTema(tema);
    expect(campo.props.placeholderTextColor).toBe(c.textPlaceholder);
    expect(estilo(campo).color).toBe(c.textPrimary);
    const fundoDoCampo = fundoDe(campo);
    expect(fundoDoCampo).toBe(tema === 'claro' ? c.surface : c.background);
    expect(contraste(c.textPlaceholder, fundoDoCampo)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(c.textPrimary, fundoDoCampo)).toBeGreaterThanOrEqual(4.5);
    // o icone de aviso e o danger do tema
    const icone = icones(tela, 'TriangleAlert')[0];
    expect(icone.props.color).toBe(c.danger);
  });

  it('MoreOptionsModal: painel, titulo, linha sobre o painel e icones do tema', () => {
    const Icone = (props: { size?: number; color?: string }) => createElement('Icone', { ...props, nome: 'Linha' });
    const tela = montar(
      tema,
      <MoreOptionsModal
        visible
        title="Mais opções"
        subtitle="Escolha uma."
        options={[{ key: 'corte', title: 'Pedir corte', description: 'O profissional responde.', icon: Icone, onPress: jest.fn() }]}
        onClose={jest.fn()}
      />,
    );
    conferirPainelEVeu(tela, tema);
    conferir(tela, tema, [
      ['Mais opções', 'textPrimary', 'painel'],
      ['Escolha uma.', 'textSecondary', 'painel'],
      ['Pedir corte', 'textPrimary', 'sobrePainel'],
      ['O profissional responde.', 'textSecondary', 'sobrePainel'],
      ['Fechar', 'textSecondary', 'painel'],
    ]);
    const c = coresDoTema(tema);
    const linha = icones(tela, 'Linha')[0];
    expect(linha.props.color).toBe(c.textPrimary);
    const seta = icones(tela, 'ChevronRight')[0];
    expect(seta.props.color).toBe(c.textSecondary);
  });

  it('QueueDisclaimerModal: painel, textos, e a caixa marcada e green com o check onGreen', () => {
    const tela = montar(tema, <QueueDisclaimerModal visible onClose={jest.fn()} />);
    conferirPainelEVeu(tela, tema);
    conferir(tela, tema, [
      ['Sobre o tempo estimado', 'textPrimary', 'painel'],
      ['É uma estimativa e pode mudar. Fique de olho no app para não perder a vez.', 'textSecondary', 'painel'],
      ['Não mostrar novamente', 'textSecondary', 'painel'],
      ['Entendi', 'onGreen', 'green'],
    ]);
    const c = coresDoTema(tema);
    const info = icones(tela, 'Info')[0];
    expect(info.props.color).toBe(c.textPrimary);
    fireEvent.press(tela.getByTestId('dont-show-again'));
    conferir(tela, tema, [['Não mostrar novamente', 'textPrimary', 'painel']]);
    const check = icones(tela, 'Check')[0];
    expect(check.props.color).toBe(c.onGreen);
    expect(fundoDe(check)).toBe(c.green);
  });

  it('DeleteAccountModal: painel, titulo, corpo e o erro', () => {
    const tela = montar(tema, <DeleteAccountModal visible error="Senha incorreta." onConfirm={jest.fn()} onClose={jest.fn()} />);
    conferirPainelEVeu(tela, tema);
    conferir(tela, tema, [
      ['Seus dados são apagados. Para confirmar, digite a senha.', 'textSecondary', 'painel'],
      ['Senha incorreta.', 'danger', 'painel'],
    ]);
  });

  it('FilterSheet: folha no painel, titulo e o chip marcado no papel selecionado', () => {
    const tela = montar(tema, <FilterSheet visible value="ALL" onSelect={jest.fn()} onClose={jest.fn()} />);
    conferirPainelEVeu(tela, tema);
    conferir(tela, tema, [
      ['Filtrar por categoria', 'textPrimary', 'painel'],
      ['Mostra só os lugares desse tipo.', 'textSecondary', 'painel'],
      ['Todas', 'onSelecionado', 'selecionado'],
    ]);
    // um chip nao marcado fica sobre o painel (sobrePainel), com o texto secundario
    conferir(tela, tema, [[Object.values(SERVICE_TYPE_LABELS)[0], 'textSecondary', 'sobrePainel']]);
  });

  it('LocationSelector: a barra da Home e a folha de localizacao', () => {
    const tela = montar(tema, <LocationSelector />);
    const c = coresDoTema(tema);
    const pino = icones(tela, 'MapPin')[0];
    expect(pino.props.color).toBe(c.textPrimary);
    expect(estilo(tela.getByText('Escolher meu bairro')).color).toBe(c.textPrimary);
    const seta = icones(tela, 'ChevronRight')[0];
    expect(seta.props.color).toBe(c.textSecondary);
    fireEvent.press(tela.getByText('Escolher meu bairro'));
    conferirPainelEVeu(tela, tema);
    conferir(tela, tema, [
      ['Mostramos primeiro os estabelecimentos do seu bairro e cidade.', 'textSecondary', 'painel'],
      ['ou pelo CEP', 'textSecondary', 'painel'],
    ]);
  });
});

describe.each(TEMAS)('caixas com dados no tema %s', (tema) => {
  const amanha = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: 'tk', isAuthenticated: true });
    usePendenciaStore.getState().fechar();
  });

  it('SwapOffersModal: painel, titulo, bloco da oferta sobre o painel e o texto da vaga', async () => {
    const oferta = {
      id: 'of1', status: 'OPEN', direction: 'LATER', requesterAttendanceId: 'b', requesterClientId: null,
      professionalId: 'p1', establishmentId: 'e1', serviceItemIds: [], resultingAttendanceId: null, createdAt: '', respondedAt: null,
    };
    (swapOfferService.listAcceptable as jest.Mock).mockResolvedValue({ data: [oferta] });
    (swapOfferService.listMine as jest.Mock).mockResolvedValue({ data: [{ ...oferta, id: 'of2' }] });
    (queueService.getQueue as jest.Mock).mockResolvedValue({
      data: { totalRemainingMinutes: 30, attendancesInQueue: [
        { id: 'a', status: 'SCHEDULED', estimatedMinutes: 20 },
        { id: 'b', status: 'SCHEDULED', estimatedMinutes: 10 },
      ] },
    });
    const tela = montar(tema, <SwapOffersModal visible professionalId="p1" establishmentId="e1" onClose={jest.fn()} onChanged={jest.fn()} />);
    const vaga = await tela.findByTestId('vaga-of1', {}, { timeout: 30000 });
    conferirPainelEVeu(tela, tema);
    expect(estilo(vaga).color).toBe(coresDoTema(tema).textPrimary);
    expect(fundoDe(vaga)).toBe(coresDoTema(tema).sobrePainel);
    expect(contraste(estilo(vaga).color as string, fundoDe(vaga))).toBeGreaterThanOrEqual(4.5);
    conferir(tela, tema, [
      ['PODE ACEITAR', 'textSecondary', 'painel'],
      ['MEUS PEDIDOS', 'textSecondary', 'painel'],
      ['Aceitar troca', 'onGreen', 'green'],
    ]);
  });

  it('ScheduleModal: painel, titulo, e o horario marcado no papel selecionado', async () => {
    (intentionsService.getPublicAgenda as jest.Mock).mockResolvedValue({ data: { frame: null, blocks: [] } });
    (establishmentService.getHours as jest.Mock).mockResolvedValue({
      data: { configured: true, weekly: [], exceptions: [], upcoming: [{ date: dataISO(amanha()), day: 'MONDAY', closed: false, opens: '09:00', closes: '11:00' }] },
    });
    const tela = montar(
      tema,
      <ScheduleModal visible onClose={jest.fn()} professionalId="p1" establishmentId="e1" serviceItemIds={['s1']} minutosDoServico={60} />,
    );
    await act(async () => {});
    conferirPainelEVeu(tela, tema);
    conferir(tela, tema, [
      ['Escolha o dia e o horário.', 'textSecondary', 'painel'],
      ['Agendar', 'onGreen', 'green', 1],
      ['Cancelar', 'textPrimary', 'painel'],
    ]);
    fireEvent.press(tela.getAllByRole('button')[1]);
    await tela.findByTestId('horario-09:00', {}, { timeout: 30000 });
    conferir(tela, tema, [['09:30', 'textPrimary', 'sobrePainel']]);
    fireEvent.press(tela.getByTestId('horario-09:30'));
    conferir(tela, tema, [['09:30', 'onSelecionado', 'selecionado']]);
  });

  it('ModalDePagamento: o aviso (faixa e selo de dinheiro) e o Pix, no painel do tema', async () => {
    (paymentService.get as jest.Mock).mockResolvedValue({
      data: { status: 'PENDING', services_value: 40, penalties_value: 5, amount: 45, pix_copy_paste: '000201pix', holder_name: 'Carlos Lima' },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const c = coresDoTema(tema);
    act(() => usePendenciaStore.getState().avisar([{ attendance_id: 'a1', status: 'PENDING', amount: 45, professional_name: 'Carlos' }]));
    const aviso = montar(tema, <QueryClientProvider client={client}><ModalDePagamento /></QueryClientProvider>);
    conferirPainelEVeu(aviso, tema);
    conferir(aviso, tema, [
      ['Pagamento pendente', 'textPrimary', 'painel'],
      ['R$ 45,00 com Carlos.', 'textSecondary', 'painel'],
      ['Pagamento', 'danger', 'dangerTint'],
      ['Pagar', 'onGreen', 'green'],
      ['Agora não', 'textPrimary', 'painel'],
    ]);
    expect(estilo(aviso.getByTestId('faixa-do-tipo')).backgroundColor).toBe(c.danger);
    aviso.unmount();

    act(() => usePendenciaStore.getState().pagar('a1'));
    const pix = montar(tema, <QueryClientProvider client={client}><ModalDePagamento /></QueryClientProvider>);
    await pix.findByText('R$ 40,00', {}, { timeout: 30000 });
    conferirPainelEVeu(pix, tema);
    conferir(pix, tema, [
      ['Pagar por Pix', 'textPrimary', 'painel'],
      ['Serviço', 'textSecondary', 'painel'],
      ['R$ 40,00', 'textPrimary', 'painel'],
      ['Já paguei', 'onGreen', 'green'],
      ['Copiar código Pix', 'textPrimary', 'painel'],
    ]);
    // o codigo copia-e-cola e um bloco sobre o painel
    const codigo = pix.getByTestId('pix-codigo');
    expect(estilo(codigo).color).toBe(c.textPrimary);
    expect(estilo(codigo).backgroundColor).toBe(c.sobrePainel);
    expect(contraste(c.textPrimary, c.sobrePainel)).toBeGreaterThanOrEqual(4.5);
    // o QR segue escuro sobre branco nos dois temas: o leitor do banco nao le o codigo invertido
    const raiz = pix.UNSAFE_root as unknown as { findAll: (filtro: (n: No) => boolean) => No[] };
    const qr = raiz.findAll((n) => n.props.value === '000201pix' && n.props.backgroundColor)[0];
    expect(qr.props.backgroundColor).toBe('#FFFFFF');
    expect(qr.props.color).toBe('#163300');
    pix.unmount();
    act(() => usePendenciaStore.getState().fechar());
  });
});
