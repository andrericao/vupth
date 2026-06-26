// Consulta de CEP via ViaCEP (API pública gratuita, não depende do backend VUPTH).
// Portado do front-partner (src/lib/cep.ts) para manter os dois apps alinhados.
import { unmask } from "@utils/masks";

export type CepAddress = {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

type ViaCepResponse = {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

/**
 * Busca o endereço de um CEP. Retorna null se o CEP for inválido/não encontrado
 * ou se a requisição falhar (offline etc.) — nunca lança.
 */
export async function lookupCep(rawCep: string): Promise<CepAddress | null> {
  const cep = unmask(rawCep);
  if (cep.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) return null;
    const data: ViaCepResponse = await res.json();
    if (data.erro) return null;
    return {
      street: data.logradouro ?? "",
      neighborhood: data.bairro ?? "",
      city: data.localidade ?? "",
      state: data.uf ?? "",
    };
  } catch {
    return null;
  }
}
