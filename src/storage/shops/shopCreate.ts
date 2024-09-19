import AsyncStorage from "@react-native-async-storage/async-storage";

import { shopsGetAll } from "./shopsGetAll";
import { SHOP_COLLECTION } from "@storage/storageConfig";

export async function shopCreate(newShop: string){
	try{

		const storedShops = await shopsGetAll();
		const storageStringified = JSON.stringify ([...storedShops, newShop]);

		// setItem(key, value);
		await AsyncStorage.setItem(SHOP_COLLECTION, storageStringified);
	} catch( error ){
		throw error;
	}

}