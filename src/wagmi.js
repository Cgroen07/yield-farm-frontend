import { createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { injected } from '@wagmi/connectors'

// Contract addresses
export const TOKEN_CONTRACT = '0x85C7de3f640B6dBD3A31CC9919f0e464171b2AAb'
export const STAKING_CONTRACT = '0xE0f9bf4a929B974F63BB7fCa81a71aab24D52478'

// ✅ Proper MetaMask connector setup
export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected({ chains: [sepolia] }), // <-- Pass the chains here
  ],
  transports: {
    [sepolia.id]: http(),
  },
  ssr: false, // important for Vite/React setups
})
