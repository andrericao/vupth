import { MOCK_ESTABLISHMENTS } from '@domain/establishment/mockData';
import { Establishment, OpenStatus } from '@domain/establishment/types';

type StatusFilter = OpenStatus | 'ALL';

function filterEstablishments(
  establishments: Establishment[],
  search: string,
  selectedFilter: StatusFilter
): Establishment[] {
  return establishments.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = selectedFilter === 'ALL' || e.open_status === selectedFilter;
    return matchesSearch && matchesFilter;
  });
}

describe('Home - Filtro de Estabelecimentos', () => {
  it('deve retornar todos quando filtro é ALL e busca vazia', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, '', 'ALL');
    expect(result.length).toBe(MOCK_ESTABLISHMENTS.length);
  });

  it('deve filtrar por nome (case insensitive)', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, 'barbearia', 'ALL');
    result.forEach((e) => {
      expect(e.name.toLowerCase()).toContain('barbearia');
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it('deve filtrar por nome parcial', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, 'Top', 'ALL');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Barbearia Top');
  });

  it('deve filtrar por open_status OPEN', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, '', 'OPEN');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((e) => {
      expect(e.open_status).toBe('OPEN');
    });
  });

  it('deve filtrar por open_status CLOSED', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, '', 'CLOSED');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((e) => {
      expect(e.open_status).toBe('CLOSED');
    });
  });

  it('deve combinar busca + filtro', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, 'Nail', 'CLOSED');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Nail Designer');
  });

  it('deve retornar vazio quando nada corresponde', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, 'inexistente', 'ALL');
    expect(result.length).toBe(0);
  });

  it('busca não deve afetar quando filtro já exclui tudo', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, 'Barbearia', 'CLOSED');
    expect(result.length).toBe(0);
  });
});
