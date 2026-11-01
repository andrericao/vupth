import {
  iniciarSentry,
  carregarSentry,
  limparTexto,
  limparValor,
  limparEvento,
  limparRastro,
  ehErroDeConexao,
  nomeDaTela,
  marcarContexto,
  reportarProblema,
  sentryLigado,
  capturarErro,
  registrarMotivo,
} from "@utils/sentry";

// sentry (Andre, 09/10): inerte sem DSN e nos testes; com DSN, liga com o
// ambiente e o commit, sem dado pessoal e sem rastreio de desempenho.
describe("iniciarSentry", () => {
  const sdk = () => ({ init: jest.fn() }) as any;

  it("sem DSN: nem carrega o SDK", () => {
    const carregar = jest.fn(sdk);
    expect(iniciarSentry({ dsn: "", ambiente: "staging", carregar })).toBe(false);
    expect(iniciarSentry({ dsn: null, ambiente: "staging", carregar })).toBe(false);
    expect(carregar).not.toHaveBeenCalled();
  });

  it("nos testes: nunca liga", () => {
    const carregar = jest.fn(sdk);
    expect(iniciarSentry({ dsn: "https://x@o.ingest.sentry.io/1", ambiente: "staging", emTeste: true, carregar })).toBe(false);
    expect(carregar).not.toHaveBeenCalled();
  });

  it("com DSN: liga com o ambiente e o commit", () => {
    const s = sdk();
    expect(
      iniciarSentry({ dsn: " https://x@o.ingest.sentry.io/1 ", ambiente: "prod", commit: "abc1234", carregar: () => s })
    ).toBe(true);
    expect(s.init).toHaveBeenCalledWith({
      dsn: "https://x@o.ingest.sentry.io/1",
      environment: "prod",
      release: "abc1234",
      tracesSampleRate: 0,
      sendDefaultPii: false,
      beforeSend: expect.any(Function),
      beforeBreadcrumb: expect.any(Function),
    });
  });

  it("binario sem o modulo, ou init que falha: nao derruba o app", () => {
    expect(iniciarSentry({ dsn: "d", ambiente: "prod", carregar: () => null })).toBe(false);
    const quebra = { init: () => { throw new Error("native"); } } as any;
    expect(iniciarSentry({ dsn: "d", ambiente: "prod", carregar: () => quebra })).toBe(false);
  });

  it("o carregador padrao nunca lanca: devolve o SDK ou null", () => {
    expect(() => carregarSentry()).not.toThrow();
    expect(() => carregarSentry(() => true)).not.toThrow();
  });

  // volta-1-5-0 (Andre, 10/10): o OTA roda no APK 1.5.0, sem o RNSentry nativo.
  // O require do JS passa mesmo assim; sem o nativo, nem carrega.
  it("binario sem o RNSentry nativo: null, sem tocar no SDK", () => {
    expect(carregarSentry(() => false)).toBeNull();
  });

  it("com o RNSentry nativo: carrega o SDK", () => {
    const sdk = { init: jest.fn() } as never;
    expect(carregarSentry(() => true, () => sdk)).toBe(sdk);
  });

  it("a pergunta pelo nativo que lanca vira null", () => {
    expect(
      carregarSentry(() => {
        throw new Error("sem TurboModuleRegistry");
      })
    ).toBeNull();
  });
});

