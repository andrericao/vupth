import { establishmentService } from '@services/establishmentService';
import { api } from '@services/api';

// um-refresh-por-vez (log [SLOW] de 15/10): dois GET /establishment/{id}/hours
// juntos na mesma tela. Com um no ar, quem pede de novo recebe a mesma resposta.

jest.mock('@services/api', () => ({ api: { get: jest.fn() } }));
const get = api.get as jest.Mock;

describe('establishmentService.getHours — um por loja de cada vez', () => {
  beforeEach(() => get.mockReset());

  it('dois pedidos juntos da mesma loja: um GET só, a mesma resposta', async () => {
    let soltar: (v: unknown) => void = () => {};
    get.mockReturnValueOnce(new Promise((r) => (soltar = r)));
    const um = establishmentService.getHours('e1');
    const dois = establishmentService.getHours('e1');
    soltar({ data: { configured: true } });
    await expect(um).resolves.toEqual({ data: { configured: true } });
    await expect(dois).resolves.toEqual({ data: { configured: true } });
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/establishment/e1/hours');
  });

  it('lojas diferentes não se misturam; depois da resposta, lê de novo', async () => {
    get.mockResolvedValue({ data: null });
    await Promise.all([establishmentService.getHours('e1'), establishmentService.getHours('e2')]);
    expect(get).toHaveBeenCalledTimes(2);
    await establishmentService.getHours('e1');
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('falhou: o próximo pedido tenta de novo', async () => {
    get.mockRejectedValueOnce(new Error('404')).mockResolvedValueOnce({ data: null });
    await expect(establishmentService.getHours('e1')).rejects.toThrow('404');
    await expect(establishmentService.getHours('e1')).resolves.toEqual({ data: null });
  });
});
