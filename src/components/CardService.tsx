import { useNavigation } from "@react-navigation/native";

import {
  ImageSourcePropType,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";

import {
  Box,
  ImageBackground,
  Heading,
  Text,
  Icon,
  ChevronRightIcon,
  Button,
} from "@gluestack-ui/themed";

export type CardServiceProps = {
  serviceMenu: string;
  photoBackground: ImageSourcePropType;
};

type Props = TouchableOpacityProps & {
  data: CardServiceProps;
};

export function CardService({ data, ...rest }: Props) {
  const navigation = useNavigation();

  function handleService(service: string) {
    navigation.navigate("listShops", { service });
    console.log(service);
  }

  return (
    <TouchableOpacity {...rest}>
      <Box mb="$5" borderRadius={12} overflow="hidden">
        <ImageBackground source={data.photoBackground} resizeMode="cover">
          <Box py="$6" pl="$5" h={180} justifyContent="space-between">
            <Heading fontFamily="$heading" fontSize="$3xl" color="$white">
              {data.serviceMenu}
            </Heading>
            <Button
              onPress={() => handleService(data.serviceMenu)}
              h="$10"
              w="$32"
              borderRadius={18}
              bg="$success100"
            >
              <Text
                textDecorationLine="none"
                color="$success950"
                fontFamily="$body"
              >
                Ver mais
              </Text>
              <Icon as={ChevronRightIcon} size="md" ml={3} mt={4} />
            </Button>
          </Box>
        </ImageBackground>
      </Box>
    </TouchableOpacity>
  );
}
