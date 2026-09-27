import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { ScheduleModal } from '@components/ScheduleModal';
import { notifyComingSoon } from '@domain/comingSoon';

jest.mock('@domain/comingSoon', () => ({ notifyComingSoon: jest.fn() }));

describe('ScheduleModal', () => {
  const onClose = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  function renderModal() {
    return renderWithProviders(<ScheduleModal visible onClose={onClose} />);
  }

  it('mostra o seletor de dia (Hoje) em vez do split hoje/outro-dia', () => {
    const { getByText, queryByText } = renderModal();
    expect(getByText('Hoje')).toBeTruthy();
    expect(queryByText('Para hoje, mais tarde')).toBeNull();
    expect(queryByText('Para outro dia')).toBeNull();
  });

  it('sem dia escolhido, "Confirmar" não dispara nada', () => {
    const { getByText } = renderModal();
    fireEvent.press(getByText('Confirmar'));
    expect(notifyComingSoon).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('escolher "Hoje" e confirmar conta agendar_hoje e fecha (barra em breve)', () => {
    const { getByText } = renderModal();
    fireEvent.press(getByText('Hoje'));
    fireEvent.press(getByText('Confirmar'));
    expect(notifyComingSoon).toHaveBeenCalledWith('agendar_hoje');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('escolher outro dia (2ª pílula) conta agendar_outro_dia', () => {
    const { getByText, getAllByRole } = renderModal();
    // Ordem de render: pílulas de dia primeiro; [1] = amanhã.
    fireEvent.press(getAllByRole('button')[1]);
    fireEvent.press(getByText('Confirmar'));
    expect(notifyComingSoon).toHaveBeenCalledWith('agendar_outro_dia');
  });

  it('"Cancelar" só fecha, sem contar', () => {
    const { getByText } = renderModal();
    fireEvent.press(getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(notifyComingSoon).not.toHaveBeenCalled();
  });
});
