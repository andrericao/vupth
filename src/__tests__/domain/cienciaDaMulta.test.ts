import { multaSemCiencia } from '@domain/queue/leave';
import { saidaDaFila, avisoDaMultaDoServidor } from '@domain/queue/saidaDaFila';

// Ciencia da multa (Backend 0caf229, em producao desde 26/09): depois da
// tolerancia, sair so com o "Sim" ao valor que o servidor cobra. Sem ele, o
// servidor devolve 409 e o cliente FICA na fila — era o que o app de producao
// fazia com todo mundo, porque nao mandava o valor.

const recusa = (data: object, status = 409) => ({ response: { status, data } });

describe('o 409 da ciência da multa', () => {
  it('devolve o valor que o servidor cobra', () => {
    expect(multaSemCiencia(recusa({ code: 'EXIT_PENALTY_NOT_ACKNOWLEDGED', exitPenaltyValue: 5 }))).toBe(5);
    // BigDecimal pode chegar como texto
    expect(multaSemCiencia(recusa({ code: 'EXIT_PENALTY_NOT_ACKNOWLEDGED', exitPenaltyValue: '3.00' }))).toBe(3);
  });

  it('não é esse erro: outro código, outro status, sem resposta', () => {
    expect(multaSemCiencia(recusa({ code: 'CLIENT_ALREADY_IN_QUEUE', exitPenaltyValue: 5 }))).toBeNull();
    expect(multaSemCiencia(recusa({ code: 'EXIT_PENALTY_NOT_ACKNOWLEDGED', exitPenaltyValue: 5 }, 400))).toBeNull();
    expect(multaSemCiencia(new Error('Network Error'))).toBeNull();
    expect(multaSemCiencia(undefined)).toBeNull();
  });

  it('sem valor legível (ou zero) não inventa multa', () => {
    expect(multaSemCiencia(recusa({ code: 'EXIT_PENALTY_NOT_ACKNOWLEDGED' }))).toBeNull();
    expect(multaSemCiencia(recusa({ code: 'EXIT_PENALTY_NOT_ACKNOWLEDGED', exitPenaltyValue: 0 }))).toBeNull();
    expect(multaSemCiencia(recusa({ code: 'EXIT_PENALTY_NOT_ACKNOWLEDGED', exitPenaltyValue: 'x' }))).toBeNull();
  });
});

describe('o "Sim" leva o valor que a confirmação mostrou', () => {
  it('com multa do servidor: o valor dele', () => {
    expect(saidaDaFila({ multa: true, valor: 5 }).valorConfirmado).toBe(5);
  });

  it('sem valor do servidor: o fixo que a tela mostrou', () => {
    expect(saidaDaFila({ multa: true }).valorConfirmado).toBe(3);
    expect(saidaDaFila({ multa: false, semPrevisao: true }).valorConfirmado).toBe(3);
  });

  it('sem multa não há o que confirmar', () => {
    expect(saidaDaFila({ multa: false }).valorConfirmado).toBeNull();
  });
});

describe('o aviso quando o servidor pede a ciência', () => {
  // Guia de texto §4.1: o corpo é "R$ X de multa no próximo atendimento." e a
  // saída só acontece no "Sair"; "Cancelar" deixa a pessoa na fila.
  it('mostra o valor do servidor; só o "Sair" tira da fila, o "Cancelar" deixa', () => {
    const aviso = avisoDaMultaDoServidor(5);
    expect(aviso.mensagem).toContain('R$ 5,00');
    expect(aviso.sim).toBe('Sair');
    expect(aviso.nao).toBe('Cancelar');
  });
});
