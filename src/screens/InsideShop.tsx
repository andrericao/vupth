import { useState, useEffect } from "react";

import { ImageSourcePropType } from "react-native";

import { useRoute } from "@react-navigation/native";

import { VStack, Heading, Box } from "@gluestack-ui/themed";

import { ImageBanner } from "@components/ImageBanner";
import { CardProfProps } from "@components/CardProf";
import { Profs } from "@components/Profs";

import { PROFS } from "@utils/profsData";
import { SHOPS } from "@utils/shopsData";
import { CardShopProps } from "@components/CardShop";

type RouteParams = {
  shop: string;
  //imageBanner: ImageSourcePropType;
};

export function InsideShop() {
  const route = useRoute();
  const { shop } = route.params as RouteParams;

  const [profs, setProfs] = useState<CardProfProps[]>([]);

  useEffect(() => {
    const profsFiltered = PROFS.filter(
      (prof) => prof.shopName === shop
    ) as CardProfProps[];
    setProfs(profsFiltered);
  }, []);

  return (
    <VStack>
      <ImageBanner />
      <Box
        px={15}
        flexDirection="row"
        my={15}
        gap={9}
        justifyContent="space-between"
      >
        <Heading fontFamily="$heading">Funcionários {profs.length}</Heading>
        <Heading fontFamily="$heading">Filtrar </Heading>
      </Box>

      <Profs data={profs}/>
    </VStack>
  );
}
