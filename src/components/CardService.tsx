import { useState } from "react";

import {
  ImageSourcePropType,
  TouchableOpacity,
  TouchableOpacityProps,
} from "react-native";

import { useNavigation } from "@react-navigation/native";

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

type Props = TouchableOpacityProps & {
  service: string;
  photoBackground: ImageSourcePropType;
};

export function CardService({ service, photoBackground, ...rest }: Props) {
  const navigation = useNavigation();
  const [serviceName, setServiceName] = useState('');

  function handleService(service: string) {
    
    navigation.navigate("listShops", { service });
    console.log(service);
  }

  return (
    <TouchableOpacity {...rest}>
      <Box mb="$5" borderRadius={12} overflow="hidden">
        <ImageBackground source={photoBackground} resizeMode="cover">
          <Box py="$6" pl="$5" h={180} justifyContent="space-between">
            <Heading fontFamily="$heading" fontSize="$3xl" color="$white">
              {service}
            </Heading>
            <Button
              onPress={() => handleService(service)}
              h="$10"
              w="$32"
              borderRadius={18}
              bg="$success50"
            >
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
