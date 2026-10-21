import {
  desfechoDoPedido,
  pedidoDaResposta,
  avisoDoPedidoEnviado,
  avisoDoPedidoNaoAceito,
  FOLGA_DO_PRAZO_MS,
  PedidoDeCorte,
} from '@domain/queue/pedidoDeCorte';
import { ClientAttendance } from '@services/attendanceService';

// Teste do Andre de 25/09: "o cliente não sabe se a solicitação de corte foi
// aceita ou não, nem por notificação e nem por aviso no app — o atendimento
// nem aparece na fila".

const CRIADO = Date.parse('2026-09-25T20:00:00Z');
const pedido: PedidoDeCorte = {
  id: 'cr1',
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  establishmentName: 'Barbearia',
  criadoEm: CRIADO,
  expiraEm: CRIADO + 5 * 60_000,
};

const att = (over: Partial<ClientAttendance>) =>
  ({ id: 'a1', professionalId: 'p1', status: 'SCHEDULED', scheduledTime: '2026-09-25T20:02:00Z', ...over }) as ClientAttendance;

describe('o desfecho do pedido de corte', () => {
  it('atendimento vivo com o profissional do pedido = aceito', () => {
    const d = desfechoDoPedido(pedido, [att({})], CRIADO + 60_000);
    expect(d.tipo).toBe('aceito');
  });

  it('atendimento ENCERRADO com o mesmo profissional não conta como aceite', () => {
    const hist = [att({ status: 'FINISHED' }), att({ id: 'a2', status: 'CANCELLED' })];
    expect(desfechoDoPedido(pedido, hist, CRIADO + 60_000).tipo).toBe('aguardando');
  });

  it('atendimento vivo com OUTRO profissional não conta', () => {
    expect(desfechoDoPedido(pedido, [att({ professionalId: 'p2' })], CRIADO + 60_000).tipo).toBe('aguardando');
  });

  it('passado o prazo e a folga sem atendimento: sem resposta', () => {
    expect(desfechoDoPedido(pedido, [], pedido.expiraEm! + FOLGA_DO_PRAZO_MS - 1).tipo).toBe('aguardando');
    expect(desfechoDoPedido(pedido, [], pedido.expiraEm! + FOLGA_DO_PRAZO_MS + 1).tipo).toBe('sem_resposta');
  });

  it('o aceite ganha do prazo: chegou tarde, ainda é aceito', () => {
    expect(desfechoDoPedido(pedido, [att({})], pedido.expiraEm! + 10 * 60_000).tipo).toBe('aceito');
  });
});

describe('o pedido a partir da resposta do servidor', () => {
  const ctx = { professionalId: 'p1', professionalName: 'Carlos', establishmentId: 'e1', establishmentName: 'Barbearia' };

  it('usa o created_at e o expires_at do servidor', () => {
    const p = pedidoDaResposta(
      { id: 'cr1', created_at: '2026-09-25T20:00:00Z', expires_at: '2026-09-25T20:05:00Z' },
      ctx,
      0,
    );
    expect(p.criadoEm).toBe(CRIADO);
    expect(p.expiraEm).toBe(CRIADO + 5 * 60_000);
  });

  it('sem expires_at (backend anterior), vale o contrato antigo: 5 minutos a partir de agora', () => {
    const p = pedidoDaResposta({ id: 'cr1', created_at: null }, ctx, CRIADO);
    expect(p.expiraEm).toBe(CRIADO + 5 * 60_000);
  });

  it('expires_at nulo (DEC-27, pedido para outro dia): sem prazo, nunca vira "sem resposta"', () => {
    const p = pedidoDaResposta({ id: 'cr1', created_at: null, expires_at: null }, ctx, CRIADO);
    expect(p.expiraEm).toBeNull();
    expect(desfechoDoPedido(p, [], CRIADO + 3 * 24 * 3_600_000).tipo).toBe('aguardando');
  });
});

// GUIA_DE_TEXTO.md §4.6: o aviso do pedido enviado e o do pedido que venceu.
describe('avisoDoPedidoEnviado', () => {
  const hhmm = (ms: number) => {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  it('diz quem responde e ATÉ QUANDO (a hora, não "5 minutos")', () => {
    const expiraEm = new Date(2026, 9, 18, 14, 35).getTime();
    const aviso = avisoDoPedidoEnviado({ professionalName: 'Ana', expiraEm });
    expect(aviso).toEqual({ titulo: 'Pedido enviado', mensagem: `Ana responde até ${hhmm(expiraEm)}.` });
    expect(aviso.mensagem).toBe('Ana responde até 14:35.');
    expect(aviso.mensagem.length).toBeLessThanOrEqual(70);
  });

  it('sem o nome do profissional, diz "O profissional"', () => {
    const expiraEm = new Date(2026, 9, 18, 9, 5).getTime();
    expect(avisoDoPedidoEnviado({ professionalName: '', expiraEm }).mensagem).toBe('O profissional responde até 09:05.');
  });

  it('pedido para outro dia não tem prazo: o profissional decide quando abrir a agenda', () => {
    expect(avisoDoPedidoEnviado({ professionalName: 'Ana', expiraEm: null }).mensagem).toBe(
      'Ana responde quando abrir a agenda desse dia.',
    );
  });

  it('com o horário escolhido, repete o que a pessoa pediu', () => {
    const expiraEm = new Date(2026, 9, 18, 14, 35).getTime();
    expect(avisoDoPedidoEnviado({ professionalName: 'Ana', expiraEm }, 'amanhã às 09:30').mensagem).toBe(
      'Você pediu para amanhã às 09:30. Ana responde até 14:35.',
    );
  });
});

describe('avisoDoPedidoNaoAceito', () => {
  it('título que diz o fato, uma linha de corpo e os dois caminhos', () => {
    expect(avisoDoPedidoNaoAceito({ professionalName: 'Ana' })).toEqual({
      titulo: 'Pedido não aceito',
      mensagem: 'Ana não respondeu a tempo.',
      escolherOutro: 'Escolher outro',
      agendar: 'Agendar',
    });
    expect(avisoDoPedidoNaoAceito({ professionalName: '' }).mensagem).toBe('O profissional não respondeu a tempo.');
  });
});