// sentry-contexto-e-limpeza (Andre, 22/10)
describe("limpeza de dados sensiveis", () => {
  it("tira e-mail, token, telefone, CPF, CNPJ e chave Pix aleatoria do texto", () => {
    expect(limparTexto("falhou para ana@exemplo.com")).toBe("falhou para [e-mail]");
    expect(limparTexto("Authorization: Bearer abc.def-123")).toBe("Authorization: Bearer [token]");
    expect(limparTexto("liga (11) 98765-4321")).toBe("liga [telefone]");
    expect(limparTexto("tel +55 11 98765-4321")).not.toMatch(/\d{4}/);
    expect(limparTexto("cpf 123.456.789-09")).toBe("cpf [cpf]");
    expect(limparTexto("cnpj 12.345.678/0001-95")).toBe("cnpj [cnpj]");
    expect(limparTexto("pix 1b4e28ba-2fa1-11d2-883f-0016d3cca427")).toBe("pix [id]");
    expect(limparTexto("sem nada sensivel")).toBe("sem nada sensivel");
  });

  it("remove campos sensiveis pelo nome, em qualquer fundo", () => {
    const r = limparValor({
      Authorization: "Bearer x",
      pix_key: "a@b.com",
      ok: "texto",
      dentro: { token: "t", lista: [{ email: "a@b.com", n: 1 }] },
    }) as any;
    expect(r.Authorization).toBe("[removido]");
    expect(r.pix_key).toBe("[removido]");
    expect(r.ok).toBe("texto");
    expect(r.dentro.token).toBe("[removido]");
    expect(r.dentro.lista[0].email).toBe("[removido]");
    expect(r.dentro.lista[0].n).toBe(1);
  });

  it("limparEvento: tira usuario, cabecalhos e corpo; limpa a mensagem", () => {
    const ev = limparEvento({
      message: "erro com ana@exemplo.com",
      user: { email: "ana@exemplo.com", id: "1" },
      request: { url: "https://api/x", headers: { Authorization: "Bearer x" }, cookies: "a=b", data: "{}" },
    })!;
    expect(ev.message).toBe("erro com [e-mail]");
    expect(ev.user).toBeUndefined();
    expect(ev.request.headers).toBeUndefined();
    expect(ev.request.cookies).toBeUndefined();
    expect(ev.request.data).toBeUndefined();
    expect(ev.request.url).toBe("https://api/x");
  });

  it("sem conexao nao vai ao Sentry (dica ou texto da excecao)", () => {
    expect(limparEvento({}, { originalException: { code: "ERR_NETWORK" } })).toBeNull();
    expect(limparEvento({ exception: { values: [{ value: "Network request failed" }] } })).toBeNull();
    expect(ehErroDeConexao({ isAxiosError: true })).toBe(true);
    expect(ehErroDeConexao({ isAxiosError: true, response: { status: 500 } })).toBe(false);
    expect(ehErroDeConexao({ message: "timeout of 60000ms exceeded" })).toBe(true);
    expect(ehErroDeConexao(null)).toBe(false);
    expect(ehErroDeConexao(new Error("outro erro"))).toBe(false);
  });

  it("limparRastro: de uma chamada de rede ficam metodo, status e caminho sem query", () => {
    const r = limparRastro({
      category: "fetch",
      data: { method: "GET", status_code: 200, url: "https://api/x?email=a@b.com", headers: { Authorization: "x" } },
    })!;
    expect(r.data).toEqual({ method: "GET", status_code: 200, url: "https://api/x" });
    expect(limparRastro({ category: "ui.click", message: "toque em ana@exemplo.com" })!.message).toBe("toque em [e-mail]");
  });
});

describe("contexto do Sentry", () => {
  it("a tela vai sem id de ninguem", () => {
    expect(nomeDaTela("/loja/1b4e28ba-2fa1-11d2-883f-0016d3cca427/fila?x=1")).toBe("/loja/:id/fila");
    expect(nomeDaTela("/professional/42")).toBe("/professional/:id");
    expect(nomeDaTela("/(professional)/queue")).toBe("/(professional)/queue");
  });

  it("marca papel e tela; sem SDK nao faz nada", () => {
    const sdk = { setTag: jest.fn() } as any;
    marcarContexto({ papel: "cliente", tela: "/a/42" }, sdk);
    expect(sdk.setTag).toHaveBeenCalledWith("papel", "cliente");
    expect(sdk.setTag).toHaveBeenCalledWith("tela", "/a/:id");
    marcarContexto({ papel: null }, sdk);
    expect(sdk.setTag).toHaveBeenCalledWith("papel", "desconhecido");
    expect(() => marcarContexto({ papel: "visitante" }, null)).not.toThrow();
    const quebra = { setTag: () => { throw new Error("x"); } } as any;
    expect(() => marcarContexto({ papel: "cliente" }, quebra)).not.toThrow();
  });
});


