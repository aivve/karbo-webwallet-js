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
define(["require", "exports", "./Transaction", "./CryptoUtils", "./MathUtil", "./CnUtilNative"], function (require, exports, Transaction_1, CryptoUtils_1, MathUtil_1, CnUtilNative_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TX_EXTRA_PADDING_MAX_COUNT = 255;
    exports.TX_EXTRA_NONCE_MAX_COUNT = 255;
    exports.TX_EXTRA_TAG_PADDING = 0x00;
    exports.TX_EXTRA_TAG_PUBKEY = 0x01;
    exports.TX_EXTRA_NONCE = 0x02;
    exports.TX_EXTRA_MERGE_MINING_TAG = 0x03;
    exports.TX_EXTRA_TAG_ADDITIONAL_PUBKEYS = 0x04;
    exports.TX_EXTRA_MYSTERIOUS_MINERGATE_TAG = 0xDE;
    exports.TX_EXTRA_NONCE_PAYMENT_ID = 0x00;
    exports.TX_EXTRA_NONCE_ENCRYPTED_PAYMENT_ID = 0x01;
    var TransactionsExplorer = /** @class */ (function () {
        function TransactionsExplorer() {
        }
        TransactionsExplorer.parse = function (rawTransaction, wallet) {
            var transaction = null;
            var tx_pub_key = '';
            var paymentId = null;
            tx_pub_key = rawTransaction.extra.publicKey;
            paymentId = rawTransaction.paymentId;
            var derivation = null;
            try {
                derivation = CnUtilNative_1.CnUtilNative.generate_key_derivation(tx_pub_key, wallet.keys.priv.view);
            }
            catch (e) {
                console.log('UNABLE TO CREATE DERIVATION', e);
                return null;
            }
            var outs = [];
            var ins = [];
            for (var iOut = 0; iOut < rawTransaction.outputs.length; ++iOut) {
                var out = rawTransaction.outputs[iOut];
                var txout_k = out.output.target.data;
                var amount = out.output.amount;
                var output_idx_in_tx = iOut;
                // let generated_tx_pubkey = cnUtil.derive_public_key(derivation,output_idx_in_tx,wallet.keys.pub.spend);//5.5ms
                var generated_tx_pubkey = CnUtilNative_1.CnUtilNative.derive_public_key(derivation, output_idx_in_tx, wallet.keys.pub.spend); //5.5ms
                // check if generated public key matches the current output's key
                var mine_output = (txout_k.key == generated_tx_pubkey);
                if (mine_output) {
                    //let minerTx = false;
                    //if (amount !== 0) {//miner tx
                    //	minerTx = true;
                    //} else {
                    //	let mask = rawTransaction.rct_signatures.ecdhInfo[output_idx_in_tx].mask;
                    //	let r = CryptoUtils.decode_ringct(rawTransaction.rct_signatures,
                    //		tx_pub_key,
                    //		wallet.keys.priv.view,
                    //		output_idx_in_tx,
                    //		mask,
                    //		amount,
                    //		derivation);
                    //	if (r === false)
                    //		console.error("Cant decode ringCT!");
                    //	else
                    //		amount = r;
                    //}
                    var transactionOut = new Transaction_1.TransactionOut();
                    if (typeof out.globalIndex !== 'undefined')
                        transactionOut.globalIndex = out.globalIndex;
                    else
                        transactionOut.globalIndex = output_idx_in_tx;
                    transactionOut.amount = amount;
                    transactionOut.pubKey = txout_k.key;
                    transactionOut.outputIdx = output_idx_in_tx;
                    //if (!minerTx) {
                    //	transactionOut.rtcOutPk = rawTransaction.rct_signatures.outPk[output_idx_in_tx];
                    //	transactionOut.rtcMask = rawTransaction.rct_signatures.ecdhInfo[output_idx_in_tx].mask;
                    //	transactionOut.rtcAmount = rawTransaction.rct_signatures.ecdhInfo[output_idx_in_tx].amount;
                    //}
                    //THIS is super slow and causing issues
                    if (wallet.keys.priv.spend !== null && wallet.keys.priv.spend !== '') {
                        var m_key_image = CryptoUtils_1.CryptoUtils.generate_key_image_helper({
                            view_secret_key: wallet.keys.priv.view,
                            spend_secret_key: wallet.keys.priv.spend,
                            public_spend_key: wallet.keys.pub.spend,
                        }, tx_pub_key, output_idx_in_tx, derivation);
                        transactionOut.keyImage = m_key_image.key_image;
                        transactionOut.ephemeralPub = m_key_image.ephemeral_pub;
                    }
                    if (transactionOut.amount !== 0) { //fusion
                        outs.push(transactionOut);
                    }
                    //if (minerTx)
                    //	break;
                } //  if (mine_output)
            }
            //check if no read only wallet
            if (wallet.keys.priv.spend !== null && wallet.keys.priv.spend !== '') {
                var keyImages = wallet.getTransactionKeyImages();
                for (var iIn = 0; iIn < rawTransaction.inputs.length; ++iIn) {
                    var input = rawTransaction.inputs[iIn];
                    if (keyImages.indexOf(input.data.input.k_image) != -1) {
                        // console.log('found in', vin);
                        var walletOuts = wallet.getAllOuts();
                        for (var _i = 0, walletOuts_1 = walletOuts; _i < walletOuts_1.length; _i++) {
                            var ut = walletOuts_1[_i];
                            if (ut.keyImage == input.data.input.k_image) {
                                // ins.push(vin.key.k_image);
                                // sumIns += ut.amount;
                                var transactionIn = new Transaction_1.TransactionIn();
                                transactionIn.amount = ut.amount;
                                transactionIn.keyImage = ut.keyImage;
                                ins.push(transactionIn);
                                // console.log(ut);
                                break;
                            }
                        }
                    }
                }
            }
            else {
                var txOutIndexes = wallet.getTransactionOutIndexes();
                for (var iIn = 0; iIn < rawTransaction.inputs.length; ++iIn) {
                    var input = rawTransaction.inputs[iIn];
                    var absoluteOffets = input.data.input.key_offsets.slice();
                    for (var i = 1; i < absoluteOffets.length; ++i) {
                        absoluteOffets[i] += absoluteOffets[i - 1];
                    }
                    var ownTx = -1;
                    for (var _a = 0, absoluteOffets_1 = absoluteOffets; _a < absoluteOffets_1.length; _a++) {
                        var index = absoluteOffets_1[_a];
                        if (txOutIndexes.indexOf(index) !== -1) {
                            ownTx = index;
                            break;
                        }
                    }
                    if (ownTx !== -1) {
                        var txOut = wallet.getOutWithGlobalIndex(ownTx);
                        if (txOut !== null) {
                            var transactionIn = new Transaction_1.TransactionIn();
                            transactionIn.amount = -txOut.amount;
                            transactionIn.keyImage = txOut.keyImage;
                            ins.push(transactionIn);
                        }
                    }
                }
            }
            if (outs.length > 0 || ins.length > 0) {
                transaction = new Transaction_1.Transaction();
                if (typeof rawTransaction.height !== 'undefined')
                    transaction.blockHeight = rawTransaction.height;
                if (typeof rawTransaction.timestamp !== 'undefined')
                    transaction.timestamp = rawTransaction.timestamp;
                if (typeof rawTransaction.hash !== 'undefined')
                    transaction.hash = rawTransaction.hash;
                transaction.txPubKey = tx_pub_key;
                if (paymentId !== null && paymentId != '0000000000000000000000000000000000000000000000000000000000000000')
                    transaction.paymentId = paymentId;
                transaction.fees = rawTransaction.fee;
                transaction.outs = outs;
                transaction.ins = ins;
            }
            return transaction;
        };
        TransactionsExplorer.formatWalletOutsForTx = function (wallet, blockchainHeight) {
            var unspentOuts = [];
            console.log(wallet.getAll());
            for (var _i = 0, _a = wallet.getAll(); _i < _a.length; _i++) {
                var tr = _a[_i];
                //todo improve to take into account miner tx
                //only add outs unlocked
                if (!tr.isConfirmed(blockchainHeight)) {
                    continue;
                }
                for (var _b = 0, _c = tr.outs; _b < _c.length; _b++) {
                    var out = _c[_b];
                    console.log("out.globalIndex: " + out.globalIndex);
                    unspentOuts.push({
                        keyImage: out.keyImage,
                        amount: out.amount,
                        public_key: out.pubKey,
                        index: out.outputIdx,
                        global_index: out.globalIndex,
                        tx_pub_key: tr.txPubKey
                    });
                }
            }
            console.log('outs count before spend:', unspentOuts.length, unspentOuts);
            for (var _d = 0, _e = wallet.getAll().concat(wallet.txsMem); _d < _e.length; _d++) {
                var tr = _e[_d];
                console.log(tr.ins);
                for (var _f = 0, _g = tr.ins; _f < _g.length; _f++) {
                    var i = _g[_f];
                    for (var iOut = 0; iOut < unspentOuts.length; ++iOut) {
                        var out = unspentOuts[iOut];
                        var exist = out.keyImage === i.keyImage;
                        if (exist) {
                            unspentOuts.splice(iOut, 1);
                            break;
                        }
                    }
                }
            }
            return unspentOuts;
        };
        TransactionsExplorer.createRawTx = function (dsts, wallet, rct, usingOuts, pid_encrypt, mix_outs, mixin, neededFee, payment_id) {
            if (mix_outs === void 0) { mix_outs = []; }
            return new Promise(function (resolve, reject) {
                var signed;
                try {
                    console.log('Destinations: ');
                    //need to get viewkey for encrypting here, because of splitting and sorting
                    var realDestViewKey = undefined;
                    if (pid_encrypt) {
                        realDestViewKey = cnUtil.decode_address(dsts[0].address).view;
                    }
                    var splittedDsts = cnUtil.decompose_tx_destinations(dsts, rct);
                    signed = cnUtil.create_transaction({
                        spend: wallet.keys.pub.spend,
                        view: wallet.keys.pub.view
                    }, {
                        spend: wallet.keys.priv.spend,
                        view: wallet.keys.priv.view
                    }, splittedDsts, usingOuts, mix_outs, mixin, neededFee, payment_id, pid_encrypt, realDestViewKey, 0);
                }
                catch (e) {
                    reject("Failed to create transaction: " + e);
                }
                console.log("signed tx: ", signed);
                //let raw_tx_and_hash = cnUtil.serialize_rct_tx_with_hash(signed);
                var raw_tx_and_hash = cnUtil.serialize_tx_with_hash(signed);
                resolve({ raw: raw_tx_and_hash, signed: signed });
            });
        };
        TransactionsExplorer.createTx = function (userDestinations, userPaymentId, wallet, blockchainHeight, obtainMixOutsCallback, confirmCallback, mixin) {
            if (userPaymentId === void 0) { userPaymentId = ''; }
            if (mixin === void 0) { mixin = config.defaultMixin; }
            return new Promise(function (resolve, reject) {
                // few multiplayers based on uint64_t wallet2::get_fee_multiplier
                //let fee_multiplayers = [1, 4, 20, 166];
                //let default_priority = 2;
                //let feePerKB = new JSBigInt((<any>window).config.feePerKB);
                //let priority = default_priority;
                //let fee_multiplayer = fee_multiplayers[priority - 1];
                var neededFee = new JSBigInt(window.config.coinFee); // feePerKB.multiply(13).multiply(fee_multiplayer);
                var pid_encrypt = false; //don't encrypt payment ID unless we find an integrated one
                var totalAmountWithoutFee = new JSBigInt(0);
                var paymentIdIncluded = 0;
                var paymentId = '';
                var dsts = [];
                for (var _i = 0, userDestinations_1 = userDestinations; _i < userDestinations_1.length; _i++) {
                    var dest = userDestinations_1[_i];
                    totalAmountWithoutFee = totalAmountWithoutFee.add(dest.amount);
                    var target = cnUtil.decode_address(dest.address);
                    if (typeof target.intPaymentId !== 'undefined') {
                        ++paymentIdIncluded;
                        paymentId = target.intPaymentId;
                        pid_encrypt = true;
                    }
                    dsts.push(dest);
                }
                if (paymentIdIncluded > 1) {
                    reject('multiple_payment_ids');
                    return;
                }
                if (paymentId !== '' && userPaymentId !== '') {
                    reject('address_payment_id_conflict_user_payment_id');
                    return;
                }
                if (totalAmountWithoutFee.compare(0) <= 0) {
                    reject('negative_amount');
                    return;
                }
                if (paymentId === '' && userPaymentId !== '') {
                    if (userPaymentId.length <= 16 && /^[0-9a-fA-F]+$/.test(userPaymentId)) {
                        userPaymentId = ('0000000000000000' + userPaymentId).slice(-16);
                    }
                    // now double check if ok
                    if ((userPaymentId.length !== 16 && userPaymentId.length !== 64) ||
                        (!(/^[0-9a-fA-F]{16}$/.test(userPaymentId)) && !(/^[0-9a-fA-F]{64}$/.test(userPaymentId)))) {
                        reject('invalid_payment_id');
                        return;
                    }
                    pid_encrypt = userPaymentId.length === 16;
                    paymentId = userPaymentId;
                }
                var unspentOuts = TransactionsExplorer.formatWalletOutsForTx(wallet, blockchainHeight);
                console.log('outs available:', unspentOuts.length, unspentOuts);
                var usingOuts = [];
                var usingOuts_amount = new JSBigInt(0);
                var unusedOuts = unspentOuts.slice(0);
                var totalAmount = totalAmountWithoutFee.add(neededFee) /*.add(chargeAmount)*/;
                //selecting outputs to fit the desired amount (totalAmount);
                function pop_random_value(list) {
                    var idx = Math.floor(MathUtil_1.MathUtil.randomFloat() * list.length);
                    var val = list[idx];
                    list.splice(idx, 1);
                    return val;
                }
                while (usingOuts_amount.compare(totalAmount) < 0 && unusedOuts.length > 0) {
                    var out = pop_random_value(unusedOuts);
                    usingOuts.push(out);
                    usingOuts_amount = usingOuts_amount.add(out.amount);
                    console.log("Using output: " + out.amount + " - " + JSON.stringify(out));
                }
                var calculateFeeWithBytes = function (fee_per_kb, bytes, fee_multiplier) {
                    var kB = (bytes + 1023) / 1024;
                    return kB * fee_per_kb * fee_multiplier;
                };
                console.log("Selected outs:", usingOuts);
                //if (usingOuts.length > 1) {
                //    let newNeededFee = 10000000; //JSBigInt(Math.ceil(cnUtil.estimateRctSize(usingOuts.length, mixin, 2) / 1024)).multiply(feePerKB).multiply(fee_multiplayer);
                //	totalAmount = totalAmountWithoutFee.add(newNeededFee);
                //add outputs 1 at a time till we either have them all or can meet the fee
                //	while (usingOuts_amount.compare(totalAmount) < 0 && unusedOuts.length > 0) {
                //		let out = pop_random_value(unusedOuts);
                //		usingOuts.push(out);
                //		usingOuts_amount = usingOuts_amount.add(out.amount);
                //		console.log("Using output: " + cnUtil.formatMoney(out.amount) + " - " + JSON.stringify(out));
                //		newNeededFee = JSBigInt(Math.ceil((usingOuts.length, mixin, 2) / 1024)).multiply(feePerKB).multiply(fee_multiplayer);
                //		totalAmount = totalAmountWithoutFee.add(newNeededFee);
                //	}
                //	console.log("New fee: " + cnUtil.formatMoneySymbol(newNeededFee) + " for " + usingOuts.length + " inputs");
                //	neededFee = newNeededFee;
                //}
                if (neededFee < 10000000) {
                    neededFee = 10000000;
                }
                // neededFee = neededFee / 3 * 2;
                console.log('using amount of ' + usingOuts_amount + ' for sending ' + totalAmountWithoutFee + ' with fees of ' + (neededFee / Math.pow(10, config.coinUnitPlaces)));
                confirmCallback(totalAmountWithoutFee, neededFee).then(function () {
                    if (usingOuts_amount.compare(totalAmount) < 0) {
                        console.log("Not enough spendable outputs / balance too low (have "
                            + cnUtil.formatMoneyFull(usingOuts_amount) + " but need "
                            + cnUtil.formatMoneyFull(totalAmount)
                            + " (estimated fee " + cnUtil.formatMoneyFull(neededFee) + " included)");
                        // return;
                        reject({ error: 'balance_too_low' });
                        return;
                    }
                    else if (usingOuts_amount.compare(totalAmount) > 0) {
                        var changeAmount = usingOuts_amount.subtract(totalAmount);
                        //add entire change for rct
                        console.log("1) Sending change of " + cnUtil.formatMoneySymbol(changeAmount)
                            + " to " /*+ AccountService.getAddress()*/);
                        dsts.push({
                            address: wallet.getPublicAddress(),
                            amount: changeAmount
                        });
                    }
                    else if (usingOuts_amount.compare(totalAmount) === 0) {
                        //create random destination to keep 2 outputs always in case of 0 change
                        var fakeAddress = cnUtil.create_address(cnUtil.random_scalar()).public_addr;
                        console.log("Sending 0 KRB to a fake address to keep tx uniform (no change exists): " + fakeAddress);
                        dsts.push({
                            address: fakeAddress,
                            amount: 0
                        });
                    }
                    console.log('destinations', dsts);
                    var amounts = [];
                    for (var l = 0; l < usingOuts.length; l++) {
                        amounts.push(usingOuts[l].amount.toString());
                    }
                    obtainMixOutsCallback(amounts.length * (mixin + 1)).then(function (lotsMixOuts) {
                        console.log('------------------------------mix_outs', lotsMixOuts);
                        console.log('amounts', amounts);
                        console.log('lots_mix_outs', lotsMixOuts);
                        var mix_outs = [];
                        var iMixOutsIndexes = 0;
                        for (var _i = 0, amounts_1 = amounts; _i < amounts_1.length; _i++) {
                            var amount = amounts_1[_i];
                            var localMixOuts = [];
                            for (var i = 0; i < mixin + 1; ++i) {
                                localMixOuts.push(lotsMixOuts[iMixOutsIndexes]);
                                ++iMixOutsIndexes;
                            }
                            localMixOuts.sort().reverse();
                            mix_outs.push({
                                outputs: localMixOuts.slice(),
                                amount: 0
                            });
                        }
                        console.log('mix_outs', mix_outs);
                        TransactionsExplorer.createRawTx(dsts, wallet, false, usingOuts, pid_encrypt, mix_outs, mixin, neededFee, paymentId).then(function (data) {
                            resolve(data);
                        }).catch(function (e) {
                            reject(e);
                        });
                    });
                    //https://github.com/moneroexamples/openmonero/blob/ebf282faa8d385ef3cf97e6561bd1136c01cf210/README.md
                    //https://github.com/moneroexamples/openmonero/blob/95bc207e1dd3881ba0795c02c06493861de8c705/src/YourMoneroRequests.cpp
                });
            });
        };
        return TransactionsExplorer;
    }());
    exports.TransactionsExplorer = TransactionsExplorer;
});
