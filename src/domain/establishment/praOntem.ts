import { Establishment } from './types';

// Busca "Pra ontem" (Andre, 26/09): para quem tem um compromisso — casamento,
// festa, encontro — e precisa cortar JA. Aparecem as lojas mais proximas e
// livres: o servidor manda so as abertas agora e com profissional com servico
// (?openNow=true&hasAvailability=true), e o app ordena por quem ATENDE
// PRIMEIRO, contando o caminho ate la.
//
// "Mais perto" e "mais livre" brigam: a loja da esquina com 40 min de fila
// atende depois da que fica a 3 km sem fila. O que a pessoa com pressa quer
// saber e quando senta na cadeira — e a fila anda enquanto ela vai: por isso
// o MAIOR dos dois tempos, nao a soma.

/**
 * Minutos por km no deslocamento urbano (carro/app de transporte, contando
 * transito e estacionar). Estimativa grossa, so para ordenar.
 */
export const MINUTOS_POR_KM = 3;

/**
 * Em quantos minutos a pessoa estaria sendo atendida: o maior entre a espera da
 * fila e o caminho. `null` quando a espera e desconhecida. Sem distancia (sem
 * GPS, ou loja ainda nao geocodificada), conta so a espera.
 */
export function minutosAteSerAtendido(e: Establishment): number | null {
  const espera = e.estimated_wait_minutes;
  if (espera == null) return null;
  const km = e.distance_km;
  if (km == null) return espera;
  return Math.max(espera, Math.round(km * MINUTOS_POR_KM));
}

/**
 * A ordem do "Pra ontem": quem atende primeiro antes. Loja sem distancia vai
 * depois das que tem — sem saber onde fica, ela nao pode furar a frente de uma
 * que a gente sabe que esta perto. Espera desconhecida fica por ultimo. Empate
 * mantem a ordem do servidor.
 */
export function ordenarPraOntem(lojas: Establishment[]): Establishment[] {
  const peso = (e: Establishment) => {
    const min = minutosAteSerAtendido(e);
    if (min == null) return [2, 0];
    return [e.distance_km == null ? 1 : 0, min];
  };
  return lojas
    .map((e, i) => ({ e, i, p: peso(e) }))
    .sort((a, b) => a.p[0] - b.p[0] || a.p[1] - b.p[1] || a.i - b.i)
    .map(({ e }) => e);
}

/** "Atende em ~N min" / "Atende agora" — o numero que a pessoa com pressa procura. */
export function rotuloPraOntem(e: Establishment): string | null {
  const min = minutosAteSerAtendido(e);
  if (min == null) return null;
  if (min <= 0) return 'Atende agora';
  if (min < 60) return `Atende em ~${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `Atende em ~${h}h${m ? String(m).padStart(2, '0') : ''}`;
}
