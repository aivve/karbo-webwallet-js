let global : any = typeof window !== 'undefined' ? window : self;
global.config = {
	apiUrl:typeof window !== 'undefined' && window.location ? window.location.href.substr(0,window.location.href.lastIndexOf('/')+1)+'api/' : 'https://wallet.parsicoin.net/api/',
	mainnetExplorerUrl: "http://explorer.parsicoin.net/",
	mainnetExplorerUrlHash: "http://explorer.parsicoin.net/?hash={ID}#blockchain_transaction",
	mainnetExplorerUrlBlock: "http://explorer.parsicoin.net/?hash={ID}#blockchain_block",
	testnetExplorerUrl: "http://testnet.parsicoin.net/",
	testnetExplorerUrlHash: "http://testnet.parsicoin.net/?hash={ID}#blockchain_transaction",
	testnetExplorerUrlBlock: "http://testnet.parsicoin.net/?hash={ID}#blockchain_block",
	testnet: false,
    coinUnitPlaces: 8,
    coinDisplayUnitPlaces: 2,
	txMinConfirms: 6,         
	txCoinbaseMinConfirms: 6,
	addressPrefix: 0xf5,
	integratedAddressPrefix: 0,
	addressPrefixTestnet: 0xf5,
	integratedAddressPrefixTestnet: 0,
	subAddressPrefix: 0,
	subAddressPrefixTestnet: 0,
	coinFee: new JSBigInt('100000000'),
	feePerKB: new JSBigInt('100000000'), //for testnet its not used, as fee is dynamic.
	dustThreshold: new JSBigInt('100000000'),//used for choosing outputs/change - we decompose all the way down if the receiver wants now regardless of threshold
	defaultMixin: 0, // default value mixin

	idleTimeout: 30,
	idleWarningDuration: 20,

	coinSymbol: 'PARS',
	openAliasPrefix: "pars",
	coinName: 'ParsiCoin',
	coinUriPrefix: 'parsicoin:',
	avgBlockTime: 120,
	maxBlockNumber: 500000000,
};