import { ImageSourcePropType } from "react-native";

import { Box, ImageBackground } from "@gluestack-ui/themed";

type Props = {
	data: ImageSourcePropType
}

export function ImagePerfil({ data }: Props){
	return(
		<Box
			h={81}
			w={81}			
		>
			<ImageBackground 
				flex={1}
				source={data}
				resizeMode="cover"
				overflow="hidden"
				borderRadius={50}
			/>
		</Box>
	);
}