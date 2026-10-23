import { ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { act, fireEvent, within } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { ScheduleModal } from '@components/ScheduleModal';
import { intentionsService } from '@services/intentionsService';
import { establishmentService } from '@services/establishmentService';
import { useAuthStore } from '@stores/authStore';
import { dataISO } from '@domain/establishment/horarios';

// Barra de encaixe (Andre, 26/09): escolhe o dia, vê os horários livres, confirma.

jest.mock('expo-secure-store');
jest.mock('@services/intentionsService', () => ({
  intentionsService: { getPublicAgenda: jest.fn(), create: jest.fn() },
}));
jest.mock('@services/establishmentService', () => ({ establishmentService: { getHours: jest.fn() } }));
jest.setTimeout(90000);

const amanha = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
};

function abrir(over: Partial<React.ComponentProps<typeof ScheduleModal>> = {}) {
  const props: React.ComponentProps<typeof ScheduleModal> & { onClose: jest.Mock; onPrecisaLogin: jest.Mock; onAgendado: jest.Mock } = {
    visible: true,
    onClose: jest.fn(),
    professionalId: 'p1',
    establishmentId: 'e1',
    serviceItemIds: ['s1'],
    minutosDoServico: 60,
    onPrecisaLogin: jest.fn(),
    onAgendado: jest.fn(),
    ...(over as object),
  };
  return { props, ...renderWithProviders(<ScheduleModal {...props} />) };
}

