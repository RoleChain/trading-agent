import { ethers } from 'ethers';
import { getMarketData } from './marketData';
import { Alchemy, Network } from "alchemy-sdk";
import { CONSTANTS } from '../config/constants';
import { abi as NonfungiblePositionManagerABI } from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json';

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
];

export interface V3Position {
  tokenId: string;
  token0: {
    symbol: string;
    address: string;
  };
  token1: {
    symbol: string;
    address: string;
  };
  fee: number;
  liquidity: string;
  tickLower: number;
  tickUpper: number;
}

export interface WalletData {
  erc20_balances: {
    token: string;
    balance: number;
    token_address: string;
  }[];
  v3_positions: V3Position[];
}

async function fetchUniswapV3Positions(walletAddress: string): Promise<V3Position[]> {
  const config = {
    apiKey: process.env.ALCHEMY_API_KEY,
    network: Network.MATIC_MAINNET,
  };
  
  const alchemy = new Alchemy(config);
  
  try {
    // Fetch all NFTs owned by the wallet for Uniswap V3 Positions NFT contract
    const nftsResponse = await alchemy.nft.getNftsForOwner(walletAddress, {
      contractAddresses: [CONSTANTS.POSITION_MANAGER_ADDRESS]
    });

    const positions: V3Position[] = [];
    
    for (const nft of nftsResponse.ownedNfts) {
      // Create contract instance for position manager
      const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
      const positionManager = new ethers.Contract(
        CONSTANTS.POSITION_MANAGER_ADDRESS,
        NonfungiblePositionManagerABI,
        provider
      );

      try {
        // Fetch position data from contract
        const position = await positionManager.positions(nft.tokenId);
        
        // Get token contracts to fetch symbols
        const token0Contract = new ethers.Contract(position.token0, ERC20_ABI, provider);
        const token1Contract = new ethers.Contract(position.token1, ERC20_ABI, provider);
        
        const [token0Symbol, token1Symbol] = await Promise.all([
          token0Contract.symbol(),
          token1Contract.symbol()
        ]);

        positions.push({
          tokenId: nft.tokenId,
          token0: {
            symbol: token0Symbol,
            address: position.token0
          },
          token1: {
            symbol: token1Symbol, 
            address: position.token1
          },
          fee: position.fee,
          liquidity: position.liquidity.toString(),
          tickLower: position.tickLower,
          tickUpper: position.tickUpper
        });
      } catch (error) {
        console.error(`Error fetching position data for token ${nft.tokenId}:`, error);
      }
    }

    return positions;
  } catch (error) {
    console.error('Error fetching Uniswap V3 positions from Alchemy:', error);
    return [];
  }
}

export const getWalletBalance = async (): Promise<WalletData> => {
  const marketData = await getMarketData();
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  
  // Get unique token addresses from market data
  const tokenAddresses = new Set<string>();
  marketData.forEach(pool => {
    tokenAddresses.add(pool.token_a_address);
    tokenAddresses.add(pool.token_b_address);
  });

  // Fetch V3 positions using Alchemy
  const v3Positions = await fetchUniswapV3Positions(wallet.address);
  
  const erc20_balances = [];

  // Fetch balance for each token
  for (const address of tokenAddresses) {
    const contract = new ethers.Contract(address, ERC20_ABI, provider);
    const decimals = await contract.decimals();
    const rawBalance = await contract.balanceOf(wallet.address);
    const balance = parseFloat(ethers.utils.formatUnits(rawBalance, decimals));

    const pool = marketData.find(p => 
      p.token_a_address.toLowerCase() === address.toLowerCase() ||
      p.token_b_address.toLowerCase() === address.toLowerCase()
    );
    
    const token = await contract.symbol();

    erc20_balances.push({
      token,
      balance,
      token_address: address
    });
  }

  return {
    erc20_balances,
    v3_positions: v3Positions
  };
};
