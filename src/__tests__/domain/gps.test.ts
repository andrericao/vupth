import {
  toUserLocation,
  toAddressDraft,
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
    it('permissão concedida: devolve coordenadas + localidade + resultado cru', async () => {
      const result = await acquireDeviceLocation(providers());

      expect(result).toEqual({
        coords,
        location: { city: 'Florianópolis', neighborhood: 'Centro', state: 'SC' },
        raw: { city: 'Florianópolis', district: 'Centro', region: 'SC' },
      });
    });

    it('permissão negada: null e NÃO chega a ler as coordenadas', async () => {
      const p = providers({ requestPermission: jest.fn().mockResolvedValue('denied') });

      expect(await acquireDeviceLocation(p)).toBeNull();
      expect(p.getCoords).not.toHaveBeenCalled();
    });

    it('reverse geocode falhando: mantém as coordenadas (servem ao B7) sem localidade', async () => {
      const p = providers({ reverseGeocode: jest.fn().mockRejectedValue(new Error('offline')) });

      expect(await acquireDeviceLocation(p)).toEqual({ coords, location: null, raw: null });
    });

    it('reverse geocode vazio: idem, coordenadas sem localidade', async () => {
      const p = providers({ reverseGeocode: jest.fn().mockResolvedValue([]) });

      expect(await acquireDeviceLocation(p)).toEqual({ coords, location: null, raw: null });
    });
  });

  // Preenchimento do formulário de endereço pelo GPS (Andre 2026-08-01).
  describe('toAddressDraft', () => {
    it('mapeia rua, número, bairro, cidade, UF e CEP', () => {
      expect(
        toAddressDraft({
          street: 'Rua Felipe Schmidt',
          streetNumber: '150',
          district: 'Centro',
          city: 'Florianópolis',
          region: 'SC',
          postalCode: '88010-000',
        }),
      ).toEqual({
        street: 'Rua Felipe Schmidt',
        number: '150',
        neighborhood: 'Centro',
        city: 'Florianópolis',
        state: 'SC',
        zipCode: '88010000',
      });
    });

    it('OMITE o que o aparelho não soube (não apaga o que já foi digitado)', () => {
      expect(toAddressDraft({ city: 'Recife', region: 'PE' })).toEqual({
        city: 'Recife',
        state: 'PE',
      });
    });

    it('CEP incompleto não entra no rascunho', () => {
      expect(toAddressDraft({ city: 'Recife', postalCode: '5001' }).zipCode).toBeUndefined();
    });

    it('sem street usa o `name` do resultado', () => {
      expect(toAddressDraft({ name: 'Av. Beira Mar', city: 'Florianópolis' }).street).toBe(
        'Av. Beira Mar',
      );
    });

    it('resultado ausente = rascunho vazio', () => {
      expect(toAddressDraft(null)).toEqual({});
      expect(toAddressDraft()).toEqual({});
    });
  });
});
