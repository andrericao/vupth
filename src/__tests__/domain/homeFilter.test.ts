import { MOCK_ESTABLISHMENTS } from '@domain/establishment/mockData';
import { Establishment } from '@domain/establishment/types';
import { filterEstablishments, sortEstablishments } from '@domain/establishment/filter';

describe('Home - Filtro de Estabelecimentos', () => {
  it('sem busca deve mostrar abertos E fechados (cliente pode manifestar interesse)', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, '', 'ALL');
    const statuses = new Set(result.map((e) => e.open_status));
    expect(statuses.has('OPEN')).toBe(true);
    expect(statuses.has('CLOSED')).toBe(true);
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

  it('deve filtrar por serviceType BARBER', () => {
    const result = filterEstablishments(MOCK_ESTABLISHMENTS, '', 'BARBER');
    expect(result.length).toBeGreaterThan(0);
    result.forEach((e) => {
      expect(e.serviceType).toBe('BARBER');
    });
  });

  it('mostra estabelecimento fechado mesmo sem wait (null) — cliente manifesta interesse', () => {
    const fechadoSemWait: Establishment = {
      ...MOCK_ESTABLISHMENTS[0],
      id: 'fechado-null',
      name: 'Loja Fechada',
      open_status: 'CLOSED',
      estimated_wait_minutes: null,
    };
    const result = filterEstablishments([fechadoSemWait], '', 'ALL');
    expect(result.map((e) => e.id)).toEqual(['fechado-null']);
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

describe('sortEstablishments', () => {
  const make = (id: string, wait: number | null, best?: number): Establishment => ({
    ...MOCK_ESTABLISHMENTS[0],
    id,
    estimated_wait_minutes: wait,
    rating_best: best ?? null,
  });

  it('ordena por menor tempo de espera primeiro', () => {
    const out = sortEstablishments([make('c', 30), make('a', 5), make('b', 10)]);
    expect(out.map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('no empate de tempo, o mais bem avaliado (maior estrela) vem antes', () => {
    const out = sortEstablishments([
      make('baixa', 10, 4.1),
      make('alta', 10, 4.9),
      make('media', 10, 4.5),
    ]);
    expect(out.map((e) => e.id)).toEqual(['alta', 'media', 'baixa']);
  });

  it('estabelecimentos sem disponibilidade (null) vão por último', () => {
    const out = sortEstablishments([make('sem', null, 5), make('com', 20, 4)]);
    expect(out.map((e) => e.id)).toEqual(['com', 'sem']);
  });
});
