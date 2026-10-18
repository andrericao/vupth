import {
  FEEDBACK_URL,
  INTERVALO_APOS_ENVIO_MS,
  INTERVALO_DO_PEDIDO_MS,
  devePedirFeedback,
} from '@domain/feedback/feedback';

// pedido-de-feedback (CLI-34): no maximo uma vez a cada 30 dias, e 90 dias
// depois de quem tocou em "Enviar feedback".

const T = 1_800_000_000_000;

describe('devePedirFeedback', () => {
  it('nunca pediu: pede', () => {
    expect(devePedirFeedback(T, null, null)).toBe(true);
  });

  it('pediu ha menos de 30 dias: nao pede; com 30 dias, pede', () => {
    expect(devePedirFeedback(T, T - INTERVALO_DO_PEDIDO_MS + 1, null)).toBe(false);
    expect(devePedirFeedback(T, T - INTERVALO_DO_PEDIDO_MS, null)).toBe(true);
  });

  it('enviou ha menos de 90 dias: nao pede, mesmo passados 30 do ultimo pedido', () => {
    const envio = T - INTERVALO_APOS_ENVIO_MS + 1;
    expect(devePedirFeedback(T, T - INTERVALO_DO_PEDIDO_MS * 2, envio)).toBe(false);
    expect(devePedirFeedback(T, T - INTERVALO_DO_PEDIDO_MS * 3, T - INTERVALO_APOS_ENVIO_MS)).toBe(true);
  });

  it('o link leva ao formulario do Suporte com perfil e categoria', () => {
    expect(FEEDBACK_URL).toBe('https://vupth-support.pages.dev/contato.html?perfil=cliente&categoria=feedback');
  });
});
