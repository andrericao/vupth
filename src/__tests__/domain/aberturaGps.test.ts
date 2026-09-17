import {
  acaoDoGpsNaAbertura,
  coordsDaLista,
  listaPodeBuscar,
} from '../../domain/location/abertura';

// A lista de lojas era pedida duas ou três vezes por abertura (16/09): a chave
// da consulta leva as coordenadas, e elas mudavam depois da primeira busca.

describe('acaoDoGpsNaAbertura', () => {
  it('antes de ler o que estava salvo, espera — ainda não sabe se já perguntou', () => {
    expect(acaoDoGpsNaAbertura({ hydrated: false, gpsAsked: false, resolved: false })).toBe('esperar');
    expect(acaoDoGpsNaAbertura({ hydrated: false, gpsAsked: true, resolved: true })).toBe('esperar');
  });

  it('primeira abertura pergunta a permissão', () => {
    expect(acaoDoGpsNaAbertura({ hydrated: true, gpsAsked: false, resolved: false })).toBe('perguntar');
  });

  it('quem escolheu o lugar na mão não é perguntado', () => {
    expect(acaoDoGpsNaAbertura({ hydrated: true, gpsAsked: false, resolved: true })).toBe('nada');
  });

  it('já perguntado NUNCA é perguntado de novo — só atualiza a coordenada', () => {
    expect(acaoDoGpsNaAbertura({ hydrated: true, gpsAsked: true, resolved: false })).toBe('atualizar');
    expect(acaoDoGpsNaAbertura({ hydrated: true, gpsAsked: true, resolved: true })).toBe('atualizar');
  });
});

describe('listaPodeBuscar', () => {
  it('só com a localização decidida', () => {
    expect(listaPodeBuscar({ hydrated: false, gpsPending: false })).toBe(false);
    expect(listaPodeBuscar({ hydrated: true, gpsPending: true })).toBe(false);
    expect(listaPodeBuscar({ hydrated: true, gpsPending: false })).toBe(true);
  });
});

describe('coordsDaLista', () => {
  it('sem coordenada, sem coordenada', () => {
    expect(coordsDaLista(null)).toBeNull();
    expect(coordsDaLista(undefined)).toBeNull();
  });

  it('arredonda a 3 casas (~100 m)', () => {
    expect(coordsDaLista({ latitude: -27.59543, longitude: -48.54812 })).toEqual({
      latitude: -27.595,
      longitude: -48.548,
    });
  });

  it('a oscilação do GPS entre leituras não vira chave nova', () => {
    const a = coordsDaLista({ latitude: -27.59541, longitude: -48.54811 });
    const b = coordsDaLista({ latitude: -27.59548, longitude: -48.54794 });
    expect(a).toEqual(b);
  });
});
