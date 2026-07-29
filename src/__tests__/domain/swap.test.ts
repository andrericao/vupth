import {
  acceptOfferText,
  myOfferText,
  outOfQueueOfferErrorMessage,
  isOutOfQueueOffer,
  vanishedPendingOffers,
  findSwapAttendance,
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

  // Detecção do aceite quando o solicitante está FORA da fila: sem WS, o sinal é
  // a oferta sumir do /swap-offers/me (só lista OPEN) + o atendimento aparecer.
  describe('detecção do aceite (fatia 2)', () => {
    it('isOutOfQueueOffer: sem attendance de origem = publicada de fora', () => {
      expect(isOutOfQueueOffer({ requesterAttendanceId: null })).toBe(true);
      expect(isOutOfQueueOffer({ requesterAttendanceId: 'att-1' })).toBe(false);
    });

    it('vanishedPendingOffers: sobra quem não está mais OPEN', () => {
      const pending = [{ offerId: 'a' }, { offerId: 'b' }];
      expect(vanishedPendingOffers(pending, [{ id: 'a' }])).toEqual([{ offerId: 'b' }]);
      expect(vanishedPendingOffers(pending, [{ id: 'a' }, { id: 'b' }])).toEqual([]);
      expect(vanishedPendingOffers(pending, [])).toEqual(pending);
    });

    it('findSwapAttendance: acha o atendimento ativo daquele profissional', () => {
      const history = [
        { id: 'old', professionalId: 'p1', status: 'FINISHED' },
        { id: 'other', professionalId: 'p2', status: 'SCHEDULED' },
        { id: 'novo', professionalId: 'p1', status: 'SCHEDULED' },
      ];
      expect(findSwapAttendance(history, 'p1')?.id).toBe('novo');
      expect(findSwapAttendance(history, 'p3')).toBeUndefined();
    });

    it('findSwapAttendance: LATE também conta (ainda aguardando)', () => {
      expect(
        findSwapAttendance([{ id: 'x', professionalId: 'p1', status: 'LATE' }], 'p1')?.id,
      ).toBe('x');
    });

    it('findSwapAttendance: histórico só com encerrados = nada (cancelada/expirada)', () => {
      const history = [
        { id: 'a', professionalId: 'p1', status: 'CANCELLED' },
        { id: 'b', professionalId: 'p1', status: 'FINISHED' },
      ];
      expect(findSwapAttendance(history, 'p1')).toBeUndefined();
    });
  });
});
