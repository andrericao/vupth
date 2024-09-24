import { useState } from "react";
import { FlatList } from "react-native";

import { VStack, Box } from "@gluestack-ui/themed";
import { useRoute } from "@react-navigation/native";

import { Input } from "@components/Input";
import { Header } from "@components/Header";
import { CardShop } from "@components/CardShop";
import { FilterService } from "@components/FilterService";

import { SERVICES } from "@utils/servicesData";
import { SHOPS } from "@utils/shopsData";

import { shopsGetAll } from "@storage/shops/shopsGetAll";

type RouteParams = {
  service: string;
  shop: string
};

export function ListShops() {

  const [listShops, setListShops] = useState<string[]>([]);
  const route = useRoute();
  const { service } = route.params as RouteParams;

  async function fetchShops() {
    try {
      const data = await shopsGetAll();
      setListShops(data);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <VStack flex={1} px={15} py={60}>
      <Header showBackButton />
      <Box mt="$6" justifyContent="space-between">
        <FlatList
          data={SERVICES}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FilterService
              key={item.id}
              serviceMenu={item.serviceMenu}
              iconService={item.iconService}
              isActive={item.serviceMenu === service}
            />
          )}
          contentContainerStyle={{
            gap: 27,
          }}
          horizontal
        />
      </Box>

      <Box mt={20}>
        <Input placeholder={`Buscar em ${service}`} />

        <Box mt="$40">
          <FlatList
            data={SHOPS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <CardShop
              key={item.id}
              shopName={item.nameShop}
              reviews={item.reviews}
              photoShop={item.photoShop}
              serviceName={service}
            />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 200 }}
          />
        </Box>
      </Box>
    </VStack>
  );
}
