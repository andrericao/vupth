import type { PendingPenalty } from '@services/penaltyService';

// A conta da escolha de servicos (Andre, 25/09): as multas pendentes entram
// SEPARADAS do servico — cobrancas do servico de um lado, do app do outro — e
// cada multa diz de onde veio. O cliente nunca e cobrado na surdina.

const MOTIVO: Record<string, string> = {
  LATE_CANCEL: 'Saiu da fila',
  NO_SHOW: 'Não compareceu',
  LATE_ARRIVAL: '3º atraso',
};

export const reais = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

const dataCurta = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** "Saiu da fila · Carlos, Barbearia Premium · 25/09" — o que se sabe, sem lacuna. */
export function origemDaMulta(m: PendingPenalty): string {
  const quem = [m.originProfessionalName, m.originEstablishmentName].filter(Boolean).join(', ');
  return [MOTIVO[m.type] ?? 'Multa', quem || null, dataCurta(m.originDate)].filter(Boolean).join(' · ');
}

/** Servico + multas: o que a pessoa paga no proximo atendimento. */
export function contaComMultas(servico: number, multas: PendingPenalty[]) {
  const totalMultas = multas.reduce((t, m) => t + (Number(m.amount) || 0), 0);
  return { servico, totalMultas, total: servico + totalMultas };
}
