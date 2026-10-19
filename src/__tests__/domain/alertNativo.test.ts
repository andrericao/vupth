import { instalarDialogoNativo, dialogoNativoInstalado } from "@utils/alertNativo";
import { useDialogoStore } from "@stores/dialogo.store";

describe("instalarDialogoNativo", () => {
  beforeEach(() => useDialogoStore.getState().fechar());

  const alvoFalso = () => ({ alert: jest.fn() });

  it("na WEB não instala — lá quem desenha é o shim, com o mesmo desenho", () => {
    const alvo = alvoFalso();
    expect(instalarDialogoNativo({ plataforma: "web", alvo: alvo as any })).toBe(false);
    expect(dialogoNativoInstalado(alvo as any)).toBe(false);
  });

  it("as chamadas existentes passam a abrir o NOSSO diálogo", () => {
    const alvo = alvoFalso();
    instalarDialogoNativo({ plataforma: "android", alvo: alvo as any, hostMontado: () => true });

    alvo.alert("Erro", "Senha incorreta");

    expect(useDialogoStore.getState().atual?.titulo).toBe("Erro");
  });

  it("o onPress do botão tocado roda — é o que várias telas usam para navegar", async () => {
    const alvo = alvoFalso();
    const onPress = jest.fn();
    instalarDialogoNativo({ plataforma: "ios", alvo: alvo as any, hostMontado: () => true });

    alvo.alert("Pronto", "Serviço criado", [{ text: "OK", onPress }]);
    useDialogoStore.getState().responder(0);
    await Promise.resolve();

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("🔴 SEM host montado, cai no Alert ORIGINAL — nunca ficar mudo", () => {
    // Trocar o diálogo por um modal que ninguém desenha reproduz exatamente o
    // defeito que estávamos consertando na web: o app deixa de falar.
    const alvo = alvoFalso();
    const original = alvo.alert;
    instalarDialogoNativo({ plataforma: "android", alvo: alvo as any, hostMontado: () => false });

    alvo.alert("Erro", "Sem host");

    // Repassa os argumentos INTACTOS: a rede nao pode "melhorar" o pedido, so
    // entregar. Normalizar aqui esconderia a diferenca entre o caminho normal e
    // o de emergencia justo quando alguem estivesse depurando o de emergencia.
    expect(original).toHaveBeenCalledWith("Erro", "Sem host", undefined);
    expect(useDialogoStore.getState().atual).toBeNull();
  });

  it("instalar duas vezes não empilha patch sobre patch", () => {
    const alvo = alvoFalso();
    instalarDialogoNativo({ plataforma: "android", alvo: alvo as any, hostMontado: () => true });
    const primeiro = alvo.alert;
    instalarDialogoNativo({ plataforma: "android", alvo: alvo as any, hostMontado: () => true });

    expect(alvo.alert).toBe(primeiro);
  });
});

describe('alertNativo — o cancelable do Alert chega ao diálogo', () => {
  it('cancelable: false vira cancelavel: false', () => {
    const { useDialogoStore } = jest.requireActual('@stores/dialogo.store');
    const { instalarDialogoNativo } = jest.requireActual('@utils/alertNativo');
    const alvo: { alert: (...a: unknown[]) => void } = { alert: jest.fn() };
    useDialogoStore.setState({ atual: null, fila: [] });
    instalarDialogoNativo({ plataforma: 'android', alvo, hostMontado: () => true });
    alvo.alert('Você foi chamado', 'msg', [{ text: 'Entendi' }], { cancelable: false });
    expect(useDialogoStore.getState().atual?.cancelavel).toBe(false);
  });
});

describe("alertNativo — o que sobra dos caminhos", () => {
  beforeEach(() => useDialogoStore.setState({ atual: null, fila: [] } as never));

  it("sem host montado e com opções, repassa as opções ao Alert original", () => {
    const alvo = { alert: jest.fn() };
    const original = alvo.alert;
    instalarDialogoNativo({ plataforma: "android", alvo: alvo as any, hostMontado: () => false });

    alvo.alert("Aviso", "msg", [{ text: "OK" }], { cancelable: false });

    expect(original).toHaveBeenCalledWith("Aviso", "msg", [{ text: "OK" }], { cancelable: false });
  });

  it("sem hostMontado nas dependências, pergunta ao store do diálogo", () => {
    const alvo = { alert: jest.fn() };
    const original = alvo.alert;
    useDialogoStore.setState({ hostMontado: false } as never);
    instalarDialogoNativo({ plataforma: "android", alvo: alvo as any });

    alvo.alert("Erro");

    expect(original).toHaveBeenCalledWith("Erro", undefined, undefined);
  });

  it("botão sem texto vira OK e sem estilo vira default", () => {
    const alvo = { alert: jest.fn() };
    instalarDialogoNativo({ plataforma: "android", alvo: alvo as any, hostMontado: () => true });

    alvo.alert("Título", "msg", [{}]);

    expect(useDialogoStore.getState().atual?.botoes).toEqual([{ texto: "OK", estilo: "default" }]);
  });

  it("sem alvo, olha o Alert do React Native", () => {
    expect(typeof dialogoNativoInstalado()).toBe("boolean");
  });

  it("sem dependências, instala no Alert do React Native da plataforma atual", () => {
    const { Alert } = jest.requireActual("react-native");
    const antes = Alert.alert;
    try {
      expect(instalarDialogoNativo()).toBe(true);
      expect(dialogoNativoInstalado()).toBe(true);
    } finally {
      Alert.alert = antes;
      delete Alert.__vupthDialogo;
      delete Alert.__vupthAlertOriginal;
    }
  });
});

// modais-de-alerta (design-modais, 17/10): o tipo viaja no 4o argumento, ao lado
// do cancelable, e o Alert do sistema nunca o recebe.
describe("alertNativo — o tipo do aviso", () => {
  beforeEach(() => useDialogoStore.setState({ atual: null, fila: [] } as never));

  it("o tipo e o selo chegam ao dialogo, junto do cancelable", () => {
    const alvo = { alert: jest.fn() };
    instalarDialogoNativo({ plataforma: "android", alvo: alvo as any, hostMontado: () => true });

    alvo.alert("Sair da fila", "R$ 3,00 de multa.", [{ text: "Sair" }], {
      cancelable: false,
      tipo: "dinheiro",
      selo: "Multa",
    });

    expect(useDialogoStore.getState().atual).toMatchObject({ tipo: "dinheiro", selo: "Multa", cancelavel: false });
  });

  it("sem tipo, o dialogo sai sem tipo — as ~95 chamadas de hoje seguem iguais", () => {
    const alvo = { alert: jest.fn() };
    instalarDialogoNativo({ plataforma: "android", alvo: alvo as any, hostMontado: () => true });
    alvo.alert("Erro", "Senha incorreta");
    expect(useDialogoStore.getState().atual?.tipo).toBeUndefined();
  });

  it("sem host montado, o Alert do sistema recebe as opcoes SEM o tipo nem o selo", () => {
    const alvo = { alert: jest.fn() };
    const original = alvo.alert;
    instalarDialogoNativo({ plataforma: "android", alvo: alvo as any, hostMontado: () => false });

    alvo.alert("Sair da fila", "x", undefined, { cancelable: false, tipo: "dinheiro", selo: "Multa" });

    expect(original).toHaveBeenCalledWith("Sair da fila", "x", undefined, { cancelable: false });
    expect(useDialogoStore.getState().atual).toBeNull();
  });
});

