import { useMultaStore } from '@stores/multaStore';
import { alertaTipado } from '@utils/alertaTipado';
import { formatarReais } from '@utils/formatarReais';

// multa-bloqueia-entrada (DEC-83): o cliente tem no máximo duas multas acumuladas. Com duas pendentes, entrar na fila,
// agendar e pedir corte voltam 409 PENALTY_LIMIT_REACHED (limit, total, penalties, payment_id); o aviso leva ao pagar.

type ErroHttp = { response?: { status?: number; data?: { code?: string; limit?: number; total?: number | string } } };

export function limiteDeMultasDoErro(erro: unknown): { limite: number; total: number } | null {
  const r = (erro as ErroHttp | null)?.response;
  if (r?.status !== 409 || r.data?.code !== 'PENALTY_LIMIT_REACHED') return null;
  return { limite: Number(r.data.limit) || 2, total: Number(r.data.total) || 0 };
}

export function mensagemDoLimiteDeMultas(limite: number, total: number): string {
  const valor = total > 0 ? ` (${formatarReais(total)})` : '';
  return `Você tem ${limite} multas pendentes${valor}. Pague para marcar um corte.`;
}

/** Se o erro é o limite de multas, mostra o aviso com o "Pagar multa" e devolve true (o erro foi tratado). */
export function avisarLimiteDeMultas(erro: unknown): boolean {
  const l = limiteDeMultasDoErro(erro);
  if (!l) return false;
  alertaTipado(
    'Multas pendentes',
    mensagemDoLimiteDeMultas(l.limite, l.total),
    [
      { text: 'Agora não', style: 'cancel' },
      { text: 'Pagar multa', onPress: () => useMultaStore.getState().abrir() },
    ],
    { tipo: 'dinheiro', selo: 'Multa' },
  );
  return true;
}
