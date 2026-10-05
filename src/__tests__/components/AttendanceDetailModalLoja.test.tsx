import { renderWithProviders } from '../utils/renderWithProviders';
import { AttendanceDetailModal } from '@components/AttendanceDetailModal';
import { ClientAttendance } from '@services/attendanceService';

// Backend a883210: GET /attendances/client/me traz o establishmentName. Com ele,
// o detalhe diz onde foi; sem ele (backend anterior), a linha some.

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

const atendimento = (establishmentName?: string | null): ClientAttendance => ({
  id: 'a1',
  clientId: 'c1',
  clientName: 'André',
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  establishmentName,
  services: [],
  status: 'FINISHED',
  totalValue: 40,
  scheduledTime: '2026-09-24T14:00:00',
  startTime: null,
  endTime: null,
  durationInMinutes: null,
});

describe('AttendanceDetailModal — o nome da loja', () => {
  it('com establishmentName, mostra a linha Local', () => {
    const { getByText } = renderWithProviders(
      <AttendanceDetailModal attendance={atendimento('Barbearia do Zé')} onClose={jest.fn()} onRate={jest.fn()} />,
    );
    expect(getByText('Local')).toBeTruthy();
    expect(getByText('Barbearia do Zé')).toBeTruthy();
  });

  it.each([undefined, null, ''])('sem o nome (%p), não mostra a linha', (nome) => {
    const { queryByText } = renderWithProviders(
      <AttendanceDetailModal attendance={atendimento(nome)} onClose={jest.fn()} onRate={jest.fn()} />,
    );
    expect(queryByText('Local')).toBeNull();
  });
});
