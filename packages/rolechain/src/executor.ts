import { 
  UniswapCommand, 
  MintPositionCommand, 
  AddLiquidityCommand, 
  RemoveLiquidityCommand, 
  SwapCommand 
} from './types';
import { ethers } from 'ethers';
import { Pool, Position, NonfungiblePositionManager } from '@uniswap/v3-sdk';
import { Token, CurrencyAmount, Percent, TradeType } from '@uniswap/sdk-core';
import { abi as NonfungiblePositionManagerABI } from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json';
import { abi as IUniswapV3PoolABI } from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { fromReadableAmount } from './utils';
import { nearestUsableTick } from '@uniswap/v3-sdk';
import { Route, Trade } from '@uniswap/v3-sdk';
import { SwapRouter, SwapQuoter } from '@uniswap/v3-sdk';
import { Currency } from '@uniswap/sdk-core';
import { LoggingService } from './services/LoggingService';
import { AIResponse } from './types/AIResponse';

const SWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const QUOTER_CONTRACT_ADDRESS = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e';
const NETWORK_ID = 137;
const POSITION_MANAGER_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
const FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984';  // Uniswap V3 Factory
const FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
];

export const maxFeePerGas = ethers.utils.parseUnits('110', 'gwei');
export const maxPriorityFeePerGas = ethers.utils.parseUnits('26', 'gwei');


export class UniswapCommandExecutor {
  private provider: ethers.providers.Provider;
  private wallet: ethers.Wallet;
  private positionManagerAddress = POSITION_MANAGER_ADDRESS;
  private loggingService: LoggingService;
  private logger: ReturnType<LoggingService['createLogger']>;

  constructor() {
    if (!process.env.RPC_URL) {
      throw new Error('RPC_URL environment variable is not set');
    }
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY environment variable is not set');
    }

