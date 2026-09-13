import { atendimentoAtivo, estaAtivo, filaDoAtendimento } from '@domain/queue/reconciliar';
import { ClientAttendance } from '@services/attendanceService';

// O defeito que isto conserta (08/09, confirmado em 09/09): o cliente entrava
// na fila por ACEITE DE PEDIDO DE CORTE e o app dele nao mostrava nada. A fila
// local so nascia quando ele mesmo entrava pela tela — quando o atendimento
// nascia do outro lado, o servidor sabia e o aparelho nunca ficava sabendo.
//
// E nao era so a tela sumir: sem `activeQueue` some o countdown, o aviso da vez
// e o botao de SAIR. O cliente ficava numa fila real, visivel pro profissional,
// sem nenhuma forma de sair dela.

function att(over: Partial<ClientAttendance> = {}): ClientAttendance {
  return {
    id: 'a1',
    clientId: 'c1',
    clientName: 'Cliente',
    professionalId: 'p1',
    professionalName: 'Ana',
    establishmentId: 'e1',
    services: [],
    status: 'SCHEDULED',
    totalValue: 0,
    scheduledTime: '2026-09-12T10:00:00Z',
    startTime: null,
    endTime: null,
    durationInMinutes: null,
    ...over,
  };
}

describe('quais atendimentos põem o cliente na fila', () => {
  it('esperando, em atendimento e pausado contam', () => {
    expect(estaAtivo('SCHEDULED')).toBe(true);
    expect(estaAtivo('IN_PROGRESS')).toBe(true);
    // Pausado conta: o cliente esta na cadeira, o corte so parou.
    expect(estaAtivo('PAUSED')).toBe(true);
  });

  it('encerrado e cancelado NAO contam', () => {
    expect(estaAtivo('FINISHED')).toBe(false);
    expect(estaAtivo('CANCELLED')).toBe(false);
  });

  it('histórico só com encerrados não reconstrói fila nenhuma', () => {
    // Este era o estado de quem tinha atendimentos antigos: a tela mostrava os
    // realizados e nada mais. Reconstruir fila a partir deles seria pior.
    const hist = [att({ status: 'FINISHED' }), att({ id: 'a2', status: 'CANCELLED' })];
    expect(atendimentoAtivo(hist)).toBeNull();
  });

  it('acha o ativo no meio dos encerrados', () => {
    const hist = [att({ status: 'FINISHED' }), att({ id: 'vivo', status: 'SCHEDULED' })];
    expect(atendimentoAtivo(hist)?.id).toBe('vivo');
  });

  it('com mais de um ativo, fica com o MAIS RECENTE', () => {
    // Nao deveria acontecer, mas o app nao pode quebrar por isso — e o mais
    // antigo provavelmente e residuo.
    const hist = [
      att({ id: 'velho', scheduledTime: '2026-09-12T08:00:00Z' }),
      att({ id: 'novo', scheduledTime: '2026-09-12T11:00:00Z' }),
    ];
    expect(atendimentoAtivo(hist)?.id).toBe('novo');
  });

  it('histórico vazio não quebra', () => {
    expect(atendimentoAtivo([])).toBeNull();
  });
});

describe('o estado montado a partir do servidor', () => {
  it('traz o attendanceId — sem ele não há como SAIR da fila', () => {
    // Era o pior sintoma: o cliente via (ou nao via) a fila e nao tinha botao.
    expect(filaDoAtendimento(att()).attendanceId).toBe('a1');
  });

  it('NÃO inventa estimativa nem posição — o poll busca as reais', () => {
    const fila = filaDoAtendimento(att());
    expect(fila.estimatedMinutes).toBe(0);
    expect(fila.position).toBeUndefined();
    // Chutar um numero mostraria uma previsao inventada por alguns segundos,
    // que e pior do que nao mostrar.
    expect(fila.initialPosition).toBeUndefined();
  });

  it('em atendimento, guarda o início real para o cronômetro', () => {
    const fila = filaDoAtendimento(
      att({ status: 'IN_PROGRESS', startTime: '2026-09-12T10:30:00Z' }),
    );
    expect(fila.startedAt).toBe(Date.parse('2026-09-12T10:30:00Z'));
  });

  it('esperando, não tem início — o cronômetro não deve correr', () => {
    expect(filaDoAtendimento(att({ status: 'SCHEDULED' })).startedAt).toBeUndefined();
  });

  it('soma a duração dos serviços quando vem', () => {
    const fila = filaDoAtendimento(
      att({ services: [{ estimatedMinutes: 30 }, { estimatedMinutes: 15 }] as never }),
    );
    expect(fila.serviceMinutes).toBe(45);
  });

  it('sem o nome da loja, monta assim mesmo — a tela sabe se virar', () => {
    // O historico nao traz esse campo. Falhar aqui deixaria o cliente sem fila
    // por causa de um rotulo.
    expect(filaDoAtendimento(att()).establishmentName).toBe('');
    expect(filaDoAtendimento(att(), 'Barbearia X').establishmentName).toBe('Barbearia X');
  });

  it('scheduledTime inválido não gera data quebrada', () => {
    const fila = filaDoAtendimento(att({ scheduledTime: 'nao-e-data' }));
    expect(Number.isNaN(fila.enteredAt)).toBe(false);
  });
});
