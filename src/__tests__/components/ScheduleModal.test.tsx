import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { ScheduleModal } from '@components/ScheduleModal';
import { notifyComingSoon } from '@domain/comingSoon';

jest.mock('@domain/comingSoon', () => ({ notifyComingSoon: jest.fn() }));

describe('ScheduleModal', () => {
  const onClose = jest.fn();
  const onScheduleToday = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  function renderModal() {
    return renderWithProviders(
      <ScheduleModal visible onClose={onClose} onScheduleToday={onScheduleToday} />,
    );
  }

  it('"Para hoje, mais tarde" fecha o modal e abre o seletor (onScheduleToday)', () => {
    const { getByText } = renderModal();
    fireEvent.press(getByText('Para hoje, mais tarde'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onScheduleToday).toHaveBeenCalledTimes(1);
    expect(notifyComingSoon).not.toHaveBeenCalled();
  });

  it('"Para outro dia" mostra "em breve" (agendar_outro_dia)', () => {
    const { getByText } = renderModal();
    fireEvent.press(getByText('Para outro dia'));
    expect(notifyComingSoon).toHaveBeenCalledWith('agendar_outro_dia');
  });

  it('"Cancelar" só fecha', () => {
    const { getByText } = renderModal();
    fireEvent.press(getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onScheduleToday).not.toHaveBeenCalled();
    expect(notifyComingSoon).not.toHaveBeenCalled();
  });
});
