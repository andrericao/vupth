import { VStack, HStack, Text } from "@gluestack-ui/themed";
import { Check, X } from "phosphor-react-native";
import { PasswordRule } from "@domain/auth/validateAuth";

type Props = {
  rules: PasswordRule[];
};

export function PasswordRules({ rules }: Props) {
  return (
    <VStack gap="$1" mt="$1">
      {rules.map((rule) => (
        <HStack key={rule.label} alignItems="center" gap="$1">
          {rule.passed ? (
            <Check size={14} color="#163300" weight="bold" />
          ) : (
            <X size={14} color="#B3261E" weight="bold" />
          )}
          <Text size="xs" color={rule.passed ? "$forest" : "$brandDanger"}>
            {rule.label}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}
