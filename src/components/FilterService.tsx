import { ComponentProps } from "react";
import { ImageSourcePropType } from "react-native";

import { Button, Box, Text, Image } from "@gluestack-ui/themed";

type Props = ComponentProps<typeof Button> & {
  serviceMenu?: string;
  isActive: boolean;
  iconService?: ImageSourcePropType;
};

export function FilterService({
  serviceMenu,
  iconService,
  isActive = false,
  ...rest
}: Props) {
  return (
    <Button
      bg="$transparent"
      alignItems="center"
      flexWrap="wrap"
      height={90}
      width={140}
      {...rest}
    >
      <Box
        borderRadius={15}
        padding={6}
        alignItems="center"
        w="$24"
        bg={isActive ? "$success100" : "$gray500"}
        sx={{
          ":active": {
            bg: "$success100",
          },
        }}
      >
        <Image width={36} height={36} source={iconService} alt="barber_icon" />
      </Box>

      <Text color="$black" fontFamily={isActive ? "$heading" : "$body"}>
        {serviceMenu}
      </Text>
    </Button>
  );
}