    this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    this.loggingService = new LoggingService();
    this.logger = this.loggingService.createLogger();
  }

  private async fetchPoolState(poolAddress: string) {
    const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI, this.provider);

    const [token0, token1, fee, tickSpacing, liquidity, slot0] =
      await Promise.all([
        poolContract.token0(),
        poolContract.token1(),
        poolContract.fee(),
        poolContract.tickSpacing(),
        poolContract.liquidity(),
        poolContract.slot0(),
      ]);

    return {
      token0,
      token1,
      fee,
      tickSpacing,
      liquidity,
      sqrtPriceX96: slot0[0],
      tick: slot0[1],
    };
  }

  private async constructPosition(token0Amount: CurrencyAmount<Token>, token1Amount: CurrencyAmount<Token>, poolAddress: string) {
    const poolInfo = await this.fetchPoolState(poolAddress);

    const configuredPool = new Pool(
      token0Amount.currency,
      token1Amount.currency,
      poolInfo.fee,
      poolInfo.sqrtPriceX96.toString(),
      poolInfo.liquidity.toString(),
      poolInfo.tick
    );

    return Position.fromAmounts({
      pool: configuredPool,
      tickLower: nearestUsableTick(poolInfo.tick, poolInfo.tickSpacing) - poolInfo.tickSpacing * 2,
      tickUpper: nearestUsableTick(poolInfo.tick, poolInfo.tickSpacing) + poolInfo.tickSpacing * 2,
      amount0: token0Amount.quotient,
      amount1: token1Amount.quotient,
      useFullPrecision: true,
    });
  }

  private async approveToken(spender: string, tokenAddress: string, amount: string) {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function approve(address spender, uint256 amount) public returns (bool)'],
      this.wallet
    );

    const gasEstimate = await tokenContract.estimateGas.approve(spender, amount);
    await tokenContract.approve(spender, amount, { gasLimit: gasEstimate, maxFeePerGas: ethers.utils.parseUnits('101', 'gwei'),
        maxPriorityFeePerGas: ethers.utils.parseUnits('25', 'gwei') });
  }

  private async executeMintPosition(params: MintPositionCommand['params']) {
    await this.logger.log('Starting mint position execution with params:', params);
    
    const { 
      token_a_amount, 
      token_b_amount, 
      token_a_address,
      token_b_address,
      token_a_decimals,
      token_b_decimals,
      pool_address,
      fee_tier 
    } = params;
    
    await this.logger.log('Creating token instances...');
    const tokenA = new Token(NETWORK_ID, token_a_address, token_a_decimals);
    const tokenB = new Token(NETWORK_ID, token_b_address, token_b_decimals);
    await this.logger.log('Token instances created:', { tokenA, tokenB });

    await this.logger.log('Converting amounts to raw values...');
    const amountA = CurrencyAmount.fromRawAmount(tokenA, fromReadableAmount(token_a_amount, token_a_decimals));
    const amountB = CurrencyAmount.fromRawAmount(tokenB, fromReadableAmount(token_b_amount, token_b_decimals));
    await this.logger.log('Raw amounts:', { amountA: amountA.quotient.toString(), amountB: amountB.quotient.toString() });

    await this.logger.log('Approving tokens...');
    await this.approveToken(this.positionManagerAddress, tokenA.address, amountA.quotient.toString());
    await this.logger.log('Token A approved');
    await this.approveToken(this.positionManagerAddress, tokenB.address, amountB.quotient.toString());
    await this.logger.log('Token B approved');

    await this.logger.log('Constructing position...');
    const position = await this.constructPosition(amountA, amountB, pool_address);
    await this.logger.log('Position constructed:', {
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      liquidity: position.liquidity.toString()
    });

    const mintOptions = {
      recipient: this.wallet.address,
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      slippageTolerance: new Percent(50, 10_000),
    };
    await this.logger.log('Mint options:', mintOptions);

    await this.logger.log('Getting transaction parameters...');
    const { calldata, value } = NonfungiblePositionManager.addCallParameters(position, mintOptions);

    const transaction = {
      data: calldata,
      to: this.positionManagerAddress,
      value: value,
      from: this.wallet.address,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
    await this.logger.log('Transaction prepared:', {
      to: transaction.to,
      value: transaction.value,
      maxFeePerGas: transaction.maxFeePerGas.toString(),
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas.toString()
    });

    await this.logger.log('Sending transaction...');
    const txResponse = await this.wallet.sendTransaction(transaction);
    await this.logger.log('Transaction sent:', txResponse.hash);
    
    await this.logger.log('Waiting for transaction confirmation...');
    const receipt = await txResponse.wait();
    await this.logger.log('Transaction confirmed:', receipt.transactionHash);
    
    return receipt;
  }

  private async executeAddLiquidity(params: AddLiquidityCommand['params']) {
    await this.logger.log('Starting add liquidity execution with params:', params);
    
    let token_a_decimals: number;
    let token_b_decimals: number;
    const { 
      token_id, 
      token_a_amount, 
      token_b_amount,
      token_a_address,
      token_b_address,
      pool_address 
    } = params;
    console.log('fetching decimals');
    token_a_decimals = params.token_a_decimals ?? await this.fetchTokenDecimals(token_a_address);
    token_b_decimals = params.token_b_decimals ?? await this.fetchTokenDecimals(token_b_address);
    console.log('decimals fetched');
    
    await this.logger.log('Creating token instances...');
    const tokenA = new Token(NETWORK_ID, token_a_address, token_a_decimals);
    const tokenB = new Token(NETWORK_ID, token_b_address, token_b_decimals);
    await this.logger.log('Token instances created:', { tokenA, tokenB });

    await this.logger.log('Converting amounts to raw values...');
    const amountA = CurrencyAmount.fromRawAmount(tokenA, fromReadableAmount(token_a_amount, token_a_decimals));
    const amountB = CurrencyAmount.fromRawAmount(tokenB, fromReadableAmount(token_b_amount, token_b_decimals));
    await this.logger.log('Raw amounts:', { amountA: amountA.quotient.toString(), amountB: amountB.quotient.toString() });

    await this.logger.log('Approving tokens...');
    await this.approveToken(this.positionManagerAddress, tokenA.address, amountA.quotient.toString());
    await this.logger.log('Token A approved');
    await this.approveToken(this.positionManagerAddress, tokenB.address, amountB.quotient.toString());
    await this.logger.log('Token B approved');

    await this.logger.log('Constructing position...');
    const position = await this.constructPosition(amountA, amountB, pool_address);
    await this.logger.log('Position constructed:', {
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      liquidity: position.liquidity.toString()
    });

    const addLiquidityOptions = {
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      slippageTolerance: new Percent(50, 10_000),
      tokenId: token_id
    };
    await this.logger.log('Add liquidity options:', addLiquidityOptions);

    await this.logger.log('Getting transaction parameters...');
    const { calldata, value } = NonfungiblePositionManager.addCallParameters(position, addLiquidityOptions);

    const transaction = {
      data: calldata,
      to: this.positionManagerAddress,
      value: value,
      from: this.wallet.address,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
    await this.logger.log('Transaction prepared:', {
      to: transaction.to,
      value: transaction.value,
      maxFeePerGas: transaction.maxFeePerGas.toString(),
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas.toString()
    });

    await this.logger.log('Sending transaction...');
    const txResponse = await this.wallet.sendTransaction(transaction);
    await this.logger.log('Transaction sent:', txResponse.hash);
    
    await this.logger.log('Waiting for transaction confirmation...');
    const receipt = await txResponse.wait();
    await this.logger.log('Transaction confirmed:', receipt.transactionHash);
    
    return receipt;
  }

  private async executeRemoveLiquidity(params: RemoveLiquidityCommand['params']) {
    await this.logger.log('Executing remove liquidity', params);  
    const { token_id, percentage_bps } = params;
    
    // Create NFT Position Manager contract instance
    const positionManager = new ethers.Contract(
      POSITION_MANAGER_ADDRESS,
      NonfungiblePositionManagerABI,
      this.provider
    );

    // Fetch position details using token ID
    await this.logger.log('Fetching position details for token ID:', token_id);
    const position = await positionManager.positions(token_id);
    const {
      token0,
      token1,
      fee,
      tickLower,
      tickUpper,
      liquidity
    } = position;

    // Get token details
    await this.logger.log('Fetching token details...');
    const [decimals0, decimals1] = await Promise.all([
      this.fetchTokenDecimals(token0),
      this.fetchTokenDecimals(token1)
    ]);

    // Create Token instances
    const tokenA = new Token(NETWORK_ID, token0, decimals0);
    const tokenB = new Token(NETWORK_ID, token1, decimals1);

    // Get pool address
    await this.logger.log('Getting pool address...');
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, this.provider);
    const poolAddress = await factory.getPool(token0, token1, fee);

    // Get pool state
    await this.logger.log('Fetching pool state...');
    const poolInfo = await this.fetchPoolState(poolAddress);

    // Create Pool instance
    const pool = new Pool(
      tokenA,
      tokenB,
      fee,
      poolInfo.sqrtPriceX96.toString(),
      poolInfo.liquidity.toString(),
      poolInfo.tick
    );

    // Create Position instance
    const positionInstance = new Position({
      pool,
      liquidity: liquidity.toString(),
      tickLower,
      tickUpper
    });

    await this.logger.log('Position details:', {
      token0: token0,
      token1: token1,
      fee: fee,
      liquidity: liquidity.toString(),
      tickLower: tickLower,
      tickUpper: tickUpper
    });

    const collectOptions = {
      expectedCurrencyOwed0: CurrencyAmount.fromRawAmount(tokenA, 0),
      expectedCurrencyOwed1: CurrencyAmount.fromRawAmount(tokenB, 0),
      recipient: this.wallet.address,
    };

    const removeLiquidityOptions = {
      deadline: Math.floor(Date.now() / 1000) + 60 * 20,
      slippageTolerance: new Percent(50, 10_000),
      tokenId: token_id,
      liquidityPercentage: new Percent(percentage_bps, 10000),
      collectOptions,
    };

    await this.logger.log('Generating remove liquidity parameters...');
    const { calldata, value } = NonfungiblePositionManager.removeCallParameters(
      positionInstance, 
      removeLiquidityOptions
    );

    const transaction = {
      data: calldata,
      to: this.positionManagerAddress,
      value: value,
      from: this.wallet.address,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };

    await this.logger.log('Sending transaction...');
    const txResponse = await this.wallet.sendTransaction(transaction);
    await this.logger.log('Transaction sent:', txResponse.hash);
    
    await this.logger.log('Waiting for confirmation...');
    const receipt = await txResponse.wait();
    await this.logger.log('Transaction confirmed:', receipt.transactionHash);
    
    return receipt;
  }

  private async getV3PoolAddress(tokenA: string, tokenB: string, fee: number): Promise<string> {
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, this.provider);
    return await factory.getPool(tokenA, tokenB, fee);
  }

  private async executeSwap(params: SwapCommand['params']) {
    await this.logger.log('Starting swap execution with params:', params);
    const { input_token, output_token, swap_amount_in } = params;

    // Try different fee tiers to find the pool
    const feeTiers = [500, 3000, 10000]; // 0.05%, 0.3%, 1%
    let poolAddress = null;
    
    for (const fee of feeTiers) {
      const address = await this.getV3PoolAddress(input_token, output_token, fee);
      if (address && address !== ethers.constants.AddressZero) {
        poolAddress = address;
        break;
      }
    }

    if (!poolAddress) {
      throw new Error('No pool found for token pair');
    }
    await this.logger.log('Pool address:', poolAddress);

    // Create token instances
    await this.logger.log('Creating token instances...');
    const tokenInDecimals = await this.fetchTokenDecimals(input_token);
    const tokenOutDecimals = await this.fetchTokenDecimals(output_token);
    
    const tokenIn = new Token(NETWORK_ID, input_token, tokenInDecimals);
    const tokenOut = new Token(NETWORK_ID, output_token, tokenOutDecimals);

    // Get pool info for the token pair
    await this.logger.log('Fetching pool state...');
    const poolInfo = await this.fetchPoolState(poolAddress);

    // Create pool instance
    const pool = new Pool(
      tokenIn,
      tokenOut,
      poolInfo.fee,
      poolInfo.sqrtPriceX96.toString(),
      poolInfo.liquidity.toString(),
      poolInfo.tick
    );

    // Create route
    const swapRoute = new Route([pool], tokenIn, tokenOut);
    await this.logger.log('Route created:', {
      path: swapRoute.tokenPath.map(token => token.address),
      midPrice: swapRoute.midPrice.toSignificant(6)
    });

    // Get quote for exact input
    const amountOut = await this.getOutputQuote(swapRoute, swap_amount_in, tokenInDecimals);
    await this.logger.log('Quote received:', amountOut.toString());

    // Create trade with exact input
    const inputAmount = CurrencyAmount.fromRawAmount(
      tokenIn,
      fromReadableAmount(swap_amount_in, tokenInDecimals)
    );

    await this.logger.log('Approving token spending...');
    await this.approveToken(SWAP_ROUTER_ADDRESS, input_token, inputAmount.quotient.toString());
    await this.logger.log('Token approved');

    const trade = Trade.createUncheckedTrade({
      route: swapRoute,
      inputAmount,
      outputAmount: CurrencyAmount.fromRawAmount(tokenOut, amountOut),
      tradeType: TradeType.EXACT_INPUT,
    });

    const options = {
      slippageTolerance: new Percent(50, 10_000), // 0.5%
      deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
      recipient: this.wallet.address,
    };

    // Get method parameters
    const methodParameters = SwapRouter.swapCallParameters([trade], options);

    const transaction = {
      data: methodParameters.calldata,
      to: SWAP_ROUTER_ADDRESS,
      value: methodParameters.value,
      from: this.wallet.address,
      maxFeePerGas,
      maxPriorityFeePerGas,
    };

    try {
      await this.logger.log('Sending transaction...');
      const txResponse = await this.wallet.sendTransaction(transaction);
      await this.logger.log('Transaction sent:', txResponse.hash);

      await this.logger.log('Waiting for confirmation...');
      const receipt = await txResponse.wait();
      await this.logger.log('Transaction confirmed:', receipt.transactionHash);
      return receipt;

    } catch (error: any) {
      await this.logger.error('Swap failed with error:', error);
      if (error.error?.data) {
        const decodedError = error.error.data.toString();
        await this.logger.error('Decoded error:', decodedError);
      }
      throw error;
    }
  }

  // Add helper method for getting quote
  private async getOutputQuote(route: Route<Currency, Currency>, amount: number, decimals: number) {
    const { calldata } = await SwapQuoter.quoteCallParameters(
      route,
      CurrencyAmount.fromRawAmount(
        route.input,
        fromReadableAmount(amount, decimals)
      ),
      TradeType.EXACT_INPUT,
      {
        useQuoterV2: true,
      }
    );

    const quoteCallReturnData = await this.provider.call({
      to: QUOTER_CONTRACT_ADDRESS,
      data: calldata,
    });

    return ethers.utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData)[0];
  }

  private async fetchTokenDecimals(tokenAddress: string): Promise<number> {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function decimals() view returns (uint8)'],
      this.provider
    );
    return await tokenContract.decimals();
  }

  public async execute(aiResponse: AIResponse) {
    const executionId = await this.loggingService.initializeExecution(aiResponse);
    console.log('Execution ID:', executionId.execution_id);
    
    try {
      for (const command of aiResponse.commands) {
        await this.logger.log('Executing command', { command: command.command });
        switch (command.command) {
          case 'MINT_POSITION':
            await this.executeMintPosition(command.params);
            break;
          case 'ADD_LIQUIDITY':
            await this.executeAddLiquidity(command.params);
            break;
          case 'REMOVE_LIQUIDITY':
            await this.executeRemoveLiquidity(command.params);
            break;
          case 'SWAP':
            await this.executeSwap(command.params);
            break;
          default:
            throw new Error('Unknown command');
        }
      }
      
      await this.loggingService.completeExecution();
    } catch (error: any) {
      await this.logger.error('Command execution failed', error);
      await this.loggingService.completeExecution(error.message);
      throw error;
    }
  }
} 