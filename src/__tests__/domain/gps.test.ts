import {
  toUserLocation,
  acquireDeviceLocation,
  LocationProviders,
} from '@domain/location/gps';

const coords = { latitude: -27.5954, longitude: -48.548 };

function providers(over: Partial<LocationProviders> = {}): LocationProviders {
  return {
    requestPermission: jest.fn().mockResolvedValue('granted'),
    getCoords: jest.fn().mockResolvedValue(coords),
    reverseGeocode: jest
      .fn()
      .mockResolvedValue([{ city: 'Florianópolis', district: 'Centro', region: 'SC' }]),
    ...over,
  };
}

describe('GPS — reverse geocode → localidade (Fase 3)', () => {
  describe('toUserLocation', () => {
    it('mapeia cidade, bairro (district) e UF (region)', () => {
      expect(
        toUserLocation({ city: 'Florianópolis', district: 'Centro', region: 'SC' }),
      ).toEqual({ city: 'Florianópolis', neighborhood: 'Centro', state: 'SC' });
    });

    it('sem city usa subregion (iOS)', () => {
      expect(toUserLocation({ subregion: 'São José', region: 'SC' })).toEqual({
        city: 'São José',
        state: 'SC',
      });
    });

    it('sem cidade nenhuma = null (não dá para ranquear)', () => {
      expect(toUserLocation({ district: 'Centro', region: 'SC' })).toBeNull();
      expect(toUserLocation({ city: '   ' })).toBeNull();
      expect(toUserLocation(null)).toBeNull();
      expect(toUserLocation()).toBeNull();
    });

    it('omite bairro/UF vazios em vez de mandar string vazia', () => {
      expect(toUserLocation({ city: 'Recife', district: '', region: null })).toEqual({
        city: 'Recife',
      });
    });
  });

  describe('acquireDeviceLocation', () => {
    it('permissão concedida: devolve coordenadas + localidade', async () => {
      const result = await acquireDeviceLocation(providers());

      expect(result).toEqual({
        coords,
        location: { city: 'Florianópolis', neighborhood: 'Centro', state: 'SC' },
      });
    });

    it('permissão negada: null e NÃO chega a ler as coordenadas', async () => {
      const p = providers({ requestPermission: jest.fn().mockResolvedValue('denied') });

      expect(await acquireDeviceLocation(p)).toBeNull();
      expect(p.getCoords).not.toHaveBeenCalled();
    });

    it('reverse geocode falhando: mantém as coordenadas (servem ao B7) sem localidade', async () => {
      const p = providers({ reverseGeocode: jest.fn().mockRejectedValue(new Error('offline')) });

      expect(await acquireDeviceLocation(p)).toEqual({ coords, location: null });
    });

    it('reverse geocode vazio: idem, coordenadas sem localidade', async () => {
      const p = providers({ reverseGeocode: jest.fn().mockResolvedValue([]) });

      expect(await acquireDeviceLocation(p)).toEqual({ coords, location: null });
    });
  });
});
