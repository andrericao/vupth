import { useState, useEffect } from "react";

import { ImageSourcePropType } from "react-native";

import { useRoute } from "@react-navigation/native";

import { VStack, Heading, Box } from "@gluestack-ui/themed";

import { ImageBanner } from "@components/ImageBanner";
import { CardProfProps } from "@components/CardProf";
import { CardShopProps } from "@components/CardShop";
import { Profs } from "@components/Profs";

import { PROFS } from "@utils/profsData";
import { SHOPS } from "@utils/shopsData";

type RouteParams = {
  shop: string;
  imageShop: ImageSourcePropType;
};

export function InsideShop() {
  const route = useRoute();
  const { shop, imageShop } = route.params as RouteParams;

  const [profs, setProfs] = useState<CardProfProps[]>([]);
  const [bannerShop, setBannerShop] = useState<CardShopProps[]>([]);

  const filterImage = () => {
    const shopSelected = SHOPS.filter(
      (shopName) => shopName.shopName === shop) as CardShopProps[];
      setBannerShop(shopSelected);
  }

  useEffect(() => {
    const profsFiltered = PROFS.filter(
      (prof) => prof.shopName === shop
    ) as CardProfProps[];
    setProfs(profsFiltered);
    filterImage();
  }, []);

  console.log(shop)
  console.log(imageShop)

  return (
    <VStack>
      <ImageBanner data={imageShop} />
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
