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
  it('aberta e sem fila: "Sem fila" — entra agora, sem esperar', () => {
    expect(statusTag(loja(true, 0))).toEqual({ label: 'Sem fila', live: true });
    expect(statusTag(loja(true, null))).toEqual({ label: 'Sem fila', live: true });
  });

  it('aberta COM fila: o número, NOMEANDO a fila', () => {
    expect(statusTag(loja(true, 120))).toEqual({ label: 'Fila de 2h', live: true });
    expect(statusTag(loja(true, 30)).label).toBe('Fila de 30 min');
  });

  it('cabe na pílula — o pior caso tem 16 caracteres', () => {
    // "Fila de 1h 30min" é o mais largo que a regra consegue produzir, contra
    // 8 de "Agendar". Se o formato de tempo crescer, este teste avisa antes de
    // a pílula estourar a linha.
    const maiores = [90, 200, 359].map((m) => statusTag(loja(true, m)).label);
    maiores.forEach((l) => expect(l.length).toBeLessThanOrEqual(16));
  });

  it('as duas respostas abertas nomeiam a MESMA coisa — não dependem de contraste', () => {
    // "~2h" sozinho não diz de quê (horário? deslocamento? duração?), e
    // "Livre" tem o mesmo problema pelo outro lado. Nomear a fila nas duas
    // faz cada uma se explicar na primeira leitura, sem ver a outra.
    expect(statusTag(loja(true, 0)).label).toMatch(/fila/i);
    expect(statusTag(loja(true, 90)).label).toMatch(/fila/i);
  });

  it('fechada: Agendar, e NUNCA `live`', () => {
    // `live` é o que acende o acento e faz o ponto piscar. Loja fechada não
    // pode carregar nenhum dos dois — piscar ali sinaliza movimento que não
    // existe, e o verde diria "pode ir agora" para quem não pode.
    expect(statusTag(loja(false, null))).toEqual({ label: 'Agendar', live: false });
    // Mesmo com espera vinda do backend, fechada é fechada.
    expect(statusTag(loja(false, 45))).toEqual({ label: 'Agendar', live: false });
  });

  it('a tag NUNCA repete a linha: ou diz "Sem fila", ou diz o tempo', () => {
    // A linha não repete a espera: ou a tag diz "Sem fila", ou diz o tempo.
    expect(statusTag(loja(true, 90)).label).toMatch(/\d/);
    expect(statusTag(loja(true, 0)).label).not.toMatch(/\d/);
  });
});
