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

import {VueClass, VueRequireFilter, VueVar} from "../lib/numbersLab/VueAnnotate";
import {DependencyInjectorInstance} from "../lib/numbersLab/DependencyInjector";
import {Wallet} from "../model/Wallet";
import {DestructableView} from "../lib/numbersLab/DestructableView";
import {Constants} from "../model/Constants";
import {AppState} from "../model/AppState";
import {Transaction} from "../model/Transaction";
import {Cn} from "../model/Cn";
import {BlockchainExplorerProvider} from "../providers/BlockchainExplorerProvider";
import {BlockchainExplorer, RawDaemon_Out} from "../model/blockchain/BlockchainExplorer";
import {TransactionsExplorer} from "../model/TransactionsExplorer";
import {WalletWatchdog} from "../model/WalletWatchdog";

let wallet : Wallet = DependencyInjectorInstance().getInstance(Wallet.name,'default', false);
let blockchainExplorer : BlockchainExplorer = BlockchainExplorerProvider.getInstance();

class AccountView extends DestructableView{
	@VueVar([]) transactions !: Transaction[];
	@VueVar([]) recentTransactions !: Transaction[];
	@VueVar(0) walletAmount !: number;
	@VueVar(0) unlockedWalletAmount !: number;
	@VueVar(0) ticker !: string;
	@VueVar('') address !: string;

	@VueVar(0) currentScanBlock !: number;
	@VueVar(0) blockchainHeight !: number;
	@VueVar(Math.pow(10, config.coinUnitPlaces)) currencyDivider !: number;

	@VueVar('') accountNumber !: string;
	@VueVar(true) accountNumberLoading !: boolean;

	intervalRefresh : number = 0;

	constructor(container : string){
		super(container);
		let self = this;

		this.ticker = config.coinSymbol;
		this.address = wallet.getPublicAddress();

		AppState.enableLeftMenu();
		this.intervalRefresh = <any>setInterval(function(){
			self.refresh();
		}, 1*1000);
		this.refresh();

		if (typeof blockchainExplorer.getAccountNumber === 'function') {
			blockchainExplorer.getAccountNumber(wallet.getPublicAddress()).then(function (accountNumber: string | null) {
				self.accountNumberLoading = false;
				if (accountNumber !== null) {
					self.accountNumber = accountNumber;
				}
			}).catch(function () {
				self.accountNumberLoading = false;
			});
		} else {
			self.accountNumberLoading = false;
		}
	}

	destruct(): Promise<void> {
		clearInterval(this.intervalRefresh);
		return super.destruct();
	}

	refresh(){
		let self = this;
		blockchainExplorer.getHeight().then(function(height : number){
			self.blockchainHeight = height;
		});

		this.refreshWallet();
	}

	private formatBalanceAmount(value:number): string{
		return Cn.formatMoney(value);
	}

	formatNativeBalance(value:number): string{
		return this.formatBalanceAmount(value);
	}

	getBalanceWholePart(value:number): string{
		let formattedAmount = this.formatBalanceAmount(value);
		let fractionMatch = formattedAmount.match(/(\.\d+)$/);
		if(fractionMatch !== null)
			return formattedAmount.substr(0, formattedAmount.length - fractionMatch[1].length);
		return formattedAmount;
	}

	getBalanceFractionPart(value:number): string{
		let formattedAmount = this.formatBalanceAmount(value);
		let fractionMatch = formattedAmount.match(/(\.\d+)$/);
		return fractionMatch !== null ? fractionMatch[1] : '';
	}

	displayUnlockedWalletAmount(): number{
		return Math.max(0, Math.min(this.walletAmount, this.unlockedWalletAmount));
	}

	displayPendingWalletAmount(): number{
		return Math.max(0, this.walletAmount - this.displayUnlockedWalletAmount());
	}

	hasBalanceDetails(): boolean{
		return this.displayPendingWalletAmount() > 0;
	}

	copyAddress(){
		let el = document.createElement('textarea');
		el.value = this.address;
		el.setAttribute('readonly', '');
		el.style.position = 'absolute';
		el.style.left = '-9999px';
		document.body.appendChild(el);
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);

