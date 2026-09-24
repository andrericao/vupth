import { renderWithProviders } from '../utils/renderWithProviders';
import { AttendanceDetailModal } from '@components/AttendanceDetailModal';
import { ClientAttendance } from '@services/attendanceService';

// Contrato de 18/09: o backend passou a separar REMOVED (a loja tirou o cliente
// da fila) de CANCELLED (o cliente desistiu). Sem o rótulo, o detalhe caía no
// fallback e mostrava o texto cru do servidor — "REMOVED" — na tela.

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

const atendimento = (status: string): ClientAttendance => ({
  id: 'a1',
  clientId: 'c1',
  clientName: 'André',
  professionalId: 'p1',
  professionalName: 'Carlos',
  establishmentId: 'e1',
  services: [],
  status,
  totalValue: 40,
  scheduledTime: '2026-09-24T14:00:00',
  startTime: null,
  endTime: null,
  durationInMinutes: null,
});

describe('AttendanceDetailModal — quem encerrou o atendimento', () => {
  it('REMOVED diz que foi a loja, e não mostra o status cru', () => {
    const { getByText, queryByText } = renderWithProviders(
      <AttendanceDetailModal attendance={atendimento('REMOVED')} onClose={jest.fn()} onRate={jest.fn()} />,
    );

    expect(getByText('Retirado pela loja')).toBeTruthy();
    expect(queryByText('REMOVED')).toBeNull();
  });

  it('CANCELLED segue "Cancelado" — atendimentos antigos também são CANCELLED quando foi a loja', () => {
    const { getByText } = renderWithProviders(
      <AttendanceDetailModal attendance={atendimento('CANCELLED')} onClose={jest.fn()} onRate={jest.fn()} />,
    );

    expect(getByText('Cancelado')).toBeTruthy();
  });
});
