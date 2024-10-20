import { TouchableOpacityProps, ImageSourcePropType } from "react-native";

import { HStack, Text, Box } from "@gluestack-ui/themed";

export type CardValuesProps = {
  id: string;
  category: string;
  nameProcedure: string;
  price: number;
  photoProcedure: ImageSourcePropType;
};

type Props = TouchableOpacityProps & {
  data: CardValuesProps;
};

export function CardValues({ data, ...rest }: Props){
	return(
		<HStack
		{ ...rest }>
			<Box
        borderRadius={15}
        padding={6}
        alignItems="center"
        w="$24"
        sx={{
          ":active": {
            bg: "$success100",
          },
        }}
      >
      </Box>

      <Text color="$black">
        {serviceMenu}
      </Text>
			
		</HStack>
	);
}