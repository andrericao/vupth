import { useState } from "react";
import { FlatList } from "react-native";

import { VStack, Box, MenuItem } from "@gluestack-ui/themed";
import { useRoute, useNavigation } from "@react-navigation/native";

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

  const route = useRoute();
  const { service } = route.params as RouteParams;

  const [servicoSelected, setServicoSelected] = useState(service);
  const [listShops, setListShops] = useState<string[]>([]);

  const [shop, setShop] = useState("");

  const navigation = useNavigation();

  function handleService(service: string) {
    console.log(service);
    return navigation.navigate("listShops", { service });
    
  }

  async function fetchShops() {
    try {
      const data = await shopsGetAll();
      setListShops(data);
    } catch (error) {
      console.error(error);
    }
  }

/*
  function handleListShops(){

    const listShopFilter = SHOPS.filter((service) => SERVICES.serviceMenu === service);
    return console.log(listShopFilter);
  }
    */
    

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
              isActive={servicoSelected === item.serviceMenu}
              onPress={() => setServicoSelected(item.serviceMenu)}
            />
          )} 
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </Box>

      <Box mt={20}>
        <Input placeholder={`Buscar em ${servicoSelected}`} />

        <Box mt="$40">
          <FlatList
            data={SHOPS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <CardShop
              key={item.id}
              shopName={item.nameShop}
              reviews={item.reviews}
              photoShop={item.photoShop}
              serviceName={servicoSelected}
            />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 200 }}
          />
        </Box>
      </Box>
    </VStack>
  );
}
