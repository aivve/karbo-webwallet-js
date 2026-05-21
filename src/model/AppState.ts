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

import {DependencyInjectorInstance} from "../lib/numbersLab/DependencyInjector";
import {Wallet} from "./Wallet";
import {BlockchainExplorerProvider} from "../providers/BlockchainExplorerProvider";
import {Observable} from "../lib/numbersLab/Observable";
import {WalletRepository} from "./WalletRepository";
import {BlockchainExplorer, RawDaemon_Transaction} from "./blockchain/BlockchainExplorer";
import {TransactionsExplorer} from "./TransactionsExplorer";
import {WalletWatchdog} from "./WalletWatchdog";
import {Biometric} from "./Biometric";

export class WalletWorker {
	wallet: Wallet;
	password: string;
	walletId: string;
	walletName: string|null;
	backupConfirmed: boolean;

	intervalSave: any = 0;
	private active = true;
	private saveObserver !: Function;

	constructor(wallet: Wallet, password: string, walletId: string, walletName: string|null = null, backupConfirmed: boolean = true) {
		this.wallet = wallet;
		this.password = password;
		this.walletId = walletId;
		this.walletName = walletName;
		this.backupConfirmed = backupConfirmed;
		let self: any = this;
		this.saveObserver = function () {
			if (!self.active)
				return;
			if (self.intervalSave === 0)
				self.intervalSave = setTimeout(function () {
					if (!self.active)
						return;
					self.save();
					self.intervalSave = 0;
				}, 1000);
		};
		wallet.addObserver(Observable.EVENT_MODIFIED, this.saveObserver);

		this.save();
	}

	save(makeActive: boolean = true): Promise<void> {
		if (!this.active && makeActive)
			return Promise.resolve();
		return WalletRepository.save(this.wallet, this.password, this.walletId, this.walletName, this.backupConfirmed, makeActive);
	}

	stop(): Promise<void> {
		if (!this.active)
			return Promise.resolve();

		this.active = false;
		this.wallet.removeObserver(Observable.EVENT_MODIFIED, this.saveObserver);
		if (this.intervalSave !== 0) {
			clearTimeout(this.intervalSave);
			this.intervalSave = 0;
		}
		return this.save(false);
	}
}

export class AppState {

	static openWallet(wallet: Wallet, password: string, walletId: string|null = null, walletName: string|null = null, backupConfirmed: boolean = true) {
		let existingWallet: Wallet = DependencyInjectorInstance().getInstance(Wallet.name, 'default', false);
		if (existingWallet !== null)
			AppState.disconnect();

		let resolvedWalletId = walletId === null ? WalletRepository.createWalletId() : walletId;
		WalletRepository.setCurrentWalletId(resolvedWalletId);
		let walletWorker = new WalletWorker(wallet, password, resolvedWalletId, walletName, backupConfirmed);

		DependencyInjectorInstance().register(Wallet.name, wallet);
		let watchdog = BlockchainExplorerProvider.getInstance().watchdog(wallet);
		DependencyInjectorInstance().register(WalletWatchdog.name, watchdog);
		DependencyInjectorInstance().register(WalletWorker.name, walletWorker);

		$('body').addClass('connected');
		$('body').removeClass('viewOnlyWallet');
		if (wallet.isViewOnly())
			$('body').addClass('viewOnlyWallet');
	}

	static disconnect() {
		let wallet: Wallet = DependencyInjectorInstance().getInstance(Wallet.name, 'default', false);
		let walletWorker: WalletWorker = DependencyInjectorInstance().getInstance(WalletWorker.name, 'default', false);
		let walletWatchdog: WalletWatchdog = DependencyInjectorInstance().getInstance(WalletWatchdog.name, 'default', false);
		if (walletWatchdog !== null)
			walletWatchdog.stop();
		if (walletWorker !== null)
			walletWorker.stop();

		DependencyInjectorInstance().register(Wallet.name, undefined, 'default');
		DependencyInjectorInstance().register(WalletWorker.name, undefined, 'default');
		DependencyInjectorInstance().register(WalletWatchdog.name, undefined, 'default');
		$('body').removeClass('connected');
		$('body').removeClass('viewOnlyWallet');
	}

	private static leftMenuEnabled = false;

	static enableLeftMenu() {
		if (!this.leftMenuEnabled) {
			this.leftMenuEnabled = true;
			$('body').removeClass('menuDisabled');
		}
	}

	static disableLeftMenu() {
		if (this.leftMenuEnabled) {
			this.leftMenuEnabled = false;
			$('body').addClass('menuDisabled');
		}
	}

