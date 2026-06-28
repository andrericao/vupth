import { Spinner, Center, Text } from "@gluestack-ui/themed";

// Tela exibida no app open enquanto o portao de readiness (waitForBackend) espera
// o backend acordar (cold start do Render). Ver CLAUDE.md "Readiness / cold start".
export function PreparingServer() {
  return (
    <Center flex={1} bg="$gray700" px={15}>
      <Spinner size="large" color="$green500" />
      <Text mt="$3" color="$gray300">
        Preparando servidor...
      </Text>
      <Text mt="$1" size="xs" color="$gray400" textAlign="center">
        Na primeira vez pode levar até ~50s para o servidor acordar.
      </Text>
    </Center>
  );
}
