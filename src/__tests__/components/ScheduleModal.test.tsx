import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { ScheduleModal } from '@components/ScheduleModal';
import { notifyComingSoon } from '@domain/comingSoon';

jest.mock('@domain/comingSoon', () => ({ notifyComingSoon: jest.fn() }));

describe('ScheduleModal', () => {
  const onClose = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  function renderModal() {
    return renderWithProviders(
      <ScheduleModal visible onClose={onClose} />,
    );
  }

  it('"Para hoje, mais tarde" mostra "em breve" (agendar_hoje) e fecha', () => {
    const { getByText } = renderModal();
    fireEvent.press(getByText('Para hoje, mais tarde'));
    expect(notifyComingSoon).toHaveBeenCalledWith('agendar_hoje');
    expect(onClose).toHaveBeenCalledTimes(1);
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
    expect(notifyComingSoon).not.toHaveBeenCalled();
  });
});
