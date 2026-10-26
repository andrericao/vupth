import { Alert, StyleSheet } from 'react-native';
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

  // card-ticket-pontilhado (André, 24/10): o card da Início é o ticket do mockup 2.
  it('o card é um ticket: valor grande, validade, picote só à esquerda, vão de 12 px e Participar só na campanha de link', () => {
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const t = wrap(
      <CarrosselDeCampanhas
        campanhas={[
          { id: 'd', name: 'Desconto de lançamento', benefit: 'DISCOUNT', type: 'DISCOUNT', value_percent: 10, ends_at: '2099-11-05T21:30:00' },
          { id: 'l', name: 'Indique', benefit: 'CASH', type: 'REFERRAL_BONUS', value_amount: 10 },
        ]}
      />
    );
    expect(t.getByTestId('campanha-d-valor')).toHaveTextContent('10%');
    expect(t.getByTestId('campanha-l-valor')).toHaveTextContent('R$ 10,00');
    expect(t.getByText('Válido até 05/11 às 21:30')).toBeTruthy();
    expect(t.getByTestId('campanha-d-picote-esquerdo')).toBeTruthy();
    expect(t.queryByTestId('campanha-d-picote-direito')).toBeNull();
    expect(StyleSheet.flatten(t.getByTestId('campanhas-da-home').props.contentContainerStyle).gap).toBe(12);
    expect(t.queryByTestId('participar-d')).toBeNull();
    expect(t.getByTestId('participar-l')).toBeTruthy();
    spy.mockRestore();
  });

  it('o botão Participar do card chama o join direto', async () => {
    useAuthStore.setState({ accessToken: 'tk' } as never);
    mockJoin.mockResolvedValue({ data: {} });
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const t = wrap(<CarrosselDeCampanhas campanhas={[{ id: 'l', name: 'Indique', type: 'REFERRAL_BONUS' }]} />);
    await act(async () => { fireEvent.press(t.getByTestId('participar-l')); });
    expect(mockJoin).toHaveBeenCalledWith('l', 'tk');
    spy.mockRestore();
  });

  // cards-de-promocao-em-portugues (André, 24/10): o código do servidor nunca aparece cru no card.
  it('o card traz o benefício em português, nunca DISCOUNT nem CASH', () => {
    const t = wrap(
      <CarrosselDeCampanhas
        campanhas={[
          { id: 'd', name: 'Desconto de lançamento', benefit: 'DISCOUNT', type: 'DISCOUNT' },
          { id: 'c', name: 'Indique', benefit: 'CASH', type: 'REFERRAL_BONUS' },
        ]}
      />
    );
    expect(t.getByText('Desconto')).toBeTruthy();
    expect(t.getByText('Ganho em dinheiro')).toBeTruthy();
    expect(t.queryByText('DISCOUNT')).toBeNull();
    expect(t.queryByText('CASH')).toBeNull();
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

  // DEC-124: o toque numa campanha que passou do prazo ou esgotou abre o modal, sem os detalhes.
  it('campanha encerrada ou esgotada abre o modal certo; Participar recusado também', async () => {
    useAuthStore.setState({ accessToken: 'tk' } as never);
    const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const t = wrap(
      <CarrosselDeCampanhas
        campanhas={[
          { id: 'e', name: 'Velha', ends_at: '2020-01-01T00:00:00' },
          { id: 's', name: 'Sem vaga', ends_at: '2099-01-01T00:00:00', remaining_slots: 0 },
          { id: 'l', name: 'Link', type: 'REFERRAL_BONUS' },
        ]}
      />
    );
    fireEvent.press(t.getByTestId('campanha-e'));
    expect(spy).toHaveBeenLastCalledWith('Promoção encerrada', expect.any(String), expect.any(Array), expect.anything());
    fireEvent.press(t.getByTestId('campanha-s'));
    expect(spy).toHaveBeenLastCalledWith('Promoção esgotada', expect.any(String), expect.any(Array), expect.anything());
    mockJoin.mockRejectedValue({ response: { status: 409, data: { code: 'CAMPAIGN_SOLD_OUT' } } });
    fireEvent.press(t.getByTestId('campanha-l'));
    const botoes = spy.mock.calls[spy.mock.calls.length - 1][2] as { onPress?: () => void }[];
    await act(async () => { botoes[0].onPress?.(); });
    expect(spy).toHaveBeenLastCalledWith('Promoção esgotada', expect.any(String), expect.any(Array), expect.anything());
    spy.mockRestore();
  });
});
