import { createNavigationContainerRef } from "@react-navigation/native";

// Ref global de navegação — permite navegar de FORA da árvore de componentes
// (ex.: ao tocar numa notificação push, em usePushRegistration). Anexado ao
// NavigationContainer em routes/index.tsx.
export const navigationRef = createNavigationContainerRef();

/**
 * Navega ao tocar numa notificação. `route` vem de `notificationRoute` (domain/push).
 * Best-effort: no-op se a navegação ainda não montou. Hoje o único destino é a
 * aba Atendimentos (fila ao vivo + agendamentos).
 */
export function navigateFromNotification(route: string | null): void {
  if (!route || !navigationRef.isReady()) return;
  if (route === "attendances") {
    // Atendimentos vive numa aba (tab navigator) — navigate afrouxado pois o ref
    // é destipado (o app usa vários navigators aninhados).
    const navigate = navigationRef.navigate as unknown as (
      name: string,
      params?: object,
    ) => void;
    navigate("atendimentosTab", { screen: "attendances" });
  }
}

/**
 * Leva pro login depois do onboarding.
 *
 * O onboarding e renderizado ACIMA do navegador (ver routes/index.tsx), entao
 * nao tem `useNavigation`: quando ele sai, o navegador de abas monta pela
 * primeira vez. Por isso a navegacao espera o `isReady` em vez de disparar na
 * hora — no instante do toque a arvore ainda nao existe.
 */
export function goToLoginAfterOnboarding(): void {
  const tryNavigate = (attempt = 0) => {
    if (navigationRef.isReady()) {
      const navigate = navigationRef.navigate as unknown as (
        name: string,
        params?: object,
      ) => void;
      navigate("homeTab", { screen: "login", params: {} });
      return;
    }
    // Ate ~1s de espera pelo mount; depois desiste e deixa na Home, que e um
    // destino valido (dava pra logar por ali de qualquer jeito).
    if (attempt < 20) setTimeout(() => tryNavigate(attempt + 1), 50);
  };
  tryNavigate();
}
