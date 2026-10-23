import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { EscolhaDeCupom } from '@components/EscolhaDeCupom';

// cupom-em-configuracoes: um cupom ativo por corte, ou nenhum.

const cupons = [
  { id: 'a', name: 'Lançamento', value_percent: 10 },
  { id: 'b', name: 'Amigo', value_amount: 5 },
];

describe('EscolhaDeCupom', () => {
  it('sem cupom ativo, não aparece', () => {
    const { queryByTestId } = renderWithProviders(<EscolhaDeCupom cupons={[]} escolhido={null} onEscolher={jest.fn()} />);
    expect(queryByTestId('escolha-de-cupom')).toBeNull();
  });

  it('mostra nome e regra; o toque escolhe, e no escolhido tira', () => {
    const onEscolher = jest.fn();
    const livre = renderWithProviders(<EscolhaDeCupom cupons={cupons} escolhido={null} onEscolher={onEscolher} />);
    expect(livre.getByText('10% de desconto')).toBeTruthy();
    fireEvent.press(livre.getByTestId('usar-cupom-a'));
    expect(onEscolher).toHaveBeenLastCalledWith('a');
    livre.unmount();
    const escolhido = renderWithProviders(<EscolhaDeCupom cupons={cupons} escolhido="a" onEscolher={onEscolher} />);
    expect(escolhido.getByText('✓ Lançamento')).toBeTruthy();
    fireEvent.press(escolhido.getByTestId('usar-cupom-a'));
    expect(onEscolher).toHaveBeenLastCalledWith(null);
  });
});
