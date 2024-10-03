import { useState, useEffect } from "react";
import { FlatList } from "react-native";

import { VStack, Box } from "@gluestack-ui/themed";
import { useRoute } from "@react-navigation/native";

import { Input } from "@components/Input";
import { Header } from "@components/Header";
import { Shops } from "@components/Shops";
import { FilterService } from "@components/FilterService";
import { CardShopProps } from "@components/CardShop";

import { SERVICES } from "@utils/servicesData";
import { SHOPS } from "@utils/shopsData";

// import { shopsGetAll } from "@storage/shops/shopsGetAll";

type RouteParams = {
  service: string;
  shop: string;
};

export function ListShops() {
  const route = useRoute();
  const { service } = route.params as RouteParams;

  const [serviceSelected, setServicoSelected] = useState(service);
  const [shops, setShops] = useState<CardShopProps[]>([]);

  /*
  async function fetchShops() {
    try {
      const data = await shopsGetAll();
      setListShops(data);
    } catch (error) {
      console.error(error);
    }
  }
    */

  useEffect(() => {
    const shopsFiltered = SHOPS.filter(
      (shop) => shop.serviceName === serviceSelected,
    ) as CardShopProps[];
    setShops(shopsFiltered);
  }, [serviceSelected]);

  //console.info(shops[1].shopName);

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
