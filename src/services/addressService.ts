import { api } from './api';

export interface AddressRequest {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  reference?: string;
  latitude?: number;
  longitude?: number;
}

export interface AddressResponse {
  id: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  reference: string | null;
  latitude: number | null;
  longitude: number | null;
  main: boolean;
}

function authHeader(accessToken: string) {
  return { headers: { Authorization: `Bearer ${accessToken}` } };
}

export const addressService = {
  create(data: AddressRequest, accessToken: string) {
    return api.post('/users/me/addresses', data, authHeader(accessToken));
  },

  update(addressId: string, data: AddressRequest, accessToken: string) {
    return api.patch(`/users/me/addresses/${addressId}`, data, authHeader(accessToken));
  },

  list(accessToken: string) {
    return api.get<AddressResponse[]>('/users/me/addresses', authHeader(accessToken));
  },

  getMain(accessToken: string) {
    return api.get<AddressResponse>('/users/me/addresses/main', authHeader(accessToken));
  },

  setMain(addressId: string, accessToken: string) {
    return api.patch(`/users/me/addresses/${addressId}/main`, null, authHeader(accessToken));
  },

  remove(addressId: string, accessToken: string) {
    return api.delete(`/users/me/addresses/${addressId}`, authHeader(accessToken));
  },
};
