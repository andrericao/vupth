import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import { render, fireEvent, act, screen } from '@testing-library/react-native';

import { DialogoVupth } from '@components/DialogoVupth';
import { useDialogoStore, abrirDialogo } from '@stores/dialogo.store';

const estilo = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);
const idsDosBotoes = () =>
  screen.getAllByTestId(/^dialogo-botao-/).map((el) => el.props.testID as string);

// modais-de-alerta (design-modais, 17/10): o tipo e dito por uma faixa no topo e
// um selo com icone; o primario e sempre verde-marca, e so a acao destrutiva e
// danger. Sem `tipo` o cartao e o de sempre.
describe("DialogoVupth com tipo", () => {
  beforeEach(() => useDialogoStore.setState({ atual: null, fila: [] }));

  const abrir = (pedido: Parameters<typeof abrirDialogo>[0]) => {
    render(<DialogoVupth />);
    act(() => void abrirDialogo(pedido));
  };

  it("sem tipo: nem selo nem faixa, botoes na ordem da lista, desenho antigo", () => {
    abrir({
      titulo: "Fechar fila",
      mensagem: "Ninguém novo entra.",
      botoes: [{ texto: "Voltar", estilo: "cancel" }, { texto: "Fechar" }],
    });
    expect(screen.queryByTestId("dialogo-selo")).toBeNull();
    expect(screen.queryByTestId("dialogo-faixa")).toBeNull();
    expect(idsDosBotoes()).toEqual(["dialogo-botao-0", "dialogo-botao-1"]);
    // o cancelar vazado e o confirmar solido: a regra do pesoDoBotao, intacta
    expect(estilo("dialogo-botao-0").borderWidth).toBe(1.5);
    expect(estilo("dialogo-botao-1").backgroundColor).toBe("#9FE870");
  });

  it("tipo desconhecido vira o dialogo de sempre, sem selo", () => {
    abrir({ titulo: "Oi", mensagem: "x", tipo: "perigoso" as never });
    expect(screen.queryByTestId("dialogo-selo")).toBeNull();
  });

  it.each([
    ["informacao", "Aviso", true],
    ["atencao", "Atenção", true],
    ["dinheiro", "Pagamento", true],
    ["erro", "Erro", false],
  ] as const)("%s: selo '%s'; faixa=%s", (tipo, selo, faixa) => {
    abrir({ titulo: "Título", mensagem: "Uma linha.", tipo });
    expect(screen.getByText(selo)).toBeTruthy();
    expect(!!screen.queryByTestId("dialogo-faixa")).toBe(faixa);
  });

  it("o selo e a faixa levam as cores do tipo, nao do botao", () => {
    abrir({ titulo: "Hora do almoço", mensagem: "60 min.", tipo: "atencao" });
    expect(estilo("dialogo-selo").backgroundColor).toBe("#FFC091");
    expect(estilo("dialogo-faixa").backgroundColor).toBe("#FFC091");
    // a faixa tem 6 px e cresce da esquerda
    expect(estilo("dialogo-faixa").height).toBe(6);
    expect(estilo("dialogo-faixa").transformOrigin).toBe("0% 50%");
  });

  it("o selo pode trocar de rotulo: Multa no lugar de Pagamento", () => {
    abrir({ titulo: "Sair da fila", mensagem: "R$ 3,00.", tipo: "dinheiro", selo: "Multa" });
    expect(screen.getByText("Multa")).toBeTruthy();
    expect(screen.queryByText("Pagamento")).toBeNull();
  });

  it("o primario e verde-marca com texto forest, em cima; o cancelar e secundario, embaixo", () => {
    abrir({
      titulo: "Hora do almoço",
      tipo: "atencao",
      botoes: [{ texto: "Agora não", estilo: "cancel" }, { texto: "Iniciar" }],
    });
    // a ordem da tela: o primario (indice 1) primeiro
    expect(idsDosBotoes()).toEqual(["dialogo-botao-1", "dialogo-botao-0"]);
    expect(estilo("dialogo-botao-1").backgroundColor).toBe("#9FE870");
    expect(estilo("dialogo-botao-0").backgroundColor).toBe("#F3F5F1");
    // sem borda: o cartao e os botoes nao desenham contorno
    expect(estilo("dialogo-botao-1").borderWidth).toBeUndefined();
  });

  it("so a acao destrutiva e danger, e o indice devolvido continua o da lista", async () => {
    let escolha!: Promise<number>;
    render(<DialogoVupth />);
    act(() => {
      escolha = abrirDialogo({
        titulo: "Sair da fila",
        mensagem: "R$ 3,00 de multa.",
        tipo: "dinheiro",
        botoes: [{ texto: "Cancelar", estilo: "cancel" }, { texto: "Sair", estilo: "destructive" }],
      });
    });
    // o destrutivo tem id fixo, qualquer que seja a posicao (bateria Maestro)
    expect(estilo("dialogo-botao-destrutivo").backgroundColor).toBe("#B3261E");
    fireEvent.press(screen.getByTestId("dialogo-botao-destrutivo"));
    await expect(escolha).resolves.toBe(1);
  });
});

