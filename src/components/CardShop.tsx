import { TouchableOpacity, TouchableOpacityProps } from "react-native";

import ShopLogo from "@assets/shop-logo/salao-beleza.jpg";

import {
  Box,
  ImageBackground,
  Heading,
  Link,
  LinkText,
  Icon,
  ChevronRightIcon,
  Button,
} from "@gluestack-ui/themed";

type Props = TouchableOpacityProps;

export function CardShop({ ...rest }: Props) {
  return (
    <TouchableOpacity {...rest}>
      <Box mb="$5" borderRadius={12} overflow="hidden">
        <Box py="$6" pl="$5" h={180} w={180} justifyContent="space-between">
          <ImageBackground source={ShopLogo} resizeMode="cover">
            <Heading fontFamily="$heading" fontSize="$3xl" color="$white">
              Barbeiro
            </Heading>
            <Button h="$10" w="$32" borderRadius={18} bg="$success50">
              <Link flexDirection="row" alignItems="center" gap={3}>
                <LinkText
                  textDecorationLine="none"
                  color="$success950"
                  fontFamily="$body"
                >
                  Ver mais
                </LinkText>
                <Icon as={ChevronRightIcon} size="md" />
              </Link>
            </Button>
          </ImageBackground>
        </Box>
      </Box>
    </TouchableOpacity>
  );
}
