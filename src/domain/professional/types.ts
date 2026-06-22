export interface Professional {
  id: string;
  name: string;
  specialty: string;
  is_available: boolean;
  current_attendance: AttendanceInQueue | null;
  establishment_id?: string;
  establishment_name?: string;
}

export interface ProfessionalWithQueue extends Professional {
  waiting_list: AttendanceInQueue[];
  queue_count: number;
  estimated_wait_minutes: number;
}

export interface AttendanceInQueue {
  id: string;
  establishmentId: string;
  establishmentName: string;
  professionalId: string;
  professionalName: string;
  clientId: string;
  clientName: string;
  services: AttendanceServiceItem[];
  status: string;
  totalValue: number;
  scheduledTime: string;
  estimatedMinutes: number;
  durationInMinutes: number | null;
}

export interface AttendanceServiceItem {
  id: string;
  customName: string;
  estimatedMinutes: number;
}

export interface ServiceItemResponse {
  id: string;
  serviceItemType: string;
  customName: string;
  price: number;
  weeklyAverageDurationInMinutes: number | null;
}
