import {
  LinkingOptions,
  getPathFromState as caminhoPadrao,
  getStateFromPath as estadoPadrao,
} from "@react-navigation/native";

// No NAVEGADOR, a navegacao do app precisa entrar no historico dele. Sem isto
// o React Navigation troca de tela sem criar entrada nenhuma, e o "voltar" do
// celular volta ao que havia ANTES do site — ou fecha a aba (teste do Andre de
// 25/09: em Dados pessoais, o voltar fechou o app). So vale na web; no
// aparelho, o voltar do Android ja e da navegacao.

/** Os caminhos. Nomes em portugues: e o que aparece na barra de endereco. */
const TELAS = {
  homeTab: {
    screens: {
      home: "",
      establishmentList: "lojas",
      establishmentDetail: "loja/:establishmentId",
      serviceSelection: "servicos",
      queueStatus: "fila",
      login: "entrar",
      signUp: "cadastro",
      completeProfile: "completar-cadastro",
      forgotPassword: "esqueci-a-senha",
    },
  },
  atendimentosTab: { screens: { attendances: "atendimentos" } },
  settingsTab: {
    screens: {
      settings: "perfil",
      dadosCadastrais: "perfil/dados-cadastrais",
      editProfile: "perfil/dados",
      editEmail: "perfil/email",
      editPassword: "perfil/senha",
      editAddress: "perfil/endereco",
      terms: "termos",
      // paginas-legais (08/10): as URLs publicas que a Play Store pede.
      privacy: "privacidade",
      excluirConta: "excluir-conta",
      sistema: "sistema",
    },
  },
};

/**
 * Telas que dependem de parametros passados pela tela anterior (os servicos
 * escolhidos, o profissional). Reabertas pela URL — recarregar a pagina, colar
 * o endereco — elas nao teriam o que precisam, e a fila com servicos na mao
 * poderia CRIAR um atendimento de novo. Nesses casos o app abre no Inicio.
 */
const SO_PELA_NAVEGACAO = ["servicos", "fila", "completar-cadastro"];

/**
 * O link de indicacao (`/i/<codigo>`, CLI-34) nao e tela: o codigo fica guardado
 * (useIndicacao) e o app abre no Inicio.
 */
const SO_GUARDA = ["i"];

/** O caminho SEM a query: parametro nao vai para a barra de endereco. */
export function caminhoDaTela(...args: Parameters<typeof caminhoPadrao>): string {
  return caminhoPadrao(...args).split("?")[0];
}

export function telaDoCaminho(...args: Parameters<typeof estadoPadrao>) {
  const [caminho] = args;
  const semBarra = caminho.replace(/^\/+/, "").split("?")[0];
  if ([...SO_PELA_NAVEGACAO, ...SO_GUARDA].some((c) => semBarra === c || semBarra.startsWith(`${c}/`))) {
    return undefined; // o app segue do estado inicial (Inicio)
  }
  return estadoPadrao(...args);
}

// `any` no tipo das rotas: a raiz sao abas com pilhas dentro, e o tipo de
// cada pilha ja vive em auth.routes.tsx — repeti-lo aqui so para o linking nao
// acrescenta seguranca nenhuma.
export const linkingWeb: LinkingOptions<any> = {
  prefixes: [],
  config: { screens: TELAS },
  getPathFromState: caminhoDaTela,
  getStateFromPath: telaDoCaminho,
};

/**
 * O link que se compartilha (pedido do Andre de 24/09, botao no Partner): a
 * loja, ou a loja ja abrindo um profissional. O profissional vai como
 * `?profissional=` — o unico parametro que atravessa a barra de endereco, de
 * proposito: sem ele o link abriria a loja e a pessoa teria de procurar.
 *
 * `ref` (link-de-divulgacao, 05/10): o codigo de quem indicou, para a campanha
 * de indicacao futura. Ainda sem regra — o link so o carrega.
 */
export function linkParaCompartilhar(
  base: string,
  establishmentId: string,
  professionalId?: string,
  ref?: string,
): string {
  const raiz = base.replace(/\/+$/, "");
  const loja = `${raiz}/loja/${encodeURIComponent(establishmentId)}`;
  const query = [
    professionalId ? `profissional=${encodeURIComponent(professionalId)}` : null,
    ref ? `ref=${encodeURIComponent(ref)}` : null,
  ].filter(Boolean);
  return query.length ? `${loja}?${query.join("&")}` : loja;
}

/**
 * Onde o app web do cliente mora — a raiz dos links compartilhados. Producao
 * aponta para o site de producao; o resto (preview, dev) para o de staging, o
 * mesmo par que o Partner usa (`vupth-partner/src/lib/linkPublico.ts`).
 */
export function raizDoSite(env: string): string {
  return env === "prod" ? "https://vupth.pages.dev" : "https://dev.vupth.pages.dev";
}
