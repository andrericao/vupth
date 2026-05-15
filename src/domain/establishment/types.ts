export type OpenStatus = 'OPEN' | 'CLOSED';

export type EstablishmentStatus = 'ACTIVE' | 'INACTIVE';

export type ServiceItemType =
  | 'CORTE_MAQUINA'
  | 'CORTE_TESOURA'
  | 'BARBA'
  | 'CORTE_FEMININO'
  | 'MANICURE'
  | 'PEDICURE'
  | 'MASSAGEM'
  | 'DEPILACAO';

export interface ServiceItem {
  id: string;
  serviceItemType: ServiceItemType;
  customName: string;
  price: number;
  estimatedMinutes: number;
}

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Establishment {
  id: string;
  name: string;
  ownerId: string;
  urlImage: string | null;
  open_status: OpenStatus;
  status: EstablishmentStatus;
  services: ServiceItem[];
  address?: Address;
}
