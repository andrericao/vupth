import { api } from './api';

export interface CreateAttendanceRequest {
  professionalId: string;
  establishmentId: string;
  serviceItemIds: string[];
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
};
