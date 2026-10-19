import {
  advertenciaDaMulta,
  deveAdvertir,
  limiteDaSaidaGratis,
  LIMIAR_DA_ADVERTENCIA_MINUTOS,
} from '../../domain/queue/advertenciaDaMulta';

// Andre, 03/10: adiar nao da tolerancia nova; em troca, um aviso unico da
// politica quando a espera fica abaixo de 1h30.

describe('deveAdvertir', () => {
  const base = { restante: 80, aguardando: true, jaAdvertido: false };

  it('o limiar é meia hora antes da multa (1h30)', () => {
    expect(LIMIAR_DA_ADVERTENCIA_MINUTOS).toBe(90);
  });

  it('abaixo de 1h30, aguardando e sem aviso ainda → avisa', () => {
    expect(deveAdvertir(base)).toBe(true);
    expect(deveAdvertir({ ...base, restante: 10 })).toBe(true); // entrou já abaixo
  });

  it('com 1h30 ou mais, não avisa', () => {
    expect(deveAdvertir({ ...base, restante: 90 })).toBe(false);
    expect(deveAdvertir({ ...base, restante: 200 })).toBe(false);
  });

  it('uma vez só por atendimento', () => {
    expect(deveAdvertir({ ...base, jaAdvertido: true })).toBe(false);
  });

  it('sem previsão ou fora da espera, não avisa', () => {
    expect(deveAdvertir({ ...base, restante: null })).toBe(false);
    expect(deveAdvertir({ ...base, restante: undefined })).toBe(false);
    expect(deveAdvertir({ ...base, aguardando: false })).toBe(false);
  });
});

// GUIA_DE_TEXTO.md §4.2: de 244 caracteres para uma linha. A HORA substitui as
// faixas de valor — a pessoa não calcula "entre 30 minutos e 1 hora", ela olha o
// relógio. As faixas e os valores ficam no artigo do Suporte.
describe('advertenciaDaMulta', () => {
  const as = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(2026, 9, 18, h, m).getTime();
  };

  it('diz que sair ainda é de graça e a hora em que passa a custar', () => {
    const a = advertenciaDaMulta({ sairCustaAgora: false, podeAdiar: true, gratisAte: as('14:35') });
    expect(a.titulo).toBe('Sua vez está chegando');
    expect(a.mensagem).toBe('Sair agora ainda é de graça. Depois das 14:35, gera multa.');
  });

  it('uma linha: até 70 caracteres, sem as faixas de valor', () => {
    for (const s of [
      { sairCustaAgora: false, podeAdiar: true, gratisAte: as('09:05') },
      { sairCustaAgora: false, podeAdiar: false },
      { sairCustaAgora: true, podeAdiar: true },
    ]) {
      const a = advertenciaDaMulta(s);
      expect(a.mensagem.length).toBeLessThanOrEqual(70);
      expect(a.mensagem).not.toMatch(/R\$|30 minutos/);
    }
  });

  it('botões de uma palavra: Ficar / Adiar / Sair', () => {
    const a = advertenciaDaMulta({ sairCustaAgora: false, podeAdiar: true, gratisAte: as('14:35') });
    expect(a.adiar).toBe('Adiar');
    expect(a.sairDeGraca).toBe('Sair');
    expect(a.ficar).toBe('Ficar');
  });

  it('não promete saída de graça quando sair já custa', () => {
    const a = advertenciaDaMulta({ sairCustaAgora: true, podeAdiar: true });
    expect(a.sairDeGraca).toBeNull();
    expect(a.mensagem).toBe('Sair agora gera multa.');
  });

  it('sem a hora, não inventa uma', () => {
    const a = advertenciaDaMulta({ sairCustaAgora: false, podeAdiar: true });
    expect(a.mensagem).toBe('Sair agora ainda é de graça. Depois, gera multa.');
  });

  it('sem poder adiar, o botão some', () => {
    expect(advertenciaDaMulta({ sairCustaAgora: false, podeAdiar: false }).adiar).toBeNull();
  });
});

describe('limiteDaSaidaGratis', () => {
  const agora = new Date(2026, 9, 18, 14, 0).getTime();
  const min = 60000;

  it('é 1 hora antes da vez: com 75 min de espera, sair é de graça por mais 15 min', () => {
    expect(limiteDaSaidaGratis({ restante: 75, agora })).toBe(agora + 15 * min);
  });

  it('a tolerância do servidor vale se acabar depois do limite de 1 hora', () => {
    expect(limiteDaSaidaGratis({ restante: 75, agora, toleranceUntil: agora + 40 * min })).toBe(agora + 40 * min);
    expect(limiteDaSaidaGratis({ restante: 75, agora, toleranceUntil: agora + 5 * min })).toBe(agora + 15 * min);
  });

  it('já abaixo de 1 hora e sem tolerância, o limite é agora', () => {
    expect(limiteDaSaidaGratis({ restante: 40, agora })).toBe(agora);
    expect(limiteDaSaidaGratis({ restante: 40, agora, toleranceUntil: null })).toBe(agora);
  });
});
