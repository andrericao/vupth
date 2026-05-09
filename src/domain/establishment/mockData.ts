import { Establishment } from './types';

export const MOCK_ESTABLISHMENTS: Establishment[] = [
  {
    id: '1',
    name: 'Barbearia Top',
    serviceType: 'BARBER',
    isOpen: true,
    address: {
      street: 'Rua das Flores',
      number: '123',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01001000',
    },
    serviceItems: [
      {
        id: 's1',
        serviceItemType: 'CORTE_MAQUINA',
        customName: 'Corte Degradê',
        price: 35.0,
        estimatedMinutes: 30,
      },
      {
        id: 's2',
        serviceItemType: 'BARBA',
        customName: 'Barba Completa',
        price: 25.0,
        estimatedMinutes: 20,
      },
    ],
  },
  {
    id: '2',
    name: 'Salão Beleza Pura',
    serviceType: 'BEAUTY_SALON',
    isOpen: true,
    address: {
      street: 'Av. Paulista',
      number: '456',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310100',
    },
    serviceItems: [
      {
        id: 's3',
        serviceItemType: 'CORTE_FEMININO',
        customName: 'Corte Feminino',
        price: 80.0,
        estimatedMinutes: 45,
      },
    ],
  },
  {
    id: '3',
    name: 'Nail Designer',
    serviceType: 'NAIL_SALON',
    isOpen: false,
    address: {
      street: 'Rua Augusta',
      number: '789',
      neighborhood: 'Consolação',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01305000',
    },
    serviceItems: [
      {
        id: 's4',
        serviceItemType: 'MANICURE',
        customName: 'Manicure Gel',
        price: 60.0,
        estimatedMinutes: 50,
      },
      {
        id: 's5',
        serviceItemType: 'PEDICURE',
        customName: 'Pedicure Completa',
        price: 55.0,
        estimatedMinutes: 40,
      },
    ],
  },
  {
    id: '4',
    name: 'Barbearia do João',
    serviceType: 'BARBER',
    isOpen: true,
    address: {
      street: 'Rua Vergueiro',
      number: '321',
      neighborhood: 'Liberdade',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01504000',
    },
    serviceItems: [
      {
        id: 's6',
        serviceItemType: 'CORTE_TESOURA',
        customName: 'Corte Social',
        price: 40.0,
        estimatedMinutes: 35,
      },
    ],
  },
];
