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
