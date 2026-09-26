import { avisoDepoisDoIntervalo, avisoDoReagendamento } from '@domain/queue/horarioPedido';
import { formatClockTime } from '@domain/queue/types';

// Pedido do Client de 03/07, entregue pelo Backend em 26/09 (782db11): o horario
// pedido que cai numa refeicao vai para o fim dela, e a resposta traz
// placedAfterBreak: true com o scheduledTime real.

const DEPOIS_DO_ALMOCO = '2026-09-26T16:00:00Z';
// O relogio do aparelho e quem formata: o esperado sai da mesma funcao, em qualquer fuso.
const HHMM = formatClockTime(new Date(DEPOIS_DO_ALMOCO));

describe('o aviso de horário empurrado para depois do intervalo', () => {
  it('placedAfterBreak: true diz que foi para depois do intervalo, com o horário real', () => {
    const aviso = avisoDepoisDoIntervalo({ placedAfterBreak: true, scheduledTime: DEPOIS_DO_ALMOCO });
    expect(aviso?.titulo).toBe('Horário ajustado');
    expect(aviso?.mensagem).toContain('cai no intervalo do profissional');
    expect(aviso?.mensagem).toContain(`por volta de ${HHMM}`);
  });

  it('sem placedAfterBreak (servidor antigo) ou com false não há aviso', () => {
    expect(avisoDepoisDoIntervalo({ scheduledTime: DEPOIS_DO_ALMOCO })).toBeNull();
    expect(avisoDepoisDoIntervalo({ placedAfterBreak: false, scheduledTime: DEPOIS_DO_ALMOCO })).toBeNull();
    expect(avisoDepoisDoIntervalo({ placedAfterBreak: null, scheduledTime: DEPOIS_DO_ALMOCO })).toBeNull();
  });

  it('sem um scheduledTime legível, avisa sem inventar horário', () => {
    for (const scheduledTime of [undefined, null, '', 'lixo']) {
      const aviso = avisoDepoisDoIntervalo({ placedAfterBreak: true, scheduledTime });
      expect(aviso?.mensagem).toContain('logo depois dele');
      expect(aviso?.mensagem).not.toContain('por volta de');
    }
  });
});

describe('o aviso depois de reagendar', () => {
  it('horário que caiu no intervalo: o aviso do intervalo', () => {
    const aviso = avisoDoReagendamento({ placedAfterBreak: true, scheduledTime: DEPOIS_DO_ALMOCO });
    expect(aviso.titulo).toBe('Horário ajustado');
    expect(aviso.mensagem).toContain(HHMM);
  });

  it('horário mantido: o "Horário reservado" de sempre', () => {
    const aviso = avisoDoReagendamento({ placedAfterBreak: false, scheduledTime: DEPOIS_DO_ALMOCO });
    expect(aviso).toEqual({
      titulo: 'Horário reservado',
      mensagem: 'Você cedeu a vez e será chamado por volta do horário escolhido. Pode variar um pouco.',
    });
  });
});
