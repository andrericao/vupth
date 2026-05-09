import axios from "axios";

const BASE_URLS = {
	dev: "https://vupth-backend-ia.onrender.com",
	prod: "https://vupth-backend-ia-production.up.railway.app",
};

export const api = axios.create({
	baseURL: BASE_URLS.dev,
	timeout: 30000,
	headers: {
		"Content-Type": "application/json",
	},
});