// Entrada e saida (design-motion, peca 2): veu 250 ms, cartao 450 ms, faixa 500
// ms; saida 200 ms. O Modal fica sem animacao propria e o dialogo continua
// montado ate a saida acabar.
describe("DialogoVupth: entrada e saida animadas", () => {
  type Chamada = { cfg: { toValue: number; duration: number; useNativeDriver: boolean }; fim: ((r: { finished: boolean }) => void)[] };
  let chamadas: Chamada[];
  let timing: jest.SpyInstance;

  beforeEach(() => {
    useDialogoStore.setState({ atual: null, fila: [] });
    chamadas = [];
    // O driver de frames do jest nao anda com o relogio falso; quem manda no
    // fim de cada animacao e o teste.
    timing = jest.spyOn(Animated, "timing").mockImplementation(((_v: unknown, cfg: Chamada["cfg"]) => {
      const chamada: Chamada = { cfg, fim: [] };
      chamadas.push(chamada);
      return {
        start: (cb?: (r: { finished: boolean }) => void) => chamada.fim.push(cb ?? (() => {})),
        stop: jest.fn(),
        reset: jest.fn(),
      };
    }) as never);
  });
  // Um a um, e nao `restoreAllMocks`: ele tambem zera os jest.fn() do setup do
  // React Native (AccessibilityInfo), e o teste seguinte herdaria um mock mudo.
  afterEach(() => timing.mockRestore());

  const duracoes = (toValue: number) => chamadas.filter((c) => c.cfg.toValue === toValue).map((c) => c.cfg.duration);

  it("o Modal nao anima sozinho: a animacao mora por dentro", () => {
    const { UNSAFE_getByType } = render(<DialogoVupth />);
    act(() => void abrirDialogo({ titulo: "Oi", mensagem: "x" }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Modal } = require("react-native");
    expect(UNSAFE_getByType(Modal).props.animationType).toBe("none");
  });

  it("entra com veu em 250, cartao em 450 e faixa em 500, no driver nativo", () => {
    render(<DialogoVupth />);
    act(() => void abrirDialogo({ titulo: "Oi", mensagem: "x", tipo: "atencao" }));
    expect(duracoes(1).sort((a, b) => a - b)).toEqual([250, 450, 500]);
    expect(chamadas.every((c) => c.cfg.useNativeDriver === true)).toBe(true);
  });

  it("fica montado ate a saida de 200 ms acabar — e nao aceita toque enquanto sai", async () => {
    render(<DialogoVupth />);
    let escolha!: Promise<number>;
    act(() => {
      escolha = abrirDialogo({
        titulo: "Sair da fila",
        mensagem: "R$ 3,00.",
        tipo: "dinheiro",
        botoes: [{ texto: "Cancelar", estilo: "cancel" }, { texto: "Sair", estilo: "destructive" }],
      });
    });
    expect(screen.getByTestId("dialogo-cartao").props.pointerEvents).toBe("auto");

    fireEvent.press(screen.getByTestId("dialogo-botao-destrutivo"));
    await expect(escolha).resolves.toBe(1);

    // a loja ja esta vazia, mas o cartao segue na tela saindo
    expect(useDialogoStore.getState().atual).toBeNull();
    expect(screen.getByText("Sair da fila")).toBeTruthy();
    expect(screen.getByTestId("dialogo-cartao").props.pointerEvents).toBe("none");
    expect(duracoes(0)).toEqual([200, 200, 200]);

    act(() => {
      chamadas.filter((c) => c.cfg.toValue === 0).forEach((c) => c.fim.forEach((cb) => cb({ finished: true })));
    });
    expect(screen.queryByText("Sair da fila")).toBeNull();
  });

  it("um aviso que chega no meio da saida cancela a saida e entra por inteiro", async () => {
    render(<DialogoVupth />);
    act(() => void abrirDialogo({ titulo: "Primeiro", mensagem: "a" }));
    act(() => useDialogoStore.getState().responder(0));
    expect(screen.getByText("Primeiro")).toBeTruthy();

    act(() => void abrirDialogo({ titulo: "Segundo", mensagem: "b" }));
    expect(screen.getByText("Segundo")).toBeTruthy();
    expect(screen.getByTestId("dialogo-cartao").props.pointerEvents).toBe("auto");

    // o fim tardio da saida interrompida nao derruba o aviso novo
    act(() => {
      chamadas.filter((c) => c.cfg.toValue === 0).forEach((c) => c.fim.forEach((cb) => cb({ finished: false })));
    });
    expect(screen.getByText("Segundo")).toBeTruthy();
  });

  it("o proximo da fila entra na hora, sem esperar a saida do anterior", () => {
    render(<DialogoVupth />);
    act(() => void abrirDialogo({ titulo: "Um", mensagem: "a" }));
    act(() => void abrirDialogo({ titulo: "Dois", mensagem: "b" }));
    act(() => useDialogoStore.getState().responder(0));
    expect(screen.getByText("Dois")).toBeTruthy();
    expect(screen.queryByText("Um")).toBeNull();
  });

  it("com remover animacoes ligado: sem animacao, aparece e some na hora", async () => {
    // `Once` e nao spyOn/restore: a funcao ja e um jest.fn() do setup do React
    // Native, e restaurar um spy dela apagaria a implementacao para os testes
    // seguintes (a chamada passaria a devolver undefined).
    (AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValueOnce(true);
    render(<DialogoVupth />);
    await act(async () => {});
    act(() => void abrirDialogo({ titulo: "Sem movimento", mensagem: "x", tipo: "informacao" }));
    expect(screen.getByText("Sem movimento")).toBeTruthy();
    act(() => useDialogoStore.getState().responder(0));
    expect(screen.queryByText("Sem movimento")).toBeNull();
    expect(chamadas).toHaveLength(0);
  });

  it("vazio, o host nao anima nada nem desenha nada", () => {
    const { toJSON } = render(<DialogoVupth />);
    expect(toJSON()).toBeNull();
    expect(chamadas).toHaveLength(0);
  });
});
