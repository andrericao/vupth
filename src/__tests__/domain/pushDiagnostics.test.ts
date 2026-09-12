import { usePushDiagnosticsStore, sufixoDoToken } from '@stores/pushDiagnosticsStore';

// O registro de push vive inteiro dentro de um `catch {}` best-effort — certo,
// porque push nao pode derrubar o login, e ao mesmo tempo apagador de rastro.
// Este store existe para que "nao recebi nenhuma notificacao" deixe de ser
// indistinguivel de meia duzia de causas diferentes.

describe('diagnostico de push', () => {
  beforeEach(() => usePushDiagnosticsStore.getState().reset());

  it('comeca sem tentativa — e isso e diferente de "deu certo"', () => {
    const s = usePushDiagnosticsStore.getState();
    expect(s.motivo).toBeNull();
    expect(s.envio).toBe('nao-tentado');
  });

  it('guarda o motivo do fracasso, nao so o sucesso', () => {
    usePushDiagnosticsStore.getState().registrarTentativa({
      motivo: 'erro',
      detalhe: 'No FCM credentials',
    });
    const s = usePushDiagnosticsStore.getState();
    expect(s.motivo).toBe('erro');
    expect(s.detalhe).toBe('No FCM credentials');
    expect(s.tokenSufixo).toBeNull();
  });

  it('separa "tem token" de "o backend sabe do token"', () => {
    // Os dois sintomas sao identicos pro usuario: nenhum push chega.
    const st = usePushDiagnosticsStore.getState();
    st.registrarTentativa({ motivo: 'ok', token: 'ExponentPushToken[abcdefghij]' });
    st.registrarEnvio('falhou', '401 Unauthorized');
    const s = usePushDiagnosticsStore.getState();
    expect(s.motivo).toBe('ok');
    expect(s.envio).toBe('falhou');
    expect(s.erroEnvio).toBe('401 Unauthorized');
  });

  it('guarda o token INTEIRO para o diagnostico manual', () => {
    // Sem ele nao da pra mandar um push pela ferramenta do Expo, e "o backend
    // nao envia" x "o Expo nao entrega" ficam empatados.
    usePushDiagnosticsStore
      .getState()
      .registrarTentativa({ motivo: 'ok', token: 'ExponentPushToken[abcdefghij]' });
    expect(usePushDiagnosticsStore.getState().token).toBe('ExponentPushToken[abcdefghij]');
  });

  it('sem token, nao guarda lixo', () => {
    usePushDiagnosticsStore.getState().registrarTentativa({ motivo: 'sem-permissao' });
    expect(usePushDiagnosticsStore.getState().token).toBeNull();
  });

  it('mostra so o FIM do token — identifica sem expor o valor', () => {
    expect(sufixoDoToken('ExponentPushToken[abcdefghij]')).toBe('cdefghij');
    expect(sufixoDoToken(null)).toBeNull();
    expect(sufixoDoToken('')).toBeNull();
  });
});
