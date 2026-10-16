import { referralService } from '@services/referralService';
import { api } from '@services/api';

jest.mock('@services/api', () => ({ api: { post: jest.fn() } }));

describe('referralService.claim', () => {
  it('POST /referrals/claim com o código e o token', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { code: 'K7', referred_at: 'x' } });
    await referralService.claim('K7', 'tk');
    expect(api.post).toHaveBeenCalledWith('/referrals/claim', { code: 'K7' }, { headers: { Authorization: 'Bearer tk' } });
  });
});
