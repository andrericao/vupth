import { mock } from './setup';
import { campaignService } from '../../services/campaignService';

describe('CampaignService', () => {
  it('redeem envia POST /campaigns/redeem { code } + Bearer', async () => {
    mock.onPost('/campaigns/redeem').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer tok');
      expect(JSON.parse(config.data)).toEqual({ code: 'VUPTH10' });
      return [201, { id: 'c1', name: 'Lançamento' }];
    });
    const res = await campaignService.redeem('VUPTH10', 'tok');
    expect(res.status).toBe(201);
    expect(res.data.name).toBe('Lançamento');
  });

  it('listMine envia GET /campaigns/me', async () => {
    mock.onGet('/campaigns/me').reply(200, [{ id: 'c1' }]);
    const res = await campaignService.listMine('tok');
    expect(res.data).toHaveLength(1);
  });
});
