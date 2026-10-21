import { fireEvent, within } from '@testing-library/react-native';

import { renderWithProviders } from '../utils/renderWithProviders';
import { ChangeTurnModal } from '@components/ChangeTurnModal';

// Andre 2026-08-05: "no menu de mudar minha vez, ir para o final etc, quero
// apenas as opções com a opção de select". As saídas deixaram de ser telas
// encadeadas de botões e viraram UMA lista de escolha + Confirmar.

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

function setup(overrides: Partial<React.ComponentProps<typeof ChangeTurnModal>> = {}) {
  const props = {
    visible: true,
    tailEtaMs: null,
    isLast: false,
    onMoveToEnd: jest.fn(),
    onReschedule: jest.fn(),
    onCreateSwapOffer: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  return { props, ...renderWithProviders(<ChangeTurnModal {...props} />) };
}

describe('ChangeTurnModal', () => {
  it('mostra as quatro saídas como opções selecionáveis', () => {
    const { getByTestId } = setup();

    expect(getByTestId('change-turn-earlier')).toBeTruthy();
    expect(getByTestId('change-turn-later')).toBeTruthy();
    expect(getByTestId('change-turn-end')).toBeTruthy();
    expect(getByTestId('change-turn-schedule')).toBeTruthy();
  });

  // GUIA_DE_TEXTO.md §4.4: grupos "Mais cedo" / "Mais tarde" (sem caixa alta) e
  // cada opção em um verbo; a descrição de uma linha fica.
  it('os grupos e as opções seguem o guia de texto', () => {
    const { getByText, getByTestId, queryByText } = setup();

    expect(getByText('Mais cedo')).toBeTruthy();
    expect(getByText('Mais tarde')).toBeTruthy();
    expect(queryByText(/QUERO SER ATENDIDO|PRECISO DE MAIS TEMPO/)).toBeNull();
    for (const [id, rotulo] of [
      ['earlier', 'Adiantar'],
      ['later', 'Trocar'],
      ['end', 'Ir para o fim'],
      ['schedule', 'Agendar'],
    ]) {
      expect(within(getByTestId(`change-turn-${id}`)).getByText(rotulo)).toBeTruthy();
    }
    expect(getByText('Publicamos seu pedido para quem está à frente')).toBeTruthy();
  });

  it('a fila de hoje é a legenda de "Mais tarde", não de "Mais cedo"', () => {
    const { getByText } = setup({ tailEtaMs: new Date(2026, 9, 18, 14, 35).getTime() });
    expect(getByText('A fila de hoje termina às 14:35.')).toBeTruthy();
  });

  it('publicando: o botão continua "Confirmar", desabilitado, com o spinner (sem "Publicando...")', () => {
    const { props, getByTestId, queryByText } = setup({ swapBusy: true });
    fireEvent.press(getByTestId('change-turn-earlier'));
    fireEvent.press(getByTestId('change-turn-confirm'));
    expect(props.onCreateSwapOffer).not.toHaveBeenCalled();
    expect(queryByText(/Publicando/)).toBeNull();
  });

  it('não confirma nada enquanto nenhuma opção estiver marcada', () => {
    const { props, getByTestId } = setup();

    fireEvent.press(getByTestId('change-turn-confirm'));

    expect(props.onCreateSwapOffer).not.toHaveBeenCalled();
    expect(props.onMoveToEnd).not.toHaveBeenCalled();
    expect(props.onReschedule).not.toHaveBeenCalled();
  });

  it('adiantar publica oferta EARLIER; trocar com quem está atrás publica LATER', () => {
    const earlier = setup();
    fireEvent.press(earlier.getByTestId('change-turn-earlier'));
    fireEvent.press(earlier.getByTestId('change-turn-confirm'));
    expect(earlier.props.onCreateSwapOffer).toHaveBeenCalledWith('EARLIER');

    const later = setup();
    fireEvent.press(later.getByTestId('change-turn-later'));
    fireEvent.press(later.getByTestId('change-turn-confirm'));
    expect(later.props.onCreateSwapOffer).toHaveBeenCalledWith('LATER');
  });

  it('ir para o fim e agendar chamam as ações da tela', () => {
    const end = setup();
    fireEvent.press(end.getByTestId('change-turn-end'));
    fireEvent.press(end.getByTestId('change-turn-confirm'));
    expect(end.props.onMoveToEnd).toHaveBeenCalled();

    const schedule = setup();
    fireEvent.press(schedule.getByTestId('change-turn-schedule'));
    fireEvent.press(schedule.getByTestId('change-turn-confirm'));
    expect(schedule.props.onReschedule).toHaveBeenCalled();
  });

  it('quem já é o último não consegue marcar "ir para o fim"', () => {
    const { props, getByTestId } = setup({ isLast: true });

    fireEvent.press(getByTestId('change-turn-end'));
    fireEvent.press(getByTestId('change-turn-confirm'));

    expect(props.onMoveToEnd).not.toHaveBeenCalled();
    expect(getByTestId('change-turn-end').props.accessibilityState.disabled).toBe(true);
  });

  it('cancelar fecha e limpa a escolha', () => {
    const { props, getByText, getByTestId } = setup();

    fireEvent.press(getByTestId('change-turn-earlier'));
    fireEvent.press(getByText('Cancelar'));

    expect(props.onClose).toHaveBeenCalled();
    expect(getByTestId('change-turn-earlier').props.accessibilityState.selected).toBe(false);
  });
});