describe('ScheduleModal — barra de encaixe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: 'tk' });
    (intentionsService.getPublicAgenda as jest.Mock).mockResolvedValue({ data: { frame: null, blocks: [] } });
    // Amanhã aberto das 09:00 às 11:00.
    (establishmentService.getHours as jest.Mock).mockResolvedValue({
      data: { configured: true, weekly: [], exceptions: [], upcoming: [{ date: dataISO(amanha()), day: 'MONDAY', closed: false, opens: '09:00', closes: '11:00' }] },
    });
  });

  it('o título e o botão dizem só "Agendar" — sem "Confirmar" (guia de texto 4.6)', async () => {
    const { getAllByText, queryByText } = abrir();
    await act(async () => {});
    expect(getAllByText('Agendar')).toHaveLength(2); // o título e o botão
    expect(queryByText('Confirmar')).toBeNull();
    expect(queryByText('Pedir')).toBeNull();
  });

  it('sem horário escolhido, "Agendar" não agenda', async () => {
    const { getByTestId } = abrir();
    await act(async () => {});
    fireEvent.press(getByTestId('confirmar-agendamento'));
    expect(intentionsService.create).not.toHaveBeenCalled();
  });

  it('escolhe amanhã, vê os horários em que o serviço cabe, escolhe e confirma', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (intentionsService.create as jest.Mock).mockResolvedValue({ data: {} });
    const { getAllByRole, findByTestId, getByTestId, queryByTestId, props } = abrir();
    await act(async () => {});
    fireEvent.press(getAllByRole('button')[1]);
    expect(await findByTestId('horario-09:00')).toBeTruthy();
    expect(getByTestId('horario-10:00')).toBeTruthy();
    expect(queryByTestId('horario-10:30')).toBeNull();
    fireEvent.press(getByTestId('horario-09:30'));
    await act(async () => {
      fireEvent.press(getByTestId('confirmar-agendamento'));
    });
    const [dados, token] = (intentionsService.create as jest.Mock).mock.calls[0];
    expect(token).toBe('tk');
    expect(dados.professionalId).toBe('p1');
    expect(dados.serviceItemIds).toEqual(['s1']);
    expect(new Date(dados.desiredTime).getHours()).toBe(9);
    expect(alerta).toHaveBeenCalledWith('Agendado', expect.stringMatching(/às 09:30/));
    expect(props.onAgendado).toHaveBeenCalled();
    alerta.mockRestore();
  });

  // cupom-em-configuracoes: o cupom escolhido vai na intenção; se não vale, o aviso e o cupom sai.
  it('com cupom, manda o coupon_campaign_id; 422 COUPON_NOT_ACTIVE avisa e solta o cupom', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const onCupomInvalido = jest.fn();
    (intentionsService.create as jest.Mock).mockRejectedValue({ response: { status: 422, data: { code: 'COUPON_NOT_ACTIVE' } } });
    const { getAllByRole, findByTestId, getByTestId, props } = abrir({ couponCampaignId: 'cp1', onCupomInvalido });
    await act(async () => {});
    fireEvent.press(getAllByRole('button')[1]);
    await findByTestId('horario-09:00');
    fireEvent.press(getByTestId('horario-09:30'));
    await act(async () => {
      fireEvent.press(getByTestId('confirmar-agendamento'));
    });
    expect((intentionsService.create as jest.Mock).mock.calls[0][0]).toHaveProperty('coupon_campaign_id', 'cp1');
    expect(onCupomInvalido).toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalled();
    expect(alerta).toHaveBeenCalledWith('Cupom', expect.stringMatching(/não está valendo/));
    alerta.mockRestore();
  });

  // aviso-de-chegada-na-entrada (André, 22/10): faltando menos de 1 h para o horário
  // agendado, o aviso diz até que horas estar na loja; Cancelar não agenda.
  it('faltando menos de 1 h para o horário: avisa; Cancelar não agenda, Confirmar agenda', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (intentionsService.create as jest.Mock).mockResolvedValue({ data: {} });
    const { getAllByRole, findByTestId, getByTestId } = abrir();
    await act(async () => {});
    fireEvent.press(getAllByRole('button')[1]);
    await findByTestId('horario-09:00');
    fireEvent.press(getByTestId('horario-09:30'));
    const faltam45 = new Date(amanha());
    faltam45.setHours(8, 45, 0, 0);
    const agora = jest.spyOn(Date, 'now').mockReturnValue(faltam45.getTime());
    await act(async () => {
      fireEvent.press(getByTestId('confirmar-agendamento'));
    });
    expect(intentionsService.create).not.toHaveBeenCalled();
    const [titulo, mensagem, botoes] = alerta.mock.calls[0] as [string, string, { text: string; onPress?: () => void }[]];
    expect(titulo).toBe('Esteja na loja');
    expect(mensagem).toBe('Esteja na loja às 09:25.');
    expect(botoes.map((b) => b.text)).toEqual(['Cancelar', 'Confirmar']);
    await act(async () => {
      botoes.find((b) => b.text === 'Confirmar')!.onPress!();
    });
    expect(intentionsService.create).toHaveBeenCalledTimes(1);
    agora.mockRestore();
    alerta.mockRestore();
  });

  it('a recusa do servidor vira a frase dela', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (intentionsService.create as jest.Mock).mockRejectedValue({ response: { status: 409, data: { code: 'PROFESSIONAL_AGENDA_FULL' } } });
    const { getAllByRole, findByTestId, getByTestId } = abrir();
    await act(async () => {});
    fireEvent.press(getAllByRole('button')[1]);
    fireEvent.press(await findByTestId('horario-09:00'));
    await act(async () => {
      fireEvent.press(getByTestId('confirmar-agendamento'));
    });
    expect(alerta).toHaveBeenCalledWith('Não foi possível agendar', expect.stringMatching(/ocupado/));
    alerta.mockRestore();
  });

  it('pagamento pendente (409 PAYMENT_PENDING, CLI-30): fecha e mostra o aviso com o "Pagar"', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { usePendenciaStore } = require('@stores/pendenciaStore');
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const itens = [{ attendance_id: 'a0', status: 'PENDING', amount: 45 }];
    (intentionsService.create as jest.Mock).mockRejectedValue({ response: { status: 409, data: { code: 'PAYMENT_PENDING', items: itens } } });
    const { getAllByRole, findByTestId, getByTestId, props } = abrir();
    await act(async () => {});
    fireEvent.press(getAllByRole('button')[1]);
    fireEvent.press(await findByTestId('horario-09:00'));
    await act(async () => {
      fireEvent.press(getByTestId('confirmar-agendamento'));
    });
    expect(usePendenciaStore.getState().aviso).toEqual(itens);
    expect(props.onClose).toHaveBeenCalled();
    expect(alerta).not.toHaveBeenCalled();
    usePendenciaStore.getState().fechar();
    alerta.mockRestore();
  });

  it('visitante: confirmar leva ao login, sem agendar', async () => {
    useAuthStore.setState({ accessToken: null });
    const { getAllByRole, findByTestId, getByTestId, props } = abrir();
    await act(async () => {});
    fireEvent.press(getAllByRole('button')[1]);
    fireEvent.press(await findByTestId('horario-09:00'));
    await act(async () => {
      fireEvent.press(getByTestId('confirmar-agendamento'));
    });
    expect(props.onPrecisaLogin).toHaveBeenCalled();
    expect(intentionsService.create).not.toHaveBeenCalled();
  });

  it('dia sem horário da loja: diz que a loja não informou', async () => {
    (establishmentService.getHours as jest.Mock).mockResolvedValue({ data: { configured: false, weekly: [], exceptions: [], upcoming: [] } });
    const { getAllByRole, findByTestId } = abrir();
    await act(async () => {});
    fireEvent.press(getAllByRole('button')[1]);
    expect((await findByTestId('sem-horario')).props.children).toMatch(/não informou/);
  });

  it('"Cancelar" só fecha', async () => {
    const { getByText, props } = abrir();
    await act(async () => {});
    fireEvent.press(getByText('Cancelar'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

// Pedido de corte com dia e horário (S26): a mesma barra, mas o modal só
// devolve a escolha — quem pede o corte é a tela.
describe('ScheduleModal — modo corte', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: 'tk' });
    (intentionsService.getPublicAgenda as jest.Mock).mockResolvedValue({ data: { frame: null, blocks: [] } });
    (establishmentService.getHours as jest.Mock).mockResolvedValue({
      data: { configured: true, weekly: [], exceptions: [], upcoming: [{ date: dataISO(amanha()), day: 'MONDAY', closed: false, opens: '09:00', closes: '11:00' }] },
    });
  });

  it('"Assim que abrir" devolve null e fecha, sem agendar', async () => {
    const onEscolher = jest.fn();
    const { getByTestId, getByText, props } = abrir({ corte: { onEscolher } });
    await act(async () => {});
    expect(getByText('Pedir corte')).toBeTruthy();
    expect(getByText('O profissional responde em 5 min.')).toBeTruthy();
    fireEvent.press(getByTestId('corte-assim-que-abrir'));
    expect(onEscolher).toHaveBeenCalledWith(null);
    expect(props.onClose).toHaveBeenCalled();
    expect(intentionsService.create).not.toHaveBeenCalled();
  });

  it('a caixa rola dentro de si e o Cancelar fica dentro dela (cancelar-fora-da-caixa)', async () => {
    const { getByTestId, getByText } = abrir({ corte: { onEscolher: jest.fn() } });
    await act(async () => {});
    expect(getByTestId('agenda-rolagem')).toBeTruthy();
    expect(getByText('Cancelar')).toBeTruthy();
  });

  // cancelar-cortado-no-solicitar (Andre, 18/10): com a rolagem em volta de TUDO, o
  // "Cancelar" ficava abaixo da dobra, cortado na borda da caixa, sem nada que
  // avisasse que dava para rolar. Os botões saem da rolagem e ficam no rodapé da
  // caixa: o que cresce com a fonte do aparelho é o miolo, que rola; os botões
  // aparecem sempre.
  it('"Pedir" e "Cancelar" ficam no rodapé fixo, fora da rolagem', async () => {
    const { getByTestId } = abrir({ corte: { onEscolher: jest.fn() } });
    await act(async () => {});
    const rolagem = within(getByTestId('agenda-rolagem'));
    expect(rolagem.queryByText('Cancelar')).toBeNull();
    expect(rolagem.queryByText('Pedir')).toBeNull();
    expect(rolagem.queryByTestId('confirmar-agendamento')).toBeNull();
    const rodape = within(getByTestId('agenda-rodape'));
    expect(rodape.getByText('Cancelar')).toBeTruthy();
    expect(rodape.getByText('Pedir')).toBeTruthy();
    expect(rodape.getByTestId('confirmar-agendamento')).toBeTruthy();
    // O miolo (título, "Assim que abrir", dias) é o que rola.
    expect(rolagem.getByText('Pedir corte')).toBeTruthy();
    expect(rolagem.getByTestId('corte-assim-que-abrir')).toBeTruthy();
  });

  it('a caixa tem altura MÁXIMA relativa ao espaço da janela, nunca altura cravada (fonte ampliada)', async () => {
    const { getByTestId } = abrir({ corte: { onEscolher: jest.fn() } });
    await act(async () => {});
    const caixa = StyleSheet.flatten(getByTestId('agenda-caixa').props.style);
    expect(caixa.maxHeight).toBe('100%');
    expect(caixa.height).toBeUndefined();
    // O miolo encolhe antes de empurrar o rodapé para fora da caixa.
    const rolagem = StyleSheet.flatten(getByTestId('agenda-rolagem').props.style);
    expect(rolagem.flexShrink).toBe(1);
  });

  it('com dia e horário escolhidos, devolve o horário — sem criar intenção', async () => {
    const onEscolher = jest.fn();
    const { getAllByRole, findByTestId, getByTestId, getByText, props } = abrir({ corte: { onEscolher } });
    await act(async () => {});
    // O 1º botão é o "Assim que abrir"; depois vêm hoje e amanhã.
    fireEvent.press(getAllByRole('button')[2]);
    fireEvent.press(await findByTestId('horario-09:30'));
    // cancelar-fora-da-caixa (CLI-7): o botão diz só "Pedir" — o horário já está escolhido acima.
    expect(getByText('Pedir')).toBeTruthy();
    await act(async () => {
      fireEvent.press(getByTestId('confirmar-agendamento'));
    });
    const [horario] = onEscolher.mock.calls[0] as [Date];
    expect(horario.getHours()).toBe(9);
    expect(horario.getMinutes()).toBe(30);
    expect(props.onClose).toHaveBeenCalled();
    expect(intentionsService.create).not.toHaveBeenCalled();
  });
});

