import { avisoDeChegada } from '@domain/queue/avisoDeChegada';

// aviso-de-chegada-na-entrada (André, 22/10): "Esteja na loja às [agora + espera − 5 min]".
const AGORA = new Date(2026, 9, 22, 14, 0, 0).getTime();

describe('avisoDeChegada', () => {
  it('com menos de 1 h: o horário é agora + a espera − 5 min', () => {
    const a = avisoDeChegada(40, AGORA)!;
    expect(a.mensagem).toBe('Esteja na loja às 14:35.');
    expect(a.titulo).toBe('Esteja na loja');
    expect([a.confirmar, a.cancelar]).toEqual(['Confirmar', 'Cancelar']);
  });

  it('com 5 min ou menos, o horário é agora (nunca no passado)', () => {
    expect(avisoDeChegada(3, AGORA)!.mensagem).toBe('Esteja na loja às 14:00.');
    expect(avisoDeChegada(0, AGORA)!.mensagem).toBe('Esteja na loja às 14:00.');
    expect(avisoDeChegada(-10, AGORA)!.mensagem).toBe('Esteja na loja às 14:00.');
  });

  it('fila livre: só "Esteja na loja em 5 minutos", sem horário (modal-sem-fila-5-minutos)', () => {
    const a = avisoDeChegada(0, AGORA, { filaLivre: true })!;
    expect(a.mensagem).toBe('Esteja na loja em 5 minutos.');
    expect(a.titulo).toBe('Esteja na loja');
    expect(avisoDeChegada(0, AGORA, { filaLivre: false })!.mensagem).toBe('Esteja na loja às 14:00.');
    expect(avisoDeChegada(null, AGORA, { filaLivre: true })).toBeNull();
  });

  it('1 hora ou mais, sem estimativa ou valor inválido: sem aviso', () => {
    expect(avisoDeChegada(60, AGORA)).toBeNull();
    expect(avisoDeChegada(120, AGORA)).toBeNull();
    expect(avisoDeChegada(null, AGORA)).toBeNull();
    expect(avisoDeChegada(undefined, AGORA)).toBeNull();
    expect(avisoDeChegada(NaN, AGORA)).toBeNull();
  });
});
