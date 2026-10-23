import { Alert } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { GluestackUIProvider } from '@gluestack-ui/themed';

import { CarrosselDeCampanhas } from '@components/CarrosselDeCampanhas';
import { config } from '../../../config/gluestack-ui.config';

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
});
