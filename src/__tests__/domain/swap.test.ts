import { acceptOfferText, myOfferText } from '../../domain/queue/swap';

describe('swap text', () => {
  it('acceptOfferText: EARLIER = alguém passa na frente; LATER = eu subo', () => {
    expect(acceptOfferText('EARLIER')).toMatch(/passar na sua frente/);
    expect(acceptOfferText('LATER')).toMatch(/subir na fila/);
  });

  it('myOfferText: rótulo do próprio pedido', () => {
    expect(myOfferText('EARLIER')).toBe('Pedido para adiantar');
    expect(myOfferText('LATER')).toBe('Pedido para atrasar');
  });
});
