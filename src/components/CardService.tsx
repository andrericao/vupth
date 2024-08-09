import {
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";

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

import Barbearia from "@assets/card-service/barbearia.png";

type Props = TouchableOpacityProps;

export function CardService({ ...rest }: Props) {
  return (
    <TouchableOpacity {...rest}>
      <Box mb="$5" borderRadius={12} overflow="hidden">
        <ImageBackground
          
          source={Barbearia}
          resizeMode="cover"
        >
          <Box py="$6" pl="$5" h={180} justifyContent="space-between">
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
          </Box>
        </ImageBackground>
      </Box>
    </TouchableOpacity>
  );
}