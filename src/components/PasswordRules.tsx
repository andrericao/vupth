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
            <Check size={14} color="#2F432F" weight="bold" />
          ) : (
            <X size={14} color="#E63946" weight="bold" />
          )}
          <Text size="xs" color={rule.passed ? "$green500" : "$red500"}>
            {rule.label}
          </Text>
        </HStack>
      ))}
    </VStack>
  );
}
