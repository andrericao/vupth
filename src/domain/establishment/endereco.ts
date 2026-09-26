import { Address } from './types';

// O endereco na tela da loja (Andre, 24/09): "nao adianta o cliente querer
// marcar sem saber como chegar". O `GET /establishment/id/{id}` ja trazia o
// `address` com latitude e longitude — so nao aparecia em lugar nenhum.

/** "Rua X, 300 · Centro, Cidade" — o que cabe numa linha e identifica o lugar. */
export function enderecoEmUmaLinha(a?: Address | null): string | null {
  if (!a?.street) return null;
  const rua = [a.street, a.number].filter(Boolean).join(', ');
  const regiao = [a.neighborhood, a.city].filter(Boolean).join(', ');
  return regiao ? `${rua} · ${regiao}` : rua;
}

/**
 * O link do "como chegar". Com coordenada, vai direto ao ponto — o endereco
 * escrito pode ser ambiguo (duas "Rua Um" na mesma cidade). O formato
 * `maps/search/?api=1` abre o app de mapas no celular e o site no navegador.
 */
export function linkDoMapa(a?: Address | null): string | null {
  if (!a) return null;
  if (a.latitude != null && a.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`;
  }
  const texto = [a.street, a.number, a.neighborhood, a.city, a.state].filter(Boolean).join(', ');
  return texto ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}` : null;
}
