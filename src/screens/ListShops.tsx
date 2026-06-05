import { useState, useMemo } from "react";
import { FlatList } from "react-native";

import { useRoute } from "@react-navigation/native";
import { VStack, Box } from "@gluestack-ui/themed";

import { Input } from "@components/Input";
import { Header } from "@components/Header";
import { Shops } from "@components/Shops";
import { FilterService } from "@components/FilterService";
import { CardShopProps } from "@components/CardShop";

import { SERVICES } from "@utils/servicesData";
import { SHOPS } from "@utils/shopsData";

type RouteParams = {
  service: string;
};

export function ListShops() {
  const route = useRoute();
  const { service } = route.params as RouteParams;

  const [serviceSelected, setServicoSelected] = useState(service);

  const shops = useMemo(
    () => SHOPS.filter((s) => s.serviceName === serviceSelected) as CardShopProps[],
    [serviceSelected],
  );

  return (
    <VStack flex={1} px={15} py={60}>
      <Header showBackButton />
      <Box mt="$6">
        <FlatList
          data={SERVICES}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FilterService
              serviceMenu={item.serviceMenu}
              iconService={item.iconService}
              isActive={serviceSelected === item.serviceMenu}
              onPress={() => setServicoSelected(item.serviceMenu)}
            />
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </Box>

      <Box mt={20}>
        <Input placeholder={`Buscar em ${serviceSelected}`} />
      </Box>
      <Shops data={shops} />
    </VStack>
  );
}
