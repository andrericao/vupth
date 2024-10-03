import { FlatList } from "react-native";

import { useNavigation } from "@react-navigation/native";

import { VStack, Box, Button, Text } from "@gluestack-ui/themed";

import { Input } from "@components/Input";
import { Header } from "@components/Header";
import { CardService } from "@components/CardService";

import { SERVICES } from "@utils/servicesData";

export function Services() {
  const navigation = useNavigation();

  function handleSingUp() {
    navigation.navigate("singUp");
  }

  return (
    <VStack flex={1} px={15} py={60}>
      <Header />

      <Button bg="$transparent" onPress={handleSingUp}>
        <Text color="$blue700">Cadastro</Text>
      </Button>

      <Box mt="$6" mb={200}>
        <Input placeholder="Pesquise o serviço desejado" />
      </Box>

      <FlatList
        data={SERVICES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CardService
            key={item.id}
            service={item.serviceMenu}
            photoBackground={item.photoBackground}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 200 }}
      />
    </VStack>
  );
}
