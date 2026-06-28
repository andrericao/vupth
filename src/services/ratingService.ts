import { api } from './api';

export interface RatingRequest {
  score: number; // 1-5 (inteiro)
  comment?: string;
}

// Avaliação de atendimento (Item 6 backend). POST /attendances/{id}/rating —
// só o cliente dono do atendimento, só com status FINISHED, 1 voto (409 no 2º).
export const ratingService = {
  submit(attendanceId: string, data: RatingRequest, accessToken: string) {
    return api.post(`/attendances/${attendanceId}/rating`, data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  },
};
