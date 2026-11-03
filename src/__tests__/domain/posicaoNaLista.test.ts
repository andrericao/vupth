import { marcarPosicaoNaLista, tirarPosicaoNaLista } from '@domain/establishment/posicaoNaLista';
import { establishmentService } from '@services/establishmentService';
import { api } from '@services/api';

// posicao-na-lista (DEC-176): a posição da loja na lista vai uma vez só no ?list_position=N.
jest.mock('@services/api', () => ({ api: { get: jest.fn() } }));
const get = api.get as jest.Mock;

describe('a posição da loja na lista', () => {
  it('índice 0 é a posição 1; vale uma busca só', () => {
    marcarPosicaoNaLista('e1', 0);
    expect(tirarPosicaoNaLista('e1')).toBe(1);
    expect(tirarPosicaoNaLista('e1')).toBeUndefined();
  });

  it('a última marcação vale; lojas não se misturam', () => {
    marcarPosicaoNaLista('e1', 4);
    marcarPosicaoNaLista('e1', 1);
    marcarPosicaoNaLista('e2', 7);
    expect(tirarPosicaoNaLista('e1')).toBe(2);
    expect(tirarPosicaoNaLista('e2')).toBe(8);
  });

  it('índice inválido (não achou na lista, fração, sem id) não marca', () => {
    marcarPosicaoNaLista('e1', -1);
    marcarPosicaoNaLista('e1', 1.5);
    marcarPosicaoNaLista('', 3);
    expect(tirarPosicaoNaLista('e1')).toBeUndefined();
    expect(tirarPosicaoNaLista('')).toBeUndefined();
  });
});

describe('GET /establishment/id/{id} com a posição', () => {
  beforeEach(() => get.mockReset().mockResolvedValue({ data: {} }));

  it('com a posição, vai o list_position', async () => {
    await establishmentService.getById('e1', 3);
    expect(get).toHaveBeenCalledWith('/establishment/id/e1', { params: { list_position: 3 } });
  });

  it('sem a posição (link, Recentes, atalho), a busca de sempre', async () => {
    await establishmentService.getById('e1');
    expect(get).toHaveBeenCalledWith('/establishment/id/e1', undefined);
  });
});
