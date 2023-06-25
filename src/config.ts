//export {};
let myGlobal : any = typeof window !== 'undefined' ? window : self;
myGlobal.config = {
	debug: false,
	apiUrl: [
		"https://node.karbo.io:32448/"
	],
    nodeList: [
		"https://karbo.club/services/node_web/",
		"https://node.karbo.org:32448/",
		"https://node.karbo.io:32448/"
	],
	nodeUrl: "",
	mainnetExplorerUrl: "http://explorer.karbowanec.com/",
	mainnetExplorerUrlHash: "http://explorer.karbowanec.com/?hash={ID}#blockchain_transaction",
	mainnetExplorerUrlBlock: "http://explorer.karbowanec.com/?hash={ID}#blockchain_block",
	testnetExplorerUrl: "http://testnet.karbo.org/",
	testnetExplorerUrlHash: "http://testnet.karbo.org/?hash={ID}#blockchain_transaction",
	testnetExplorerUrlBlock: "http://testnet.karbo.org/?hash={ID}#blockchain_block",
	testnet: false,
    coinUnitPlaces: 12,
    coinDisplayUnitPlaces: 2,
	txMinConfirms: 5,
	txCoinbaseMinConfirms: 10,
	addressPrefix: 111,
	integratedAddressPrefix: 112,
	addressPrefixTestnet: 111,
	integratedAddressPrefixTestnet: 112,
	subAddressPrefix: 113,
	subAddressPrefixTestnet: 113,
	coinFee: new JSBigInt('10000000000'),
	dustThreshold: new JSBigInt('100000000'),//used for choosing outputs/change - we decompose all the way down if the receiver wants now regardless of threshold
	defaultMixin: 3, // default value mixin
	idleTimeout: 30,
	idleWarningDuration: 20,
	syncBlockCount: 300, // how many block we sync at once for a single remote node
	maxBlockQueue: 25, // how many watchdog blocks can be max in the queue before waiting
	maxRemoteNodes: 8, // what is the max remote nodes we use in a sync process
	maxWorkerCores: 8, // max cores that the workers can use. If lower they will use numberOfCores - 1
	coinSymbol: 'KRB',
	openAliasPrefix: "krb",
	coinName: 'Karbo',
	coinUriPrefix: 'karbowanec:',
	avgBlockTime: 240,
	maxBlockNumber: 500000000,
};

function logDebugMsg(...data: any[]) {
  if (config.debug) {
    if (data.length > 1) {
      console.log(data[0], data.slice(1));
    } else {
      console.log(data[0]);
    }
  }
}

// log debug messages if debug is set to true
myGlobal.logDebugMsg = logDebugMsg;
