import { useState } from "react";
import { FlatList } from "react-native";

import { VStack, HStack, Box, Text } from "@gluestack-ui/themed";

import { Input } from "@components/Input";
import { Header } from "@components/Header";
import { CardShop } from "@components/CardShop";
import { useRoute } from "@react-navigation/native";

type RouteParams = {
  service: string
}

export function ListShops() {
  const [shops, setSshops] = useState([
    "Barbearia",
    "Salão Beleza",
    "Sobrancelha",
    "Manicure",
  ]);

  const route = useRoute();
  const { service } = route.params as RouteParams;

  return (
    <VStack flex={1} px={15} py={60}>
        <Header showBackButton/>

        <HStack mt={50}>
          <Text>{service}</Text>
          <Text>Babearia</Text>
        </HStack>

      <Box mt={50}>
        <Input placeholder="Escreva aqui" />

        <Box mt="$40">
          <FlatList
            data={shops}
            keyExtractor={(item) => item}
            renderItem={() => <CardShop />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 200 }}
          />
        </Box>
      </Box>

    </VStack>
  );
}