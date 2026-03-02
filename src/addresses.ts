// Ponzu protocol contract addresses per network

import type { Address } from 'viem'

export type Network = 'mainnet' | 'sepolia'

export interface ProtocolAddresses {
  ponzuRecipe: Address
  ponzuSwap: Address
  ponzuRouter: Address
  zapEth: Address
  weth: Address
  linearPricingStrategy: Address
  ethRewarder: Address
  ponzuVault: Address
}

const ADDRESSES: Record<Network, ProtocolAddresses> = {
  mainnet: {
    ponzuRecipe: '0x1155484c5fE614538d83c444f9a6dB662E6a7153',
    ponzuSwap: '0x1DCA548D67938E6162f0756985cC3e539Aae30C2',
    ponzuRouter: '0xb90BD8EA30dE3b1DF07Eb574374229F4213F649e',
    zapEth: '0x33a1FB28125e3a396743Ac40B43f56499a13575D',
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    linearPricingStrategy: '0x308Ce1EC9655D952A18FC9f57cA2fA06A697F0b8',
    ethRewarder: '0x66CF6F4297d812bB9B6647f23357b47a91Da0530',
    ponzuVault: '0x4D9fEC67fA5Eed8402A1b45dA9CcA6AA5CC1B791',
  },
  sepolia: {
    ponzuRecipe: '0x219d82fc450C3124a64a1ef7aD6C092F866307fF',
    ponzuSwap: '0x27355C17C80d341e71F9ae44578a3eC61eB4fFA2',
    ponzuRouter: '0x7665074482247cAc541BE364c1811851ca102d02',
    zapEth: '0x7dF7543e3bF2E5da11Fc6eae3bC6cf88578AfbC6',
    weth: '0xeDf5E9f5f1E4255a2d68eE6B076444D0d18B77bc',
    linearPricingStrategy: '0xA68062d113360A8d5AA81505bBf21D6480A4BDB4',
    ethRewarder: '0xF625D51418ec56b99E9b7Ef54Db182642651ebdD',
    ponzuVault: '0x888888886544E7dDBab4fFeD4e58E48033c62074',
  },
}

export function getProtocolAddresses(network: Network): ProtocolAddresses {
  return ADDRESSES[network]
}
