import { lookupCep } from "@utils/cep";

const okPayload = {
  logradouro: "Avenida Paulista",
  bairro: "Bela Vista",
  localidade: "Sao Paulo",
  uf: "SP",
};

function mockFetch(impl: () => Promise<unknown>) {
  // @ts-expect-error sobrescreve o fetch global no ambiente de teste
  global.fetch = jest.fn(impl);
}

describe("lookupCep", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("retorna o endereco mapeado quando o CEP existe", async () => {
    mockFetch(async () => ({ ok: true, json: async () => okPayload }));

    const result = await lookupCep("01310-100");
    expect(result).toEqual({
      street: "Avenida Paulista",
      neighborhood: "Bela Vista",
      city: "Sao Paulo",
      state: "SP",
    });
    expect(global.fetch).toHaveBeenCalledWith("https://viacep.com.br/ws/01310100/json/");
  });

  it("aceita CEP com mascara (desmascara antes de consultar)", async () => {
    mockFetch(async () => ({ ok: true, json: async () => okPayload }));

    await lookupCep("01310-100");
    expect(global.fetch).toHaveBeenCalledWith("https://viacep.com.br/ws/01310100/json/");
  });

  it("retorna null sem chamar a API quando o CEP nao tem 8 digitos", async () => {
    mockFetch(async () => ({ ok: true, json: async () => okPayload }));

    expect(await lookupCep("123")).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("retorna null quando o ViaCEP responde erro:true", async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ erro: true }) }));

    expect(await lookupCep("00000000")).toBeNull();
  });

  it("retorna null quando a resposta nao e ok", async () => {
    mockFetch(async () => ({ ok: false, json: async () => ({}) }));

    expect(await lookupCep("01310100")).toBeNull();
  });

  it("nunca lanca: retorna null se o fetch falhar (offline)", async () => {
    mockFetch(async () => {
      throw new Error("network down");
    });

    expect(await lookupCep("01310100")).toBeNull();
  });
});
