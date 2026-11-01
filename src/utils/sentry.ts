/* eslint-disable @typescript-eslint/no-require-imports */
// sentry no Client (Andre, 24/10), no desenho do Partner: relatorio de erros e
// crash. O DSN vem do ambiente na hora do build/OTA (EXPO_PUBLIC_SENTRY_DSN),
// nunca do repositorio. Sem DSN, o SDK nem e carregado: fica inerte. Nos
// testes (jest), nunca liga.
//
// Carregado sob demanda, como as outras libs nativas (modulosNativos.ts): um
// binario anterior ao build com o Sentry nao pode derrubar o app num OTA.

type Sentry = typeof import("@sentry/react-native");

export type ConfigDoSentry = {
  dsn?: string | null;
  ambiente: string;
  commit?: string | null;
  /** Rodando no jest: nunca liga. */
  emTeste?: boolean;
  /** Versao, runtime e OTA em execucao: liga a queda ao OTA que estava rodando (sem dado pessoal). */
  tags?: Record<string, string | null | undefined>;
  carregar?: () => Sentry | null;
};

/**
 * O binario tem o modulo nativo do Sentry? volta-1-5-0 (Andre, 10/10): o OTA
 * roda no APK 1.5.0, anterior ao Sentry; o require do JS passa la, e a falha so
 * apareceria depois. Pergunta-se ao React Native antes (como o expo-image).
 */
export function temSentryNativo(): boolean {
  // O TurboModuleRegistry.get tambem acha o modulo da arquitetura antiga.
  const { TurboModuleRegistry } = require("react-native");
  return TurboModuleRegistry.get("RNSentry") != null;
}

export function carregarSentry(
  temNativo: () => boolean = temSentryNativo,
  requerer: () => Sentry = () => require("@sentry/react-native")
): Sentry | null {
  try {
    if (!temNativo()) return null;
    return requerer();
  } catch {
    return null;
  }
}

// sentry-contexto-e-limpeza (Andre, 22/10): nada que identifique a pessoa sai do
// aparelho. Os filtros rodam ANTES de enviar (beforeSend e beforeBreadcrumb).
const PADROES_SENSIVEIS: [RegExp, string][] = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [token]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[e-mail]"],
  // chave Pix aleatoria (uuid), CNPJ e CPF (com ou sem pontuacao)
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[id]"],
  [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[cnpj]"],
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[cpf]"],
  // telefone: 10 ou 11 digitos, com ou sem DDD/+55/pontuacao
  [/(?:\+?55\s?)?\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, "[telefone]"],
];
const CHAVES_SENSIVEIS = /^(authorization|cookie|set-cookie|password|senha|token|access_token|refresh_token|pix|pix_key|chave_pix|chavepix|email|e-mail|phone|telefone|cpf|cnpj)$/i;

/** Tira e-mail, telefone, token e chave Pix de qualquer texto. */
export function limparTexto(texto: string): string {
  return PADROES_SENSIVEIS.reduce((t, [padrao, troca]) => t.replace(padrao, troca), texto);
}

/** Limpa um valor qualquer (objeto, lista, texto), sem mexer no original. */
export function limparValor(valor: unknown, fundo = 0): unknown {
  if (typeof valor === "string") return limparTexto(valor);
  if (fundo > 6 || valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.map((v) => limparValor(v, fundo + 1));
  return Object.fromEntries(
    Object.entries(valor as Record<string, unknown>).map(([k, v]) => [
      k,
      CHAVES_SENSIVEIS.test(k) ? "[removido]" : limparValor(v, fundo + 1),
    ])
  );
}

/** "Sem conexao": o app ja avisa a pessoa; nao e bug para o Sentry. */
export function ehErroDeConexao(erro: unknown): boolean {
  const e = erro as { code?: string; message?: string; isAxiosError?: boolean; response?: unknown } | null;
  if (!e) return false;
  if (e.code === "ERR_NETWORK" || e.code === "ECONNABORTED" || e.code === "ETIMEDOUT") return true;
  if (e.isAxiosError && !e.response) return true;
  return /network (request failed|error)|timeout of \d+ms exceeded|sem conex/i.test(String(e.message ?? ""));
}

/** O beforeSend: limpa o evento ou o descarta (null) quando e so falta de conexao. */
export function limparEvento<T extends Record<string, any>>(evento: T, dica?: { originalException?: unknown }): T | null {
  if (ehErroDeConexao(dica?.originalException)) return null;
  const valores = evento.exception?.values as { type?: string; value?: string }[] | undefined;
  if (valores?.some((v) => ehErroDeConexao({ message: v.value }))) return null;
  const limpo = limparValor(evento) as Record<string, any>;
  // so o necessario para achar o erro: nenhum dado da pessoa
  delete limpo.user;
  if (limpo.request) {
    delete limpo.request.cookies;
    delete limpo.request.headers;
    delete limpo.request.data;
    delete limpo.request.query_string;
  }
  return limpo as T;
}

/** O beforeBreadcrumb: limpa o rastro (inclusive o de rede) ou descarta o de conexao. */
export function limparRastro<T extends Record<string, any>>(rastro: T): T | null {
  const limpo = limparValor(rastro) as Record<string, any>;
  if (limpo.category === "xhr" || limpo.category === "fetch") {
    // da chamada de rede ficam o metodo, o status e o caminho sem query
    const d = (limpo.data ?? {}) as Record<string, any>;
    limpo.data = {
      method: d.method,
      status_code: d.status_code,
      url: typeof d.url === "string" ? d.url.split("?")[0] : undefined,
    };
  }
  return limpo as T;
}

/** "/loja/1b4e28ba-2fa1-11d2-883f-0016d3cca427/fila" -> "/loja/:id/fila": a tela, sem id de ninguem. */
export function nomeDaTela(caminho: string): string {
  return caminho
    .split("?")[0]
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, ":id")
    .replace(/\/\d+(?=\/|$)/g, "/:id");
}

