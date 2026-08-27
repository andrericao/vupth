import { MOCK_ESTABLISHMENTS } from '@domain/establishment/mockData';
import { Establishment } from '@domain/establishment/types';
import {
  proximityRank,
  sortByProximity,
  formatDistanceKm,
  orderForHome,
} from '@domain/establishment/proximity';

function withAddr(
  id: string,
  city: string,
  neighborhood: string,
  wait: number | null,
  state = 'SC',
): Establishment {
  return {
    ...MOCK_ESTABLISHMENTS[0],
    id,
    open_status: 'OPEN',
    is_open: true,
    estimated_wait_minutes: wait,
    address: {
      street: 'R. X',
      number: '1',
      neighborhood,
      city,
      state,
      zipCode: '00000-000',
    },
  };
}

describe('proximityRank', () => {
  const loc = { city: 'Florianópolis', neighborhood: 'Centro', state: 'SC' };

  it('0 = mesmo bairro+cidade (acento/caixa ignorados)', () => {
    expect(proximityRank(withAddr('a', 'FLORIANOPOLIS', 'centro', 10), loc)).toBe(0);
  });
  it('1 = mesma cidade, bairro diferente', () => {
    expect(proximityRank(withAddr('b', 'Florianópolis', 'Trindade', 10), loc)).toBe(1);
  });
  it('2 = outra cidade', () => {
    expect(proximityRank(withAddr('c', 'Fortaleza', 'Centro', 10, 'CE'), loc)).toBe(2);
  });
  it('2 = mesma cidade mas UF diferente (homônimas)', () => {
    expect(proximityRank(withAddr('d', 'Florianópolis', 'Centro', 10, 'RS'), loc)).toBe(2);
  });
  it('2 = sem endereço', () => {
    const noAddr = { ...MOCK_ESTABLISHMENTS[0], id: 'e', address: undefined };
    expect(proximityRank(noAddr, loc)).toBe(2);
  });
});

describe('sortByProximity', () => {
  it('bairro → cidade → resto; dentro da faixa, menor espera primeiro', () => {
    const list = [
      withAddr('outra', 'Fortaleza', 'Centro', 5, 'CE'), // faixa 2
      withAddr('cidade-lenta', 'Florianópolis', 'Trindade', 40), // faixa 1
      withAddr('bairro', 'Florianópolis', 'Centro', 30), // faixa 0
      withAddr('cidade-rapida', 'Florianópolis', 'Agronômica', 10), // faixa 1
    ];
    const out = sortByProximity(list, { city: 'Florianópolis', neighborhood: 'Centro', state: 'SC' });
    // faixa 0 (bairro), depois faixa 1 ordenada por espera (10 antes de 40), depois faixa 2
    expect(out.map((e) => e.id)).toEqual(['bairro', 'cidade-rapida', 'cidade-lenta', 'outra']);
  });

  it('sem localização → ordem padrão (menor espera)', () => {
    const list = [withAddr('lenta', 'X', 'Y', 30), withAddr('rapida', 'X', 'Y', 5)];
    expect(sortByProximity(list, null).map((e) => e.id)).toEqual(['rapida', 'lenta']);
  });

  it('cidade vazia → ordem padrão', () => {
    const list = [withAddr('a', 'X', 'Y', 20)];
    expect(sortByProximity(list, { city: '' }).map((e) => e.id)).toEqual(['a']);
  });
});

// ─── Distância real (GPS) — o cálculo é do BACKEND desde 2026-08-06 ──────────

// Coordenada real só para montar cenários de ordenação; a distância em si não é
// mais calculada aqui.
const SAO_PAULO = { latitude: -23.5505, longitude: -46.6333 };

function withCoords(id: string, latitude: number, longitude: number, wait = 10): Establishment {
  const base = withAddr(id, 'Florianópolis', 'Centro', wait);
  return { ...base, address: { ...base.address!, latitude, longitude } };
}

describe('distância real (GPS) — quem calcula é o BACKEND', () => {
  // O Haversine local foi REMOVIDO em 2026-08-06. O backend devolve
  // `distance_km` por item quando a busca manda lat/lng, e o contrato dele é
  // explícito: o front não recalcula — senão client e partner mostrariam
  // números diferentes para a mesma loja.

  describe('formatDistanceKm', () => {
    it('abaixo de 1 km vira metros arredondados a 50', () => {
      expect(formatDistanceKm(0.32)).toBe('300 m');
      expect(formatDistanceKm(0.87)).toBe('850 m');
    });

    it('nunca mostra menos de 50 m (precisão do GPS)', () => {
      expect(formatDistanceKm(0.004)).toBe('50 m');
    });

    it('até 10 km usa uma casa decimal com vírgula', () => {
      expect(formatDistanceKm(2.34)).toBe('2,3 km');
    });

    it('acima de 10 km arredonda para inteiro', () => {
      expect(formatDistanceKm(12.6)).toBe('13 km');
    });
  });

  describe('orderForHome — favoritos', () => {
    const lista = [
      withCoords('a', -27.5, -48.5),
      withCoords('b', -27.6, -48.6),
      withCoords('c', -27.7, -48.7),
    ];

    it('sobe os favoritos ao topo', () => {
      const r = orderForHome(lista, true, null, ['c']);
      expect(r.map((e) => e.id)).toEqual(['c', 'a', 'b']);
    });

    it('a particao e ESTAVEL — dentro de cada grupo a ordem original fica', () => {
      const r = orderForHome(lista, true, null, ['c', 'a']);
      expect(r.map((e) => e.id)).toEqual(['a', 'c', 'b']);
    });

    it('sem favorito devolve a ordem intocada', () => {
      const r = orderForHome(lista, true, null, []);
      expect(r.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    });

    it('favorito que nao esta na lista e ignorado', () => {
      const r = orderForHome(lista, true, null, ['inexistente']);
      expect(r.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('orderForHome', () => {
    it('COM GPS devolve a lista intocada — a ordem é a do backend', () => {
      // Decisão do Andre (2026-08-06): distância pura. Reordenar aqui desfaria
      // o desempate estável por id que o backend faz.
      const list = [
        withCoords('longe', SAO_PAULO.latitude, SAO_PAULO.longitude),
        withCoords('perto', -27.5964, -48.549),
      ];
      expect(orderForHome(list, true, null).map((e) => e.id)).toEqual(['longe', 'perto']);
    });

    it('COM GPS não separa loja fechada — ela some do topo só se estiver longe', () => {
      const fechada = { ...withCoords('fechada-perto', -27.5964, -48.549), is_open: false };
      const list = [fechada, withCoords('aberta-longe', SAO_PAULO.latitude, SAO_PAULO.longitude)];

      expect(orderForHome(list, true, null).map((e) => e.id)).toEqual([
        'fechada-perto',
        'aberta-longe',
      ]);
    });

    it('SEM GPS cai na ordenação por bairro/cidade (Fase 1)', () => {
      const list = [
        withAddr('outra-cidade', 'Fortaleza', 'Centro', 5, 'CE'),
        withAddr('meu-bairro', 'Florianópolis', 'Centro', 30),
      ];
      const out = orderForHome(list, false, {
        city: 'Florianópolis',
        neighborhood: 'Centro',
        state: 'SC',
      });
      expect(out.map((e) => e.id)).toEqual(['meu-bairro', 'outra-cidade']);
    });
  });
});
