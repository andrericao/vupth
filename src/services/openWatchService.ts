import { api } from './api';

// avisar-quando-abrir, fatia 1 (BAK-8, DEC-160, Backend 5cca738). So logado, so o dia de hoje (expira a
// meia-noite), sem recorrencia; tudo opt-in e cada pedido avisa uma vez.
//   NOTIFY_OPEN: push "<Profissional> começou a atender" (sem profissional, o primeiro da loja).
//   QUEUE_MOVING: para quem ja tem horario marcado, push "A fila começou a andar".
// POST repetido devolve 200 com o mesmo id. Erros: 401, 404 ESTABLISHMENT_NOT_FOUND,
// 422 OPEN_WATCH_PROFESSIONAL_INVALID, 429 OPEN_WATCH_LIMIT (20 por dia), 404 OPEN_WATCH_NOT_FOUND no DELETE.
export type TipoDeAviso = 'NOTIFY_OPEN' | 'QUEUE_MOVING';

export interface AvisoDeAbertura {
  id: string;
  establishment_id: string;
  professional_id: string | null;
  kind: TipoDeAviso;
  day: string;
  created_at: string;
  fired_at: string | null;
}

export interface PedidoDeAviso {
  establishment_id: string;
  professional_id?: string;
  kind: TipoDeAviso;
}

const auth = (accessToken: string) => ({ headers: { Authorization: `Bearer ${accessToken}` } });

export const openWatchService = {
  pedir(pedido: PedidoDeAviso, accessToken: string) {
    return api.post<AvisoDeAbertura>('/open-watches', pedido, auth(accessToken));
  },
  deHoje(accessToken: string) {
    return api.get<AvisoDeAbertura[]>('/open-watches/me', auth(accessToken));
  },
  cancelar(id: string, accessToken: string) {
    return api.delete(`/open-watches/${id}`, auth(accessToken));
  },
};
