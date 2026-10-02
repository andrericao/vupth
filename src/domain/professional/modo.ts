// Modo por profissional (Backend 8e6c00f, em producao desde 26/09; decisao do
// Andre de 25/09, reafirmando a D9): numa mesma loja um trabalha em FILA e outro
// SO COM AGENDA. Em "so agenda" o cliente nao entra na fila nem pede corte —
// so agenda. O agendado entra na fila na hora dele, como hoje.

export type OperationMode = 'QUEUE' | 'AGENDA_ONLY';

/** Ausente (backend anterior) conta como fila — o comportamento de sempre. */
export function ehSoAgenda(p?: { operation_mode?: string | null } | null): boolean {
  return p?.operation_mode === 'AGENDA_ONLY';
}

export type AcaoPrincipal = 'fila' | 'agendar';
export type OpcaoDoMenu = 'schedule' | 'cut' | 'swap';

type Situacao = { soAgenda: boolean; fora: boolean; lojaAberta: boolean };

/**
 * O botao principal da escolha de servicos.
 *
 * DEC-6 (Andre, 02/10): fila fechada e invariante — ninguem entra direto. Com o
 * profissional Fora (ou Trabalhando com a fila fechada) a tela mostra so
 * "Agendar" e "Mais opcoes", onde fica o pedido de corte. Ate 02/10 o corte era
 * a acao principal.
 */
export function acaoPrincipal({ soAgenda, fora, lojaAberta }: Situacao): AcaoPrincipal {
  if (soAgenda || fora) return 'agendar';
  return lojaAberta ? 'fila' : 'agendar';
}

/**
 * Fim de fila hibrido (C20, Andre 05/08): com a fila aberta o cliente escolhe —
 * entrar agora ou agendar. O agendar e a segunda porta, visivel ao lado da
 * principal; nos outros casos nao ha segunda porta.
 */
export function temSegundaPorta(situacao: Situacao): boolean {
  return acaoPrincipal(situacao) === 'fila';
}

/**
 * O menu "Mais opcoes": tudo que nao e a acao principal nem a segunda porta.
 * "So agenda" nao tem nada alem de agendar — entrar por troca tambem e entrar
 * na fila.
 */
export function opcoesDoMenu(situacao: Situacao): OpcaoDoMenu[] {
  const { soAgenda, fora, lojaAberta } = situacao;
  if (soAgenda) return [];
  if (temSegundaPorta(situacao)) return ['swap'];
  // Fila fechada (DEC-6): so o pedido de corte — a troca tambem poe na fila.
  if (fora) return ['cut'];
  return lojaAberta ? ['schedule', 'swap'] : ['cut', 'swap'];
}

export const MENSAGEM_SO_AGENDA =
  'Este profissional atende só com horário marcado. Escolha um horário para agendar.';
