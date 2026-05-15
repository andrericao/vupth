import axios from "axios";

const localIp = process.env.EXPO_PUBLIC_API_LOCAL_IP || "localhost";

const BASE_URLS: Record<string, string> = {
	local: `http://${localIp}:8080`,
	dev: "https://vupth-backend-ia.onrender.com",
	prod: "https://vupth-backend-ia-production.up.railway.app",
};

const env = (process.env.EXPO_PUBLIC_API_ENV || "local") as keyof typeof BASE_URLS;

export const api = axios.create({
	baseURL: BASE_URLS[env],
	timeout: env === "local" ? 10000 : 30000,
	headers: {
		"Content-Type": "application/json",
	},
});