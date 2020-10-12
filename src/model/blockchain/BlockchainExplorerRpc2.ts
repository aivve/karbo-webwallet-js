/*
 * Copyright (c) 2018, Gnock
 * Copyright (c) 2018, The Masari Project
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import {BlockchainExplorer, NetworkInfo, RawDaemon_Transaction, RemoteNodeInformation} from "./BlockchainExplorer";
import {Wallet} from "../Wallet";
import {MathUtil} from "../MathUtil";
import {CnTransactions, CnUtils} from "../Cn";
import {Transaction} from "../Transaction";
import {WalletWatchdog} from "../WalletWatchdog";

export class BlockchainExplorerRpc2 implements BlockchainExplorer {

    // testnet : boolean = true;
    randInt = Math.floor(Math.random() * Math.floor(config.apiUrl.length));
    serverAddress = config.apiUrl[this.randInt];

    heightCache = 0;
    heightLastTimeRetrieve = 0;
    getHeight(): Promise<number> {
        if (Date.now() - this.heightLastTimeRetrieve < 20 * 1000 && this.heightCache !== 0) {
            return Promise.resolve(this.heightCache);
        }
        let self = this;
        this.heightLastTimeRetrieve = Date.now();
        return new Promise<number>(function (resolve, reject) {
            $.ajax({
                url: config.nodeUrl + 'getheight',
                method: 'POST',
                data: JSON.stringify({
                })
            }).done(function (raw: any) {
                self.heightCache = parseInt(raw.height);
                resolve(self.heightCache);
            }).fail(function (data: any) {
                reject(data);
            });
        });
    }

    scannedHeight: number = 0;

    getScannedHeight(): number {
        return this.scannedHeight;
    }

    watchdog(wallet: Wallet): WalletWatchdog {
        let watchdog = new WalletWatchdog(wallet, this);
        watchdog.loadHistory();
        return watchdog;
    }

    getTransactionsForBlocks(start_block: number): Promise<RawDaemonTransaction[]> {
        let self = this;
        let transactions: RawDaemonTransaction[] = [];
        let startBlock = Number(start_block);
        return new Promise<RawDaemonTransaction[]>(function (resolve, reject) {
            let tempHeight;
            let operator = 10;
            if (self.heightCache - startBlock > operator) {
                tempHeight = startBlock + operator;
            } else {
                tempHeight = self.heightCache;
            }

            let blockHeights: number[] = [];
            let c = tempHeight - startBlock + 1, th = tempHeight;
            while ( c-- ) {
                blockHeights[c] = th--
            }

            self.postData(config.nodeUrl + 'json_rpc', {
                "jsonrpc": "2.0",
                "id": 0,
                "method": "getblocksbyheights",
                "params": {
                    "blockHeights": blockHeights
                }
            }).then(data => {
                for (let i = 0; i < data.result.blocks.length; i++) {
                    let finalTxs: any[] = data.result.blocks[i].transactions;
                    for (let j = 0; j < finalTxs.length; j++) {
                        let finalTx = finalTxs[j];
                        transactions.push(finalTx);
                    }
                }
                resolve(transactions);
            }).catch(error => {
                console.log('REJECT');
                try {
                    console.log(JSON.parse(error.responseText));
                } catch (e) {
                    console.log(e);
                }
                reject(error);
            });

        });
    }

    getTransactionPool(): Promise<RawDaemonTransaction[]> {
        let self = this;
        return new Promise<RawDaemonTransaction[]>(function (resolve, reject) {
            self.postData(config.nodeUrl + 'json_rpc', {
                'jsonrpc': '2.0',
                'id': 0,
                'method': 'gettransactionspool',
                'params': ''
            }).then(data => {
                let rawTxs = data.result.transactions;
                let txHashes: any[] = [];

                for (let iTx = 0; iTx < rawTxs.length; iTx++) {
                    txHashes.push(rawTxs[iTx].hash);
                }

                self.postData(config.nodeUrl + 'json_rpc', {
                    "jsonrpc": "2.0",
                    "id": 0,
                    "method": "gettransactionsbyhashes",
                    "params": {
                        "transactionHashes": txHashes
                    }
                }).then(detailTx => {
                    let response = detailTx.transactions;
                    if (response !== null) {
                        resolve(response);
                    }
                }).catch(error => {
                    console.log('REJECT');
                    try {
                        console.log(JSON.parse(error.responseText));
                    } catch (e) {
                        console.log(e);
                    }
                    reject(error);
                });
            });
        });
    }

    existingOuts: any[] = [];
    getRandomOuts(nbOutsNeeded: number, initialCall = true): Promise<any[]> {
        let self = this;
        if (initialCall) {
            self.existingOuts = [];
        }

        return this.getHeight().then(function (height: number) {
            let txs: RawDaemonTransaction[] = [];
            let promises = [];

            let randomBlocksIndexesToGet: number[] = [];
            let numOuts = height;

            for (let i = 0; i < nbOutsNeeded; ++i) {
                let selectedIndex: number = -1;
                do {
                    selectedIndex = MathUtil.randomTriangularSimplified(numOuts);
                    if (selectedIndex >= height - config.txCoinbaseMinConfirms)
                        selectedIndex = -1;
                } while (selectedIndex === -1 || randomBlocksIndexesToGet.indexOf(selectedIndex) !== -1);
                randomBlocksIndexesToGet.push(selectedIndex);

                let promise = self.getTransactionsForBlocks(Math.floor(selectedIndex / 100) * 100).then(function (rawTransactions: RawDaemonTransaction[]) {
                    txs.push.apply(txs, rawTransactions);
                });
                promises.push(promise);
            }

            return Promise.all(promises).then(function () {
                let txCandidates: any = {};
                for (let iOut = 0; iOut < txs.length; ++iOut) {
                    let tx = txs[iOut];

                    if (
                        (typeof tx.blockIndex !== 'undefined' && randomBlocksIndexesToGet.indexOf(tx.blockIndex) === -1) ||
                        typeof tx.blockIndex === 'undefined'
                    ) {
                        continue;
                    }

                    for (let output_idx_in_tx = 0; output_idx_in_tx < tx.outputs.length; ++output_idx_in_tx) {
                        //let globalIndex = output_idx_in_tx;
                        //if (typeof tx.global_index_start !== 'undefined')
                        //    globalIndex += tx.global_index_start;
                        let globalIndex = tx.outputs[output_idx_in_tx].globalIndex;

                        let newOut = {
                            public_key: tx.outputs[output_idx_in_tx].output.target.data.key,
                            global_index: globalIndex,
                            // global_index: count,
                        };
                        if (typeof txCandidates[tx.blockIndex] === 'undefined') txCandidates[tx.blockIndex] = [];
                        txCandidates[tx.blockIndex].push(newOut);
                    }
                }

                //console.log(txCandidates);

                let selectedOuts = [];
                for (let txsOutsHeight in txCandidates) {
                    let outIndexSelect = MathUtil.getRandomInt(0, txCandidates[txsOutsHeight].length - 1);
                    //console.log('select ' + outIndexSelect + ' for ' + txsOutsHeight + ' with length of ' + txCandidates[txsOutsHeight].length);
                    selectedOuts.push(txCandidates[txsOutsHeight][outIndexSelect]);
                }

                //console.log(selectedOuts);

                return selectedOuts;
            });
        });
    }

    sendRawTx(rawTx: string) {
        let self = this;
        return new Promise(function (resolve, reject) {
            self.postData(config.nodeUrl + 'sendrawtransaction', {
                tx_as_hex: rawTx,
                do_not_relay: false
            }).then(transactions => {
                if (transactions.status && transactions.status == 'OK') {
                    resolve(transactions);
                } else {
                    reject(transactions);
                }
            }).catch(error => {
                reject(error);
            });
        });
    }

    resolveOpenAlias(domain: string): Promise<{ address: string, name: string | null }> {
        let self = this;
        return new Promise(function (resolve, reject) {
            self.postData(config.nodeUrl + 'json_rpc', {
                "jsonrpc": "2.0",
                "id": 0,
                "method": "resolveopenalias",
                "params": {
                    "url": domain
                }
            }).then(data => {
                resolve(data.result);
            }).catch(error => {
                console.log('REJECT');
                try {
                    console.log(JSON.parse(error.responseText));
                } catch (e) {
                    console.log(e);
                }
                reject(error);
            });
        });
    }

    async postData(url: string, data: any) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });

        return response.json();
    }

}
