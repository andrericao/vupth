import { Linking } from "react-native";

import { SUPORTE_URL } from "@utils/suporte";

// "Saiba mais" (GUIA_DE_TEXTO.md regra 4, DEC-63): o texto do aviso fica de uma
// linha e a regra completa mora no Suporte. O link vai ao ARTIGO do assunto,
// nunca a home: quem toca em "Saiba mais" da multa e cai numa busca em branco
// saiu do app e nao achou nada, que e pior que nao ter o link.
//
// Cada chave e um assunto do app; o valor e o caminho do artigo no site de
// Suporte (`artigos/<perfil>/<assunto>.html`). Trocar um artigo de lugar e
// mexer aqui e em nenhuma tela.
export const ARTIGOS_DO_SUPORTE = {
  sairDaFila: "cliente/sair-da-fila",
  atraso: "cliente/atrasos",
  mudarAVez: "cliente/mudar-minha-vez",
  excluirConta: "cliente/excluir-conta",
} as const;

export type Artigo = keyof typeof ARTIGOS_DO_SUPORTE;

export function linkDoArtigo(artigo: Artigo): string {
  return `${SUPORTE_URL}artigos/${ARTIGOS_DO_SUPORTE[artigo]}.html`;
}

/** Abre o artigo no navegador do sistema (o Voltar traz de volta ao app). Falhou, nao derruba a tela. */
export async function abrirArtigo(artigo: Artigo): Promise<void> {
  try {
    await Linking.openURL(linkDoArtigo(artigo));
  } catch {
    // sem navegador: nada a fazer na tela
  }
}
