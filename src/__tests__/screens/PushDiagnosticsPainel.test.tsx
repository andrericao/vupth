import { act, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { PushDiagnostics } from '@components/PushDiagnostics';
import { usePushDiagnosticsStore } from '@stores/pushDiagnosticsStore';

// Durante o cold start o registro falha e é repetido. O painel não pode dizer
// "NÃO" nesse meio-tempo: o teste de 15/09 foi lido como falha de push quando
// era só o Render acordando.

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

describe('painel de push — enquanto o registro é repetido', () => {
  beforeEach(() => {
    const st = usePushDiagnosticsStore.getState();
    st.reset();
    st.registrarTentativa({ motivo: 'ok', token: 'ExponentPushToken[abcdefgh12345678]' });
  });

  it('mostra "tentando de novo", não "NÃO"', () => {
    act(() => usePushDiagnosticsStore.getState().registrarEnvio('tentando', 'tentativa 2 — Network Error'));
    const { getByText, queryByText } = renderWithProviders(<PushDiagnostics />);
    expect(getByText(/tentando de novo/)).toBeTruthy();
    expect(queryByText(/NÃO/)).toBeNull();
    expect(getByText('última falha')).toBeTruthy();
    expect(getByText(/tentativa 2 — Network Error/)).toBeTruthy();
  });

  it('esgotadas as tentativas, volta a dizer NÃO com o erro', () => {
    act(() => usePushDiagnosticsStore.getState().registrarEnvio('falhou', 'Network Error'));
    const { getByText } = renderWithProviders(<PushDiagnostics />);
    expect(getByText(/NÃO — envio falhou/)).toBeTruthy();
    expect(getByText('erro do envio')).toBeTruthy();
  });
});

describe('painel de push — os outros estados (cobertura-98)', () => {
  beforeEach(() => usePushDiagnosticsStore.getState().reset());

  it('sem tentativa: diz que o registro vem depois do login', () => {
    const { getByText } = renderWithProviders(<PushDiagnostics />);
    expect(getByText(/Ainda não tentou registrar/)).toBeTruthy();
  });

  it('com token: tocar no fim mostra o token inteiro, tocar de novo esconde', () => {
    act(() =>
      usePushDiagnosticsStore.getState().registrarTentativa({ motivo: 'ok', token: 'ExponentPushToken[abcdefgh12345678]' }),
    );
    const { getByText, queryByText } = renderWithProviders(<PushDiagnostics />);
    fireEvent.press(getByText(/toque p\/ ver/));
    expect(getByText('ExponentPushToken[abcdefgh12345678]')).toBeTruthy();
    fireEvent.press(getByText('toque p/ esconder'));
    expect(queryByText('ExponentPushToken[abcdefgh12345678]')).toBeNull();
  });

  it('enviado ao backend: "sim"; sem envio: "não tentado"; com detalhe, mostra o detalhe', () => {
    act(() => {
      usePushDiagnosticsStore.getState().registrarTentativa({ motivo: 'ok', token: 'ExponentPushToken[x1]' });
      usePushDiagnosticsStore.getState().registrarEnvio('ok');
    });
    const { getByText } = renderWithProviders(<PushDiagnostics />);
    expect(getByText(/sim \(POST \/devices\)/)).toBeTruthy();

    act(() => {
      usePushDiagnosticsStore.getState().reset();
      usePushDiagnosticsStore.getState().registrarTentativa({ motivo: 'erro', detalhe: 'sem projectId' });
    });
    expect(getByText('não tentado')).toBeTruthy();
    expect(getByText('sem projectId')).toBeTruthy();
  });
});
