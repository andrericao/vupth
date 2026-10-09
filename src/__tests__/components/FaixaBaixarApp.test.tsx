import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { FaixaBaixarApp } from '@components/FaixaBaixarApp';

// link-de-divulgacao (Andre, 05/10): na web, toda visita oferece baixar o app
// ou seguir na web. No app e no iPhone, nada.

let mockNoNavegador = true;
jest.mock('@utils/ehNavegador', () => ({ ehNavegador: () => mockNoNavegador }));
jest.mock('@services/api', () => ({ API_ENV: 'prod' }));

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8)';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)';

function comNavegador(userAgent: string) {
  const guardado = new Map<string, string>();
  Object.defineProperty(globalThis, 'navigator', { value: { userAgent }, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => guardado.get(k) ?? null,
      setItem: (k: string, v: string) => guardado.set(k, v),
    },
    configurable: true,
  });
}

describe('FaixaBaixarApp', () => {
  beforeEach(() => {
    mockNoNavegador = true;
    comNavegador(ANDROID);
  });

  it('na web, com o APK no ar: aparece, e Baixar abre o /baixar fixo', () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByTestId } = renderWithProviders(<FaixaBaixarApp apkNoAr />);
    fireEvent.press(getByTestId('baixar-o-app'));
    expect(abrir).toHaveBeenCalledWith('https://vupth.pages.dev/baixar');
    abrir.mockRestore();
  });

  it('Continuar na web fecha e nao volta na proxima visita', () => {
    const { getByTestId, queryByTestId, unmount } = renderWithProviders(<FaixaBaixarApp apkNoAr />);
    fireEvent.press(getByTestId('continuar-na-web'));
    expect(queryByTestId('faixa-baixar-app')).toBeNull();
    unmount();
    const outra = renderWithProviders(<FaixaBaixarApp apkNoAr />);
    expect(outra.queryByTestId('faixa-baixar-app')).toBeNull();
  });

  it('no iPhone, no app ou sem o APK no ar: nao aparece', () => {
    comNavegador(IPHONE);
    expect(renderWithProviders(<FaixaBaixarApp apkNoAr />).queryByTestId('faixa-baixar-app')).toBeNull();
    comNavegador(ANDROID);
    mockNoNavegador = false;
    expect(renderWithProviders(<FaixaBaixarApp apkNoAr />).queryByTestId('faixa-baixar-app')).toBeNull();
    mockNoNavegador = true;
    expect(renderWithProviders(<FaixaBaixarApp apkNoAr={false} />).queryByTestId('faixa-baixar-app')).toBeNull();
  });
});
