import { create } from "zustand";

// Ponte entre quem PEDE um diálogo e quem o DESENHA.
//
// 🔴 "o modal de aviso na versão web tá melhor que o modal do apk, quero que
// também acompanhe o design do app" (Andre, 08/09). É consequência do A5: para
// consertar a web foi preciso DESENHAR a caixa, e no nativo continuou a do
// sistema operacional — que não aceita fonte, cor nem raio. Não há como "estilizar
// o Alert": só substituindo por um modal nosso.
//
// A dificuldade é que `Alert.alert` é chamado de ~100 lugares, muitos FORA de
// componente (ações de store, callbacks de erro). Modal precisa de árvore React.
// Então: quem chama continua chamando de onde quiser, isto guarda o pedido, e um
// host montado uma vez no `_layout` desenha.
//
// A FILA existe porque dois avisos seguidos se atropelavam: o segundo apagaria o
// primeiro da tela e a promessa dele nunca resolveria — e várias telas NAVEGAM no
// callback do aviso (ver o contrato do `avisar()`).
export type BotaoDialogo = {
  texto: string;
  estilo?: "default" | "cancel" | "destructive";
};

export type PedidoDialogo = {
  titulo: string;
  mensagem?: string;
  botoes?: BotaoDialogo[];
};

type DialogoNaTela = {
  titulo: string;
  mensagem?: string;
  botoes: Required<BotaoDialogo>[];
  resolver: (indice: number) => void;
};

type DialogoState = {
  atual: DialogoNaTela | null;
  fila: DialogoNaTela[];
  /** O host avisa que está montado; sem ele, quem chama cai no Alert do sistema. */
  hostMontado: boolean;
  marcarHost: (montado: boolean) => void;
  enfileirar: (d: DialogoNaTela) => void;
  responder: (indice: number) => void;
  fechar: () => void;
};

export const useDialogoStore = create<DialogoState>((set, get) => ({
  atual: null,
  fila: [],
  hostMontado: false,

  marcarHost: (montado) => set({ hostMontado: montado }),

  enfileirar: (d) =>
    set((s) => (s.atual ? { fila: [...s.fila, d] } : { atual: d })),

  responder: (indice) => {
    const atual = get().atual;
    if (!atual) return;
    const [proximo, ...resto] = get().fila;
    set({ atual: proximo ?? null, fila: resto });
    atual.resolver(indice);
  },

  fechar: () => set({ atual: null, fila: [] }),
}));

/** Normaliza como o React Native: sem botões, um "OK" sozinho. */
function normalizar(botoes?: BotaoDialogo[]): Required<BotaoDialogo>[] {
  if (!botoes || botoes.length === 0) return [{ texto: "OK", estilo: "default" }];
  return botoes.map((b) => ({ texto: b.texto, estilo: b.estilo ?? "default" }));
}

/** Abre e resolve com o ÍNDICE do botão tocado. */
export function abrirDialogo(pedido: PedidoDialogo): Promise<number> {
  return new Promise<number>((resolve) => {
    useDialogoStore.getState().enfileirar({
      titulo: pedido.titulo,
      mensagem: pedido.mensagem,
      botoes: normalizar(pedido.botoes),
      resolver: resolve,
    });
  });
}
