import { Platform } from "react-native";

// token-web-httponly (DEC-172/179, contrato do Backend f6641ce): na WEB o token sai do armazenamento do
// navegador e vai para um cookie HttpOnly que o JavaScript nao le. Fica atras de uma chave local DESLIGADA
// (EXPO_PUBLIC_WEB_AUTH_COOKIE=1 liga): o cookie so funciona com o dominio proprio (DEC-155), quando o app
// web e a API dividem o site. O app nativo nao muda (segue com o SecureStore e o Authorization).
//
// O contrato, no modo cookie:
// - login: POST /auth/login com X-Auth-Mode: cookie; a resposta traz o user, sem tokens;
// - todo pedido vai com credentials (withCredentials), sem Authorization;
// - escritas (POST, PUT, PATCH, DELETE) levam o cookie vupth_csrf no X-CSRF-Token (sem ele, 403 CSRF_INVALID);
// - renovar: POST /auth/web/refresh, 204; 401 = sessao vencida, vai ao login;
// - sair: POST /auth/web/logout, 204;
// - nada de token no localStorage nem no sessionStorage.

/**
 * O que o app guarda no lugar do token, no modo cookie. Nao e segredo nem vai ao servidor: so diz as telas
 * que ha sessao (elas perguntam `isAuthenticated && accessToken`). O Authorization com ele e tirado no envio.
 */
export const SESSAO_POR_COOKIE = "sessao-por-cookie";

export const CABECALHO_DO_MODO = { "X-Auth-Mode": "cookie" } as const;

const METODOS_QUE_GRAVAM = new Set(["post", "put", "patch", "delete"]);

/** A chave local: so na web e so com EXPO_PUBLIC_WEB_AUTH_COOKIE=1. Desligada, tudo segue como hoje. */
export function modoCookieWeb(): boolean {
  return Platform.OS === "web" && process.env.EXPO_PUBLIC_WEB_AUTH_COOKIE === "1";
}

/** Le um cookie legivel (o vupth_csrf nao e HttpOnly; o da sessao e, e o JS nunca o ve). */
export function lerCookie(nome: string, cookies: string = typeof document !== "undefined" ? document.cookie : ""): string | null {
  for (const parte of cookies.split(";")) {
    const [chave, ...resto] = parte.trim().split("=");
    if (chave === nome) return decodeURIComponent(resto.join("="));
  }
  return null;
}

type Pedido = {
  method?: string;
  withCredentials?: boolean;
  headers: { delete?: (nome: string) => unknown; [nome: string]: unknown };
};

/** Prepara um pedido para o modo cookie: credentials, sem Authorization e, nas escritas, o X-CSRF-Token. */
export function prepararPedidoPorCookie<T extends Pedido>(config: T, cookies?: string): T & { withCredentials: boolean } {
  config.withCredentials = true;
  if (typeof config.headers.delete === "function") config.headers.delete("Authorization");
  else delete config.headers.Authorization;
  if (METODOS_QUE_GRAVAM.has((config.method ?? "get").toLowerCase())) {
    const csrf = lerCookie("vupth_csrf", cookies);
    if (csrf) config.headers["X-CSRF-Token"] = csrf;
  }
  return config as T & { withCredentials: boolean };
}
