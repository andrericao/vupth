import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { EscolhaDeCupom } from '@components/EscolhaDeCupom';

// cupom-em-configuracoes + cupom-abate-no-resumo (André, 24/10): "usar cupom" é um toggle por cupom ativo,
// um só por compra, abaixo do card verde.

const cupons = [
  { id: 'a', name: 'Lançamento', value_percent: 10 },
  { id: 'b', name: 'Amigo', value_amount: 5 },
];

describe('EscolhaDeCupom', () => {
  it('sem cupom ativo, não aparece', () => {
    const { queryByTestId } = renderWithProviders(<EscolhaDeCupom cupons={[]} escolhido={null} onEscolher={jest.fn()} />);
    expect(queryByTestId('escolha-de-cupom')).toBeNull();
  });

  it('mostra "Usar cupom" com nome e regra; ligar escolhe e desligar tira', () => {
    const onEscolher = jest.fn();
    const livre = renderWithProviders(<EscolhaDeCupom cupons={cupons} escolhido={null} onEscolher={onEscolher} />);
    expect(livre.getAllByText('Usar cupom')).toHaveLength(2);
    expect(livre.getByText('Lançamento · 10% de desconto')).toBeTruthy();
    expect(livre.getByTestId('usar-cupom-a').props.value).toBe(false);
    fireEvent(livre.getByTestId('usar-cupom-a'), 'valueChange', true);
    expect(onEscolher).toHaveBeenLastCalledWith('a');
    livre.unmount();
    const escolhido = renderWithProviders(<EscolhaDeCupom cupons={cupons} escolhido="a" onEscolher={onEscolher} />);
    expect(escolhido.getByTestId('usar-cupom-a').props.value).toBe(true);
    expect(escolhido.getByTestId('usar-cupom-b').props.value).toBe(false);
    fireEvent(escolhido.getByTestId('usar-cupom-a'), 'valueChange', false);
    expect(onEscolher).toHaveBeenLastCalledWith(null);
  });
});
