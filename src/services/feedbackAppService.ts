import { api } from './api';

// feedback-no-app (CLI, DEC-167, BAK-14 feedback-por-email): POST /feedback, so logado, 204 vazio.
// Erros: 422 VALIDATION_ERROR, 429 FEEDBACK_LIMIT (5 por usuario por dia), 401.
export interface FeedbackDoApp {
  text: string;
  app: 'CLIENT';
  category?: 'SUGESTAO' | 'PROBLEMA' | 'ELOGIO' | 'OUTRO';
  app_version?: string;
  device?: string;
}

export const feedbackAppService = {
  enviar(corpo: FeedbackDoApp, accessToken: string) {
    return api.post('/feedback', corpo, { headers: { Authorization: `Bearer ${accessToken}` } });
  },
};
