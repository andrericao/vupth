import { useDialogoStore, abrirDialogo } from "@stores/dialogo.store";

// 🔴 "o modal de aviso na versão web tá melhor que o modal do apk, quero que
// também acompanhe o design do app" (08/09).
//
// É consequência do A5: para consertar a web tivemos que DESENHAR a caixa, e no
// nativo continuou a do sistema operacional — que não aceita tema, fonte nem
// cor. Seguir o desenho no APK significa substituir o `Alert` por um modal
// nosso.
//
// A dificuldade: `Alert.alert` é chamado de 100 lugares, muitos fora de
// componente (funções de store, callbacks). Um modal precisa de árvore React.
// Esta store é a ponte: quem chama continua chamando de qualquer lugar, e um
// host montado uma vez desenha.
describe("dialogo.store", () => {
  beforeEach(() => useDialogoStore.getState().fechar());

  it("abrir coloca o diálogo na tela e devolve promessa", () => {
    const p = abrirDialogo({ titulo: "Erro", mensagem: "Senha incorreta" });

    expect(useDialogoStore.getState().atual?.titulo).toBe("Erro");
    expect(p).toBeInstanceOf(Promise);
  });

  it("responder resolve com o ÍNDICE do botão tocado", async () => {
    const p = abrirDialogo({
      titulo: "Fechar fila",
      mensagem: "Ninguém novo entra.",
      botoes: [{ texto: "Voltar", estilo: "cancel" }, { texto: "Fechar" }],
    });

    useDialogoStore.getState().responder(1);

    await expect(p).resolves.toBe(1);
    expect(useDialogoStore.getState().atual).toBeNull();
  });

  it("sem botões declarados, vira um OK sozinho — igual ao Alert", () => {
    abrirDialogo({ titulo: "Pronto", mensagem: "Serviço criado" });
    expect(useDialogoStore.getState().atual?.botoes).toEqual([{ texto: "OK", estilo: "default" }]);
  });

  it("dois avisos seguidos NÃO se atropelam — o segundo espera a vez", async () => {
    // Sem fila, o segundo Alert apagaria o primeiro da tela e a promessa dele
    // nunca resolveria — e várias telas navegam no callback.
    const primeiro = abrirDialogo({ titulo: "Um", mensagem: "a" });
    const segundo = abrirDialogo({ titulo: "Dois", mensagem: "b" });

    expect(useDialogoStore.getState().atual?.titulo).toBe("Um");

    useDialogoStore.getState().responder(0);
    await expect(primeiro).resolves.toBe(0);
    expect(useDialogoStore.getState().atual?.titulo).toBe("Dois");

    useDialogoStore.getState().responder(0);
    await expect(segundo).resolves.toBe(0);
    expect(useDialogoStore.getState().atual).toBeNull();
  });

  it("fechar limpa tudo — inclusive a espera", () => {
    abrirDialogo({ titulo: "Um", mensagem: "a" });
    abrirDialogo({ titulo: "Dois", mensagem: "b" });

    useDialogoStore.getState().fechar();

    expect(useDialogoStore.getState().atual).toBeNull();
    expect(useDialogoStore.getState().fila).toHaveLength(0);
  });

  // modais-de-alerta (design-modais, 17/10)
  it("o tipo e o selo vao junto do pedido", () => {
    abrirDialogo({ titulo: "Sair da fila", tipo: "dinheiro", selo: "Multa" });
    expect(useDialogoStore.getState().atual).toMatchObject({ tipo: "dinheiro", selo: "Multa" });
  });

  it("sem tipo, o pedido segue sem tipo — as chamadas antigas nao mudam", () => {
    abrirDialogo({ titulo: "Erro", mensagem: "Senha incorreta" });
    expect(useDialogoStore.getState().atual?.tipo).toBeUndefined();
  });

  it("um tipo que nao existe e descartado, nao desenhado pela metade", () => {
    abrirDialogo({ titulo: "Oi", tipo: "outro" as never });
    expect(useDialogoStore.getState().atual?.tipo).toBeUndefined();
  });
});

