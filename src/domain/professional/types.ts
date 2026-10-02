import { WorkStatus } from "./expediente";

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
  // Expediente (contrato de 19/09): WORKING / ON_BREAK / OFF. Opcional porque
  // producao ainda pode rodar o backend anterior — quem le usa
  // `@domain/professional/expediente`, onde a ausencia conta como trabalhando.
  work_status?: WorkStatus | null;
  // Fila fechada para novos com ele trabalhando (S1 fatia 3) — ver `filaFechada`.
  accepting_new?: boolean | null;
  // Fila ou so agenda (Backend 8e6c00f) — ver `@domain/professional/modo`.
  operation_mode?: 'QUEUE' | 'AGENDA_ONLY' | null;
  // Foto de perfil (Backend 46f1f74, em producao) — null sem foto: ficam as iniciais.
  profile_image_url?: string | null;
  waiting_list: AttendanceInQueue[];
  queue_count: number;
  estimated_wait_minutes: number;
  // Avaliação (Item 6 backend) — média e contagem denormalizadas. Opcional até o
  // backend implementar; quando ausente, o front usa placeholder (pseudoRating).
  rating_average?: number | null;
  rating_count?: number;
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
  /** Tempo configurado pelo profissional — o que o cliente ve (Backend d1165a2). */
  estimatedMinutes?: number | null;
  weeklyAverageDurationInMinutes: number | null;
}
