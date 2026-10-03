import {
  advertenciaDaMulta,
  deveAdvertir,
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

describe('advertenciaDaMulta', () => {
  it('diz as três faixas da política', () => {
    const a = advertenciaDaMulta({ sairCustaAgora: false, podeAdiar: true });
    expect(a.mensagem).toMatch(/de graça com 1 hora ou mais/);
    expect(a.mensagem).toMatch(/Entre 30 minutos e 1 hora.*R\$ 3,00/);
    expect(a.mensagem).toMatch(/30 minutos ou menos, R\$ 5,00/);
  });

  it('oferece adiar e sair de graça quando os dois valem', () => {
    const a = advertenciaDaMulta({ sairCustaAgora: false, podeAdiar: true });
    expect(a.adiar).toBe('Adiar minha vez');
    expect(a.sairDeGraca).toBe('Sair agora de graça');
    expect(a.ficar).toBe('Continuar na fila');
  });

  it('não promete saída de graça quando sair já custa', () => {
    expect(advertenciaDaMulta({ sairCustaAgora: true, podeAdiar: true }).sairDeGraca).toBeNull();
  });

  it('sem poder adiar, o botão some', () => {
    expect(advertenciaDaMulta({ sairCustaAgora: false, podeAdiar: false }).adiar).toBeNull();
  });
});
