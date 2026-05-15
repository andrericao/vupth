import { MOCK_ESTABLISHMENTS } from '@domain/establishment/mockData';
import { Establishment, ServiceType } from '@domain/establishment/types';

function filterEstablishments(
  establishments: Establishment[],
  search: string,
  selectedFilter: ServiceType | 'ALL'
): Establishment[] {
  const isSearching = search.trim().length > 0;

  return establishments.filter((e) => {
    const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = selectedFilter === 'ALL' || e.serviceType === selectedFilter;
    const matchesOpen = isSearching || e.open_status === 'OPEN';
    return matchesSearch && matchesFilter && matchesOpen;
  });
}

describe('Home - Filtro de Estabelecimentos', () => {
  it('sem busca deve mostrar apenas abertos', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, '', 'ALL');
    result.forEach((e) => {
      expect(e.open_status).toBe('OPEN');
    });
    expect(result.length).toBeLessThan(MOCK_ESTABLISHMENTS.length);
  });

  it('com busca deve mostrar abertos e fechados', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, 'Nail', 'ALL');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Nail Designer');
    expect(result[0].open_status).toBe('CLOSED');
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

  it('deve filtrar por serviceType BARBER (só abertos)', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, '', 'BARBER');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((e) => {
      expect(e.serviceType).toBe('BARBER');
      expect(e.open_status).toBe('OPEN');
    });
  });

  it('deve combinar busca + filtro', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, 'João', 'BARBER');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Barbearia do João');
  });

  it('deve retornar vazio quando nada corresponde', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, 'inexistente', 'ALL');
    expect(result.length).toBe(0);
  });

  it('deve retornar vazio quando filtro não tem resultados', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, '', 'SPA');
    expect(result.length).toBe(0);
  });
});
