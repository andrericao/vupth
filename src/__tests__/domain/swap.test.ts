import {
  acceptOfferText,
  myOfferText,
  outOfQueueOfferErrorMessage,
} from '../../domain/queue/swap';

describe('swap text', () => {
  it('acceptOfferText: EARLIER = alguém passa na frente; LATER = eu subo', () => {
    expect(acceptOfferText('EARLIER')).toMatch(/passar na sua frente/);
    expect(acceptOfferText('LATER')).toMatch(/subir na fila/);
  });

  it('myOfferText: rótulo do próprio pedido', () => {
    expect(myOfferText('EARLIER')).toBe('Pedido para adiantar');
    expect(myOfferText('LATER')).toBe('Pedido para atrasar');
  });

  it('myOfferText: oferta de FORA da fila (fatia 2) é "entrar por troca"', () => {
    expect(myOfferText('EARLIER', true)).toBe('Pedido para entrar por troca');
  });

  describe('outOfQueueOfferErrorMessage', () => {
    it('NOT_ALLOWED de fora = já estou na fila desse profissional', () => {
      expect(outOfQueueOfferErrorMessage('QUEUE_SWAP_OFFER_NOT_ALLOWED')).toMatch(
        /já está na fila desse profissional/,
      );
    });

    it('serviço de outro profissional / inexistente', () => {
      expect(outOfQueueOfferErrorMessage('SERVICE_ITEM_NOT_OF_PROFESSIONAL')).toMatch(
        /não é deste profissional/,
      );
      expect(outOfQueueOfferErrorMessage('SERVICE_ITEM_NOT_FOUND')).toMatch(
        /Serviço não encontrado/,
      );
      expect(outOfQueueOfferErrorMessage('PROFESSIONAL_NOT_FOUND')).toMatch(
        /Profissional não encontrado/,
      );
    });

    it('sem código: 401 pede login; demais caem no genérico', () => {
      expect(outOfQueueOfferErrorMessage(undefined, 401)).toMatch(/Entre na sua conta/);
      expect(outOfQueueOfferErrorMessage(undefined, 500)).toMatch(/Tente novamente/);
      expect(outOfQueueOfferErrorMessage()).toMatch(/Tente novamente/);
    });
  });
});
