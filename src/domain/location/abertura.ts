import { Coords } from './gps';

// O que a abertura do app faz com o GPS, e quando a lista de lojas pode sair.
//
// Até 16/09 a lista de lojas era pedida DUAS ou TRÊS vezes a cada abertura. A
// chave da consulta leva as coordenadas, e elas mudavam depois da primeira
// busca: o store começa vazio e só depois lê o que estava salvo; e o GPS era
// pedido de novo em toda abertura, porque o efeito lia `gpsAsked` ANTES da
// leitura terminar — o que ainda voltava a perguntar a permissão a quem já
// tinha negado.

export type AcaoGpsNaAbertura = 'esperar' | 'perguntar' | 'atualizar' | 'nada';

export function acaoDoGpsNaAbertura(s: {
  hydrated: boolean;
  gpsAsked: boolean;
  resolved: boolean;
}): AcaoGpsNaAbertura {
  // Sem ler o que estava salvo, não dá para saber se já perguntamos.
  if (!s.hydrated) return 'esperar';
  // Primeira vez: pergunta — a não ser que a pessoa já tenha escolhido o lugar
  // na mão.
  if (!s.gpsAsked) return s.resolved ? 'nada' : 'perguntar';
  // Já perguntamos: nunca de novo. Só atualiza a coordenada se a permissão já
  // foi dada, para ela não envelhecer com quem se muda.
  return 'atualizar';
}

/**
 * Quanto a lista espera o GPS. Passou disso, busca sem ele — uma busca a mais
 * depois é melhor que a tela parada esperando o satélite.
 */
export const ESPERA_MAXIMA_GPS_MS = 5_000;

export function listaPodeBuscar(s: { hydrated: boolean; gpsPending: boolean }): boolean {
  return s.hydrated && !s.gpsPending;
}

/**
 * A coordenada que vai para a busca, com 3 casas (~100 m). O GPS oscila alguns
 * metros entre uma leitura e outra, e cada oscilação virava chave nova — e
 * busca nova — sem mudar a ordem de loja nenhuma.
 */
export function coordsDaLista(coords: Coords | null | undefined): Coords | null {
  if (!coords) return null;
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return { latitude: r(coords.latitude), longitude: r(coords.longitude) };
}
