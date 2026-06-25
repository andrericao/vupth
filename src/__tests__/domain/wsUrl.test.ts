import { deriveWsUrl } from "@services/api";

describe("deriveWsUrl", () => {
  it("converte http em ws e adiciona /ws/websocket", () => {
    expect(deriveWsUrl("http://localhost:8080")).toBe(
      "ws://localhost:8080/ws/websocket",
    );
  });

  it("converte https em wss", () => {
    expect(deriveWsUrl("https://vupth-backend-ia.onrender.com")).toBe(
      "wss://vupth-backend-ia.onrender.com/ws/websocket",
    );
  });

  it("nao altera o host, so o protocolo e o sufixo", () => {
    expect(deriveWsUrl("https://api.exemplo.com:8443")).toBe(
      "wss://api.exemplo.com:8443/ws/websocket",
    );
  });
});
