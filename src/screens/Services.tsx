import { FlatList } from "react-native";

import { VStack, Box } from "@gluestack-ui/themed";

import { Input } from "@components/Input";
import { Header } from "@components/Header";
import { CardService } from "@components/CardService";


export function Services() {
  const DATA = [
    {
      id: "01",
      service: "Barbearia",
      photoBackground: require("@assets/card-service/barbearia.png")
    },
    {
      id: "02",
      service: "Salão de Beleza",
      photoBackground: require("@assets/card-service/beauty-salon.png")
    },
    {
      id: "03",
      service: "Sobrancelha",
      photoBackground: require("@assets/card-service/sobrancelha.png")
    },
    {
      id: "04",
      service: "Manicure",
      photoBackground: require("@assets/card-service/manicure.jpeg")
    }
    
  ];

  return (
    <VStack flex={1} px={15} py={60}>
        <Header />

      <Box mt={50}>
        <Input placeholder="Pesquise o serviço desejado" />

        <Box mt="$40">
          <FlatList
            data={DATA}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <CardService 
              key={item.id}
              service={item.service}
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
