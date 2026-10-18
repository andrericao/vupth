import { Alert } from "react-native";

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
});