// sentry-feedback-do-usuario (Andre, 22/10)
describe("reportarProblema", () => {
  it("sem SDK (Sentry desligado) o botao nao existe e nada e enviado", () => {
    expect(sentryLigado(null)).toBe(false);
    expect(sentryLigado({} as any)).toBe(true);
    expect(reportarProblema({ mensagem: "travou" }, null)).toBe(false);
  });

  it("manda a mensagem limpa, com o nome so se vier, e o ultimo erro", () => {
    const sdk = { captureFeedback: jest.fn(), lastEventId: () => "ev1" } as any;
    expect(reportarProblema({ mensagem: " travou, falem com ana@exemplo.com ", nome: " Ana " }, sdk)).toBe(true);
    expect(sdk.captureFeedback).toHaveBeenCalledWith({
      message: "travou, falem com [e-mail]",
      name: "Ana",
      associatedEventId: "ev1",
    });
    reportarProblema({ mensagem: "oi", nome: "  " }, sdk);
    expect(sdk.captureFeedback.mock.calls[1][0].name).toBeUndefined();
  });

  it("mensagem vazia nao envia; SDK que falha nao derruba", () => {
    const sdk = { captureFeedback: jest.fn() } as any;
    expect(reportarProblema({ mensagem: "   " }, sdk)).toBe(false);
    expect(sdk.captureFeedback).not.toHaveBeenCalled();
    const quebra = { captureFeedback: () => { throw new Error("x"); } } as any;
    expect(reportarProblema({ mensagem: "oi" }, quebra)).toBe(false);
  });
});

// log-de-falha-na-abertura (DEC-152): as tags ligam a queda ao OTA; o erro da raiz e o motivo do modo seguro vao ao
// Sentry, sem dado pessoal.
describe("tags, erro da raiz e motivo", () => {
  it("as tags (updateId, runtime, versao, commit) entram; vazias nao; e-mail e limpo", () => {
    const s = { init: jest.fn(), setTag: jest.fn() } as any;
    iniciarSentry({
      dsn: "d",
      ambiente: "staging",
      carregar: () => s,
      tags: { updateId: "u-1", runtimeVersion: "1.1.0", versao: null, commit: "joao@x.com" },
    });
    expect(s.setTag).toHaveBeenCalledWith("updateId", "u-1");
    expect(s.setTag).toHaveBeenCalledWith("runtimeVersion", "1.1.0");
    expect(s.setTag).toHaveBeenCalledWith("commit", "[e-mail]");
    expect(s.setTag).not.toHaveBeenCalledWith("versao", expect.anything());
  });

  it("uma tag que falha nao derruba a abertura", () => {
    const s = { init: jest.fn(), setTag: jest.fn(() => { throw new Error("x"); }) } as any;
    expect(iniciarSentry({ dsn: "d", ambiente: "prod", carregar: () => s, tags: { updateId: "u" } })).toBe(true);
  });

  it("capturarErro e registrarMotivo: sem SDK devolvem false; com SDK enviam; SDK que lanca nao propaga", () => {
    expect(capturarErro(new Error("x"), null)).toBe(false);
    expect(registrarMotivo("motivo", null)).toBe(false);
    const s = { captureException: jest.fn(), captureMessage: jest.fn() } as any;
    expect(capturarErro(new Error("x"), s)).toBe(true);
    expect(s.captureException).toHaveBeenCalled();
    expect(registrarMotivo("caiu com maria@x.com", s)).toBe(true);
    expect(s.captureMessage).toHaveBeenCalledWith("caiu com [e-mail]", "warning");
    const ruim = { captureException: () => { throw new Error("y"); }, captureMessage: () => { throw new Error("y"); } } as any;
    expect(capturarErro(new Error("x"), ruim)).toBe(false);
    expect(registrarMotivo("m", ruim)).toBe(false);
  });
});
