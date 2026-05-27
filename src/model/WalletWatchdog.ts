/**
 *     Copyright (c) 2018-2020, ExploShot
 *     Copyright (c) 2018-2020, The Qwertycoin Project
 *     Copyright (c) 2018-2020, The Karbo
 *
 *     All rights reserved.
 *     Redistribution and use in source and binary forms, with or without modification,
 *     are permitted provided that the following conditions are met:
 *
 *     ==> Redistributions of source code must retain the above copyright notice,
 *         this list of conditions and the following disclaimer.
 *     ==> Redistributions in binary form must reproduce the above copyright notice,
 *         this list of conditions and the following disclaimer in the documentation
 *         and/or other materials provided with the distribution.
 *     ==> Neither the name of Qwertycoin nor the names of its contributors
 *         may be used to endorse or promote products derived from this software
 *          without specific prior written permission.
 *
 *     THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 *     "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 *     LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 *     A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 *     CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *     EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 *     PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 *     PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 *     LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 *     NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 *     SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import {Wallet} from "./Wallet";
import {BlockchainExplorer, RawDaemon_Transaction} from "./blockchain/BlockchainExplorer";
import {Transaction} from "./Transaction";
import {TransactionsExplorer} from "./TransactionsExplorer";

export class WalletWatchdog {

    wallet: Wallet;
    explorer: BlockchainExplorer;

    constructor(wallet: Wallet, explorer: BlockchainExplorer) {
        this.wallet = wallet;
        this.explorer = explorer;

        this.initWorker();
        this.initMempool();
        // Background, fire-and-forget. Errors are logged inside.
        this.healStaleCtOutputs();
    }

    private healStaleCtOutputsPromise: Promise<void> | null = null;

    /**
     * One-shot, deduped (per WalletWatchdog instance) repair pass: for every
     * stored tx that contains a CT-era output without CT markers, re-fetch the
     * raw tx from the daemon and re-parse it with the current CT-aware
     * scanner. The re-parsed Transaction replaces the old one via
     * Wallet.addNew(replace=true), repopulating ctCommitment / ctMaskedAmount
     * / ctBlinding / ctRingAmount. After this completes, formatWalletOutsForTx
     * stops dropping those outputs and the user's balance comes back.
     *
     * Runs sequentially to keep node load low; failures are logged and the
     * pass continues; leftover suspects will simply be re-attempted next
     * time a watchdog is constructed (e.g. wallet switch).
     */
    healStaleCtOutputs(): Promise<void> {
        if (this.healStaleCtOutputsPromise !== null) return this.healStaleCtOutputsPromise;
        let self = this;

        this.healStaleCtOutputsPromise = this.explorer.getHeight().catch(function (e: any) {
            console.warn('[wallet] CT heal: failed to refresh daemon height before scan', e);
        }).then(function () {
            let suspects = TransactionsExplorer.findStaleCtSuspectTxs(self.wallet);
            if (suspects.length === 0) return;

            console.warn('[wallet] healing ' + suspects.length + ' tx(es) with stale CT outputs:',
                suspects.map(s => ({hash: s.hash, height: s.height})));

            let healed = 0;
            let failed = 0;
            let chain: Promise<any> = Promise.resolve();
            for (let suspect of suspects) {
                let s = suspect;
                chain = chain.then(function () {
                    if (self.stopped) return;
                    return self.explorer.getTransactionsForBlocks(s.height, s.height, /*includeMinerTx*/ true).then(function (rawTxs: any) {
                        if (self.stopped) return;
                        if (!Array.isArray(rawTxs)) return; // 'status' string fallback when block has no txs
                        for (let rawTx of rawTxs as RawDaemon_Transaction[]) {
                            if (rawTx.hash !== s.hash) continue;
                            let parsed = TransactionsExplorer.parse(rawTx, self.wallet);
                            if (parsed !== null) {
                                self.wallet.addNew(parsed, /*replace*/ true);
                                healed++;
                            } else {
                                failed++;
                                console.warn('[wallet] heal: re-parse returned null for ' + s.hash);
                            }
                            return;
                        }
                        failed++;
                        console.warn('[wallet] heal: tx ' + s.hash + ' not found at height ' + s.height);
                    }).catch(function (e: any) {
                        failed++;
                        console.warn('[wallet] heal: fetch failed for ' + s.hash + ' at height ' + s.height, e);
                    });
                });
            }

            return chain.then(function () {
                console.info('[wallet] CT heal pass complete: healed=' + healed + ' failed=' + failed + ' total=' + suspects.length);
            });
        }).then(function () {
            self.healStaleCtOutputsPromise = null;
        });
        return this.healStaleCtOutputsPromise;
    }

    private defaultNodeUrl: string | null = null;

    private applyNodeUrl() {
        if (this.wallet.options.customNode && this.wallet.options.nodeUrl !== '') {
            config.nodeUrl = this.wallet.options.nodeUrl;
            return;
        }

        if (this.defaultNodeUrl === null || config.nodeList.indexOf(this.defaultNodeUrl) === -1) {
            let randNodeInt:number = Math.floor(Math.random() * Math.floor(config.nodeList.length));
            this.defaultNodeUrl = config.nodeList[randNodeInt];
        }

        config.nodeUrl = this.defaultNodeUrl;
    }

    private getSyncRetryDelayMs() {
        if (this.wallet.lastHeight < this.lastMaximumHeight) {
            return 5 * 1000;
        }

        return 30 * 1000;
    }
    initWorker() {
        let self = this;

        this.applyNodeUrl();
        this.workerProcessing = new Worker('./workers/TransferProcessingEntrypoint.js');
        this.workerProcessing.onmessage = function (data: MessageEvent) {
            let message: string | any = data.data;
            logDebugMsg("InitWorker message", message);
            if (message === 'ready') {
                logDebugMsg('worker ready');
                self.signalWalletUpdate();
            } else if (message === 'readyWallet') {
                self.workerProcessingReady = true;
            } else if (message.type) {
                if (self.stopped)
                    return;
                if (message.type === 'processed') {
                    let transactions = message.transactions;
                    let txPrivateKeys = typeof message.txPrivateKeys === 'object' && message.txPrivateKeys !== null ? message.txPrivateKeys : {};
                    let hasUpdates = transactions.length > 0;

                    for (let hash in txPrivateKeys) {
                        if (Object.prototype.hasOwnProperty.call(txPrivateKeys, hash) && self.wallet.findTxPrivateKeyWithHash(hash) === null) {
                            self.wallet.addTxPrivateKeyWithTxHash(hash, txPrivateKeys[hash]);
                            hasUpdates = true;
                        }
                    }

                    if (transactions.length > 0) {
                        for (let tx of transactions)
                            self.wallet.addNew(Transaction.fromRaw(tx));
                    }

                    if (hasUpdates) {
                        self.signalWalletUpdate();
                    }
                    //if (self.workerCurrentProcessing.length > 0) {
                    //    let transactionHeight = self.workerCurrentProcessing[self.workerCurrentProcessing.length - 1].height;
                    //    if (typeof transactionHeight !== 'undefined')
                    //        self.wallet.lastHeight = transactionHeight;
                    //}

                    // we are done processing now
                    self.workerProcessingWorking = false;
                }
            }
        };
    }

    signalWalletUpdate() {
        if (this.stopped)
            return;
        let self = this;
        logDebugMsg('wallet update');
        this.lastBlockLoading = -1;//reset scanning

        this.applyNodeUrl();
        this.workerProcessing.postMessage({
            type: 'initWallet',
            wallet: this.wallet.exportToRaw()
        });
        clearInterval(this.intervalTransactionsProcess);
        this.intervalTransactionsProcess = setInterval(function () {
            self.checkTransactionsInterval();
        }, this.wallet.options.readSpeed);

        //force mempool update after a wallet update (new tx, ...)
        self.checkMempool();
    }

    intervalMempool: any = 0;

    initMempool(force: boolean = false) {
        let self = this;
        if (this.intervalMempool === 0 || force) {
            if (force && this.intervalMempool !== 0) {
                clearInterval(this.intervalMempool);
            }

            this.intervalMempool = setInterval(function () {
                self.checkMempool();
            }, 30 * 1000);
        }
        self.checkMempool();
    }

    stopped: boolean = false;

    stop() {
        clearInterval(this.intervalTransactionsProcess);
        this.intervalTransactionsProcess = 0;
        this.transactionsToProcess = [];
        clearInterval(this.intervalMempool);
        this.intervalMempool = 0;
        this.stopped = true;
        if (typeof this.workerProcessing !== 'undefined')
            this.terminateWorker();
    }

    checkMempool(force: boolean = false): boolean {
        let self = this;
        if (!force && this.lastMaximumHeight - this.lastBlockLoading > 1) { //only check memory pool if the user is up to date to ensure outs & ins will be found in the wallet
            return false;
        }

        this.explorer.getTransactionPool().then(function (pool: any) {
            if (self.stopped)
                return;
            let txsMem: Transaction[] = [];
            if (typeof pool !== 'undefined')
                for (let rawTx of pool) {
                    let tx = TransactionsExplorer.parse(rawTx, self.wallet);
                    if (tx !== null) {
                        txsMem.push(tx);
                    }
                }
            self.wallet.txsMem = txsMem;
        }).catch(function () {
        });
        return true;
    }

    terminateWorker() {
        this.workerProcessing.terminate();
        this.workerProcessingReady = false;
        this.workerCurrentProcessing = [];
        this.workerProcessingWorking = false;
        this.workerCountProcessed = 0;
    }

    transactionsToProcess: RawDaemon_Transaction[][] = [];
    intervalTransactionsProcess: any = 0;

    workerProcessing !: Worker;
    workerProcessingReady = false;
    workerProcessingWorking = false;
    workerCurrentProcessing: RawDaemon_Transaction[] = [];
    workerCountProcessed = 0;

    checkTransactionsInterval() {
        logDebugMsg(`checkTransactionsInterval called...`);
        if (this.stopped) {
            clearInterval(this.intervalTransactionsProcess);
            this.intervalTransactionsProcess = 0;
            return;
        }

        //somehow we're repeating and regressing back to re-process Tx's
        //loadHistory getting into a stack overflow ?
        //need to work out timings and ensure process does not reload when it's already running...

        if (this.workerProcessingWorking || !this.workerProcessingReady) {
            logDebugMsg(`checkTransactionsInterval exiting...`, this.workerProcessingWorking, this.workerProcessingReady);
            return;
        }

        //we destroy the worker in charge of decoding the transactions every 5k transactions to ensure the memory is not corrupted
        //cnUtil bug, see https://github.com/mymonero/mymonero-core-js/issues/8
        if (this.workerCountProcessed >= 5 * 1000) {
            logDebugMsg('Recreate worker..');
            this.terminateWorker();
            this.initWorker();
            return;
        }

        // define the transactions we need to process
        var transactionsToProcess: RawDaemon_Transaction[] = [];

        if (this.transactionsToProcess.length > 0) {
            transactionsToProcess = this.transactionsToProcess.shift()!;
        }

        // check if we have anything to process and log it if in debug more
        logDebugMsg('checkTransactionsInterval', 'Transactions to be processed', transactionsToProcess);

        if (transactionsToProcess.length > 0) {
            this.workerCurrentProcessing = transactionsToProcess;
            this.workerProcessingWorking = true;
            this.workerProcessing.postMessage({
                type: 'process',
                transactions: transactionsToProcess
            });
            ++this.workerCountProcessed;
        } else {
            clearInterval(this.intervalTransactionsProcess);
            this.intervalTransactionsProcess = 0;
        }
    }

    processTransactions(transactions: RawDaemon_Transaction[], callback: Function) {
        logDebugMsg(`processTransactions called...`, transactions);
        if (this.stopped) {
            callback();
            return;
        }
        let transactionsToAdd = transactions;

        // add the raw transaction to the processing FIFO list
        this.transactionsToProcess.push(transactionsToAdd);

        if (this.intervalTransactionsProcess === 0) {
            let self = this;
            this.intervalTransactionsProcess = setInterval(function () {
                self.checkTransactionsInterval();
            }, this.wallet.options.readSpeed);
        }

        // signal we are finished
        callback();
    }


    lastBlockLoading = -1;
    lastMaximumHeight = 0;

    loadHistory() {
        if (this.stopped) return;

        let self = this;

        if (this.lastBlockLoading === -1) this.lastBlockLoading = this.wallet.lastHeight;

        //don't reload until it's finished processing the last batch of transactions
        if (this.workerProcessingWorking || !this.workerProcessingReady) {
            logDebugMsg(`Cannot process, need to wait...`, this.workerProcessingWorking, this.workerProcessingReady);
            setTimeout(function () {
                self.loadHistory();
            }, 250);
            return;
        }
        if (this.transactionsToProcess.length > 500) {
            logDebugMsg(`Having more then 500 TX packets in FIFO queue`, this.transactionsToProcess.length);
            //to ensure no pile explosion
            setTimeout(function () {
                self.loadHistory();
            }, 2 * 1000);
            return;
        }

        this.explorer.getHeight().then(function (height) {
            if (self.stopped)
                return;
            logDebugMsg("Checking on height", height);
            if (height > self.lastMaximumHeight) {
                self.lastMaximumHeight = height;
            } else {
                if (self.wallet.lastHeight >= self.lastMaximumHeight) {
                    setTimeout(function () {
                        self.loadHistory();
                    }, 1000);
                    return;
                }
            }

            // we are only here if the block is actually increased from last processing
            if (self.lastBlockLoading === -1) self.lastBlockLoading = self.wallet.lastHeight;

            if (self.lastBlockLoading !== height) {
                let previousStartBlock = Number(self.lastBlockLoading);
                let endBlock = previousStartBlock + config.syncBlockCount;

                if (previousStartBlock > self.lastMaximumHeight) previousStartBlock = self.lastMaximumHeight;
                if (endBlock > self.lastMaximumHeight) endBlock = self.lastMaximumHeight;

                self.explorer.getTransactionsForBlocks(previousStartBlock, endBlock, self.wallet.options.checkMinerTx).then(function (transactions: any) {
                    if (self.stopped)
                        return;
                    logDebugMsg("getTransactionsForBlocks", previousStartBlock, endBlock, transactions);

                    //to ensure no pile explosion
                    if (transactions === 'OK') {
                        self.lastBlockLoading = endBlock;
                        self.wallet.lastHeight = endBlock;

                        setTimeout(function () {
                            self.loadHistory();
                        }, 25);
                    } else if (transactions.length > 0) {
                        let lastTx = transactions[transactions.length - 1];
                        if (typeof lastTx.height !== 'undefined') {
                            self.lastBlockLoading = lastTx.height + 1;
                        }
                        self.processTransactions(transactions, function() {
                            self.wallet.lastHeight = endBlock;
    
                            setTimeout(function () {
                                self.loadHistory();
                            }, 25);
                        });
                    } else {
                        self.lastBlockLoading = endBlock;
                        self.wallet.lastHeight = endBlock;

                        let delay = endBlock < self.lastMaximumHeight ? 25 : 30 * 1000;
                        setTimeout(function () {
                            self.loadHistory();
                        }, delay);
                    }
                }).catch(function () {
                    if (self.stopped)
                        return;
                    logDebugMsg(`Error occured in loadHistory[1]...`);
                    setTimeout(function () {
                        self.loadHistory();
                    }, self.getSyncRetryDelayMs());//retry later if an error occurred
                });
            } else {
                setTimeout(function () {
                    self.loadHistory();
                }, 30 * 1000);
            }
        }).catch(function () {
            if (self.stopped)
                return;
            logDebugMsg(`Error occured in loadHistory[2]...`);
            setTimeout(function () {
                self.loadHistory();
            }, self.getSyncRetryDelayMs());//retry later if an error occurred
        });
    }

    start = () => {
      // init the mempool
      this.initMempool();
  
      // set the interval for checking the new transactions
      this.intervalTransactionsProcess = setInterval(() => {
        this.checkTransactionsInterval();
      }, this.wallet.options.readSpeed);
  
      // run main loop
      this.stopped = false;
      this.lastBlockLoading = -1;
      this.lastMaximumHeight = 0;
      this.loadHistory();
    }
}
