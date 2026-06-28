import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { authService } from "./authService";

const localIp = process.env.EXPO_PUBLIC_API_LOCAL_IP || "localhost";

const BASE_URLS: Record<string, string> = {
	local: `http://${localIp}:8080`,
	dev: "https://vupth-backend-ia.onrender.com",
	prod: "https://vupth-backend-ia-production.up.railway.app",
};

const env = (process.env.EXPO_PUBLIC_API_ENV || "local") as keyof typeof BASE_URLS;

// Base URL HTTP resolvida e env atual — usados pelo portao de readiness (cold start Render).
export const API_BASE_URL = BASE_URLS[env];
export const API_ENV = env;

// WebSocket (STOMP) — deriva ws(s) do baseURL HTTP. `/ws/websocket` e o transporte
// raw do SockJS (o handshake nativo do RN nao usa a lib SockJS).
export function deriveWsUrl(baseUrl: string): string {
	return `${baseUrl.replace(/^http/, "ws")}/ws/websocket`;
}

export const WS_URL = deriveWsUrl(BASE_URLS[env]);

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

export const api = axios.create({
	baseURL: BASE_URLS[env],
	timeout: env === "local" ? 10000 : 90000,
	headers: {
		"Content-Type": "application/json",
	},
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
	if (!config.headers.Authorization && !isPublicPath(config.url)) {
		const token = await SecureStore.getItemAsync(TOKEN_KEY);
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}
	}
	return config;
});

let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

function processQueue(error: unknown, token: string | null) {
	failedQueue.forEach((p) => {
		if (error) {
			p.reject(error);
		} else {
			p.resolve(token!);
		}
	});
	failedQueue = [];
}

api.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

		if (error.response?.status !== 401 || originalRequest._retry || isPublicPath(originalRequest.url)) {
			return Promise.reject(error);
		}

		if (isRefreshing) {
			return new Promise((resolve, reject) => {
				failedQueue.push({
					resolve: (token: string) => {
						originalRequest.headers.Authorization = `Bearer ${token}`;
						resolve(api(originalRequest));
					},
					reject,
				});
			});
		}

		originalRequest._retry = true;
		isRefreshing = true;

		try {
			const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
			if (!refreshToken) throw new Error("No refresh token");

			const { data } = await authService.refresh(refreshToken);

			await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
			await SecureStore.setItemAsync(REFRESH_KEY, data.refresh_token);

			_setAuthState?.({
				accessToken: data.access_token,
				refreshToken: data.refresh_token,
			});

			originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
			processQueue(null, data.access_token);

			return api(originalRequest);
		} catch (refreshError) {
			processQueue(refreshError, null);

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
		} finally {
			isRefreshing = false;
		}
	},
);
