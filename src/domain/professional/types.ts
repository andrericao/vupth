export type Specialty = 'BARBER' | 'HAIRDRESSER' | 'NAIL_TECH' | 'MASSEUSE' | 'ESTHETICIAN';

export interface Professional {
  id: string;
  name: string;
  specialty: Specialty;
  isAvailable: boolean;
  establishmentId?: string;
}

export interface ProfessionalWithQueue extends Professional {
  attendancesInQueue: QueueAttendance[];
  estimatedWaitMinutes: number;
}

export interface QueueAttendance {
  id: string;
  clientName?: string;
  position: number;
  estimatedWaitMinutes: number;
}
