import { TouchableOpacity, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { VStack, Text, Heading, Box, HStack } from "@gluestack-ui/themed";
import { CaretRight } from "phosphor-react-native";

import { AppNavigatorRoutesProps } from "@routes/auth.routes";
import { Header } from "@components/Header";
import { cardShadow } from "@utils/styles";
import { ServiceType } from "@domain/establishment/types";

const CATEGORIES: { key: ServiceType; label: string; emoji: string }[] = [
  { key: "BARBER", label: "Barbearia", emoji: "✂️" },
  { key: "BEAUTY_SALON", label: "Salão", emoji: "💇" },
  { key: "EYEBROW", label: "Sobrancelha", emoji: "👁️" },
  { key: "NAIL_SALON", label: "Manicure", emoji: "💅" },
  { key: "SPA", label: "Spa", emoji: "🌿" },
  { key: "CLINIC", label: "Clínica", emoji: "🩺" },
];

export function Services() {
  const navigation = useNavigation<AppNavigatorRoutesProps>();

  function handleCategory(key: ServiceType) {
    // Troca para a aba Home (navegador pai = tabs) com o filtro aplicado.
    navigation.getParent()?.navigate("homeTab", { screen: "home", params: { filter: key } });
  }

  return (
    <VStack flex={1} px={15} pt={60} pb={30} bg="$gray700">
      <Header />

      <Heading fontFamily="$heading" fontSize="$2xl" mt="$4" mb="$1">
        Serviços
      </Heading>
      <Text size="sm" color="$gray300" mb="$5">
        Escolha uma categoria para ver os estabelecimentos
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack gap="$3">
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              onPress={() => handleCategory(cat.key)}
              testID={`category-${cat.key}`}
            >
              <Box bg="$white" p="$4" borderRadius="$2xl" style={cardShadow}>
                <HStack alignItems="center" gap="$3">
                  <Text fontSize="$2xl">{cat.emoji}</Text>
                  <Text flex={1} fontFamily="$heading" size="md">
                    {cat.label}
                  </Text>
                  <CaretRight size={18} color="#9CA3AF" />
                </HStack>
              </Box>
            </TouchableOpacity>
          ))}
        </VStack>
      </ScrollView>
    </VStack>
  );
}
