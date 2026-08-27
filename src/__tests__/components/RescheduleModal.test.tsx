import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { RescheduleModal } from '@components/RescheduleModal';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

const BASE = new Date(2026, 0, 1, 10, 0, 0).getTime(); // 01/01/2026 10:00 (piso)

describe('RescheduleModal (seletor HH:MM)', () => {
  const onConfirm = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  function renderModal(penalty = false) {
    return renderWithProviders(
      <RescheduleModal
        visible
        baseMs={BASE}
        tailEtaMs={null}
        penalty={penalty}
        loading={false}
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
  }

  it('horário válido chama onConfirm com o ISO do alvo', () => {
    const { getByText, getByPlaceholderText } = renderModal();
    fireEvent.changeText(getByPlaceholderText('HH'), '14');
    fireEvent.changeText(getByPlaceholderText('MM'), '30');
    fireEvent.press(getByText('Agendar'));

    expect(onConfirm).toHaveBeenCalledWith(new Date(2026, 0, 1, 14, 30, 0, 0).toISOString());
  });

  it('horário antes do piso mostra erro e NÃO confirma', () => {
    const { getByText, getByPlaceholderText, queryByText } = renderModal();
    fireEvent.changeText(getByPlaceholderText('HH'), '09');
    fireEvent.changeText(getByPlaceholderText('MM'), '00');
    fireEvent.press(getByText('Agendar'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(queryByText(/após o fim da fila/i)).toBeTruthy();
  });

  it('hora inválida (>23) mostra erro', () => {
    const { getByText, getByPlaceholderText, queryByText } = renderModal();
    fireEvent.changeText(getByPlaceholderText('HH'), '99');
    fireEvent.changeText(getByPlaceholderText('MM'), '00');
    fireEvent.press(getByText('Agendar'));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(queryByText(/hora inválida/i)).toBeTruthy();
  });

  it('com penalty exibe o aviso de multa', () => {
    const { getByText } = renderModal(true);
    expect(getByText(/multa/i)).toBeTruthy();
  });

  it('Cancelar fecha', () => {
    const { getByText } = renderModal();
    fireEvent.press(getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });
});
