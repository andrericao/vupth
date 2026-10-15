import { useEffect, useState } from "react";
import { HStack, Center, VStack } from "@gluestack-ui/themed";
import { BrandMark } from "@components/BrandMark";

// Abertura do app enquanto o portão de readiness (PRD_BACKEND 18c) espera o
// backend. Tela da marca: o "V" e um indicador discreto (os pontos andando) —
// sem citar servidor, API ou demora (abertura-profissional, Andre 15/10: "não
// vamos lançar com essa falta; temos que ser profissional"). Na produção o
// portão passa em fração de segundo; no staging (Render Free) o cold start
// continua, só que mudo.
//
// ⚠️ Ver historico: um selo de marca solto em ladrilho verde CHEIO como fundo
// ja foi testado e revertido (Andre, 2026-08-06: "o começo ficou horrível").
// O fundo continua claro; o verde fica só no "V".

const DOTS = 3;
const STEP_MS = 400;

function Dots() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % DOTS), STEP_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <HStack space="sm" alignItems="center" testID="abertura-indicador">
      {Array.from({ length: DOTS }, (_, i) => (
        <Center
          key={i}
          width={7}
          height={7}
          borderRadius="$full"
          bg={i === active ? "$brandGreen" : "$brandBorder"}
        />
      ))}
    </HStack>
  );
}

export function PreparingServer() {
  return (
    <Center
      flex={1}
      bg="$brandBackground"
      px={24}
      testID="abertura"
      accessibilityLabel="Carregando"
    >
      <VStack alignItems="center" space="xl">
        <BrandMark size={72} />
        <Dots />
      </VStack>
    </Center>
  );
}
