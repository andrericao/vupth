// Horário de funcionamento POR DIA da semana (C22) — contrato do backend de
// 16/09, no ar em staging desde 17/09.
//
// Até aqui a tela da loja só sabia dizer "Aberto agora" / "Fechada agora": o
// contrato antigo trazia um booleano e nada mais. Quem chegava fora do horário
// não tinha como saber QUANDO a loja reabre — e a decisão do modelo híbrido
// (04/09) depende disso para o agendar fazer sentido.

export type DiaDaSemana =
  | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

/** Uma faixa de atendimento. `closed` verdadeiro nunca leva horário. */
export interface FaixaDeHorario {
  closed: boolean;
  /** "HH:mm", no fuso da loja. */
  opens?: string | null;
  closes?: string | null;
}

export interface DiaDaSemanaHorario extends FaixaDeHorario {
  day: DiaDaSemana;
}

export interface ExcecaoDeData extends FaixaDeHorario {
  /** "YYYY-MM-DD" — só de hoje em diante. */
  date: string;
}

export interface DiaResolvido extends FaixaDeHorario {
  date: string;
  day: DiaDaSemana;
  /** O horário deste dia veio de uma exceção, não da regra da semana. */
  exception?: boolean;
}

export interface HorariosDaLoja {
  /** `false` = a loja ainda não definiu a semana. Não inventar horário. */
  configured: boolean;
  weekly: DiaDaSemanaHorario[];
  exceptions: ExcecaoDeData[];
  /** Os próximos dias já resolvidos (exceção > regra da semana). */
  upcoming: DiaResolvido[];
}

export const NOME_DO_DIA: Record<DiaDaSemana, string> = {
  MONDAY: "Segunda",
  TUESDAY: "Terça",
  WEDNESDAY: "Quarta",
  THURSDAY: "Quinta",
  FRIDAY: "Sexta",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

const ORDEM: DiaDaSemana[] = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
];

/** `Date.getDay()` é domingo=0; a semana do contrato começa na segunda. */
export function diaDaData(data: Date): DiaDaSemana {
  return ORDEM[(data.getDay() + 6) % 7];
}

/**
 * O texto de uma faixa. As três formas vêm do contrato: fechado não leva
 * horário; `opens` igual a `closes` é 24 horas; `closes` antes de `opens` vira
 * a meia-noite — e aí a tela precisa dizer isso, senão "22:00 às 02:00" lê como
 * erro de digitação.
 */
export function textoDaFaixa(faixa: FaixaDeHorario): string {
  if (faixa.closed) return "Fechado";
  const abre = faixa.opens ?? "";
  const fecha = faixa.closes ?? "";
  if (!abre || !fecha) return "Fechado";
  if (abre === fecha) return "24 horas";
  const viraODia = fecha < abre;
  return `${abre} às ${fecha}${viraODia ? " (vira o dia)" : ""}`;
}

/** As 7 linhas da semana, na ordem do contrato, marcando o dia de hoje. */
export function semanaParaExibir(
  horarios: HorariosDaLoja | null | undefined,
  hoje: Date,
): { dia: DiaDaSemana; nome: string; texto: string; ehHoje: boolean }[] {
  if (!horarios?.configured) return [];
  const hojeDia = diaDaData(hoje);
  const porDia = new Map(horarios.weekly.map((d) => [d.day, d]));
  return ORDEM.filter((d) => porDia.has(d)).map((dia) => ({
    dia,
    nome: NOME_DO_DIA[dia],
    texto: textoDaFaixa(porDia.get(dia)!),
    ehHoje: dia === hojeDia,
  }));
}

/** Data local em "YYYY-MM-DD" — o formato que o contrato usa. */
export function dataISO(data: Date): string {
  const mes = `${data.getMonth() + 1}`.padStart(2, "0");
  const dia = `${data.getDate()}`.padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${dia}`;
}

/** O dia de hoje já resolvido: a exceção da data ganha da regra da semana. */
export function horarioDeHoje(
  horarios: HorariosDaLoja | null | undefined,
  hoje: Date,
): DiaResolvido | null {
  if (!horarios?.configured) return null;
  const iso = dataISO(hoje);
  const doUpcoming = horarios.upcoming.find((d) => d.date === iso);
  if (doUpcoming) return doUpcoming;

  const excecao = horarios.exceptions.find((e) => e.date === iso);
  const dia = diaDaData(hoje);
  if (excecao) return { ...excecao, day: dia, exception: true };

  const daSemana = horarios.weekly.find((d) => d.day === dia);
  return daSemana ? { ...daSemana, date: iso, exception: false } : null;
}

/** "Hoje, 08:00 às 18:00" · "Fechada hoje". Sem semana definida, nada. */
export function resumoDeHoje(
  horarios: HorariosDaLoja | null | undefined,
  hoje: Date,
): string | null {
  const dia = horarioDeHoje(horarios, hoje);
  if (!dia) return null;
  return dia.closed ? "Fechada hoje" : `Hoje, ${textoDaFaixa(dia)}`;
}

/**
 * Quando reabre — o que a pessoa que chega fora do horário quer saber. Olha só
 * os dias JÁ RESOLVIDOS (`upcoming`), porque é neles que a exceção da data já
 * está aplicada: dizer "reabre sábado" por causa da regra da semana, num sábado
 * que o dono fechou por exceção, é pior que não dizer nada.
 */
export function proximaAbertura(
  horarios: HorariosDaLoja | null | undefined,
  hoje: Date,
): string | null {
  if (!horarios?.configured) return null;
  const iso = dataISO(hoje);
  const proximo = horarios.upcoming.find((d) => d.date > iso && !d.closed && d.opens);
  if (!proximo) return null;
  const amanha = dataISO(new Date(hoje.getTime() + 24 * 60 * 60 * 1000));
  const quando = proximo.date === amanha ? "amanhã" : NOME_DO_DIA[proximo.day].toLowerCase();
  return `Reabre ${quando}, ${proximo.opens}`;
}
