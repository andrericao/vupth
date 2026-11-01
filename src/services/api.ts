import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import * as Updates from "expo-updates";

import { resolveApiEnv } from "./apiEnv";
import { esperarServidor } from "./prontidaoDoServidor";

interface RefreshResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
}

const localIp = process.env.EXPO_PUBLIC_API_LOCAL_IP || "localhost";

// Tres nomes, os mesmos do backend: `dev` e a MAQUINA, `staging` e o Render,
// `prod` e o Railway.
//
// Ate 06/09 eram quatro, e duas chaves apontavam pro mesmo host: `dev` e
// `staging` eram ambas o Render, porque este app batizou de `dev` o que o
// partner batizou de `staging` e o mesmo `.env` circulava entre os repos. A
// maquina se chamava `local`. Resultado: `dev` era a sua maquina no backend e
// a nuvem no app — e um `.env` dizendo `dev` mandava pro Render de surpresa.
const BASE_URLS: Record<string, string> = {
	dev: `http://${localIp}:8080`,
	staging: "https://vupth-backend-ia.onrender.com",
	prod: "https://vupth-backend-ia-production.up.railway.app",
};

// O CANAL manda quando existe (bundle publicado); o `.env` so vale rodando
// local. Ver `apiEnv.ts` pro porque — em resumo, o `.env` de quem publica
// vazava pro app de todo mundo.
const canalDoBundle = (() => {
	try {
		return Updates.channel;
	} catch {
		return null;
	}
})();
const env = resolveApiEnv(canalDoBundle, process.env.EXPO_PUBLIC_API_ENV);

// Base URL HTTP resolvida e env atual — usados pelo portao de readiness (cold start Render).
// Sem indexacao defensiva aqui de proposito: `resolveApiEnv` so devolve chave
// que existe neste mapa. Antes, um nome fora do mapa virava `undefined` e o
// app subia sem baseURL — toda chamada falhava sem dizer por que.
export const API_BASE_URL = BASE_URLS[env];
export const API_ENV = env;

// WebSocket (STOMP) — deriva ws(s) do baseURL HTTP. `/ws/websocket` e o transporte
// raw do SockJS (o handshake nativo do RN nao usa a lib SockJS).
export function deriveWsUrl(baseUrl: string): string {
	return `${baseUrl.replace(/^http/, "ws")}/ws/websocket`;
}

export const WS_URL = deriveWsUrl(API_BASE_URL);

const TOKEN_KEY = "vupth_access_token";
const REFRESH_KEY = "vupth_refresh_token";
const USER_KEY = "vupth_user";

const PUBLIC_PATHS = ["/establishment", "/auth/", "/professional/"];

function isPublicPath(url: string | undefined): boolean {
	if (!url) return false;
	return PUBLIC_PATHS.some((p) => url.startsWith(p));
}

type AuthStoreSetter = (state: Record<string, unknown>) => void;
let _setAuthState: AuthStoreSetter | null = null;

export function registerAuthStore(setter: AuthStoreSetter) {
	_setAuthState = setter;
}

// axios 1.17+ tipa `create` tambem como export nomeado e a regra de import
// passa a avisar aqui; o uso via objeto default e intencional.
// eslint-disable-next-line import/no-named-as-default-member
export const api = axios.create({
	baseURL: BASE_URLS[env],
	// O `/establishment` leva ~11,7s (medido em 2026-08-26, e o MESMO tempo com
	// 4 ou 13 lojas — custo fixo, nao proporcional). Com 10s o app estourava na
	// PRIMEIRA tela em dev: "Erro ao carregar estabelecimentos", com o backend
	// respondendo 200 logo depois. 30s cobre a lentidao sem esconder falha real.
	// ⚠️ Isto MASCARA um problema de backend, nao conserta: ver S35.
	timeout: env === "dev" ? 30000 : 90000,
	headers: {
		"Content-Type": "application/json",
	},
});

const METODOS_QUE_GRAVAM = new Set(["post", "put", "patch", "delete"]);

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
	// abrir-com-lista-salva (DEC-148): com o app aberto pelo cache e o servidor ainda acordando, o que GRAVA
	// espera ele ficar pronto; o que le (a lista salva se atualizando) segue.
	if (METODOS_QUE_GRAVAM.has((config.method ?? "get").toLowerCase()) && !config.url?.startsWith("/actuator")) {
		await esperarServidor();
	}
	if (!config.headers.Authorization && !isPublicPath(config.url)) {
		const token = await SecureStore.getItemAsync(TOKEN_KEY);
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
	}
	return config;
});

// UM refresh por vez (um-refresh-por-vez, log [SLOW] de 15/10: dois POST
// /auth/refresh juntos). O refresh troca o refresh_token: o segundo, com o token
// que o primeiro acabou de queimar, derrubava a sessao. Quem precisa renovar
// enquanto um esta no ar — o interceptor (401) ou o WebSocket (beforeConnect) —
// espera o mesmo resultado.
let refreshEmVoo: Promise<string> | null = null;

async function trocarTokens(): Promise<string> {
	const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
	if (!refreshToken) throw new Error("No refresh token");

	// Chamada inline (não importa authService) para evitar o require cycle
	// api ↔ authService. `/auth/` é rota pública → o interceptor não tenta
	// refresh-sobre-refresh (sem recursão).
	const { data } = await api.post<RefreshResponse>("/auth/refresh", {
		refresh_token: refreshToken,
	});

	await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
	await SecureStore.setItemAsync(REFRESH_KEY, data.refresh_token);

	_setAuthState?.({
		accessToken: data.access_token,
		refreshToken: data.refresh_token,
	});
	return data.access_token;
}

/** Renova a sessao; com um refresh ja no ar, devolve o resultado dele. */
export function renovarSessao(): Promise<string> {
	if (!refreshEmVoo) {
		refreshEmVoo = trocarTokens().finally(() => {
			refreshEmVoo = null;
		});
	}
	return refreshEmVoo;
}

api.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

		// 401 de NEGÓCIO, não de sessão: senha atual incorreta na troca de senha
		// (PATCH /profile/update-password/me). Não dispara refresh/logout — a tela
		// trata como erro de campo ("senha atual incorreta").
		const errorCode = (error.response?.data as { code?: string } | undefined)?.code;

		if (
			error.response?.status !== 401 ||
			errorCode === "CURRENT_PASSWORD_INVALID" ||
			originalRequest._retry ||
			isPublicPath(originalRequest.url)
		) {
			return Promise.reject(error);
		}

		originalRequest._retry = true;

		try {
			const token = await renovarSessao();
			originalRequest.headers.Authorization = `Bearer ${token}`;
			return api(originalRequest);
		} catch (refreshError) {
			await SecureStore.deleteItemAsync(TOKEN_KEY);
			await SecureStore.deleteItemAsync(REFRESH_KEY);
			await SecureStore.deleteItemAsync(USER_KEY);

			_setAuthState?.({
				user: null,
				accessToken: null,
				refreshToken: null,
				isAuthenticated: false,
			});

			return Promise.reject(refreshError);
		}
	},
);