export type ContextoDoSentry = { papel?: "cliente" | "visitante" | null; tela?: string | null };

let sdkLigado: Sentry | null = null;

/** Marca os eventos seguintes com o papel (cliente ou visitante) e a tela (sem nome, e-mail nem telefone). */
export function marcarContexto(contexto: ContextoDoSentry, sdk: Sentry | null = sdkLigado): void {
  if (!sdk) return;
  try {
    if (contexto.papel !== undefined) sdk.setTag("papel", contexto.papel ?? "desconhecido");
    if (contexto.tela !== undefined) sdk.setTag("tela", contexto.tela ? nomeDaTela(contexto.tela) : "desconhecida");
  } catch {
    // contexto e enfeite: nunca derruba o app
  }
}

/** Liga o Sentry se houver DSN. Devolve se ligou. */
export function iniciarSentry({ dsn, ambiente, commit, emTeste, tags, carregar = carregarSentry }: ConfigDoSentry): boolean {
  const chave = dsn?.trim();
  if (!chave || emTeste) return false;
  const sentry = carregar();
  if (!sentry) return false;
  try {
    sentry.init({
      dsn: chave,
      environment: ambiente,
      release: commit ?? undefined,
      // So erros e crash: sem rastreio de desempenho nem replay de tela.
      tracesSampleRate: 0,
      sendDefaultPii: false,
      beforeSend: (evento: any, dica: any) => limparEvento(evento, dica),
      beforeBreadcrumb: (rastro: any) => limparRastro(rastro),
    });
    sdkLigado = sentry;
    for (const [nome, valor] of Object.entries(tags ?? {})) {
      if (valor) {
        try {
          sentry.setTag(nome, limparTexto(String(valor)));
        } catch {
          // tag e enfeite: nunca derruba a abertura
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}

/** O Sentry esta ligado neste binario (DSN no build e modulo nativo)? So entao o botao "Reportar problema" aparece. */
export function sentryLigado(sdk: Sentry | null = sdkLigado): boolean {
  return sdk !== null;
}

/**
 * sentry-feedback-do-usuario (Andre, 22/10): manda a mensagem da pessoa ao
 * formulario de feedback do Sentry, junto do ultimo erro e da tela (as tags ja
 * marcadas). O nome e opcional; e-mail nunca e pedido. Devolve se enviou.
 */
export function reportarProblema(
  { mensagem, nome }: { mensagem: string; nome?: string },
  sdk: Sentry | null = sdkLigado
): boolean {
  const texto = mensagem.trim();
  if (!sdk || !texto) return false;
  try {
    sdk.captureFeedback({
      message: limparTexto(texto),
      ...(nome?.trim() ? { name: nome.trim() } : {}),
      associatedEventId: sdk.lastEventId?.(),
    });
    return true;
  } catch {
    return false;
  }
}

/** Manda um erro capturado pela raiz (ErrorBoundary) ao Sentry, ja limpo pelo beforeSend. Nunca lanca. */
export function capturarErro(erro: unknown, sdk: Sentry | null = sdkLigado): boolean {
  if (!sdk) return false;
  try {
    sdk.captureException(erro);
    return true;
  } catch {
    return false;
  }
}

/** Registra o MOTIVO de uma decisao do app (ex.: abriu em modo seguro). Texto sem dado pessoal. */
export function registrarMotivo(mensagem: string, sdk: Sentry | null = sdkLigado): boolean {
  if (!sdk) return false;
  try {
    sdk.captureMessage(limparTexto(mensagem), "warning");
    return true;
  } catch {
    return false;
  }
}
