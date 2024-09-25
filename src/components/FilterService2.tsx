import { TouchableOpacityProps, ImageSourcePropType } from "react-native";

import { Box, Text, Image } from "@gluestack-ui/themed";

type Props = TouchableOpacityProps & {
  serviceMenu: string;
  isActive?: boolean;
  iconService: ImageSourcePropType;
};

export function FilterService2({
  serviceMenu,
  iconService,
  isActive = false,
  ...rest
}: Props) {
  
  return (
    <Box alignItems="center"  {...rest}>
      <Box
        bg={isActive ? "$success100" : "$gray500"}
        padding={6}
        alignItems="center"
        w="$24"
        borderRadius={15}
      >
        <Image
          width={36}
          height={36}
          source={iconService}
          alt="barber_icon"
        />
      </Box>

      <Text fontFamily={isActive ? "$heading" : "$body"} color="$black">
        {serviceMenu}
      </Text>
    </Box>
  );
}
