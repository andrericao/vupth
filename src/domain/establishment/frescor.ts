// abrir-com-lista-salva (DEC-148, ajuste do André): a lista pode abrir do disco, mas o que muda com o tempo
// (aberta/fechada, horário, fila, espera, preço) nunca aparece do cache — mostra skeleton até o Backend responder.
// Um dado é "fresco" quando foi buscado NESTA abertura do app; o que veio do disco tem data anterior.
export const INICIO_DA_SESSAO = Date.now();

export function dadosFrescos(dataUpdatedAt: number): boolean {
  return dataUpdatedAt >= INICIO_DA_SESSAO;
}
