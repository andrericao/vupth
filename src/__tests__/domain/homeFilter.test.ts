import { MOCK_ESTABLISHMENTS } from '@domain/establishment/mockData';
import { Establishment } from '@domain/establishment/types';
import { filterEstablishments } from '@domain/establishment/filter';

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

  it('esconde estabelecimentos sem profissional (estimated_wait_minutes === null)', () => {
    const semProf: Establishment = {
      ...MOCK_ESTABLISHMENTS[0],
      id: 'sem-prof',
      name: 'Loja Sem Profissional',
      open_status: 'OPEN',
      estimated_wait_minutes: null,
    };
    const comProf: Establishment = {
      ...MOCK_ESTABLISHMENTS[0],
      id: 'com-prof',
      name: 'Loja Com Profissional',
      open_status: 'OPEN',
      estimated_wait_minutes: 10,
    };

    const result = filterEstablishments([semProf, comProf], '', 'ALL');
    expect(result.map((e) => e.id)).toEqual(['com-prof']);
  });

  it('mantém estabelecimentos com estimated_wait_minutes undefined (mocks/legado)', () => {
    // MOCK_ESTABLISHMENTS não definem o campo -> não devem ser escondidos
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, '', 'ALL');
    expect(result.length).toBeGreaterThan(0);
  });
});
