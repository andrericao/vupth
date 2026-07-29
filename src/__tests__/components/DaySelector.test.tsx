import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../utils/renderWithProviders';
import { DaySelector } from '@components/DaySelector';
import { isSameDay } from '@domain/schedule/days';

describe('DaySelector', () => {
  const from = new Date(2026, 6, 15, 9, 0); // 15/jul/2026

  it('mostra "Hoje" e os números dos dias seguintes', () => {
    const { getByText } = renderWithProviders(
      <DaySelector selectedDate={null} onSelect={jest.fn()} from={from} count={3} />,
    );
    expect(getByText('Hoje')).toBeTruthy();
    expect(getByText('16')).toBeTruthy();
    expect(getByText('17')).toBeTruthy();
  });

  it('chama onSelect com a data do dia tocado', () => {
    const onSelect = jest.fn();
    const { getByText } = renderWithProviders(
      <DaySelector selectedDate={null} onSelect={onSelect} from={from} count={3} />,
    );

    fireEvent.press(getByText('16'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(isSameDay(onSelect.mock.calls[0][0], new Date(2026, 6, 16))).toBe(true);
  });

  it('marca o dia selecionado como selected (a11y)', () => {
    const { getByLabelText } = renderWithProviders(
      <DaySelector selectedDate={new Date(2026, 6, 16)} onSelect={jest.fn()} from={from} count={3} />,
    );
    expect(getByLabelText('Dia 16').props.accessibilityState.selected).toBe(true);
    expect(getByLabelText('Hoje').props.accessibilityState.selected).toBe(false);
  });
});
