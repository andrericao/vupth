import { useState } from "react";
import { FlatList } from "react-native";

import { VStack, Box } from "@gluestack-ui/themed";

import { Input } from "@components/Input";
import { Header } from "@components/Header";
import { CardShop } from "@components/CardShop";

export function Shops() {
  const [shops, setSshops] = useState([
    "Barbearia",
    "Salão Beleza",
    "Sobrancelha",
    "Barbearia",
    "Salão Beleza",
    "Sobrancelha",
  ]);

  return (
    <VStack flex={1} px={15} py={60}>
        <Header />

      <Box mt={50}>
        <Input placeholder="Escreva aqui" />

        <Box mt="$40">
          <FlatList
            data={shops}
            keyExtractor={(item) => item}
            renderItem={() => <CardShop />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </Box>
      </Box>

    </VStack>
  );
}