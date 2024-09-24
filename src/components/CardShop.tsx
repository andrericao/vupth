import { TouchableOpacity, TouchableOpacityProps, ImageSourcePropType } from "react-native";

import { useNavigation } from "@react-navigation/native";

import ShopLogo from "@assets/shop-logo/salao-beleza.jpg";

import {
  Box,
  Text,
  ImageBackground,
  Heading,
  Icon,
  ChevronRightIcon,
  StarIcon,
  Button,
  Pressable,
} from "@gluestack-ui/themed";

type Props = TouchableOpacityProps & {
  shopName: string;
  reviews: number;
  photoShop: ImageSourcePropType;
  serviceName: string;
}

export function CardShop({shopName, reviews, photoShop, serviceName,...rest }: Props) {

  const navigation = useNavigation();

  function handleInsideShop(shop: string) {
    navigation.navigate("insideShop", { shopName });
    console.log(shop);
  }

  return (
    <TouchableOpacity {...rest}>
      <Pressable
        onPress={() => handleInsideShop(shopName)}
      >
      <Box
        mb="$5"
        h={120}
        flexDirection="row"
        borderRadius={12}
        bg="$gray500"
        overflow="hidden"
      >
        <Box w={180} h="$full">
          <ImageBackground flex={1} source={photoShop} resizeMode="cover" />
        </Box>
        <Box
          px={12}
          flex={1}
          flexDirection="row"
          justifyContent="space-between"
        >
          <Box justifyContent="center">
            <Heading fontFamily="$heading" fontSize="$xl" color="$black">
              {shopName}
            </Heading>
            <Text fontFamily="$body">Tempo Estimado: 01h40</Text>
            <Box gap={9} mt={12} flexDirection="row" alignItems="center">
              <Icon
                color="$yellow300"
                fill="$yellow300"
                as={StarIcon}
                size="xl"
              />
              <Text alignItems="center" fontFamily="$body" fontSize="$xl">
                {reviews}
              </Text>
            </Box>
          </Box>
          <Box flexDirection="row" alignItems="center">
          <Button bg="$transparent" alignItems="center">
            <Icon as={ChevronRightIcon} size="xl" />
          </Button>
          </Box>
        </Box>
      </Box>
      </Pressable>
    </TouchableOpacity>
  );
}
