import { Alert } from 'react-native';
import { useComingSoonStore } from '@stores/comingSoonStore';

// Funcionalidades cuja UI já existe no front, mas que AGUARDAM ENDPOINT do backend.
// Ao tocar, mostram "em breve" e contabilizam o toque (comingSoonStore) para o
// Andre priorizar depois. Quando o endpoint existir, é só trocar o notifyComingSoon
// pela chamada real no ponto de uso.
// 'agendar_hoje' (#40): o front manda targetTime no POST /attendances, mas no
// device (2026-07-14) o comportamento divergiu da spec (cliente atendível na hora,
// sem ceder a vez). O backend PRD marca o #40 como CONCLUÍDO+testado (distinto do
// status INTENTION/S2) → é divergência a DIAGNOSTICAR (backend na fila viva ou
// display no front), não "backend não fez". Revertido para "em breve" até o
// diagnóstico; religar trocando por goToQueue(targetTime). Ver HANDOFF_BACKEND §12.1.
// 'esqueci_senha' SAIU (2026-07-22): backend entregou forgot/reset-password e a
// tela ForgotPassword está LIGADA (Login → forgotPassword).
export type ComingSoonFeature =
  | 'agendar_hoje'
  | 'agendar_outro_dia'
  | 'trocar_posicao'
  | 'manifestar_interesse';

export const COMING_SOON_LABELS: Record<ComingSoonFeature, string> = {
  agendar_hoje: 'Agendar para hoje, mais tarde',
  agendar_outro_dia: 'Agendar para outro dia',
  trocar_posicao: 'Trocar posição na fila',
  manifestar_interesse: 'Manifestar interesse (loja fechada)',
};

// Ordem estável para exibir a lista em Config.
export const COMING_SOON_FEATURES = Object.keys(COMING_SOON_LABELS) as ComingSoonFeature[];

/** Registra o toque e avisa "em breve". Ponto único a trocar quando o endpoint vier. */
export function notifyComingSoon(feature: ComingSoonFeature) {
  void useComingSoonStore.getState().tap(feature);
  Alert.alert('Em breve 🚧', `${COMING_SOON_LABELS[feature]} estará disponível em breve.`);
}
