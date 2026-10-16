import { Alert } from 'react-native';
import { act, fireEvent } from '@testing-library/react-native';

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

  it('sem horário escolhido, "Confirmar" não agenda', async () => {
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
    expect(getByText('Solicitar corte')).toBeTruthy();
    fireEvent.press(getByTestId('corte-assim-que-abrir'));
    expect(onEscolher).toHaveBeenCalledWith(null);
    expect(props.onClose).toHaveBeenCalled();
    expect(intentionsService.create).not.toHaveBeenCalled();
  });

  it('com dia e horário escolhidos, devolve o horário — sem criar intenção', async () => {
    const onEscolher = jest.fn();
    const { getAllByRole, findByTestId, getByTestId, getByText, props } = abrir({ corte: { onEscolher } });
    await act(async () => {});
    // O 1º botão é o "Assim que abrir"; depois vêm hoje e amanhã.
    fireEvent.press(getAllByRole('button')[2]);
    fireEvent.press(await findByTestId('horario-09:30'));
    expect(getByText('Pedir neste horário')).toBeTruthy();
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
