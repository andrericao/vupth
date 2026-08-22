import { useEffect, useState } from "react";
import { VStack, HStack, Box, Text, Heading } from "@gluestack-ui/themed";

import { useWsDiagnosticsStore, ChannelState } from "@stores/wsDiagnosticsStore";
import {
  WsChannel,
  channelVerdict,
  formatSince,
  VerdictLevel,
} from "@domain/ws/diagnostics";

// Painel de diagnóstico do tempo real (Andre 2026-08-06). O backend pediu o
// "Teste 0" — imprimir os headers do frame CONNECTED — mas num binário
// instalado `console.log` só aparece via `adb logcat` ou dev client, e o teste
// tem que ser feito com o celular na mão. Então o CONNECTED vira tela.
//
// O que cada linha responde:
//   Canal pessoal  -> S14: conectou com identidade ou como ANÔNIMO?
//   Heartbeat      -> S17: o servidor manda batida ou 0?
//   Recebidas/última -> separa "conectado" de "realmente recebendo".
//   Conexões       -> quantas vezes reconectou (background, troca de rede).

const LEVEL_COLOR: Record<VerdictLevel, string> = {
  ok: "$forest",
  warn: "$brandWarning",
  bad: "$brandDanger",
  idle: "$brandTextSecondary",
};

const LEVEL_BG: Record<VerdictLevel, string> = {
  ok: "$greenTint",
  warn: "$brandWarning",
  bad: "$brandDangerTint",
  idle: "$brandSurface",
};

function Channel({
  channel,
  label,
  state,
  now,
}: {
  channel: WsChannel;
  label: string;
  state: ChannelState;
  now: number;
}) {
  const verdict = channelVerdict(channel, state.status, state.info);

  return (
    <VStack gap="$1" testID={`ws-diag-${channel}`}>
      <HStack alignItems="center" gap="$2">
        <Box w={8} h={8} rounded="$full" bg={LEVEL_COLOR[verdict.level]} />
        <Text fontFamily="$heading" size="sm">
          {label}
        </Text>
      </HStack>
      <Box bg={LEVEL_BG[verdict.level]} borderRadius="$lg" px="$3" py="$2">
        <Text size="xs" color={verdict.level === "idle" ? "$brandTextSecondary" : "$forest"}>
          {verdict.message}
        </Text>
      </Box>
      <Text size="xs" color="$brandTextSecondary">
        {state.messages} recebidas · última {formatSince(state.lastMessageAt, now)} ·{" "}
        {state.connects} {state.connects === 1 ? "conexão" : "conexões"}
        {state.info?.heartBeat ? ` · heart-beat ${state.info.heartBeat}` : ""}
        {state.errors > 0 ? ` · ${state.errors} falhas` : ""}
      </Text>

      {/* O MOTIVO da falha. Sem isto o painel dizia só "falhou o handshake", que
          não aponta causa nenhuma — foi o que travou o teste de 2026-08-07. */}
      {state.lastError && (
        <Text size="xs" color="$brandDanger" testID={`ws-diag-${channel}-error`}>
          {state.lastError}
        </Text>
      )}
    </VStack>
  );
}

export function WsDiagnostics() {
  const publicState = useWsDiagnosticsStore((s) => s.public);
  const personalState = useWsDiagnosticsStore((s) => s.personal);

  // O painel mostra tempo relativo ("há 12s"); sem um tick ele congelaria na
  // hora em que a tela abriu e passaria a mentir.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <VStack mt="$8" gap="$3" testID="ws-diagnostics">
      <VStack>
        <Heading fontFamily="$heading" fontSize="$md" mb="$1">
          Tempo real (diagnóstico)
        </Heading>
        <Text size="xs" color="$brandTextSecondary">
          Estado das conexões que trazem sua vez na fila sem precisar recarregar.
        </Text>
      </VStack>

      <Box bg="$brandSurface" borderRadius="$card" p="$4">
        <VStack gap="$4">
          <Channel
            channel="personal"
            label="Canal pessoal (a sua vez)"
            state={personalState}
            now={now}
          />
          <Box h={1} bg="$brandBorder" />
          <Channel
            channel="public"
            label="Fila do estabelecimento"
            state={publicState}
            now={now}
          />
        </VStack>
      </Box>
    </VStack>
  );
}
