import { Box, ImageBackground } from "@gluestack-ui/themed";

import ShopLogo from "@assets/shop-logo/salao-beleza.jpg";

export function ImageBanner(){
	return(
		<Box 
			h={300}
			w="$full"
		>
			<ImageBackground
				flex={1}
				source={ShopLogo}
				resizeMode="cover" />
		</Box>
	);
}