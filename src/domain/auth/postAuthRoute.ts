/**
 * Para onde ir depois de autenticar.
 *
 * Esta regra estava COPIADA em `Login.tsx` e `SignUp.tsx`, e agora teria uma
 * terceira copia no "Completar perfil" — que entra ENTRE o cadastro e o
 * destino, e precisa terminar exatamente onde o cadastro terminaria. Tres
 * copias da mesma decisao divergem; uma funcao pura nao.
 *
 * O que ela preserva: quem foi interrompido no meio de entrar numa fila volta
 * pro ponto exato, com a selecao intacta. Perder isso significa a pessoa
 * refazer a escolha de servico depois de criar conta.
 */
export type PostAuthParams = {
  redirectTo?: string;
  establishmentId?: string;
  professionalId?: string;
  professionalName?: string;
  establishmentName?: string;
  estimatedWaitMinutes?: number;
  serviceItemIds?: string[];
  targetTime?: string;
  establishmentOpen?: boolean;
  contactPhone?: string | null;
};

export type PostAuthDestino =
  | { tipo: "replace"; rota: "serviceSelection" | "queueStatus"; params: Record<string, unknown> }
  | { tipo: "reset"; rota: "home" };

export function postAuthRoute(params: PostAuthParams = {}): PostAuthDestino {
  // Sem loja E profissional, o destino nao existe — cair na Home e o certo,
  // nao um erro. E por isso que os dois campos sao exigidos junto.
  const temAlvo = !!params.establishmentId && !!params.professionalId;

  if (params.redirectTo === "serviceSelection" && temAlvo) {
    return {
      tipo: "replace",
      rota: "serviceSelection",
      params: {
        establishmentId: params.establishmentId,
        professionalId: params.professionalId,
        professionalName: params.professionalName ?? "",
        establishmentName: params.establishmentName ?? "",
        estimatedWaitMinutes: params.estimatedWaitMinutes ?? 0,
        serviceItemIds: params.serviceItemIds,
        establishmentOpen: params.establishmentOpen,
        contactPhone: params.contactPhone,
      },
    };
  }

  if (params.redirectTo === "queueStatus" && temAlvo) {
    return {
      tipo: "replace",
      rota: "queueStatus",
      params: {
        establishmentId: params.establishmentId,
        professionalId: params.professionalId,
        professionalName: params.professionalName,
        establishmentName: params.establishmentName,
        estimatedWaitMinutes: params.estimatedWaitMinutes,
        serviceItemIds: params.serviceItemIds,
        targetTime: params.targetTime,
      },
    };
  }

  return { tipo: "reset", rota: "home" };
}
