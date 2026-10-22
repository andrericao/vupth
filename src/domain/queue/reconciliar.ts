import { ClientAttendance } from '@services/attendanceService';
import { ActiveQueue } from '@stores/queueStore';

import { AttendanceStatus } from './types';

// Reconstroi a fila ativa a partir do que o SERVIDOR diz.
//
// Por que precisa existir (achado de 08/09, confirmado em 09/09): a tela so
// mostrava fila que existisse no armazenamento LOCAL, e esse estado nascia em
// dois lugares — o cliente entrando pela tela da fila, e o aceite de troca.
// Quando o atendimento nasce do OUTRO lado (o profissional ACEITA um pedido de
// corte), o servidor sabe e o app nunca fica sabendo.
//
// O resultado era o pior tipo de invisibilidade: o cliente esta numa fila real,
// sendo visto pelo profissional, e o app dele nao mostra nada — sem countdown,
// sem aviso da vez e SEM COMO SAIR. Fechar e reabrir nao resolvia, porque o
// estado nunca existiu.
//
// ⚠️ Isto NAO e pedido ao backend: os atendimentos ativos ja vem na resposta de
// `listClientHistory` — o poll do `useQueueCountdown` ja os encontra pelo id.
// O que faltava era usa-los quando o local esta vazio.

/**
 * Status em que o cliente ESTA na fila (ou na cadeira) e precisa ver a tela.
 *
 * ⚠️ O LATE e VIVO: o cliente foi chamado e nao chegou, mas para o
 * profissional o atendimento segue esperando o corte comecar. Ate 25/09 ele
 * ficava fora desta lista — quem tinha a fila refeita pelo servidor perdia a
 * fila no app, e com ela o aviso de atraso, que so dispara com a fila no
 * aparelho (teste do Andre de 25/09, q292). E a mesma lista do
 * `entrarNaFila`, que ja contava o LATE como ocupado.
 */
const ATIVOS: AttendanceStatus[] = ['SCHEDULED', 'LATE', 'IN_PROGRESS', 'PAUSED'];

export function estaAtivo(status: string): boolean {
  return (ATIVOS as string[]).includes(status);
}

/**
 * Acha o atendimento ativo do cliente. Havendo mais de um (nao deveria, mas o
 * app nao pode quebrar por isso), fica com o MAIS RECENTE: e o que o cliente
 * tem em mente, e o mais antigo provavelmente e residuo.
 */
export function atendimentoAtivo(historico: ClientAttendance[]): ClientAttendance | null {
  const ativos = historico.filter((a) => estaAtivo(a.status));
  if (ativos.length === 0) return null;
  return ativos.reduce((maisRecente, a) =>
    Date.parse(a.scheduledTime) > Date.parse(maisRecente.scheduledTime) ? a : maisRecente,
  );
}

/**
 * Monta o estado local a partir do atendimento do servidor.
 *
 * Preenche o MINIMO que a tela precisa para existir. `estimatedMinutes` e
 * `position` ficam de fora de proposito: o poll do `useQueueCountdown` busca o
 * tempo de espera real logo em seguida e reconcilia. Chutar um numero aqui
 * mostraria uma previsao inventada por alguns segundos — pior que nao mostrar.
 *
 * ⚠️ Ate 17/09 este "de fora" era `0`, e ZERO TAMBEM E UM CHUTE: na tela virava
 * "Agora". Agora e `null`, que as telas mostram como "Calculando...".
 */
export function filaDoAtendimento(
  a: ClientAttendance,
  nomeDoEstabelecimento?: string,
): ActiveQueue {
  const emAtendimento = a.status === 'IN_PROGRESS' || a.status === 'PAUSED';
  return {
    attendanceId: a.id,
    professionalId: a.professionalId,
    professionalName: a.professionalName ?? '',
    establishmentId: a.establishmentId,
    // O historico nao traz o nome da loja. Quem chama passa se souber; a tela
    // ja sabe se virar sem ele.
    establishmentName: nomeDoEstabelecimento ?? '',
    enteredAt: Date.parse(a.scheduledTime) || Date.now(),
    estimatedMinutes: null,
    status: a.status as AttendanceStatus,
    ...(emAtendimento && a.startTime ? { startedAt: Date.parse(a.startTime) } : {}),
    ...(typeof a.totalValue === 'number' ? { totalValue: a.totalValue } : {}),
    ...(a.services?.length
      ? { serviceMinutes: a.services.reduce((s, x) => s + (x.estimatedMinutes ?? 0), 0) }
      : {}),
  };
}

/**
 * "Avaliar" só nos FINISHED sem nota. A fonte é o `rated` do servidor (Backend
 * 3925ec3); a lista local cobre a nota recém-enviada, antes do próximo
 * refetch, e o backend anterior, que não manda o campo.
 */
export function podeAvaliar(a: ClientAttendance, jaAvaliados: string[]): boolean {
  return a.status === 'FINISHED' && a.rated !== true && !jaAvaliados.includes(a.id);
}

/**
 * O atendimento mais recente que TERMINOU e ainda não foi avaliado.
 *
 * Existe porque a avaliação deixou de ser um pedágio: quem fugiu do popup uma
 * vez não pode ser jogado nele de novo (Andre, 19/09). O convite fica na aba
 * Atendimentos, onde ele não atrapalha — e leva ao atendimento que aconteceu.
 */
export function atendimentoSemAvaliar(
  historico: ClientAttendance[],
  jaAvaliados: string[],
): ClientAttendance | null {
  const candidatos = historico.filter((a) => podeAvaliar(a, jaAvaliados));
  if (candidatos.length === 0) return null;
  return candidatos.reduce((maisRecente, a) =>
    Date.parse(a.scheduledTime) > Date.parse(maisRecente.scheduledTime) ? a : maisRecente,
  );
}
