import { VStack, Text, Heading, ScrollView } from "@gluestack-ui/themed";

// checar-ambiente-da-api (F20, DEC-184): o build e de um ambiente e a API diz ser de outro (producao falando
// com o staging, ou o inverso). O app para aqui em vez de seguir: nada de gravar dado de gente no banco errado.
// Frase de pessoa, sem citar servidor nem ambiente; o detalhe vai ao Sentry.
export function AmbienteErrado() {
  return (
    <ScrollView
      flex={1}
      bg="$brandBackground"
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
      testID="ambiente-errado"
    >
      <VStack gap="$4">
        <Heading fontFamily="$heading" fontSize="$xl" color="$brandTextPrimary">
          Esta versão do app precisa ser atualizada
        </Heading>
        <Text fontFamily="$body" fontSize="$md" color="$brandTextSecondary">
          Feche o app e abra de novo. Se continuar assim, atualize o VUPTH na loja de aplicativos.
        </Text>
      </VStack>
    </ScrollView>
  );
}
