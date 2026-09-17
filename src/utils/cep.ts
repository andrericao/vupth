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

// O reverse geocode do Android costuma trazer o estado POR EXTENSO ("Santa
// Catarina"); o ViaCEP so aceita a sigla.
const UF_POR_NOME: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA", ceara: "CE",
  "distrito federal": "DF", "espirito santo": "ES", goias: "GO", maranhao: "MA",
  "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG", para: "PA",
  paraiba: "PB", parana: "PR", pernambuco: "PE", piaui: "PI", "rio de janeiro": "RJ",
  "rio grande do norte": "RN", "rio grande do sul": "RS", rondonia: "RO", roraima: "RR",
  "santa catarina": "SC", "sao paulo": "SP", sergipe: "SE", tocantins: "TO",
};

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

export function siglaDaUf(estado: string): string | null {
  const n = normalizar(estado);
  if (/^[a-z]{2}$/.test(n)) return n.toUpperCase();
  return UF_POR_NOME[n] ?? null;
}

type ViaCepBusca = { cep?: string; bairro?: string };

/**
 * O CEP a partir do ENDERECO — para o GPS, que traz rua, bairro, cidade e UF mas
 * quase nunca o CEP no Android (bateria de 07/09, A2).
 *
 * So devolve um CEP quando a resposta e INEQUIVOCA: rua longa tem varios CEPs
 * (por faixa de numero), e um CEP chutado e pior que o campo vazio — o cliente
 * confia no que veio preenchido. O bairro, quando vem, desempata. Nunca lanca.
 */
export async function buscarCepPorEndereco(e: {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}): Promise<string | null> {
  const uf = e.state ? siglaDaUf(e.state) : null;
  const cidade = e.city?.trim();
  const rua = e.street?.trim();
  // O ViaCEP exige pelo menos 3 letras na cidade e na rua.
  if (!uf || !cidade || !rua || cidade.length < 3 || rua.length < 3) return null;

  try {
    const url = `https://viacep.com.br/ws/${uf}/${encodeURIComponent(cidade)}/${encodeURIComponent(rua)}/json/`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepBusca[] | { erro?: boolean };
    if (!Array.isArray(data)) return null;

    let candidatos = data.filter((d) => d.cep);
    if (e.neighborhood) {
      const doBairro = candidatos.filter(
        (d) => d.bairro && normalizar(d.bairro) === normalizar(e.neighborhood!),
      );
      if (doBairro.length > 0) candidatos = doBairro;
    }
    const ceps = new Set(candidatos.map((d) => unmask(d.cep!)));
    if (ceps.size !== 1) return null;
    const [cep] = ceps;
    return cep.length === 8 ? cep : null;
  } catch {
    return null;
  }
}
