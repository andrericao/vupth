import { Component, ErrorInfo, ReactNode } from "react";
import { VStack, Text, Heading, Box, ScrollView } from "@gluestack-ui/themed";

import { Button } from "@components/Button";

// Rede de seguranca contra erro de RENDER. Ate 2026-09-07 o app nao tinha
// nenhuma: qualquer excecao ao renderizar derrubava o processo, e o usuario via
// o app FECHAR SOZINHO — sem mensagem, sem log, sem nada pra reportar.
//
// O proprio App.tsx ja registrava o sintoma noutro contexto: "o `useQuery`
// estoura 'No QueryClient set' no boot (app fecha / tela branca)". O
// comportamento era conhecido; faltava a rede.
//
// Motivo imediato: o relato de 07/09 de que sair da fila fechava o app. A
// hipotese e um render com `activeQueue` ja nulo — se for isso, e aqui que
// aparece, com a mensagem, em vez de matar o processo.
//
// ⚠️ LIMITE, e ele importa pra nao criar falsa seguranca: um ErrorBoundary
// pega erro de RENDER, de lifecycle e de construtor. NAO pega erro em handler
// de evento nem em promise solta — esses seguem invisiveis. Se o app fechar de
// novo e esta tela NAO aparecer, isso por si so e informacao: o erro nao foi de
// render.

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Vai pro Metro quando ligado, e pro logcat quando nao. E o unico rastro
    // que existe hoje — nao ha coletor de crash no projeto.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <ScrollView
        flex={1}
        bg="$brandBackground"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
      >
        <VStack gap="$4">
          <Heading fontFamily="$heading" fontSize="$xl" color="$brandTextPrimary">
            Alguma coisa quebrou aqui
          </Heading>
          <Text fontFamily="$body" fontSize="$md" color="$brandTextSecondary">
            O app nao fechou — voce pode continuar. Se isso se repetir, mande a linha abaixo junto
            com o que voce estava fazendo.
          </Text>

          {/* O texto tecnico fica: sem coletor de crash, e a unica coisa que o
              QA tem pra reportar. Discreto, mas legivel. */}
          <Box bg="$brandSurface" borderRadius="$lg" p="$3">
            <Text fontFamily="$mono" fontSize="$sm" color="$brandTextSecondary">
              {error.message || String(error)}
            </Text>
          </Box>

          <Button title="Tentar de novo" onPress={this.reset} />
        </VStack>
      </ScrollView>
    );
  }
}