		swal({
			type: 'success',
			title: i18n.t('receivePage.copyNotice'),
			timer: 1500,
			showConfirmButton: false,
		});
	}

	copyAccountNumber(){
		let el = document.createElement('textarea');
		el.value = this.accountNumber;
		el.setAttribute('readonly', '');
		el.style.position = 'absolute';
		el.style.left = '-9999px';
		document.body.appendChild(el);
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);

		swal({
			type: 'success',
			title: i18n.t('receivePage.copyNotice'),
			timer: 1500,
			showConfirmButton: false,
		});
	}

	registerAccount(){
		let self = this;
		swal({
			title: i18n.t('accountPage.registerAccountModal.title'),
			html: i18n.t('accountPage.registerAccountModal.content'),
			showCancelButton: true,
			confirmButtonText: i18n.t('accountPage.registerAccountModal.confirmText'),
			cancelButtonText: i18n.t('accountPage.registerAccountModal.cancelText'),
		}).then(function (result: any) {
			if (result.dismiss) return;

			blockchainExplorer.getHeight().then(function (blockchainHeight: number) {
				let dustAmount = 1; // minimal amount for self-transfer
				let destinationAddress = wallet.getPublicAddress();

				swal({
					title: i18n.t('sendPage.creatingTransferModal.title'),
					html: i18n.t('sendPage.creatingTransferModal.content'),
					onOpen: () => {
						swal.showLoading();
					}
				});

				let mixinToSendWith: number = config.defaultMixin;

				TransactionsExplorer.createTx(
					[{address: destinationAddress, amount: dustAmount}],
					'',
					wallet,
					blockchainHeight,
					function (amounts: any[], numberOuts: number): Promise<RawDaemon_Out[]> {
						return blockchainExplorer.getRandomOuts(amounts, numberOuts);
					},
					function (amount: number, feesAmount: number): Promise<void> {
						if (amount + feesAmount > wallet.unlockedAmount(blockchainHeight)) {
							swal({
								type: 'error',
								title: i18n.t('sendPage.notEnoughMoneyModal.title'),
								text: i18n.t('sendPage.notEnoughMoneyModal.content'),
								confirmButtonText: i18n.t('sendPage.notEnoughMoneyModal.confirmText'),
							});
							throw '';
						}

						return new Promise<void>(function (resolve, reject) {
							setTimeout(function () {
								swal({
									title: i18n.t('accountPage.registerAccountModal.confirmingTitle'),
									html: i18n.t('accountPage.registerAccountModal.confirmingContent', {
										fees: feesAmount / Math.pow(10, config.coinUnitPlaces),
									}),
									showCancelButton: true,
									confirmButtonText: i18n.t('sendPage.confirmTransactionModal.confirmText'),
									cancelButtonText: i18n.t('sendPage.confirmTransactionModal.cancelText'),
								}).then(function (result: any) {
									if (result.dismiss) {
										reject('');
									} else {
										swal({
											title: i18n.t('sendPage.finalizingTransferModal.title'),
											html: i18n.t('sendPage.finalizingTransferModal.content'),
											onOpen: () => {
												swal.showLoading();
											}
										});
										resolve();
									}
								}).catch(reject);
							}, 1);
						});
					},
					mixinToSendWith,
					true // accountRegistration
				).then(function (rawTxData: { raw: { hash: string, prvkey: string, raw: string }, signed: any }) {
					blockchainExplorer.sendRawTx(rawTxData.raw.raw).then(function () {
						wallet.addTxPrivateKeyWithTxHash(rawTxData.raw.hash, rawTxData.raw.prvkey);

						let watchdog: WalletWatchdog = DependencyInjectorInstance().getInstance(WalletWatchdog.name);
						if (watchdog !== null) {
							watchdog.checkMempool(true);
						}

						swal({
							type: 'success',
							title: i18n.t('accountPage.registerAccountModal.successTitle'),
							html: i18n.t('accountPage.registerAccountModal.successContent'),
							confirmButtonText: i18n.t('sendPage.transferSentModal.confirmText'),
						});
					}).catch(function (data: any) {
						swal({
							type: 'error',
							title: i18n.t('sendPage.transferExceptionModal.title'),
							html: i18n.t('sendPage.transferExceptionModal.content', {details: JSON.stringify(data)}),
							confirmButtonText: i18n.t('sendPage.transferExceptionModal.confirmText'),
						});
					});
				}).catch(function (error: any) {
					if (error && error !== '') {
						swal({
							type: 'error',
							title: i18n.t('sendPage.transferExceptionModal.title'),
							html: i18n.t('sendPage.transferExceptionModal.content', {details: JSON.stringify(error)}),
							confirmButtonText: i18n.t('sendPage.transferExceptionModal.confirmText'),
						});
					}
				});
			});
		});
	}

	private txBlockDetailsHtml(transaction : Transaction, explorerUrlBlock : string): string{
		if(transaction.blockHash !== '')
			return `<a href="`+explorerUrlBlock.replace('{ID}', transaction.blockHash)+`" target="_blank">`+transaction.blockHeight+`</a>`;
		return ''+transaction.blockHeight;
	}

	moreInfoOnTx(transaction : Transaction){
		let explorerUrlHash = config.testnet ? config.testnetExplorerUrlHash : config.mainnetExplorerUrlHash;
		let explorerUrlBlock = config.testnet ? config.testnetExplorerUrlBlock : config.mainnetExplorerUrlBlock;

		let amount = transaction.getAmount();
		let amountAbs = Math.abs(amount) / Math.pow(10, config.coinUnitPlaces);
		let isOut = amount < 0;

		let rows = '';

		// Amount
		rows += `<div class="tx-detail-row">
			<span class="tx-detail-label">`+i18n.t('accountPage.txDetails.amount')+`</span>
			<span class="tx-detail-value" style="color:var(${isOut ? '--color-danger' : '--color-success'});font-weight:600;">${isOut ? '-' : '+'}${amountAbs} ${config.coinSymbol}</span>
		</div>`;

		// Fees
		if(isOut)
			rows += `<div class="tx-detail-row">
				<span class="tx-detail-label">`+i18n.t('accountPage.txDetails.feesOnTx')+`</span>
				<span class="tx-detail-value">`+(transaction.fee / Math.pow(10, config.coinUnitPlaces))+` `+config.coinSymbol+`</span>
			</div>`;

		// Block height
		rows += `<div class="tx-detail-row">
			<span class="tx-detail-label">`+i18n.t('accountPage.txDetails.blockHeight')+`</span>
			<span class="tx-detail-value">`+this.txBlockDetailsHtml(transaction, explorerUrlBlock)+`</span>
		</div>`;

		// Payment ID
		if(transaction.paymentId !== ''){
			rows += `<div class="tx-detail-row">
				<span class="tx-detail-label">`+i18n.t('accountPage.txDetails.paymentId')+`</span>
				<span class="tx-detail-value tx-detail-mono">`+transaction.paymentId+`</span>
			</div>`;
		}

		// Tx hash
		rows += `<div class="tx-detail-row tx-detail-row-stack">
			<span class="tx-detail-label">`+i18n.t('accountPage.txDetails.txHash')+`</span>
			<a href="`+explorerUrlHash.replace('{ID}', transaction.hash)+`" target="_blank" class="tx-detail-hash">`+transaction.hash+`</a>
		</div>`;

		// Tx private key
		let txPrivKey = wallet.findTxPrivateKeyWithHash(transaction.hash);
		if(txPrivKey !== null){
			rows += `<div class="tx-detail-row tx-detail-row-stack">
				<span class="tx-detail-label">`+i18n.t('accountPage.txDetails.txPrivKey')+`</span>
				<span class="tx-detail-hash">`+txPrivKey+`</span>
			</div>`;
		}

		swal({
			title:i18n.t('accountPage.txDetails.title'),
			confirmButtonText: i18n.t('global.invalidPasswordModal.confirmText'),
			html:`<div class="tx-detail-grid">`+rows+`</div>`
		});
	}

	refreshWallet(){
		this.currentScanBlock = wallet.lastHeight;
		this.walletAmount = wallet.totalAmount();
		this.unlockedWalletAmount = wallet.unlockedAmount(this.currentScanBlock);
		this.transactions = wallet.txsMem.concat(wallet.getTransactionsCopy().reverse());
		// Show only the 5 most recent transactions on dashboard
		this.recentTransactions = this.transactions.slice(0, 5);
	}
}

if(wallet !== null && blockchainExplorer !== null)
	new AccountView('#app');
else
	window.location.href = '#index';

