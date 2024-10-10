import { Box, ImageBackground } from "@gluestack-ui/themed";

import { ImageSourcePropType } from "react-native";

type Props = {
	data: ImageSourcePropType;
}

export function ImageBanner({ data, ...rest }: Props){
	return(
		<Box {...rest}
			h={300}
			w="$full"
		>
			<ImageBackground
				flex={1}
				source={data}
				resizeMode="stretch"
				/>
				
		</Box>
	);
}