describe('ScheduleModal — o que sobra (cobertura-98)', () => {
  const horas = (dia: Record<string, unknown>) =>
    (establishmentService.getHours as jest.Mock).mockResolvedValue({
      data: { configured: true, weekly: [], exceptions: [], upcoming: [{ date: dataISO(amanha()), day: 'MONDAY', ...dia }] },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: 'tk' });
    (intentionsService.getPublicAgenda as jest.Mock).mockResolvedValue({ data: { frame: null, blocks: [] } });
  });

  it('a loja fechada no dia: diz que não abre', async () => {
    horas({ closed: true, opens: null, closes: null });
    const { getAllByRole, findByText } = abrir();
    await act(async () => {});
    fireEvent.press(getAllByRole('button')[1]);
    expect(await findByText('A loja não abre neste dia.')).toBeTruthy();
  });

  it('o serviço não cabe no dia: diz que não há horário livre', async () => {
    horas({ closed: false, opens: '09:00', closes: '09:30' });
    const { getAllByRole, findByText } = abrir();
    await act(async () => {});
    fireEvent.press(getAllByRole('button')[1]);
    expect(await findByText('Não há horário livre para este serviço neste dia.')).toBeTruthy();
  });

  it('enquanto a agenda e o horário não chegam: "Buscando horários..."; as leituras falhando não quebram', async () => {
    let soltar: (v: unknown) => void = () => {};
    (establishmentService.getHours as jest.Mock).mockReturnValue(new Promise((r) => (soltar = r)));
    (intentionsService.getPublicAgenda as jest.Mock).mockRejectedValue(new Error('x'));
    const { getAllByRole, getByText } = abrir();
    fireEvent.press(getAllByRole('button')[1]);
    expect(getByText('Buscando horários...')).toBeTruthy();
    await act(async () => soltar(Promise.reject(new Error('y'))));
  });

  // Guia de texto, regra 6: "Agendando..." dentro do botão vira o botão
  // desabilitado com o spinner. Sem isso, o rótulo trocava de palavra a cada
  // estado e o toque repetido mandava a intenção duas vezes.
  it('enquanto o servidor responde: o botão fica desabilitado com o spinner, sem "Agendando..." e sem enviar de novo', async () => {
    horas({ closed: false, opens: '09:00', closes: '11:00' });
    (intentionsService.create as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { getAllByRole, findByTestId, getByTestId, queryByText } = abrir();
    await act(async () => {});
    fireEvent.press(getAllByRole('button')[1]);
    fireEvent.press(await findByTestId('horario-09:00'));
    await act(async () => {
      fireEvent.press(getByTestId('confirmar-agendamento'));
    });
    expect(queryByText(/Agendando/)).toBeNull();
    expect(within(getByTestId('confirmar-agendamento')).UNSAFE_queryAllByType(ActivityIndicator).length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.press(getByTestId('confirmar-agendamento'));
    });
    expect(intentionsService.create).toHaveBeenCalledTimes(1);
  });
});

