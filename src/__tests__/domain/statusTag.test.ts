import { statusTag } from '@domain/establishment/statusTag';

const loja = (aberta: boolean, espera: number | null): any => ({
  id: 'x', name: 'X', status: 'ACTIVE',
  is_open: aberta, open_status: aberta ? 'OPEN' : 'CLOSED',
  estimated_wait_minutes: espera,
});

// A tag responde UMA pergunta: posso ir agora? Antes eram duas palavras que
// não carregavam a diferença — "Livre" (sem fila) e "Aberto" (com fila) —,
// pintadas iguais, repetindo o que a linha já dizia.
describe('a tag de status diz o que a pessoa faria com a informação', () => {
  it('aberta e sem fila: Livre — entra agora, sem esperar', () => {
    expect(statusTag(loja(true, 0))).toEqual({ label: 'Livre', live: true });
    expect(statusTag(loja(true, null))).toEqual({ label: 'Livre', live: true });
  });

  it('aberta COM fila: o número, não a palavra vaga', () => {
    // "Aberto" não dizia que havia fila. O tempo diz, e é acionável.
    expect(statusTag(loja(true, 120))).toEqual({ label: '~2h', live: true });
    expect(statusTag(loja(true, 30)).label).toBe('~30 min');
  });

  it('fechada: Agendar, e NUNCA `live`', () => {
    // `live` é o que acende o acento e faz o ponto piscar. Loja fechada não
    // pode carregar nenhum dos dois — piscar ali sinaliza movimento que não
    // existe, e o verde diria "pode ir agora" para quem não pode.
    expect(statusTag(loja(false, null))).toEqual({ label: 'Agendar', live: false });
    // Mesmo com espera vinda do backend, fechada é fechada.
    expect(statusTag(loja(false, 45))).toEqual({ label: 'Agendar', live: false });
  });

  it('a tag NUNCA repete a linha: ou diz Livre, ou diz o tempo — nunca os dois', () => {
    const comFila = statusTag(loja(true, 90));
    expect(comFila.label).not.toContain('Livre');
    expect(statusTag(loja(true, 0)).label).not.toMatch(/\d/);
  });
});
