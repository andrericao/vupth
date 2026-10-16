import { createNavigationContainerRef } from "@react-navigation/native";

import type { RotaDaNotificacao } from "@domain/push";
import { useQueueStore } from "@stores/queueStore";

// Ref global de navegação — permite navegar de FORA da árvore de componentes
// (ex.: ao tocar numa notificação push, em usePushRegistration). Anexado ao
// NavigationContainer em routes/index.tsx.
export const navigationRef = createNavigationContainerRef();

/**
 * Navega ao tocar numa notificação. `route` vem de `notificationRoute` (domain/push).
 *
 * Com o app FECHADO, o toque chega antes de a navegacao montar (o portao do
 * servidor vem antes): ate 05/10 o toque se perdia e o app abria na Home. Agora
 * espera o mount (ate ~15 s) e so entao navega.
 *
 * "fila": com a fila no aparelho, abre a tela dela; sem (app recem-aberto, a
 * fila ainda nao voltou do servidor), cai em Atendimentos — que reconstroi a
 * fila pelo servidor e mostra o cartao dela.
 */
export function navigateFromNotification(
  route: RotaDaNotificacao | null,
  tentativa = 0,
  espera: (fn: () => void, ms: number) => void = (fn, ms) => { setTimeout(fn, ms); },
): void {
  if (!route) return;
  if (!navigationRef.isReady()) {
    if (tentativa < 75) espera(() => navigateFromNotification(route, tentativa + 1, espera), 200);
    return;
  }
  // Atendimentos vive numa aba (tab navigator) — navigate afrouxado pois o ref
  // é destipado (o app usa vários navigators aninhados).
  const navigate = navigationRef.navigate as unknown as (name: string, params?: object) => void;
  const fila = route === "fila" ? useQueueStore.getState().activeQueue : null;
  if (fila) {
    navigate("homeTab", {
      screen: "queueStatus",
      // v7: sem o pop, uma fila ja aberta na pilha ganhava outra por cima.
      pop: true,
      params: {
        professionalId: fila.professionalId,
        establishmentId: fila.establishmentId,
        professionalName: fila.professionalName,
        establishmentName: fila.establishmentName,
        estimatedWaitMinutes: fila.estimatedMinutes,
      },
    });
    return;
  }
  navigate("atendimentosTab", { screen: "attendances", pop: true });
}

/**
 * Abre Atendimentos ja com a avaliacao do atendimento (push de concluido,
 * notificacao-avaliar CLI-33). Espera o mount como o toque comum.
 */
export function abrirAvaliacao(
  attendanceId: string,
  tentativa = 0,
  espera: (fn: () => void, ms: number) => void = (fn, ms) => { setTimeout(fn, ms); },
): void {
  if (!navigationRef.isReady()) {
    if (tentativa < 75) espera(() => abrirAvaliacao(attendanceId, tentativa + 1, espera), 200);
    return;
  }
  const navigate = navigationRef.navigate as unknown as (name: string, params?: object) => void;
  navigate("atendimentosTab", { screen: "attendances", pop: true, params: { avaliar: attendanceId } });
}

/**
 * Leva pro login depois do onboarding.
 *
 * O onboarding tem o navegador PROPRIO (ver routes/index.tsx): quando ele
 * sai, o navegador de abas monta pela primeira vez. Por isso a navegacao espera
 * as abas existirem (o `isReady` sozinho ja vale com a entrada na tela) em vez
 * de disparar na hora — no instante do toque a arvore das abas ainda nao existe.
 */
function abasMontadas(): boolean {
  if (!navigationRef.isReady()) return false;
  const nomes = (navigationRef.getRootState() as { routeNames?: string[] } | undefined)?.routeNames;
  return !nomes || nomes.includes("homeTab");
}

export function goToLoginAfterOnboarding(): void {
  const tryNavigate = (attempt = 0) => {
    if (abasMontadas()) {
      const navigate = navigationRef.navigate as unknown as (
        name: string,
        params?: object,
      ) => void;
      navigate("homeTab", { screen: "login", params: {}, pop: true });
      return;
    }
    // Ate ~1s de espera pelo mount; depois desiste e deixa na Home, que e um
    // destino valido (dava pra logar por ali de qualquer jeito).
    if (attempt < 20) setTimeout(() => tryNavigate(attempt + 1), 50);
  };
  tryNavigate();
}

/**
 * Abre a tela da fila ja no "Mudar minha vez" — o "Adiar minha vez" do aviso de
 * atraso, que vive fora das telas (useAvisoDeAtraso). Best-effort.
 */
export function abrirMudarMinhaVez(fila: {
  professionalId: string;
  establishmentId: string;
  professionalName?: string;
  establishmentName?: string;
}): void {
  if (!navigationRef.isReady()) return;
  const navigate = navigationRef.navigate as unknown as (name: string, params?: object) => void;
  navigate("homeTab", { screen: "queueStatus", pop: true, params: { ...fila, serviceItemIds: [], abrirMudarVez: true } });
}

// O estado da navegacao, guardado para a arvore remontar no mesmo lugar — ao
// salvar o tamanho da fonte o app se redesenha e a pessoa continua na tela em
// que estava (Andre, 26/09), em vez de voltar ao Inicio.
let estadoGuardado: object | undefined;
export function guardarEstadoDaNavegacao(estado: object | undefined): void {
  estadoGuardado = estado;
}
export function estadoDaNavegacao(): object | undefined {
  return estadoGuardado;
}
