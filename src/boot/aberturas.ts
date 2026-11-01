import * as SecureStore from "expo-secure-store";

import { useModoSeguroStore } from "@stores/modoSeguroStore";

// log-de-falha-na-abertura (DEC-72/DEC-152): protecao contra laco de queda. A cada abertura grava, no aparelho, que
// "esta abrindo"; quando a primeira tela esta de pe, apaga. Se o app abre e a marca da abertura anterior ainda esta la
// duas vezes seguidas, ele caiu duas vezes na abertura: sobe em MODO SEGURO (sem o que e opcional) em vez de cair de novo.
//
// Regras que nao se quebram:
// - gravar a marca NUNCA derruba a abertura: tudo aqui e try/catch, e a leitura tem teto de tempo;
// - sem a marca (SecureStore falhou), segue normal: nunca trava a pessoa fora do app;
// - o modo seguro so desliga o opcional (cache salvo, push em segundo plano) e AVISA; login e dados nao saem.

export const CHAVE_DE_ABERTURAS = "vupth_aberturas";
/** Quedas seguidas na abertura que levam ao modo seguro. */
export const QUEDAS_PARA_O_MODO_SEGURO = 2;
/** Teto da leitura do aparelho: a abertura nao espera mais que isso por um disco lento. */
export const TETO_DA_LEITURA_MS = 1500;
/** A marca tambem sai por tempo, se a primeira tela demorar: o que vier primeiro. */
export const CONFIRMA_POR_TEMPO_MS = 10000;
const TETO_DA_CONTAGEM = 9;

export type EstadoDeAberturas = { pendentes: number };

/** Le o que esta gravado; qualquer coisa estranha vira "sem quedas". */
export function lerEstado(bruto: string | null | undefined): EstadoDeAberturas {
  try {
    const n = Number((JSON.parse(String(bruto)) as { pendentes?: unknown }).pendentes);
    return { pendentes: Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), TETO_DA_CONTAGEM) : 0 };
  } catch {
    return { pendentes: 0 };
  }
}

/** Esta abertura e segura? E o que grava a marca desta abertura (uma queda a mais ate ser confirmada). */
export function decidirAbertura(estado: EstadoDeAberturas): { seguro: boolean; proximo: EstadoDeAberturas; quedas: number } {
  const quedas = estado.pendentes;
  return {
    seguro: quedas >= QUEDAS_PARA_O_MODO_SEGURO,
    proximo: { pendentes: Math.min(quedas + 1, TETO_DA_CONTAGEM) },
    quedas,
  };
}

const SEM_QUEDAS: EstadoDeAberturas = { pendentes: 0 };

async function comTeto<T>(p: Promise<T>, ms: number, padrao: T): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<T>((resolve) => {
    t = setTimeout(() => resolve(padrao), ms);
  });
  try {
    return await Promise.race([p, limite]);
  } finally {
    if (t) clearTimeout(t);
  }
}

async function gravar(estado: EstadoDeAberturas): Promise<void> {
  try {
    await comTeto(SecureStore.setItemAsync(CHAVE_DE_ABERTURAS, JSON.stringify(estado)), TETO_DA_LEITURA_MS, undefined);
  } catch {
    // a marca e uma rede de seguranca: nunca derruba a abertura
  }
}

export type DecisaoDeAbertura = { seguro: boolean; quedas: number };

let decisao: Promise<DecisaoDeAbertura> | null = null;

/** Roda uma vez por abertura (memoizado): le, decide, grava a marca e avisa o store. Nunca rejeita. */
export function iniciarAbertura(): Promise<DecisaoDeAbertura> {
  if (!decisao) {
    decisao = (async () => {
      let r = { seguro: false, quedas: 0 };
      try {
        const bruto = await comTeto(SecureStore.getItemAsync(CHAVE_DE_ABERTURAS), TETO_DA_LEITURA_MS, null);
        const d = decidirAbertura(lerEstado(bruto));
        await gravar(d.proximo);
        r = { seguro: d.seguro, quedas: d.quedas };
      } catch {
        r = { seguro: false, quedas: 0 };
      }
      useModoSeguroStore.getState().definir(r.seguro, r.quedas);
      return r;
    })();
  }
  return decisao;
}

/** A primeira tela esta de pe: a abertura deu certo, zera a contagem. */
export async function confirmarAbertura(): Promise<void> {
  await gravar(SEM_QUEDAS);
}

/** "Abrir em modo seguro" na tela de erro: a proxima abertura ja sobe em modo seguro. */
export async function forcarModoSeguro(): Promise<void> {
  await gravar({ pendentes: QUEDAS_PARA_O_MODO_SEGURO });
}

/** So para os testes. */
export function reiniciarAberturaParaTeste(): void {
  decisao = null;
}
