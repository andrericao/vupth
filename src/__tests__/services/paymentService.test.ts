import { paymentService } from '@services/paymentService';
import { api } from '@services/api';

jest.mock('@services/api', () => ({ api: { get: jest.fn(), post: jest.fn() } }));
const auth = { headers: { Authorization: 'Bearer tk' } };

describe('paymentService', () => {
  it('o pagamento, o "Já paguei" e as pendências, com o token', () => {
    paymentService.get('a1', 'tk');
    paymentService.claim('a1', 'tk');
    paymentService.pendentes('tk');
    expect(api.get).toHaveBeenCalledWith('/attendances/a1/payment', auth);
    expect(api.post).toHaveBeenCalledWith('/attendances/a1/payment/claim', undefined, auth);
    expect(api.get).toHaveBeenCalledWith('/clients/me/pending-payments', auth);
  });
});
