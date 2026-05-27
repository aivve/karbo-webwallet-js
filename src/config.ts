//export {};
let myGlobal : any = typeof window !== 'undefined' ? window : self;
myGlobal.config = {
	debug: false,
	nodeList: [
		"https://node.karbo.org:32448/",
		"https://node.karbo.io:32448/"
	],
	nodeUrl: "",
	mainnetExplorerUrl: "http://explorer.karbo.org/",
	mainnetExplorerUrlHash: "http://explorer.karbo.org/transaction/{ID}",
	mainnetExplorerUrlBlock: "http://explorer.karbo.org/block/{ID}",
	testnetExplorerUrl: "http://testnet.karbo.org/",
	testnetExplorerUrlHash: "http://testnet.karbo.org/transaction/{ID}",
	testnetExplorerUrlBlock: "http://testnet.karbo.org/block/{ID}",
	testnet: false,
	coinUnitPlaces: 12,
	coinDisplayUnitPlaces: 2,
	txMinConfirms: 2,
	txCoinbaseMinConfirms: 10,
	ctForkHeight: 4294967294,
	ctForkHeightTestnet: 400,
	addressPrefix: 111,
	integratedAddressPrefix: 112,
	addressPrefixTestnet: 111,
	integratedAddressPrefixTestnet: 112,
	subAddressPrefix: 113,
	subAddressPrefixTestnet: 113,
	coinFee: new JSBigInt('10000000000'),
	dustThreshold: new JSBigInt('100000000'),//used for choosing outputs/change - we decompose all the way down if the receiver wants now regardless of threshold
	defaultMixin: 15, // CT default: 15 decoys + real input = ring size 16
	syncBlockCount: 1000,
	coinSymbol: 'KRB',
	openAliasPrefix: "krb",
	coinName: 'Karbo',
	coinUriPrefix: 'karbowanec:',
	avgBlockTime: 240,
	maxBlockNumber: 500000000,
};

let randInt = Math.floor(Math.random() * Math.floor(config.nodeList.length));
config.nodeUrl = config.nodeList[randInt];

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