	static askUserOpenWallet(redirectToHome: boolean = true, walletId: string|null = null) : Promise<void> {
		return WalletRepository.getActiveWalletId().then(function (activeId: string|null) {
			let resolvedWalletId = walletId !== null ? walletId : activeId;
			if (resolvedWalletId === null)
				return AppState.promptPasswordAndOpenWallet(redirectToHome, walletId);

			return Biometric.isEnabledForWallet(resolvedWalletId).then(function (enabled: boolean) {
				if (!enabled)
					return AppState.promptPasswordAndOpenWallet(redirectToHome, walletId);

				return Biometric.unlockPassword(resolvedWalletId, i18n.t('global.openWalletModal.biometricReason'))
					.then(function (password: string|null) {
						if (password === null) // cancelled, failed, or stored credential gone
							return AppState.promptPasswordAndOpenWallet(redirectToHome, walletId);
						return AppState.openWalletWithKnownPassword(password, redirectToHome, walletId);
					});
			});
		});
	}

	private static promptPasswordAndOpenWallet(redirectToHome: boolean, walletId: string|null) : Promise<void> {
		return new Promise<void>(function (resolve, reject) {
			swal({
				title: i18n.t('global.openWalletModal.title'),
				input: 'password',
				showCancelButton: true,
				confirmButtonText: i18n.t('global.openWalletModal.confirmText'),
				cancelButtonText: i18n.t('global.openWalletModal.cancelText'),
				html:`<a href="#!forgotPassword" class="swal-forgot-password-link"><small>`+i18n.t('global.openWalletModal.forgotPassword')+`</small></a>`
			}).then((result: any) => {
				setTimeout(function () { //for async
					if (result.value) {
						AppState.openWalletWithKnownPassword(result.value, redirectToHome, walletId)
							.then(resolve, reject);
					} else
						reject();
				}, 1);
			});
		});
	}

	private static openWalletWithKnownPassword(savePassword: string, redirectToHome: boolean, walletId: string|null) : Promise<void> {
		return new Promise<void>(function (resolve, reject) {
			swal({
				type: 'info',
				title: i18n.t('global.loading'),
				onOpen: () => {
					swal.showLoading();
				}
			});

			let memoryWallet = DependencyInjectorInstance().getInstance(Wallet.name, 'default', false);
			let currentWalletId = WalletRepository.getCurrentWalletId();
			if (memoryWallet === null || (walletId !== null && currentWalletId !== walletId)) {
				WalletRepository.getLocalWalletWithPassword(savePassword, walletId).then((wallet: Wallet | null) => {
					if (wallet !== null) {
						wallet.recalculateIfNotViewOnly();

						let blockchainHeightToRescanObj: any = {};
						for (let tx of wallet.getTransactionsCopy()) {
							if (tx.hash === '') {
								blockchainHeightToRescanObj[tx.blockHeight] = true;
							}
						}
						let blockchainHeightToRescan = Object.keys(blockchainHeightToRescanObj);
						if (blockchainHeightToRescan.length > 0) {
							let blockchainExplorer: BlockchainExplorer = BlockchainExplorerProvider.getInstance();

							let promisesBlocks = [];
							for (let height of blockchainHeightToRescan) {
								promisesBlocks.push(blockchainExplorer.getTransactionsForBlocks(parseInt(height), parseInt(height), wallet.options.checkMinerTx));
							}

							Promise.all(promisesBlocks).then(function (arrayOfTxs: Array<RawDaemon_Transaction[]>) {
								for (let txs of arrayOfTxs) {
									for (let rawTx of txs) {
										if (wallet !== null) {
											let tx = TransactionsExplorer.parse(rawTx, wallet);
											if (tx !== null) {
												console.log(`Added new Tx ${tx.hash} to wallet`);
												wallet.addNew(tx);
											}
										}
									}
								}
							});
						}
						swal.close();
						resolve();

						AppState.openWallet(wallet, savePassword, WalletRepository.getCurrentWalletId());
						if (redirectToHome)
							window.location.href = '#account';
					} else {
						swal({
							type: 'error',
							title: i18n.t('global.invalidPasswordModal.title'),
							text: i18n.t('global.invalidPasswordModal.content'),
							confirmButtonText: i18n.t('global.invalidPasswordModal.confirmText'),
							onOpen: () => {
								swal.hideLoading();
							}
						});
						reject();
					}
				});
			} else {
				swal.close();
				if (redirectToHome)
					window.location.href = '#account';
				resolve();
			}
		});
	}
}
