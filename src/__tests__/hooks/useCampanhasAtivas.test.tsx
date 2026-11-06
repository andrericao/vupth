import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useCampanhasAtivas, useCampanhasDisponiveis } from '@hooks/useCampanhasAtivas';
import { campaignService } from '@services/campaignService';
import { referralService } from '@services/referralService';

let mockToken: string | null = 'tk';
jest.mock('@stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ accessToken: mockToken }),
}));
jest.mock('@services/campaignService', () => ({ campaignService: { listActive: jest.fn(), listMine: jest.fn() } }));
jest.mock('@services/referralService', () => ({ referralService: { me: jest.fn() } }));

const lista = campaignService.listActive as jest.Mock;
const meus = campaignService.listMine as jest.Mock;
const links = referralService.me as jest.Mock;

describe('useCampanhasAtivas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToken = 'tk';
    meus.mockResolvedValue({ data: [] });
    links.mockResolvedValue({ data: { campaigns: [] } });
  });

  // promocoes-em-secoes (André, 05/11): a campanha em que a pessoa ja esta sai do carrossel.
  it('sem a campanha em que ja participa: cupom ativado (id ou codigo) ou link', async () => {
    lista.mockResolvedValue({
      data: [
        { id: 'cupom', name: 'Cupom', code: 'VUPTH10' },
        { id: 'outro-id', name: 'Mesmo codigo', code: 'promo5' },
        { id: 'link', name: 'Indique', type: 'REFERRAL_BONUS' },
        { id: 'nova', name: 'Nova' },
      ],
    });
    meus.mockResolvedValue({ data: [{ id: 'cupom', status: 'ACTIVE' }, { id: 'x', code: 'PROMO5 ', status: 'USED' }] });
    links.mockResolvedValue({ data: { campaigns: [{ campaign_id: 'link', link: 'l' }] } });
    const { result } = renderHook(() => useCampanhasAtivas());
    await waitFor(() => expect(result.current.map((c) => c.id)).toEqual(['nova']));
  });

  it('sem as listas da pessoa (falha ou formato estranho), mostra todas as no ar', async () => {
    lista.mockResolvedValue({ data: [{ id: 'a', name: 'A' }] });
    meus.mockRejectedValue(new Error('x'));
    links.mockResolvedValue({ data: null });
    const { result } = renderHook(() => useCampanhasAtivas());
    await waitFor(() => expect(result.current.map((c) => c.id)).toEqual(['a']));
    meus.mockResolvedValue({ data: 'x' });
    links.mockRejectedValue(new Error('y'));
    const outro = renderHook(() => useCampanhasAtivas());
    await waitFor(() => expect(outro.result.current.map((c) => c.id)).toEqual(['a']));
  });

  it('recarregar le de novo (depois de Participar em Disponiveis)', async () => {
    lista.mockResolvedValue({ data: [{ id: 'l', name: 'Indique' }] });
    const { result } = renderHook(() => useCampanhasDisponiveis());
    await waitFor(() => expect(result.current.campanhas).toHaveLength(1));
    links.mockResolvedValue({ data: { campaigns: [{ campaign_id: 'l', link: 'x' }] } });
    await act(async () => result.current.recarregar());
    await waitFor(() => expect(result.current.campanhas).toHaveLength(0));
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
