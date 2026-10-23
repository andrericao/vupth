import { detalhesDaCampanha } from '@domain/campanha/detalhes';

describe('detalhesDaCampanha', () => {
  it('descrição, código, validade e vagas, uma por linha', () => {
    const t = detalhesDaCampanha({
      id: 'c', description: 'Indique e ganhe.', code: 'VUPTH10', ends_at: '2026-11-05T15:00:00Z', remaining_slots: 3,
    });
    const linhas = t.split('\n');
    expect(linhas[0]).toBe('Indique e ganhe.');
    expect(linhas[1]).toBe('Código: VUPTH10');
    expect(linhas[2]).toMatch(/^Vale até \d{2}\/11\.$/);
    expect(linhas[3]).toBe('Restam 3 vagas.');
  });
  it('sem descrição usa o benefício; uma vaga no singular', () => {
    expect(detalhesDaCampanha({ id: 'c', benefit: 'Corte grátis', remaining_slots: 1 })).toBe('Corte grátis\nResta 1 vaga.');
  });
  it('vazia e data inválida não quebram', () => {
    expect(detalhesDaCampanha({ id: 'c', ends_at: 'x' })).toBe('');
  });
});
