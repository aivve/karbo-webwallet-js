/**
 *	   Copyright (c) 2018, Gnock
 *     Copyright (c) 2018-2020, ExploShot
 *     Copyright (c) 2018-2020, The Qwertycoin Project
 *     Copyright (c) 2018-2020, The Masari Project
 *     Copyright (c) 2014-2018, MyMonero.com
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

import {Transaction, TransactionIn, TransactionOut} from "./Transaction";
import {Wallet} from "./Wallet";
import {MathUtil} from "./MathUtil";
import {Cn, CnNativeBride, CnRandom, CnTransactions, CnUtils} from "./Cn";
import {RawDaemon_Transaction, RawDaemon_OutsForAmount} from "./blockchain/BlockchainExplorer";
import hextobin = CnUtils.hextobin;

export const TX_EXTRA_PADDING_MAX_COUNT = 255;
export const TX_EXTRA_NONCE_MAX_COUNT = 255;

export const TX_EXTRA_TAG_PADDING = 0x00;
export const TX_EXTRA_TAG_PUBKEY = 0x01;
export const TX_EXTRA_NONCE = 0x02;
export const TX_EXTRA_MERGE_MINING_TAG = 0x03;
// Karbo reuses tag 0x04 for account registration (04 <spendPub:32> <viewPub:32>).
// Monero's "additional pubkeys" meaning of 0x04 is a subaddress feature Karbo
// never emits, so it is intentionally not supported here.
export const TX_EXTRA_TAG_ACCOUNT_REGISTRATION = 0x04;
export const TX_EXTRA_MYSTERIOUS_MINERGATE_TAG = 0xDE;


export const TX_EXTRA_NONCE_PAYMENT_ID = 0x00;
export const TX_EXTRA_NONCE_ENCRYPTED_PAYMENT_ID = 0x01;

const CT_MIN_MIXIN = 3;
const CT_MAX_MIXIN = 15;

type RawOutForTx = {
	keyImage: string,
	amount: any,
	public_key: string,
	index: number,
	global_index: number,
	tx_pub_key: string,
	ctCommitment?: string,
	ctMaskedAmount?: string,
	ctBlinding?: string,
	ring_amount?: any,
	is_coinbase?: boolean
};

type TxExtra = {
	type: number,
	data: number[]
};

export class TransactionsExplorer {

	static isCtActivated(blockchainHeight: number): boolean {
		let lastBlockMajorVersion = parseInt((<any>config).lastBlockMajorVersion || '0');
		let forkHeight = new JSBigInt(typeof config.ctForkHeight !== 'undefined' ? config.ctForkHeight : '4294967294');
		if (
			lastBlockMajorVersion >= 6 &&
			forkHeight.compare(new JSBigInt(blockchainHeight)) > 0 &&
			typeof (<any>config).ctForkHeightTestnet !== 'undefined'
		) {
			forkHeight = new JSBigInt((<any>config).ctForkHeightTestnet);
		}
		return new JSBigInt(blockchainHeight).compare(forkHeight) >= 0;
	}

	static randomOutAmountForWalletOut(out: RawOutForTx): any {
		let ringAmount = out.ring_amount || (out.ctCommitment ? CnTransactions.ctConfidentialOutputAmount() : out.amount);
		return ringAmount === CnTransactions.ctConfidentialOutputAmount() ? CnTransactions.ctConfidentialOutputAmountRpc() : ringAmount;
	}

	static alignMixOutsWithRequestedAmounts(lotsMixOuts: RawDaemon_OutsForAmount[], requestedAmounts: any[]): RawDaemon_OutsForAmount[] {
		let groupsByAmount: {[amount: string]: RawDaemon_OutsForAmount[]} = {};
		for (let group of lotsMixOuts) {
			let key = CnTransactions.normalizeMixAmount(group.amount);
			if (typeof groupsByAmount[key] === 'undefined') {
				groupsByAmount[key] = [];
			}
			groupsByAmount[key].push(group);
		}

		let usedByAmount: {[amount: string]: number} = {};
		let aligned: RawDaemon_OutsForAmount[] = [];
		for (let i = 0; i < requestedAmounts.length; ++i) {
			let key = CnTransactions.normalizeMixAmount(requestedAmounts[i]);
			let groups = groupsByAmount[key] || [];
			let selectedGroup: RawDaemon_OutsForAmount | null = null;

			if (groups.length > 0) {
				let used = usedByAmount[key] || 0;
				selectedGroup = groups[Math.min(used, groups.length - 1)];
				usedByAmount[key] = used + 1;
			} else if (
				lotsMixOuts.length === requestedAmounts.length &&
				typeof lotsMixOuts[i] !== 'undefined' &&
				CnTransactions.normalizeMixAmount(lotsMixOuts[i].amount) === key
			) {
				selectedGroup = lotsMixOuts[i];
			}

			if (selectedGroup === null) {
				throw 'Random outs missing amount bucket ' + requestedAmounts[i];
			}

			aligned.push({
				amount: selectedGroup.amount,
				outs: (selectedGroup.outs || []).slice()
			});
		}

		return aligned;
	}

	// An output is a stale CT suspect when it sits in a CT-era non-coinbase
	// tx but has incomplete CT markers. The common case is data persisted by
	// an older scanner that decoded the amount but did not store all CT fields.
	// formatWalletOutsForTx drops these from sends so we don't ship rings the
	// daemon will reject; healStaleCtOutputs (WalletWatchdog) re-fetches the
	// parent tx and re-parses it under the current scanner to repopulate them.
	static isStaleCtOutput(tr: Transaction, out: TransactionOut): boolean {
		return TransactionsExplorer.isCtActivated(tr.blockHeight)
			&& !tr.is_coinbase
			&& (
				!out.ctCommitment ||
				!out.ctMaskedAmount ||
				!out.ctBlinding ||
				!out.ctRingAmount
			);
	}

	// Returns one entry per suspect tx (deduped by hash), regardless of how
	// many suspect outs it contains. Caller uses this to know which raw txs
	// to re-fetch and re-parse.
	static findStaleCtSuspectTxs(wallet: Wallet): Array<{hash: string, height: number}> {
		let seen: {[k: string]: boolean} = {};
		let suspects: Array<{hash: string, height: number}> = [];
		for (let tr of wallet.getAll()) {
			if (tr.hash === '' || tr.blockHeight <= 0) continue;
			if (seen[tr.hash]) continue;
			for (let out of tr.outs) {
				if (TransactionsExplorer.isStaleCtOutput(tr, out)) {
					seen[tr.hash] = true;
					suspects.push({hash: tr.hash, height: tr.blockHeight});
					break;
				}
			}
		}
		return suspects;
	}

	static parseExtra(oExtra: number[]): TxExtra[] {
		let extra = oExtra.slice();
		let extras: TxExtra[] = [];
		let hasFoundPubKey = false;

		while (extra.length > 0) {
			let extraSize = 0;
			let startOffset = 0;

			if (extra[0] === TX_EXTRA_NONCE ||
				extra[0] === TX_EXTRA_MERGE_MINING_TAG ||
				extra[0] === TX_EXTRA_MYSTERIOUS_MINERGATE_TAG) {

				extraSize = extra[1];
				startOffset = 2;
			} else if (extra[0] === TX_EXTRA_TAG_PUBKEY) {
				extraSize = 32;
				startOffset = 1;
				hasFoundPubKey = true;
			} else if (extra[0] === TX_EXTRA_TAG_ACCOUNT_REGISTRATION) {
				// Karbo account registration: 04 <spendPub:32> <viewPub:32>.
				// Fixed 64-byte payload, no count byte. Skipping it cleanly lets
				// the loop reach the 0x01 tx pubkey regardless of tag order
				// (construct_ct_tx emits 04 before 01); the old additional-pubkeys
				// reading misread spendPub[0] as a key count, overran the buffer,
				// never found the pubkey, and parse() dropped the whole tx -
				// hiding the spend and inflating the balance.
				extraSize = 64;
				startOffset = 1;
			} else if (extra[0] === TX_EXTRA_TAG_PADDING) {

				// this tag has to be the last in extra
				// we do nothing with it

				/*

				let iExtra = 2;
				let fExtras = {
					type: extra[0],
					data: [extra[1]]
				};

				while (extra.length > iExtra && extra[iExtra++] == 0) {
					fExtras.data.push(0);
				}

				continue;
				*/
			}

			if (extraSize === 0) {
				if (!hasFoundPubKey) {
					throw 'Invalid extra size' + extra[0];
				}

				break;
			}

			let data = extra.slice(startOffset, startOffset + extraSize);
			extras.push({
				type: extra[0],
				data: data
			});
			extra = extra.slice(startOffset + extraSize);
		}

		return extras;
	}

	static isMinerTx(rawTransaction: RawDaemon_Transaction) {
		if(rawTransaction.vin.length > 0 && rawTransaction.vin[0].type === 'ff') {
			return true;
		}

		return false;
	}

	static buildDeterministicTxKeyInputs(rawTransaction: RawDaemon_Transaction): CnTransactions.Vin[] | null {
		let inputs: CnTransactions.Vin[] = [];

		for (let rawVin of rawTransaction.vin) {
			if (rawVin.type === '04' || rawVin.type === 'confidential_input' || rawVin.type === 'input_to_confidential') {
				if (typeof rawVin.value === 'undefined' || typeof rawVin.value.k_image !== 'string') {
					return null;
				}
				let value : any = rawVin.value;

				// Prefer the per-member ring_members layout from the mixed-ring
				// schema; fall back to the legacy single-bucket (ring_amount +
				// ring_offsets) layout for any old daemon RPC responses still
				// in flight during the rollout.
				let ringMembers : CnTransactions.RingMember[] = [];
				if (Array.isArray(value.ring_members)) {
					for (let m of value.ring_members) {
						ringMembers.push({
							amount: '' + (m.amount !== undefined ? m.amount : (m.ringAmount || CnTransactions.ctConfidentialOutputAmount())),
							output_index: m.output_index !== undefined ? m.output_index : m.outputIndex
						});
					}
				} else {
					let legacyBucket = '' + (value.ring_amount || value.ringAmount || CnTransactions.ctConfidentialOutputAmount());
					let legacyOffsets = (value.ring_offsets || value.ringOutputIndexes || []);
					for (let offset of legacyOffsets) {
						ringMembers.push({ amount: legacyBucket, output_index: offset });
					}
				}

				inputs.push({
					type: 'confidential_input',
					ring_members: ringMembers,
					ring_pubkeys: (value.ring_pubkeys || value.ringPubkeys || []).slice(),
					ring_commits: (value.ring_commits || value.ringCommitments || []).slice(),
					pseudo_commit: value.pseudo_commit || value.pseudoCommitment || '',
					k_image: value.k_image
				});
				continue;
			}

			if (rawVin.type !== '02' && rawVin.type !== 'input_to_key') {
				return null;
			}

			if (typeof rawVin.value === 'undefined' || !Array.isArray(rawVin.value.key_offsets) || typeof rawVin.value.k_image !== 'string') {
				return null;
			}

			inputs.push({
				type: 'input_to_key',
				amount: '' + rawVin.value.amount,
				k_image: rawVin.value.k_image,
				key_offsets: rawVin.value.key_offsets.slice()
			});
		}

		return inputs.length > 0 ? inputs : null;
	}

	static deriveDeterministicTxPrivateKey(rawTransaction: RawDaemon_Transaction, wallet: Wallet, txPubKey: string = ''): { txPrivKey: string, txPubKeyMatches: boolean } | null {
		if (wallet.keys.priv.view === '') {
			return null;
		}

		let inputs = this.buildDeterministicTxKeyInputs(rawTransaction);
		if (inputs === null) {
			return null;
		}

		try {
			let txKeys = CnTransactions.generate_deterministic_tx_keys(inputs, wallet.keys.priv.view);
			return {
				txPrivKey: txKeys.sec,
				txPubKeyMatches: txPubKey !== '' && txKeys.pub === txPubKey
			};
		} catch (e) {
			return null;
		}
	}
	static parse(rawTransaction: RawDaemon_Transaction, wallet: Wallet): Transaction | null {
		let transaction: Transaction | null = null;

		let tx_pub_key = '';
		let paymentId: string | null = null;

		let txExtras = [];
		try {
			let hexExtra: number[] = [];
			let uint8Array = hextobin(rawTransaction.extra);

			for (let i = 0; i < uint8Array.byteLength; i++) {
				hexExtra[i] =  uint8Array[i];
			}

			txExtras = this.parseExtra(hexExtra);
		} catch (e) {
			console.error(e);
			console.log('Error when scanning transaction on block ' + rawTransaction.height, rawTransaction);

			return null;
		}

		for (let extra of txExtras) {
			if (extra.type === TX_EXTRA_TAG_PUBKEY) {
				for (let i = 0; i < 32; ++i) {
					tx_pub_key += String.fromCharCode(extra.data[i]);
				}
				break;
			}
		}

		if (tx_pub_key === '') {
			console.log(`tx_pub_key === null`);
			return null;
		}

		tx_pub_key = CnUtils.bintohex(tx_pub_key);
		let encryptedPaymentId: string | null = null;

		for (let extra of txExtras) {
			if (extra.type === TX_EXTRA_NONCE) {
				if (extra.data[0] === TX_EXTRA_NONCE_PAYMENT_ID) {
					paymentId = '';
					for (let i = 1; i < extra.data.length; ++i) {
						paymentId += String.fromCharCode(extra.data[i]);
					}
					paymentId = CnUtils.bintohex(paymentId);
					break;
				} else if (extra.data[0] === TX_EXTRA_NONCE_ENCRYPTED_PAYMENT_ID) {
					encryptedPaymentId = '';
					for (let i = 1; i < extra.data.length; ++i) {
						encryptedPaymentId += String.fromCharCode(extra.data[i]);
					}
					encryptedPaymentId = CnUtils.bintohex(encryptedPaymentId);
					break;
				}
			}
		}

		let derivation = null;
		try {
			derivation = CnNativeBride.generate_key_derivation(tx_pub_key, wallet.keys.priv.view);
		} catch (e) {
			console.log('UNABLE TO CREATE DERIVATION', e);
			return null;
		}

		let outs: TransactionOut[] = [];
		let ins: TransactionIn[] = [];
		let isCtTx = rawTransaction.version === 2;

		for (let iOut = 0; iOut < rawTransaction.vout.length; iOut++) {
			let out = rawTransaction.vout[iOut];
			let txout_k : any = out.target.data || <any>out.target || {};
			let outKey = txout_k.key || txout_k.target_key || txout_k.targetKey;
			let outCommitment = txout_k.commitment || txout_k.commit || '';
			let outMaskedAmount = txout_k.masked_amount || txout_k.maskedAmount || '';
			let amount: number = 0;
			try {
				amount = out.amount;
			} catch (e) {
				console.error(e);
				continue;
			}

			let output_idx_in_tx = iOut;

			let generated_tx_pubkey = CnNativeBride.derive_public_key(derivation, output_idx_in_tx, wallet.keys.pub.spend);

			// check if generated public key matches the current output's key
			let mine_output = (outKey == generated_tx_pubkey);

			if (mine_output) {
				let ctBlinding = '';
				if (isCtTx) {
					if (outMaskedAmount === '' || outCommitment === '') {
						console.warn('Skipping CT output with missing commitment or masked amount', rawTransaction.hash, iOut);
						continue;
					}
					let decodedCt = CnTransactions.decode_ct_amount(outMaskedAmount, outCommitment, derivation, output_idx_in_tx);
					amount = decodedCt.amount.toJSValue();
					ctBlinding = decodedCt.blinding;
				}

				let transactionOut = new TransactionOut();
				if (typeof rawTransaction.global_index_start !== 'undefined')
					transactionOut.globalIndex = rawTransaction.output_indexes[output_idx_in_tx];
				else
					transactionOut.globalIndex = output_idx_in_tx;

				transactionOut.amount = amount;
				transactionOut.pubKey = outKey;
				transactionOut.outputIdx = output_idx_in_tx;
				if (isCtTx) {
					transactionOut.ctCommitment = outCommitment;
					transactionOut.ctMaskedAmount = outMaskedAmount;
					transactionOut.ctBlinding = ctBlinding;
					transactionOut.ctRingAmount = CnTransactions.ctConfidentialOutputAmount();
				}
				/*
				if (!minerTx) {
					transactionOut.rtcOutPk = rawTransaction.rct_signatures.outPk[output_idx_in_tx];
					transactionOut.rtcMask = rawTransaction.rct_signatures.ecdhInfo[output_idx_in_tx].mask;
					transactionOut.rtcAmount = rawTransaction.rct_signatures.ecdhInfo[output_idx_in_tx].amount;
				}
                */
				if (wallet.keys.priv.spend !== null && wallet.keys.priv.spend !== '') {
					let m_key_image = CnTransactions.generate_key_image_helper({
						view_secret_key: wallet.keys.priv.view,
						spend_secret_key: wallet.keys.priv.spend,
						public_spend_key: wallet.keys.pub.spend,
					}, tx_pub_key, output_idx_in_tx, derivation);

					transactionOut.keyImage = m_key_image.key_image;
					transactionOut.ephemeralPub = m_key_image.ephemeral_pub;
				}

				outs.push(transactionOut);

				//if (minerTx)
				//    break;
			} //  if (mine_output)
		}

		//check if no read only wallet
		if (wallet.keys.priv.spend !== null && wallet.keys.priv.spend !== '') {
			let keyImages = wallet.getTransactionKeyImages();
			for (let iIn = 0; iIn < rawTransaction.vin.length; ++iIn) {
				let vin = rawTransaction.vin[iIn];
				if (vin.value && keyImages.indexOf(vin.value.k_image) !== -1) {
					//console.log('found in', vin);
					let walletOuts = wallet.getAllOuts();
					for (let ut of walletOuts) {
						if (ut.keyImage == vin.value.k_image) {
							// ins.push(vin.key.k_image);
							// sumIns += ut.amount;

							let transactionIn = new TransactionIn();
							transactionIn.amount = ut.amount;
							transactionIn.keyImage = ut.keyImage;
							ins.push(transactionIn);
							// console.log(ut);
							break;
						}
					}
				}
			}
		} else {
			let txOutIndexes = wallet.getTransactionOutIndexes();
			for (let iIn = 0; iIn < rawTransaction.vin.length; ++iIn) {
				let vin = rawTransaction.vin[iIn];

				if (!vin.value) continue;

				let vinValue : any = vin.value;
				// Two sources of ring offsets:
				//   (a) New per-member schema: vin.ring_members[k].output_index
				//       is *absolute* — no delta decoding needed. Mixed-bucket
				//       rings live here too, but for the "is this output of
				//       mine spent" heuristic we don't need the bucket; an
				//       index match alone is suggestive enough.
				//   (b) Legacy single-bucket schema: vin.ring_offsets /
				//       ringOutputIndexes / key_offsets are *relative* and
				//       need delta decoding.
				let absoluteOffets : number[] = [];
				if (Array.isArray(vinValue.ring_members) && vinValue.ring_members.length > 0) {
					for (let m of vinValue.ring_members) {
						let idx = m.output_index !== undefined ? m.output_index : m.outputIndex;
						if (idx !== undefined) {
							absoluteOffets.push(new JSBigInt(idx).toJSValue());
						}
					}
				} else {
					let relativeOffsets = (vinValue.key_offsets || vinValue.ring_offsets || vinValue.ringOutputIndexes || []);
					absoluteOffets = relativeOffsets.map(function(offset:any) { return new JSBigInt(offset).toJSValue(); });
					for (let i = 1; i < absoluteOffets.length; ++i) {
						absoluteOffets[i] = new JSBigInt(absoluteOffets[i]).add(absoluteOffets[i - 1]).toJSValue();
					}
				}

				let ownTx = -1;
				for (let index of absoluteOffets) {
					if (txOutIndexes.indexOf(index) !== -1) {
						ownTx = index;
						break;
					}
				}

				if (ownTx !== -1) {
					let txOut = wallet.getOutWithGlobalIndex(ownTx);
					if (txOut !== null) {
						let transactionIn = new TransactionIn();
						transactionIn.amount = -txOut.amount;
						transactionIn.keyImage = txOut.keyImage;
						ins.push(transactionIn);
					}
				}
			}
		}

		if (outs.length > 0 || ins.length) {
			transaction = new Transaction();

			if (typeof rawTransaction.height !== 'undefined') transaction.blockHeight = rawTransaction.height;
			if (typeof rawTransaction.ts !== 'undefined') transaction.timestamp = rawTransaction.ts;
			if (typeof rawTransaction.hash !== 'undefined') transaction.hash = rawTransaction.hash;
			if (typeof rawTransaction.block_hash !== 'undefined') transaction.blockHash = rawTransaction.block_hash;

			transaction.txPubKey = tx_pub_key;

			if (paymentId !== null)
				transaction.paymentId = paymentId;
			if (encryptedPaymentId !== null) {
				transaction.paymentId = Cn.decrypt_payment_id(encryptedPaymentId, tx_pub_key, wallet.keys.priv.view);
			}

			if (rawTransaction.vin[0].type === 'ff') {
				transaction.fee = 0;
			} else {
				transaction.fee = rawTransaction.fee;
			}

			transaction.outs = outs;
			transaction.ins = ins;

			transaction.is_coinbase = rawTransaction.vin[0].type === 'ff';

			if (transaction.hash !== '' && transaction.getAmount() < 0 && wallet.findTxPrivateKeyWithHash(transaction.hash) === null) {
				let derivedTxKey = TransactionsExplorer.deriveDeterministicTxPrivateKey(rawTransaction, wallet, tx_pub_key);
				if (derivedTxKey !== null && derivedTxKey.txPubKeyMatches) {
					wallet.addTxPrivateKeyWithTxHash(transaction.hash, derivedTxKey.txPrivKey);
				}
			}
		}

		return transaction;
	}


	static formatWalletOutsForTx(wallet: Wallet, blockchainHeight: number): RawOutForTx[] {
		let unspentOuts = [];

		//rct=rct_outpk + rct_mask + rct_amount
		// {"amount"          , out.amount},
		// {"public_key"      , out.out_pub_key},
		// {"index"           , out.out_index},
		// {"global_index"    , out.global_index},
		// {"rct"             , rct},
		// {"tx_id"           , out.tx_id},
		// {"tx_hash"         , tx.hash},
		// {"tx_prefix_hash"  , tx.prefix_hash},
		// {"tx_pub_key"      , tx.tx_pub_key},
		// {"timestamp"       , static_cast<uint64_t>(out.timestamp)},
		// {"height"          , tx.height},
		// {"spend_key_images", json::array()}

		// Outputs scanned by an older scanner can be
		// persisted without ctCommitment / ctMaskedAmount / ctRingAmount even
		// when they're actually confidential outputs from v2 txs. If we feed
		// those to the sender path they get classified as transparent (see
		// `ring_amount` below) and shipped to the daemon as inputs with the
		// decoded amount but with a globalIndex that lives in the CT bucket -
		// the daemon then rejects with "Wrong index in transaction inputs".
		// Skip them defensively until a rescan repopulates the CT markers.
		let staleCtSuspects: Array<{ hash: string, height: number, amount: number, globalIndex: number }> = [];

		for (let tr of wallet.getAll()) {
			//todo improve to take into account miner tx
			//only add outs unlocked
			if (!tr.isConfirmed(blockchainHeight)) {
				continue;
			}

			for (let out of tr.outs) {

				if (TransactionsExplorer.isStaleCtOutput(tr, out)) {
					// globalIndex points into the CT bucket, not the amount
					// bucket implied by `amount`. WalletWatchdog.healStaleCtOutputs
					// re-fetches the parent tx in the background; until then we
					// skip the output so we don't ship a daemon-rejecting ring.
					staleCtSuspects.push({
						hash: tr.hash,
						height: tr.blockHeight,
						amount: out.amount,
						globalIndex: out.globalIndex,
					});
					continue;
				}

				let rct = '';
				if (out.rtcAmount !== '') {
					rct = out.rtcOutPk + out.rtcMask + out.rtcAmount;
				} else {
					rct = CnTransactions.zeroCommit(CnUtils.d2s(out.amount));
				}

				unspentOuts.push({
					keyImage: out.keyImage,
					amount: out.amount,
					public_key: out.pubKey,
					index: out.outputIdx,
					global_index: out.globalIndex,
					tx_pub_key: tr.txPubKey,
					ctCommitment: out.ctCommitment,
					ctMaskedAmount: out.ctMaskedAmount,
					ctBlinding: out.ctBlinding,
					ring_amount: out.ctRingAmount || (out.ctCommitment ? CnTransactions.ctConfidentialOutputAmount() : out.amount),
					is_coinbase: tr.is_coinbase
				});
			}
		}

		if (staleCtSuspects.length > 0) {
			console.warn(
				'[wallet] Skipping ' + staleCtSuspects.length +
				' CT-era output(s) with incomplete CT markers. ' +
				'The wallet will re-fetch those txs in the background.',
				staleCtSuspects
			);
		}

		//console.log('outs count before spend:', unspentOuts.length, unspentOuts);
		for (let tr of wallet.getAll().concat(wallet.txsMem)) {
			//console.log(tr.ins);
			for (let i of tr.ins) {
				for (let iOut = 0; iOut < unspentOuts.length; ++iOut) {
					let out = unspentOuts[iOut];
					let exist = out.keyImage === i.keyImage;
					if (exist) {
						unspentOuts.splice(iOut, 1);
						break;
					}
				}
			}
		}

		return unspentOuts;
	}

	static createRawTx(
		dsts: { address: string, amount: number }[],
		wallet: Wallet,
		rct: boolean,
		usingOuts: RawOutForTx[],
		pid_encrypt: boolean,
		mix_outs: any[] = [],
		mixin: number,
		neededFee: number,
		payment_id: string,
		accountRegistration: boolean = false
	): Promise<{ raw: { hash: string, prvkey: string, raw: string }, signed: any }> {
		return new Promise<{ raw: { hash: string, prvkey: string, raw: string }, signed: any }>(function (resolve, reject) {
			let signed;
			try {
				//console.log('Destinations: ');
				//need to get viewkey for encrypting here, because of splitting and sorting
				let realDestViewKey = undefined;
				if (pid_encrypt) {
					realDestViewKey = Cn.decode_address(dsts[0].address).view;
				}

				let splittedDsts = CnTransactions.decompose_tx_destinations(dsts, rct);
				signed = CnTransactions.create_transaction(
					{
						spend: wallet.keys.pub.spend,
						view: wallet.keys.pub.view
					}, {
						spend: wallet.keys.priv.spend,
						view: wallet.keys.priv.view
					},
					splittedDsts, usingOuts,
					mix_outs, mixin, neededFee,
					payment_id, pid_encrypt,
					realDestViewKey, 0, rct, accountRegistration);

				console.log("signed tx: ", signed);
				let raw_tx_and_hash = CnTransactions.serialize_tx_with_hash(signed);
				resolve({raw: raw_tx_and_hash, signed: signed});

			} catch (e) {
				reject("Failed to create transaction: " + e);
			}

		});
	}

	static createTx(
		userDestinations: { address: string, amount: number }[],
		userPaymentId: string = '',
		wallet: Wallet,
		blockchainHeight: number,
		obtainMixOutsCallback: (amounts: any[], numberOuts: number) => Promise<RawDaemon_OutsForAmount[]>,
		confirmCallback: (amount: number, feesAmount: number) => Promise<void>,
		mixin: number = config.defaultMixin,
		accountRegistration: boolean = false,
		feeAmount: any = null):
		Promise<{ raw: { hash: string, prvkey: string, raw: string }, signed: any }> {
		return new Promise<{ raw: { hash: string, prvkey: string, raw: string }, signed: any }>(function (resolve, reject) {

			let useCt = TransactionsExplorer.isCtActivated(blockchainHeight);
			if (useCt) {
				if (mixin > CT_MAX_MIXIN) {
					reject('ct_mixin_too_big');
					return;
				}
				if (mixin !== 0 && mixin < CT_MIN_MIXIN) {
					mixin = CT_MIN_MIXIN;
				}
			}
			let neededFee = feeAmount === null ? new JSBigInt((<any>window).config.coinFee) : new JSBigInt(feeAmount);
			if (useCt && neededFee.compare(CnTransactions.ctMinimumDenomination()) < 0) {
				neededFee = CnTransactions.ctMinimumDenomination();
			}

			let pid_encrypt = false; //don't encrypt payment ID unless we find an integrated one

			let totalAmountWithoutFee = new JSBigInt(0);
			let paymentIdIncluded = 0;

			let paymentId = '';
			let dsts: { address: string, amount: number }[] = [];

			for (let dest of userDestinations) {
				totalAmountWithoutFee = totalAmountWithoutFee.add(dest.amount);
				let target = Cn.decode_address(dest.address);
				if (target.intPaymentId !== null) {
					++paymentIdIncluded;
					paymentId = target.intPaymentId;
					pid_encrypt = true;
				}

				dsts.push({
					address: dest.address,
					amount: new JSBigInt(dest.amount)
				});
			}

			if (useCt) {
				for (let dest of dsts) {
					let amount = new JSBigInt(dest.amount);
					if (amount.compare(0) <= 0 || amount.remainder(CnTransactions.ctMinimumDenomination()).compare(0) !== 0) {
						reject('ct_wrong_amount');
						return;
					}
				}
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
				if (
					(userPaymentId.length !== 16 && userPaymentId.length !== 64) ||
					(!(/^[0-9a-fA-F]{16}$/.test(userPaymentId)) && !(/^[0-9a-fA-F]{64}$/.test(userPaymentId)))
				) {
					reject('invalid_payment_id');
					return;
				}

				pid_encrypt = userPaymentId.length === 16;
				paymentId = userPaymentId;
			}


			let unspentOuts: RawOutForTx[] = TransactionsExplorer.formatWalletOutsForTx(wallet, blockchainHeight);

			//console.log('outs available:', unspentOuts.length, unspentOuts);

			let usingOuts: RawOutForTx[] = [];
			let usingOuts_amount = new JSBigInt(0);
			let unusedOuts = unspentOuts.slice(0);

			let totalAmount = totalAmountWithoutFee.add(neededFee)/*.add(chargeAmount)*/;

			//selecting outputs to fit the desired amount (totalAmount);
			function pop_random_value(list: any[]) {
				let idx = Math.floor(MathUtil.randomFloat() * list.length);
				let val = list[idx];
				list.splice(idx, 1);
				return val;
			}

			while (usingOuts_amount.compare(totalAmount) < 0 && unusedOuts.length > 0) {
				let out = pop_random_value(unusedOuts);
				usingOuts.push(out);
				usingOuts_amount = usingOuts_amount.add(out.amount);
				//console.log("Using output: " + out.amount + " - " + JSON.stringify(out));
			}

			console.log("Selected outs:", usingOuts);

			console.log('using amount of ' + usingOuts_amount + ' for sending ' + totalAmountWithoutFee + ' with fees of ' + (neededFee / Math.pow(10, config.coinUnitPlaces)) + ' KRB');
			confirmCallback(totalAmountWithoutFee, neededFee).then(function () {
				if (usingOuts_amount.compare(totalAmount) < 0) {
					console.log("Not enough spendable outputs / balance too low (have "
						+ Cn.formatMoneyFull(usingOuts_amount) + " but need "
						+ Cn.formatMoneyFull(totalAmount)
						+ " (estimated fee " + Cn.formatMoneyFull(neededFee) + " KRB included)");
					// return;
					reject({error: 'balance_too_low'});
					return;
				} else if (usingOuts_amount.compare(totalAmount) > 0) {
					let changeAmount = usingOuts_amount.subtract(totalAmount);
					let changeCanonical = changeAmount;
					if (useCt) {
						changeCanonical = changeAmount.divide(CnTransactions.ctMinimumDenomination()).multiply(CnTransactions.ctMinimumDenomination());
						let residue = changeAmount.subtract(changeCanonical);
						if (residue.compare(0) > 0) {
							neededFee = neededFee.add(residue);
						}
					}
					if (changeCanonical.compare(0) > 0) {
						console.log("1) Sending change of " + Cn.formatMoneySymbol(changeCanonical)
							+ " to " + wallet.getPublicAddress());
						dsts.push({
							address: wallet.getPublicAddress(),
							amount: changeCanonical
						});
					}
				} /*
				// not applicable for Karbo
				else if (usingOuts_amount.compare(totalAmount) === 0) {
					//create random destination to keep 2 outputs always in case of 0 change
					let fakeAddress = Cn.create_address(CnRandom.random_scalar()).public_addr;
					console.log("Sending 0 KRB to a fake address to keep tx uniform (no change exists): " + fakeAddress);
					dsts.push({
						address: fakeAddress,
						amount: 0
					});
				}*/
				console.log('destinations', dsts);

				let amounts: any[] = [];
				for (let l = 0; l < usingOuts.length; l++) {
					amounts.push(TransactionsExplorer.randomOutAmountForWalletOut(usingOuts[l]));
				}

				let allInputsAreCoinbase = useCt && usingOuts.length > 0 && usingOuts.every(function(out: RawOutForTx) {
					return out.is_coinbase === true;
				});
				let requestedMixin = allInputsAreCoinbase ? 0 : mixin;
				let nbOutsNeeded: number = requestedMixin + 1;

				let signWithMixins = function(lotsMixOuts: any[], txMixin: number) {
					console.log('------------------------------mix_outs');
					console.log('amounts', amounts);
					console.log('lots_mix_outs', lotsMixOuts);

					if (useCt && txMixin > 0) {
						let hasFullRing = lotsMixOuts.length === usingOuts.length;
						for (let i = 0; hasFullRing && i < lotsMixOuts.length; ++i) {
							hasFullRing = (lotsMixOuts[i].outs || []).length >= txMixin + 1;
						}
						if (!hasFullRing) {
							reject('ct_not_enough_mixins');
							return;
						}
					}

					TransactionsExplorer.createRawTx(dsts, wallet, useCt, usingOuts, pid_encrypt, lotsMixOuts, txMixin, neededFee, paymentId, accountRegistration).then(function (data: { raw: { hash: string, prvkey: string, raw: string }, signed: any }) {
						resolve(data);
					}).catch(function (e) {
						reject(e);
					});
				};

				if (requestedMixin === 0) {
					signWithMixins([], 0);
					return;
				}

				obtainMixOutsCallback(amounts, nbOutsNeeded).then(function (lotsMixOuts: any[]) {
					try {
						signWithMixins(TransactionsExplorer.alignMixOutsWithRequestedAmounts(lotsMixOuts, amounts), requestedMixin);
					} catch (e) {
						reject(e);
					}
				}).catch(function (e) {
					console.error('Failed to obtain mix outs', e);
					reject(e);
				});

				//https://github.com/moneroexamples/openmonero/blob/ebf282faa8d385ef3cf97e6561bd1136c01cf210/README.md
				//https://github.com/moneroexamples/openmonero/blob/95bc207e1dd3881ba0795c02c06493861de8c705/src/YourMoneroRequests.cpp
			}).catch(function (e) {
				reject(e);
			});
		});
	}
}

