import { janelaSemMulta, textoDaJanela } from '@domain/queue/janelaSemMulta';

// Andre, 20/09: "assim que o cliente entrar deve haver um aviso dizendo que
// pode sair da fila sem multa até determinado horário". A regra é a mesma de
// sempre (menos de 1h para a vez = multa); o que muda é a hora de dizê-la.

const MEIO_DIA = new Date(2026, 8, 20, 12, 0, 0).getTime();

describe('janela sem multa', () => {
  it('com 90 min de espera, a janela vai até 1h antes da previsão', () => {
    // Entrou meio-dia, previsão 13:30 → até 12:30 sair é de graça.
    const janela = janelaSemMulta({
      enteredAt: MEIO_DIA,
      estimatedMinutes: 90,
      restanteMinutos: 90,
    });

    expect(janela).toEqual({ tipo: 'semMulta', ate: '12:30', valor: 3 });
    expect(textoDaJanela(janela)).toMatch(/sem multa até 12:30/);
  });

  it('o limite sai da PREVISÃO, não do relógio: já andando na fila, o horário não se move', () => {
    // Mesma entrada e mesma previsão (13:30); já se passaram 30 min.
    const janela = janelaSemMulta({
      enteredAt: MEIO_DIA,
      estimatedMinutes: 90,
      restanteMinutos: 60,
    });

    expect(janela).toEqual({ tipo: 'semMulta', ate: '12:30', valor: 3 });
  });

  it('dentro da última hora: diz que agora custa, e que a troca não', () => {
    const janela = janelaSemMulta({
      enteredAt: MEIO_DIA,
      estimatedMinutes: 90,
      restanteMinutos: 59,
    });

    expect(janela).toEqual({ tipo: 'comMulta', valor: 3 });
    expect(textoDaJanela(janela)).toMatch(/sair agora custa R\$ 3,00/);
    expect(textoDaJanela(janela)).toMatch(/Trocar de lugar .* sem custo/);
  });

  it('fila curta: quem entra já dentro da hora não recebe promessa de janela', () => {
    const janela = janelaSemMulta({
      enteredAt: MEIO_DIA,
      estimatedMinutes: 20,
      restanteMinutos: 20,
    });

    expect(janela.tipo).toBe('comMulta');
  });

  it('sem previsão não se afirma nada — nem que há janela, nem que acabou', () => {
    expect(
      janelaSemMulta({ enteredAt: MEIO_DIA, estimatedMinutes: null, restanteMinutos: null }).tipo,
    ).toBe('desconhecida');
    expect(
      janelaSemMulta({ enteredAt: null, estimatedMinutes: 90, restanteMinutos: 90 }).tipo,
    ).toBe('desconhecida');
    expect(textoDaJanela({ tipo: 'desconhecida' })).toBeNull();
  });
});
