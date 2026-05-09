import { ProfessionalWithQueue } from './types';

export const MOCK_PROFESSIONALS: Record<string, ProfessionalWithQueue[]> = {
  '1': [
    {
      id: 'p1',
      name: 'Carlos Silva',
      specialty: 'BARBER',
      isAvailable: true,
      establishmentId: '1',
      estimatedWaitMinutes: 15,
      attendancesInQueue: [
        { id: 'a1', clientName: 'João', position: 1, estimatedWaitMinutes: 15 },
      ],
    },
    {
      id: 'p2',
      name: 'Ricardo Santos',
      specialty: 'BARBER',
      isAvailable: true,
      establishmentId: '1',
      estimatedWaitMinutes: 45,
      attendancesInQueue: [
        { id: 'a2', clientName: 'Pedro', position: 1, estimatedWaitMinutes: 15 },
        { id: 'a3', clientName: 'Lucas', position: 2, estimatedWaitMinutes: 30 },
        { id: 'a4', clientName: 'Marcos', position: 3, estimatedWaitMinutes: 45 },
      ],
    },
  ],
  '2': [
    {
      id: 'p3',
      name: 'Ana Oliveira',
      specialty: 'HAIRDRESSER',
      isAvailable: true,
      establishmentId: '2',
      estimatedWaitMinutes: 0,
      attendancesInQueue: [],
    },
  ],
  '4': [
    {
      id: 'p4',
      name: 'João Mendes',
      specialty: 'BARBER',
      isAvailable: true,
      establishmentId: '4',
      estimatedWaitMinutes: 30,
      attendancesInQueue: [
        { id: 'a5', clientName: 'Felipe', position: 1, estimatedWaitMinutes: 15 },
        { id: 'a6', clientName: 'Gustavo', position: 2, estimatedWaitMinutes: 30 },
      ],
    },
  ],
};
