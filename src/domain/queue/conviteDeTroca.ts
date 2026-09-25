import { SwapOfferDirection } from '@services/swapOfferService';

// O convite de troca chega como POPUP — decisao D16 do Andre (24/09).
//
// Teste de 25/09: "pedi pra mudar minha vez, mas logado com outro cliente nao
// consigo encontrar a solicitacao". A oferta so era buscada com a tela da fila
// aberta, e aparecia como um ponto num botao. Agora ela aparece para quem ela
// serve, em qualquer tela do app, por 5 segundos, com "Aceitar"; fecha pelo X,
// pelo voltar do Android e por um toque fora. Depois dos 5 s ela continua
// disponivel na tela da fila, ate quem publicou sair do "aguardando".
//
// Quem ela serve e o servidor que decide (`listAcceptable`): adiantar aparece
// para quem esta a frente, adiar para quem esta atras.

export const DURACAO_DO_CONVITE_MS = 5000;

/** As ofertas que ainda nao viraram popup nesta sessao. */
export function ofertasNovas<T extends { id: string }>(ofertas: T[], jaMostradas: string[]): T[] {
  return ofertas.filter((o) => !jaMostradas.includes(o.id));
}

/**
 * O texto diz o que ACONTECE com quem aceita — e nunca quem pediu: a oferta nao
 * traz o nome, e a troca e entre desconhecidos.
 */
export function textoDoConvite(direcao: SwapOfferDirection): { titulo: string; mensagem: string } {
  if (direcao === 'EARLIER') {
    return {
      titulo: 'Alguém quer adiantar a vez',
      mensagem: 'Uma pessoa atrás de você quer passar à frente. Aceitando, vocês trocam de lugar — você fica com a vez dela, sem custo.',
    };
  }
  return {
    titulo: 'Alguém quer adiar a vez',
    mensagem: 'Uma pessoa à sua frente quer ir para depois. Aceitando, vocês trocam de lugar — você passa à frente, sem custo.',
  };
}
