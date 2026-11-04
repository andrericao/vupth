import AsyncStorage from "@react-native-async-storage/async-storage";

// frases-na-abertura (CLI-27, DEC-167): frases curtas que se alternam com o V da abertura. Lista em arquivo
// unico: a Design revisa o texto aqui. De teste primeiro, depois so funcionalidades que o app tem hoje.
export const FRASES_DA_ABERTURA: readonly string[] = [
  "Estamos em teste: nos ajude a melhorar e envie seu feedback",
  "Entre na fila de casa e chegue na sua vez",
  "Veja a espera de cada profissional antes de sair",
  "Agende o horário e acompanhe a fila pelo celular",
  "Pague pelo Pix direto no app",
  "Avalie o atendimento em segundos",
];

const CHAVE = "vupth:abertura:frase";

/** Frase da abertura de numero `n` (rotacao: a cada abertura, a seguinte). */
export function fraseDaAbertura(n: number): string {
  const total = FRASES_DA_ABERTURA.length;
  return FRASES_DA_ABERTURA[((Math.floor(n) % total) + total) % total];
}

/**
 * Le o contador desta abertura, grava o proximo e devolve a frase. Nunca rejeita: sem armazenamento, a
 * primeira frase (a do teste) — a abertura nao espera por isso.
 */
export async function sortearFraseDaAbertura(): Promise<string> {
  let n = 0;
  try {
    const salvo = await AsyncStorage.getItem(CHAVE);
    const lido = salvo == null ? 0 : parseInt(salvo, 10);
    n = Number.isFinite(lido) ? lido : 0;
    await AsyncStorage.setItem(CHAVE, String((n + 1) % FRASES_DA_ABERTURA.length));
  } catch {
    n = 0;
  }
  return fraseDaAbertura(n);
}
