import { lookupCep, siglaDaUf, buscarCepPorEndereco } from "@utils/cep";

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

// GPS sem CEP (bateria de 07/09, A2): o provedor do Android traz rua, bairro,
// cidade e estado, e quase nunca o CEP. O app completa pelo ViaCEP — mas só
// quando a resposta é inequívoca: CEP chutado é pior que campo vazio.
describe("siglaDaUf", () => {
  it("aceita a sigla e o nome por extenso, com ou sem acento", () => {
    expect(siglaDaUf("sc")).toBe("SC");
    expect(siglaDaUf("Santa Catarina")).toBe("SC");
    expect(siglaDaUf("São Paulo")).toBe("SP");
    expect(siglaDaUf("Paraná")).toBe("PR");
    expect(siglaDaUf("Atlantida")).toBeNull();
  });
});

describe("buscarCepPorEndereco", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const endereco = {
    street: "Rua Bocaiúva",
    neighborhood: "Centro",
    city: "Florianópolis",
    state: "Santa Catarina",
  };

  it("um CEP só: preenche, e pergunta com a SIGLA da UF", async () => {
    mockFetch(async () => ({ ok: true, json: async () => [{ cep: "88015-530", bairro: "Centro" }] }));
    await expect(buscarCepPorEndereco(endereco)).resolves.toBe("88015530");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://viacep.com.br/ws/SC/Florian%C3%B3polis/Rua%20Bocai%C3%BAva/json/",
    );
  });

  it("vários CEPs, o bairro desempata", async () => {
    mockFetch(async () => ({
      ok: true,
      json: async () => [
        { cep: "88015-530", bairro: "Centro" },
        { cep: "88020-000", bairro: "Agronômica" },
      ],
    }));
    await expect(buscarCepPorEndereco(endereco)).resolves.toBe("88015530");
  });

  it("rua com vários CEPs no MESMO bairro (faixa de número): não chuta", async () => {
    mockFetch(async () => ({
      ok: true,
      json: async () => [
        { cep: "88015-530", bairro: "Centro" },
        { cep: "88015-531", bairro: "Centro" },
      ],
    }));
    await expect(buscarCepPorEndereco(endereco)).resolves.toBeNull();
  });

  it("sem resultado, estado desconhecido, rua curta ou rede fora: null, sem chamar ou sem lançar", async () => {
    mockFetch(async () => ({ ok: true, json: async () => [] }));
    await expect(buscarCepPorEndereco(endereco)).resolves.toBeNull();
    await expect(buscarCepPorEndereco({ ...endereco, state: "Narnia" })).resolves.toBeNull();
    await expect(buscarCepPorEndereco({ ...endereco, street: "Rx" })).resolves.toBeNull();
    mockFetch(async () => {
      throw new Error("offline");
    });
    await expect(buscarCepPorEndereco(endereco)).resolves.toBeNull();
  });
});
