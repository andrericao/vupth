import { FlatList } from "react-native";

import { VStack, Box } from "@gluestack-ui/themed";

import { Input } from "@components/Input";
import { Header } from "@components/Header";
import { CardService } from "@components/CardService";

import { SHOPS } from "@utils/data";


export function Services() {
  return (
    <VStack flex={1} px={15} py={60}>
        <Header />

      <Box mt={50}>
        <Input placeholder="Pesquise o serviço desejado" />

        <Box mt="$40">
          <FlatList
            data={SHOPS}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <CardService 
              key={item.id}
              service={item.serviceMenu}
              photoBackground={item.photoBackground}
            />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 200 }}
          />
        </Box>
      </Box>

    </VStack>
  );
}
