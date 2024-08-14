import { Box, ImageBackground } from "@gluestack-ui/themed";

import PerfilPhoto from "@assets/perfil-photo/nathalia_yellow.jpg"

export function ImagePerfil(){
	return(
		<Box
			h={81}
			w={81}			
		>
			<ImageBackground 
				flex={1}
				resizeMode="cover"
				source={PerfilPhoto}
				overflow="hidden"
				borderRadius={50}
			/>
		</Box>
	);
}