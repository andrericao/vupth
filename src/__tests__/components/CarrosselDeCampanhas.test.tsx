import { Alert } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { GluestackUIProvider } from '@gluestack-ui/themed';

import { CarrosselDeCampanhas } from '@components/CarrosselDeCampanhas';
import { useAuthStore } from '@stores/authStore';
import { config } from '../../../config/gluestack-ui.config';

const mockJoin = jest.fn();
jest.mock('@services/campaignService', () => ({
  campaignService: { join: (...a: unknown[]) => mockJoin(...a) },
}));
jest.mock('expo-secure-store');

const wrap = (ui: React.ReactElement) => render(<GluestackUIProvider config={config}>{ui}</GluestackUIProvider>);

describe('CarrosselDeCampanhas', () => {
  it('sem campanha o bloco some', () => {
    const t = wrap(<CarrosselDeCampanhas campanhas={[]} />);
    expect(t.queryByTestId('campanhas-da-home')).toBeNull();
  });

  it('mostra o nome de cada campanha e o toque abre os detalhes', () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const t = wrap(
      <CarrosselDeCampanhas
        campanhas={[
          { id: 'a', name: 'Compartilhe e ganhe', benefit: 'Corte grátis', description: 'Indique um amigo.' },
          { id: 'b', name: 'Acesse os cupons', code: 'VUPTH10' },
        ]}
      />
    );
    expect(t.getByText('Compartilhe e ganhe')).toBeTruthy();
    expect(t.getByText('Acesse os cupons')).toBeTruthy();
    fireEvent.press(t.getByTestId('campanha-b'));
    expect(spy).toHaveBeenCalledWith('Acesse os cupons', 'Código: VUPTH10', expect.any(Array), expect.anything());
    spy.mockRestore();
  });

  // compartilhe-e-ganhe (CLI-30, DEC-113): a campanha de link oferece "Participar".
  it('campanha de link: o toque oferece Participar; participar avisa onde fica o link', async () => {
    useAuthStore.setState({ accessToken: 'tk' } as never);
    mockJoin.mockResolvedValue({ data: {} });
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const t = wrap(<CarrosselDeCampanhas campanhas={[{ id: 'l1', name: 'Indique', type: 'REFERRAL_BONUS' }]} />);
    fireEvent.press(t.getByTestId('campanha-l1'));
    const botoes = spy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    expect(botoes.map((b) => b.text)).toEqual(['Participar', 'Fechar']);
    await act(async () => { botoes[0].onPress?.(); });
    expect(mockJoin).toHaveBeenCalledWith('l1', 'tk');
    expect(spy).toHaveBeenLastCalledWith('Você está dentro', expect.stringContaining('Promoções'), expect.any(Array), expect.anything());
    spy.mockRestore();
  });

  it('participar recusado avisa em uma frase; sem conta, nada', async () => {
    useAuthStore.setState({ accessToken: 'tk' } as never);
    mockJoin.mockRejectedValue({ response: { status: 409 } });
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const t = wrap(<CarrosselDeCampanhas campanhas={[{ id: 'l1', name: 'Indique', type: 'REFERRAL_BONUS' }]} />);
    fireEvent.press(t.getByTestId('campanha-l1'));
    const botoes = spy.mock.calls[0][2] as { onPress?: () => void }[];
    await act(async () => { botoes[0].onPress?.(); });
    expect(spy).toHaveBeenLastCalledWith('Campanha', expect.stringMatching(/já participa/), expect.any(Array), expect.anything());
    mockJoin.mockClear();
    await act(async () => { useAuthStore.setState({ accessToken: null } as never); });
    fireEvent.press(t.getByTestId('campanha-l1'));
    const semConta = spy.mock.calls[spy.mock.calls.length - 1][2] as { onPress?: () => void }[];
    await act(async () => { semConta[0].onPress?.(); });
    expect(mockJoin).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
