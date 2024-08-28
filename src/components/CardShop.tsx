import { TouchableOpacity, TouchableOpacityProps } from "react-native";

import ShopLogo from "@assets/shop-logo/salao-beleza.jpg";

import {
  Box,
  Text,
  ImageBackground,
  Heading,
  Link,
  Icon,
  ChevronRightIcon,
  StarIcon,
} from "@gluestack-ui/themed";

type Props = TouchableOpacityProps;

export function CardShop({ ...rest }: Props) {
  return (
    <TouchableOpacity {...rest}>
      <Box
        mb="$5"
        h={120}
        flexDirection="row"
        borderRadius={12}
        bg="$light200"
        overflow="hidden"
      >
        <Box w={180} h="$full">
          <ImageBackground
            flex={1}
            source={ShopLogo}
            resizeMode="cover"
          />
        </Box>
        <Box
          px={12}
          flex={1}
          flexDirection="row"
          justifyContent="space-between"
        >
          <Box justifyContent="center">
            <Heading fontFamily="$heading" fontSize="$xl" color="$black">
              Nome Loja
            </Heading>
            <Text fontFamily="$body">Tempo Estimado: 01h40</Text>
            <Box gap={9} mt={12} flexDirection="row" alignItems="center">
              <Icon color="$yellow300" fill="$yellow300" as={StarIcon} size="xl" />
              <Text alignItems="center" fontFamily="$body" fontSize="$xl">4.5</Text>
            </Box>
          </Box>
          <Link flexDirection="row" alignItems="center">
            <Icon as={ChevronRightIcon} size="xl" />
          </Link>
        </Box>
      </Box>
    </TouchableOpacity>
  );
}
