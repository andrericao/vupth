import { Alert } from "react-native";
import { VStack, HStack, Text, Pressable } from "@gluestack-ui/themed";

import { Button } from "@components/Button";
import { avisoDe } from "@domain/avisoDeAbertura";
import { mensagemDoErro } from "@domain/erros/mensagemDoErro";
import { useAvisosDeAbertura, useMudarAvisoDeAbertura } from "@hooks/useAvisosDeAbertura";
import type { AvisoDeAbertura, TipoDeAviso } from "@services/openWatchService";
import { useAuthStore } from "@stores/authStore";
import { useQueueStore } from "@stores/queueStore";

// avisar-quando-abrir-tela, fatia 1 (CLI-26, DEC-160, BAK-8): na loja fechada, o cliente LOGADO pede o aviso
// "<Profissional> começou a atender". Quem ja tem horario marcado nesta loja pode pedir tambem o "a fila
// começou a andar". So para hoje, opt-in, com cancelar. Sem login nao aparece (o aviso nao existe sem conta).
// "Entrar na fila quando abrir" e a fatia 2, que espera a decisao do Andre.

type Props = { establishmentId: string };

const TEXTO: Record<TipoDeAviso, { pedir: string; pedido: string; avisou: string }> = {
  NOTIFY_OPEN: {
    pedir: "Avisar quando abrir",
    pedido: "Vamos avisar quando começar a atender (só hoje).",
    avisou: "Já avisamos: começou a atender hoje.",
  },
  QUEUE_MOVING: {
    pedir: "Avisar quando a fila andar",
    pedido: "Vamos avisar quando a fila começar a andar (só hoje).",
    avisou: "Já avisamos: a fila começou a andar.",
  },
};

const ID: Record<TipoDeAviso, string> = { NOTIFY_OPEN: "aviso-abrir", QUEUE_MOVING: "aviso-fila-andar" };

function LinhaDoAviso({
  kind,
  aviso,
  ocupado,
  onPedir,
  onCancelar,
}: {
  kind: TipoDeAviso;
  aviso: AvisoDeAbertura | null;
  ocupado: boolean;
  onPedir: () => void;
  onCancelar: (id: string) => void;
}) {
  const id = ID[kind];
  if (!aviso) {
    return <Button title={TEXTO[kind].pedir} variant="outline" isLoading={ocupado} onPress={onPedir} testID={`${id}-pedir`} />;
  }
  if (aviso.fired_at) {
    return (
      <Text size="xs" color="$brandTextSecondary" testID={`${id}-avisou`}>
        {TEXTO[kind].avisou}
      </Text>
    );
  }
  return (
    <HStack alignItems="center" justifyContent="space-between" gap="$3" testID={`${id}-pedido`}>
      <Text size="xs" color="$brandTextPrimary" flex={1}>
        {TEXTO[kind].pedido}
      </Text>
      <Pressable onPress={() => onCancelar(aviso.id)} accessibilityRole="button" hitSlop={8} testID={`${id}-cancelar`}>
        <Text size="xs" fontFamily="$heading" color="$brandDanger">
          Cancelar
        </Text>
      </Pressable>
    </HStack>
  );
}

export function AvisarQuandoAbrir({ establishmentId }: Props) {
  const logado = useAuthStore((s) => !!s.accessToken);
  const agendado = useQueueStore((s) =>
    s.activeQueue && s.activeQueue.establishmentId === establishmentId && s.activeQueue.status === "SCHEDULED"
      ? s.activeQueue.professionalId
      : null,
  );
  const { data: avisos } = useAvisosDeAbertura();
  const { pedir, cancelar } = useMudarAvisoDeAbertura();

  if (!logado) return null;

  const falhou = (erro: unknown) => Alert.alert("Aviso", mensagemDoErro(erro, "Não foi possível agora. Tente de novo."));
  const pedirAviso = (kind: TipoDeAviso, professionalId?: string) =>
    pedir.mutate({ establishment_id: establishmentId, kind, professional_id: professionalId }, { onError: falhou });
  const cancelarAviso = (id: string) => cancelar.mutate(id, { onError: falhou });

  return (
    <VStack gap="$3" testID="avisar-quando-abrir">
      <LinhaDoAviso
        kind="NOTIFY_OPEN"
        aviso={avisoDe(avisos, establishmentId, "NOTIFY_OPEN")}
        ocupado={pedir.isPending && pedir.variables?.kind === "NOTIFY_OPEN"}
        onPedir={() => pedirAviso("NOTIFY_OPEN")}
        onCancelar={cancelarAviso}
      />
      {agendado ? (
        <LinhaDoAviso
          kind="QUEUE_MOVING"
          aviso={avisoDe(avisos, establishmentId, "QUEUE_MOVING", agendado)}
          ocupado={pedir.isPending && pedir.variables?.kind === "QUEUE_MOVING"}
          onPedir={() => pedirAviso("QUEUE_MOVING", agendado)}
          onCancelar={cancelarAviso}
        />
      ) : null}
    </VStack>
  );
}
