import { api } from './api';

// Queda brusca da estimativa (DEC-128; Backend 028748a): "ok" aceita o horário novo; "preciso de mais tempo" devolve as
// opções e até quando valem sem multa; "passar a vez" propõe a troca ao próximo, que precisa aceitar.
const auth = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } });

export type OpcaoDaQueda = { action: string; method: string; path: string; needs_acceptance: boolean };
export type OpcoesDaQueda = { attendance_id: string; window_until: string | null; options: OpcaoDaQueda[] };

export const suddenDropService = {
  ack(attendanceId: string, accessToken: string) {
    return api.post<{ attendanceId: string; promisedTime: string }>(
      `/attendances/${attendanceId}/sudden-drop/ack`,
      undefined,
      auth(accessToken),
    );
  },
  needTime(attendanceId: string, accessToken: string) {
    return api.post<OpcoesDaQueda>(`/attendances/${attendanceId}/sudden-drop/need-time`, undefined, auth(accessToken));
  },
  passTurn(attendanceId: string, accessToken: string) {
    return api.post(`/attendances/${attendanceId}/sudden-drop/pass-turn`, undefined, auth(accessToken));
  },
};
