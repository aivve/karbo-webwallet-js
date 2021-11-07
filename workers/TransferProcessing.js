define(["require", "exports", "../model/TransactionsExplorer", "../model/Wallet", "../model/Mnemonic"], function (require, exports, TransactionsExplorer_1, Wallet_1, Mnemonic_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    //bridge for cnUtil with the new mnemonic class
    self.mn_random = Mnemonic_1.Mnemonic.mn_random;
    self.mn_decode = Mnemonic_1.Mnemonic.mn_decode;
    self.mn_encode = Mnemonic_1.Mnemonic.mn_encode;
    var currentWallet = null;
    onmessage = function (data) {
        // if(data.isTrusted){
        var event = data.data;
        if (event.type === 'initWallet') {
            currentWallet = Wallet_1.Wallet.loadFromRaw(event.wallet);
            postMessage('readyWallet');
        }
        else if (event.type === 'process') {
            if (typeof event.wallet !== 'undefined') {
                currentWallet = Wallet_1.Wallet.loadFromRaw(event.wallet);
            }
            if (currentWallet === null) {
                postMessage('missing_wallet');
                return;
            }
            var rawTransactions = event.transactions;
            var transactions = [];
            for (var _i = 0, rawTransactions_1 = rawTransactions; _i < rawTransactions_1.length; _i++) {
                var rawTransaction = rawTransactions_1[_i];
                var transaction = TransactionsExplorer_1.TransactionsExplorer.parse(rawTransaction, currentWallet);
                if (transaction !== null) {
                    currentWallet.addNew(transaction);
                    //if (transaction.getAmount() !== 0) //fusion
                    //{
                    transactions.push(transaction.export());
                    //}
                }
            }
            postMessage({
                type: 'processed',
                transactions: transactions
            });
        }
        // let transaction = TransactionsExplorer.parse(rawTransaction, height, this.wallet);
        // }else {
        // 	console.warn('Non trusted data', data.data, JSON.stringify(data.data));
        // }
    };
    postMessage('ready');
});
