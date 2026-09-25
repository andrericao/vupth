import { filaEncerrada, saiuSemAtendimento } from '@domain/queue/types';
import { estaAtivo } from '@domain/queue/reconciliar';
import { atendimentoNaFilaDoProfissional } from '@domain/queue/entrarNaFila';

// Contrato novo do backend (decisão do Andre de 18/09): o status REMOVED é a
// LOJA tirando o cliente da fila; o CANCELLED passa a ser só o cliente
// desistindo. O backend segurou o deploy esperando os fronts aceitarem o valor.

describe('status REMOVED — a loja tirou o cliente da fila', () => {
  it('é um fim sem atendimento, como o CANCELLED — é o que limpa a fila do aparelho', () => {
    // Sem isto o poll do useQueueCountdown só reconhecia CANCELLED, e o cliente
    // retirado pela loja continuaria "na fila" no app para sempre.
    expect(saiuSemAtendimento('REMOVED')).toBe(true);
    expect(saiuSemAtendimento('CANCELLED')).toBe(true);
  });

  it('FINISHED encerra a fila mas NÃO é saída sem atendimento — ele vira a tela de concluído', () => {
    expect(saiuSemAtendimento('FINISHED')).toBe(false);
    expect(filaEncerrada('FINISHED')).toBe(true);
  });

  it('fila guardada como REMOVED não bloqueia atendimento novo', () => {
    expect(filaEncerrada('REMOVED')).toBe(true);
  });

  it('os status vivos seguem vivos', () => {
    for (const vivo of ['SCHEDULED', 'LATE', 'IN_PROGRESS', 'PAUSED']) {
      expect(saiuSemAtendimento(vivo)).toBe(false);
      expect(filaEncerrada(vivo)).toBe(false);
    }
  });

  it('atrasado (LATE) NÃO está encerrado — não vai para os realizados', () => {
    // Teste do Andre de 25/09: o atendimento atrasado aparecia entre os
    // realizados com o selo "Atrasado", como se tivesse acabado.
    expect(filaEncerrada('LATE')).toBe(false);
  });

  it('REMOVED não reconstrói a fila a partir do histórico do servidor', () => {
    expect(estaAtivo('REMOVED')).toBe(false);
  });

  it('REMOVED não conta como "você já está na fila deste profissional"', () => {
    const historico = [{ id: 'a1', professionalId: 'p1', status: 'REMOVED' }];
    expect(atendimentoNaFilaDoProfissional(historico, 'p1')).toBeNull();
  });
});
