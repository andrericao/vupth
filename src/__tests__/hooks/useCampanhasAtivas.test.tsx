import { renderHook, waitFor } from '@testing-library/react-native';

import { useCampanhasAtivas } from '@hooks/useCampanhasAtivas';
import { campaignService } from '@services/campaignService';

let mockToken: string | null = 'tk';
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: mockToken }),
}));
jest.mock('@services/campaignService', () => ({ campaignService: { listActive: jest.fn() } }));

const lista = campaignService.listActive as jest.Mock;

describe('useCampanhasAtivas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToken = 'tk';
  });

  it('lê as campanhas ao montar e descarta as sem nome', async () => {
    lista.mockResolvedValue({ data: [{ id: 'a', name: 'Compartilhe e ganhe' }, { id: 'b', name: '' }] });
    const { result } = renderHook(() => useCampanhasAtivas());
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(lista).toHaveBeenCalledWith('tk');
  });

  it('campanha encerrada ou esgotada some da lista (DEC-124)', async () => {
    lista.mockResolvedValue({
      data: [
        { id: 'a', name: 'Vale', ends_at: '2099-01-01T00:00:00', remaining_slots: 2 },
        { id: 'b', name: 'Passou', ends_at: '2020-01-01T00:00:00' },
        { id: 'c', name: 'Esgotou', ends_at: '2099-01-01T00:00:00', remaining_slots: 0 },
      ],
    });
    const { result } = renderHook(() => useCampanhasAtivas());
    await waitFor(() => expect(result.current.map((c) => c.id)).toEqual(['a']));
  });

  it('sem conta não lê nada', () => {
    mockToken = null;
    const { result } = renderHook(() => useCampanhasAtivas());
    expect(result.current).toEqual([]);
    expect(lista).not.toHaveBeenCalled();
  });

  it('falha de rede deixa a lista vazia', async () => {
    lista.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useCampanhasAtivas());
    await waitFor(() => expect(lista).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it('resposta que não é lista é ignorada', async () => {
    lista.mockResolvedValue({ data: null });
    const { result } = renderHook(() => useCampanhasAtivas());
    await waitFor(() => expect(lista).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });
});
