import { api } from './api';

export interface CreateAttendanceRequest {
  professionalId: string;
  establishmentId: string;
  serviceItemIds: string[];
  scheduledTime?: string;
}

export interface AttendanceResponse {
  id: string;
  clientId: string;
  professionalId: string;
  establishmentId: string;
  status: string;
  scheduledTime: string;
}

export interface CancelAttendanceResponse {
  id: string;
  status: string;
}

export interface AttendanceServiceLine {
  id: string;
  customName: string;
  estimatedMinutes: number;
}

export interface ClientAttendance {
  id: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  professionalName: string;
  establishmentId: string;
  services: AttendanceServiceLine[];
  status: string;
  totalValue: number;
  scheduledTime: string;
  startTime: string | null;
  endTime: string | null;
  durationInMinutes: number | null;
}

export interface ClientAttendanceFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const attendanceService = {
  create(data: CreateAttendanceRequest, accessToken: string) {
    return api.post<AttendanceResponse>('/attendances', data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },

  cancel(attendanceId: string, accessToken: string) {
    return api.put<CancelAttendanceResponse>(
      `/attendances/${attendanceId}/cancel`,
      null,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
  },

  listClientHistory(accessToken: string, filters?: ClientAttendanceFilters) {
    return api.get<ClientAttendance[]>('/attendances/client/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: filters,
    });
  },
};
