import { waitForBackend } from "@services/healthService";

function mockFetch(impl: () => Promise<unknown>) {
  // @ts-expect-error sobrescreve o fetch global no ambiente de teste
  global.fetch = jest.fn(impl);
}

const fast = {
  enabled: true,
  baseUrl: "http://backend.test",
  maxTotalMs: 200,
  perAttemptMs: 50,
  initialBackoffMs: 10,
  maxBackoffMs: 20,
};

describe("waitForBackend", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("retorna true sem chamar a API quando desabilitado (ambiente local)", async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ status: "UP" }) }));

    const ok = await waitForBackend({ ...fast, enabled: false });
    expect(ok).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("por padrao (env de teste = local) nao cutuca a API e retorna true", async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ status: "UP" }) }));

    const ok = await waitForBackend();
    expect(ok).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("retorna true e para na 1a tentativa quando readiness responde UP", async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ status: "UP" }) }));

    const ok = await waitForBackend(fast);
    expect(ok).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://backend.test/actuator/health/readiness",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("retorna false quando estoura o teto sempre recebendo status != UP", async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ status: "DOWN" }) }));

    const ok = await waitForBackend(fast);
    expect(ok).toBe(false);
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(0);
  });

  it("retorna false quando a resposta nao e ok (ex.: 503 enquanto sobe)", async () => {
    mockFetch(async () => ({ ok: false, json: async () => ({}) }));

    const ok = await waitForBackend(fast);
    expect(ok).toBe(false);
  });

  it("nunca lanca: trata fetch rejeitado (offline) como nao-pronto", async () => {
    mockFetch(async () => {
      throw new Error("network down");
    });

    const ok = await waitForBackend(fast);
    expect(ok).toBe(false);
  });

  it("aborta sem cutucar quando isCancelled ja e true", async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ status: "UP" }) }));

    const ok = await waitForBackend({ ...fast, isCancelled: () => true });
    expect(ok).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
