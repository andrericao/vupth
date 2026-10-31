import { Alert } from 'react-native';

import { avisarLimiteDeMultas, limiteDeMultasDoErro, mensagemDoLimiteDeMultas } from '@utils/limiteDeMultas';
import { useMultaStore } from '@stores/multaStore';

const erro409 = (data: object, status = 409) => ({ response: { status, data } });

describe('limite de multas (DEC-83)', () => {
  it('só o 409 PENALTY_LIMIT_REACHED conta, com o limite e o total', () => {
    expect(limiteDeMultasDoErro(erro409({ code: 'PENALTY_LIMIT_REACHED', limit: 2, total: '8.00' }))).toEqual({ limite: 2, total: 8 });
    expect(limiteDeMultasDoErro(erro409({ code: 'PENALTY_LIMIT_REACHED' }))).toEqual({ limite: 2, total: 0 });
    expect(limiteDeMultasDoErro(erro409({ code: 'OUTRO' }))).toBeNull();
    expect(limiteDeMultasDoErro(erro409({ code: 'PENALTY_LIMIT_REACHED' }, 422))).toBeNull();
    expect(limiteDeMultasDoErro(undefined)).toBeNull();
  });

  it('a mensagem diz quantas multas e o valor, e pede para pagar', () => {
    expect(mensagemDoLimiteDeMultas(2, 8)).toBe('Você tem 2 multas pendentes (R$ 8,00). Pague para marcar um corte.');
    expect(mensagemDoLimiteDeMultas(2, 0)).toBe('Você tem 2 multas pendentes. Pague para marcar um corte.');
  });

  it('o aviso leva ao "Pagar multa" e devolve true; outro erro não é tratado', () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useMultaStore.getState().fechar();
    expect(avisarLimiteDeMultas(erro409({ code: 'COUPON_NOT_ACTIVE' }))).toBe(false);
    expect(alerta).not.toHaveBeenCalled();
    expect(avisarLimiteDeMultas(erro409({ code: 'PENALTY_LIMIT_REACHED', limit: 2, total: 8 }))).toBe(true);
    const botoes = alerta.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    expect(botoes.map((b) => b.text)).toEqual(['Agora não', 'Pagar multa']);
    botoes[1].onPress!();
    expect(useMultaStore.getState().aberta).toBe(true);
    alerta.mockRestore();
  });
});
