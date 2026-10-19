import { Alert, Linking } from "react-native";

import { alertaTipado } from "@utils/alertaTipado";
import { instalarDialogoNativo } from "@utils/alertNativo";
import { useDialogoStore } from "@stores/dialogo.store";

// modais-de-alerta (design-modais, 17/10): o jeito de pedir um aviso COM tipo sem
// mexer nas ~95 chamadas de Alert.alert. Mesma assinatura, o tipo no fim.
describe("alertaTipado", () => {
  beforeEach(() => useDialogoStore.setState({ atual: null, fila: [] } as never));

  it("chama o Alert.alert com o tipo no 4o argumento", () => {
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const botoes = [{ text: "Cancelar", style: "cancel" as const }, { text: "Sair", style: "destructive" as const }];

    alertaTipado("Sair da fila", "R$ 3,00 de multa no próximo atendimento.", botoes, {
      tipo: "dinheiro",
      selo: "Multa",
    });

    expect(alerta).toHaveBeenCalledWith("Sair da fila", "R$ 3,00 de multa no próximo atendimento.", botoes, {
      tipo: "dinheiro",
      selo: "Multa",
    });
    alerta.mockRestore();
  });

  it("de ponta a ponta com a caixa da marca instalada: o onPress do botao tocado roda", async () => {
    const alvo = { alert: jest.fn() };
    instalarDialogoNativo({ plataforma: "android", alvo: alvo as never, hostMontado: () => true });
    const alerta = jest.spyOn(Alert, "alert").mockImplementation(alvo.alert as never);
    const onPress = jest.fn();

    alertaTipado(
      "Pagamento pendente",
      "R$ 5,00 com Ana.",
      [{ text: "Agora não", style: "cancel" }, { text: "Pagar", onPress }],
      { tipo: "dinheiro" }
    );
    expect(useDialogoStore.getState().atual).toMatchObject({ titulo: "Pagamento pendente", tipo: "dinheiro" });

    useDialogoStore.getState().responder(1);
    await Promise.resolve();
    expect(onPress).toHaveBeenCalledTimes(1);
    alerta.mockRestore();
  });

  describe("com artigo (Saiba mais)", () => {
    const botoes = [{ text: "Cancelar", style: "cancel" as const }, { text: "Sair", style: "destructive" as const }];

    it("poe o Saiba mais por ultimo, sem tirar o artigo do 4o argumento do Alert", () => {
      const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      alertaTipado("Sair da fila", "R$ 3,00 de multa.", botoes, { tipo: "dinheiro", selo: "Multa", artigo: "sairDaFila" });
      const [, , lista, opcoes] = alerta.mock.calls[0] as unknown as [string, string, { text: string; style?: string }[], object];
      expect(lista.map((b) => b.text)).toEqual(["Cancelar", "Sair", "Saiba mais"]);
      // Cancel e destrutivo ja existem: o Saiba mais nao pode ser mais um cancel nem um destrutivo.
      expect(lista[2].style).toBe("default");
      expect(opcoes).toEqual({ tipo: "dinheiro", selo: "Multa" });
      alerta.mockRestore();
    });

    it("o Saiba mais abre o artigo e mostra o aviso de novo, sem tocar nos outros botoes", () => {
      const abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
      const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      const sair = jest.fn();
      alertaTipado("Sair da fila", "R$ 3,00 de multa.", [botoes[0], { ...botoes[1], onPress: sair }], {
        tipo: "dinheiro",
        artigo: "sairDaFila",
      });
      (alerta.mock.calls[0][2] as { text: string; onPress?: () => void }[])[2].onPress!();
      expect(abrir).toHaveBeenCalledWith("https://vupth-support.pages.dev/artigos/cliente/sair-da-fila.html");
      expect(alerta).toHaveBeenCalledTimes(2);
      expect(sair).not.toHaveBeenCalled();
      abrir.mockRestore();
      alerta.mockRestore();
    });

    it("sem artigo, nenhum botao e acrescentado", () => {
      const alerta = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      alertaTipado("Sair da fila", "x", botoes, { tipo: "dinheiro" });
      expect((alerta.mock.calls[0][2] as unknown[]).length).toBe(2);
      alerta.mockRestore();
    });
  });
});
