import { VStack, HStack, Text } from "@gluestack-ui/themed";
import { CircleCheck, CircleX } from "lucide-react-native";
import { PasswordRule } from "@domain/auth/validateAuth";
import { useTema } from "@hooks/useTema";

type Props = {
  rules: PasswordRule[];
};

// C27 (Andre, 16/09, para os dois apps): o sinal de cada regra vai num CIRCULO
// — CircleCheck/CircleX, 14 px —, igual ao Partner.
export function PasswordRules({ rules }: Props) {
  const { cores } = useTema();
  return (
    <VStack gap="$1" mt="$1">
      {rules.map((rule) => (
        <HStack key={rule.label} alignItems="center" gap="$1">
          {rule.passed ? (
            <CircleCheck size={14} color={cores.textPrimary} />
          ) : (
            <CircleX size={14} color={cores.danger} />
          )}
          <Text size="xs" color={rule.passed ? "$brandTextPrimary" : "$brandDanger"}>
            {rule.label}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}
