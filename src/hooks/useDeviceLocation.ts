import { useCallback, useEffect, useRef } from 'react';

import {
  acquireDeviceLocation,
  toAddressDraft,
  AddressDraft,
  Coords,
  LocationProviders,
} from '@domain/location/gps';
import { useLocationStore } from '@stores/locationStore';

/**
 * GPS do device (Fase 3). Na PRIMEIRA abertura pede a permissão de localização;
 * concedida, guarda as coordenadas e deriva bairro/cidade/UF por reverse geocode
 * (tudo nativo e gratuito), alimentando a ordenação por proximidade da Home.
 *
 * Disciplina herdada do push (`usePushRegistration`): o módulo nativo é
 * carregado com `require` dentro de try/catch, então uma OTA que chegue num
 * binário SEM `expo-location` não derruba o app — o hook simplesmente não faz
 * nada e o seletor manual (endereço/CEP) continua valendo.
 *
 * Não re-pergunta: `gpsAsked` marca que já houve uma tentativa, e quem já tem
 * localidade definida na mão não é atropelado.
 */
export function useDeviceLocation() {
  const setLocation = useLocationStore((s) => s.setLocation);
  const setCoords = useLocationStore((s) => s.setCoords);
  const markGpsAsked = useLocationStore((s) => s.markGpsAsked);
  const askedRef = useRef(false);

  // Providers reais do expo-location, resolvidos só na hora do uso.
  const loadProviders = useCallback((): LocationProviders | null => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Location = require('expo-location');
      return {
        requestPermission: async () => {
          const { status } = await Location.requestForegroundPermissionsAsync();
          return status === 'granted' ? 'granted' : 'denied';
        },
        getCoords: async () => {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        },
        reverseGeocode: (coords) => Location.reverseGeocodeAsync(coords),
      };
    } catch {
      return null; // binário sem o módulo nativo (OTA antiga / Expo Go)
    }
  }, []);

  /** Pede/usa o GPS agora. Devolve true se a localidade foi definida. */
  const requestDeviceLocation = useCallback(async (): Promise<boolean> => {
    const providers = loadProviders();
    if (!providers) return false;

    await markGpsAsked();
    try {
      const result = await acquireDeviceLocation(providers);
      if (!result) return false; // permissão negada
      await setCoords(result.coords);
      if (result.location) {
        await setLocation(result.location);
        return true;
      }
      return false;
    } catch {
      return false; // GPS desligado, timeout: segue o seletor manual
    }
  }, [loadProviders, markGpsAsked, setCoords, setLocation]);

  /**
   * Endereço do aparelho para PREENCHER o formulário (tela de endereços). Não
   * mexe no filtro da Home: aqui o GPS serve para o cliente não digitar rua,
   * bairro, cidade e CEP na mão — e as coordenadas vão junto no cadastro.
   */
  const captureDeviceAddress = useCallback(async (): Promise<{
    coords: Coords;
    draft: AddressDraft;
  } | null> => {
    const providers = loadProviders();
    if (!providers) return null;

    await markGpsAsked();
    try {
      const result = await acquireDeviceLocation(providers);
      if (!result) return null; // permissão negada
      await setCoords(result.coords);
      return { coords: result.coords, draft: toAddressDraft(result.raw) };
    } catch {
      return null;
    }
  }, [loadProviders, markGpsAsked, setCoords]);

  // Primeira abertura: só pergunta quem ainda não foi perguntado E ainda não
  // definiu localidade na mão (`resolved`).
  useEffect(() => {
    if (askedRef.current) return;
    const { gpsAsked, resolved } = useLocationStore.getState();
    if (gpsAsked || resolved) return;
    askedRef.current = true;
    requestDeviceLocation();
  }, [requestDeviceLocation]);

  return { requestDeviceLocation, captureDeviceAddress };
}
