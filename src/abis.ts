import { parseAbi } from 'viem'

// Presale ABI — buy, refund, claim, launch, reads
export const PresaleABI = parseAbi([
  'function presale(uint256 minTokenAmount, address platformReferrer, address orderReferrer) payable',
  'function refund(uint256 tokenAmount)',
  'function claimTokens(uint256 tokenId)',
  'function claimETH(uint256 tokenId)',
  'function triggerLaunch()',
  'function tokensAvailable() view returns (uint256)',
  'function launched() view returns (bool)',
  'function launchTime() view returns (uint256)',
  'function totalSold() view returns (uint256)',
  'function totalPurchases() view returns (uint256)',
  'function purchases(uint256 tokenId) view returns (uint256)',
  'function ethContributions(uint256 tokenId) view returns (uint256)',
])

// PonzuRouter ABI — swaps
export const RouterABI = parseAbi([
  'function swapExactETHForTokens(uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) payable returns (uint256[] memory amounts)',
  'function swapExactTokensForETH(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)',
  'function getAmountsOut(uint256 amountIn, address[] calldata path) view returns (uint256[] memory amounts)',
])

// PonzuFactory ABI — get pair
export const FactoryABI = parseAbi([
  'function getPair(address tokenA, address tokenB) view returns (address pair)',
])

// PonzuPair ABI — reserves
export const PairABI = parseAbi([
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
])

// ZapEth ABI
export const ZapEthABI = parseAbi([
  'function calculateExpectedLP(address token, uint256 ethAmount) view returns (uint256 expectedLP)',
  'function zapETHToLP(address token, uint256 minLP, address to) payable returns (uint256 liquidity)',
])

// Farm ABI
export const FarmABI = parseAbi([
  'function stake(uint256 amount)',
  'function stakeNewCard(uint256 amount)',
  'function unstake(uint256 cardId)',
  'function claim(uint256 cardId)',
  'function claimETH(uint256 cardId)',
  'function cardStakes(uint256 cardId) view returns (uint256)',
  'function lpToken() view returns (address)',
])

// ERC20 ABI
export const TokenABI = parseAbi([
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
])

// PonzuRecipe ABI — deploy
export const RecipeABI = parseAbi([
  'function craftPonzu((address owner, address keyContract, uint256 initialBuyAmount, uint256 vestingDuration, bytes32 pricingStrategyTemplate, bytes pricingStrategyData, bytes feeStrategyData, string tokenName, string tokenSymbol, string metadata, string imageURI) params) payable',
])

export const PonzuCraftedABI = parseAbi([
  'event PonzuCrafted(address indexed owner, string tokenName, (address project, address operator, address token, address presale, address launcher, address distributor, address farm, address ponzuBottle, address liquidityCard) addresses)',
])
