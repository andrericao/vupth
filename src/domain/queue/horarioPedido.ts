import { formatClockTime } from './types';

// O horario pedido que cai numa refeicao (pedido do Client de 03/07, entregue
// pelo Backend em 26/09, 782db11): o servidor empurra o atendimento para o fim
// do intervalo e responde com placedAfterBreak: true e o scheduledTime real.
// Sem este aviso a pessoa via um horario diferente do que pediu sem saber por que.
//
// Vale nas duas portas em que o cliente escolhe o horario: o reagendar
// (PATCH /attendances/{id}/reschedule) e a entrada com targetTime.

export interface RespostaDoHorarioPedido {
  scheduledTime?: string | null;
  placedAfterBreak?: boolean | null;
}

export interface AvisoDoHorario {
  titulo: string;
  mensagem: string;
}

/** O aviso de "ficou para depois do intervalo", ou null quando o horario ficou como pedido. */
export function avisoDepoisDoIntervalo(resposta: RespostaDoHorarioPedido): AvisoDoHorario | null {
  if (resposta.placedAfterBreak !== true) return null;
  const ms = resposta.scheduledTime ? Date.parse(resposta.scheduledTime) : NaN;
  const quando = Number.isNaN(ms) ? 'logo depois dele' : `depois dele, por volta de ${formatClockTime(new Date(ms))}`;
  return {
    titulo: 'Horário ajustado',
    mensagem: `O horário que você pediu cai no intervalo do profissional. Você será atendido ${quando}. Pode variar um pouco.`,
  };
}

/** O aviso depois de reagendar: o do intervalo, se houve; senao, o de horario reservado. */
export function avisoDoReagendamento(resposta: RespostaDoHorarioPedido): AvisoDoHorario {
  return (
    avisoDepoisDoIntervalo(resposta) ?? {
      titulo: 'Horário reservado',
      mensagem: 'Você cedeu a vez e será chamado por volta do horário escolhido. Pode variar um pouco.',
    }
  );
}
