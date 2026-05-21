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

import {DestructableView} from "../lib/numbersLab/DestructableView";
import {VueVar, VueWatched} from "../lib/numbersLab/VueAnnotate";
import {TransactionsExplorer} from "../model/TransactionsExplorer";
import {WalletRepository} from "../model/WalletRepository";
import {DependencyInjectorInstance} from "../lib/numbersLab/DependencyInjector";
import {Constants} from "../model/Constants";
import {Wallet} from "../model/Wallet";
import {AppState} from "../model/AppState";
import {Storage, StorageProtectionStatus} from "../model/Storage";
import {Translations} from "../model/Translations";
import {BlockchainExplorerProvider} from "../providers/BlockchainExplorerProvider";
import {BlockchainExplorer} from "../model/blockchain/BlockchainExplorer";
import {WalletWatchdog} from "../model/WalletWatchdog";
import {DeleteWallet} from "../model/DeleteWallet";
import {Biometric} from "../model/Biometric";

let wallet : Wallet = DependencyInjectorInstance().getInstance(Wallet.name, 'default', false);
let blockchainExplorer: BlockchainExplorer = BlockchainExplorerProvider.getInstance();
let walletWatchdog : WalletWatchdog = DependencyInjectorInstance().getInstance(WalletWatchdog.name,'default', false);

class SettingsView extends DestructableView{
	@VueVar(10) readSpeed !: number;
	@VueVar(false) checkMinerTx !: boolean;

	@VueVar(false) customNode !: boolean;
	@VueVar('https://node.karbo.org:32448/') nodeUrl !: string;

	@VueVar(0) creationHeight !: number;
	@VueVar(0) scanHeight !: number;

	@VueVar(-1) maxHeight !: number;
	@VueVar('en') language !: string;
	@VueVar('dark') theme !: string;

	@VueVar(0) nativeVersionCode !: number;
	@VueVar('') nativeVersionNumber !: string;
	@VueVar('walletVault.storageStatus.notAvailable') storageProtectionKey !: string;
	@VueVar(false) biometricSupported !: boolean;
	@VueVar(false) biometricEnabled !: boolean;

	private initializing : boolean = true;

	constructor(container : string) {
		super(container);
		let self = this;
		this.readSpeed = wallet.options.readSpeed;
		this.checkMinerTx = wallet.options.checkMinerTx;

		this.nodeUrl = wallet.options.nodeUrl;
		this.customNode = wallet.options.customNode;
		this.initializing = false;

		this.creationHeight = wallet.creationHeight;
		this.scanHeight = wallet.lastHeight;

		blockchainExplorer.getHeight().then(function (height: number) {
			self.maxHeight = height;
		});

		Translations.getLang().then((userLang : string) => {
			this.language = userLang;
		});

		Storage.getItem('user-theme', 'dark').then((userTheme : string) => {
			this.theme = userTheme;
		});
		this.refreshStorageProtection();
		this.refreshBiometric();

		if(typeof (<any>window).cordova !== 'undefined' && typeof (<any>window).cordova.getAppVersion !== 'undefined') {
			(<any>window).cordova.getAppVersion.getVersionNumber().then((version : string) => {
				this.nativeVersionNumber = version;
			});
			(<any>window).cordova.getAppVersion.getVersionCode().then((version : number) => {
				this.nativeVersionCode = version;
			});
		}
	}

	refreshStorageProtection(){
		Storage.requestPersistentStorage().then((status: StorageProtectionStatus) => {
			if (status === 'enabled')
				this.storageProtectionKey = 'walletVault.storageStatus.enabled';
			else if (status === 'not_available')
				this.storageProtectionKey = 'walletVault.storageStatus.notAvailable';
			else
				this.storageProtectionKey = 'walletVault.storageStatus.notGranted';
		});
	}

	refreshBiometric(){
		Biometric.isSupported().then((supported: boolean) => {
			this.biometricSupported = supported;
			if (!supported) {
				this.biometricEnabled = false;
				return;
			}
			let walletId = WalletRepository.getCurrentWalletId();
			if (walletId === null) {
				this.biometricEnabled = false;
				return;
			}
			Biometric.isEnabledForWallet(walletId).then((enabled: boolean) => {
				this.biometricEnabled = enabled;
			});
		});
	}

	toggleBiometric(){
		let walletId = WalletRepository.getCurrentWalletId();
		if (walletId === null)
			return;

		if (this.biometricEnabled) {
			Biometric.disableForWallet(walletId).then(() => {
				this.biometricEnabled = false;
			});
			return;
		}

		swal({
			title: i18n.t('settingsPage.biometric.enableModal.title'),
			input: 'password',
			showCancelButton: true,
			confirmButtonText: i18n.t('settingsPage.biometric.enableModal.confirmText'),
			cancelButtonText: i18n.t('global.openWalletModal.cancelText'),
			text: i18n.t('settingsPage.biometric.enableModal.content')
		}).then((result: any) => {
			if (!result.value)
				return;
			let password = result.value;
			WalletRepository.getLocalWalletWithPassword(password, walletId, false).then((openedWallet: Wallet|null) => {
				if (openedWallet === null) {
					swal({
						type: 'error',
						title: i18n.t('global.invalidPasswordModal.title'),
						text: i18n.t('global.invalidPasswordModal.content'),
						confirmButtonText: i18n.t('global.invalidPasswordModal.confirmText')
					});
					return;
				}
				Biometric.enableForWallet(walletId!, password, i18n.t('settingsPage.biometric.promptReason')).then((ok: boolean) => {
					this.biometricEnabled = ok;
					if (!ok)
						swal({
							type: 'error',
							title: i18n.t('settingsPage.biometric.failModal.title'),
							text: i18n.t('settingsPage.biometric.failModal.content'),
							confirmButtonText: i18n.t('global.invalidPasswordModal.confirmText')
						});
				});
			});
		});
	}

	@VueWatched()
	languageWatch() {
		Translations.setBrowserLang(this.language);
		Translations.loadLangTranslation(this.language);
	}

	@VueWatched()
	themeWatch() {
		Storage.setItem('user-theme', this.theme);
		document.documentElement.setAttribute('data-theme', this.theme);
		let metaThemeColor = document.querySelector('meta[name="theme-color"]');
		if (metaThemeColor) {
			metaThemeColor.setAttribute('content', this.theme === 'light' ? '#eef4ff' : '#111827');
		}
	}

	deleteWallet() {
		DeleteWallet.deleteWallet();
	}

	resetWallet() {
		swal({
			title: i18n.t('settingsPage.resetWalletModal.title'),
			html: i18n.t('settingsPage.resetWalletModal.content'),
			showCancelButton: true,
			confirmButtonText: i18n.t('settingsPage.resetWalletModal.confirmText'),
			cancelButtonText: i18n.t('settingsPage.resetWalletModal.cancelText'),
		}).then((result:any) => {
			if (result.value) {
				walletWatchdog.stop();
				wallet.clearTransactions();
				wallet.resetScanHeight();
				walletWatchdog.start();
				window.location.href = '#account';
			}
		});
	}

	@VueWatched()	readSpeedWatch(){this.updateWalletOptions();}
	@VueWatched()	checkMinerTxWatch(){this.updateWalletOptions();}
	@VueWatched()	customNodeWatch(){
		if (!this.initializing) this.applyConnectionSettings();
	}

	@VueWatched()	creationHeightWatch() {
		if(this.creationHeight < 0)this.creationHeight = 0;
		if(this.creationHeight > this.maxHeight && this.maxHeight !== -1)this.creationHeight = this.maxHeight;
	}
	@VueWatched()	scanHeightWatch() {
		if(this.scanHeight < 0)this.scanHeight = 0;
		if(this.scanHeight > this.maxHeight && this.maxHeight !== -1)this.scanHeight = this.maxHeight;
	}

	private updateWalletOptions() {
		let options = wallet.options;
		options.readSpeed = this.readSpeed;
		options.checkMinerTx = this.checkMinerTx;
		options.customNode = this.customNode;
		options.nodeUrl = this.nodeUrl;
		wallet.options = options;
		walletWatchdog.signalWalletUpdate();
	}

	updateWalletSettings() {
		wallet.creationHeight = this.creationHeight;
		wallet.lastHeight = this.scanHeight;
		walletWatchdog.signalWalletUpdate();
	}

	private applyConnectionSettings() {
		let options = wallet.options;
		options.customNode = this.customNode;
		options.nodeUrl = this.nodeUrl;
		wallet.options = options;
		if (this.customNode && this.nodeUrl !== '') {
			config.nodeUrl = this.nodeUrl;
		} else if (!this.customNode) {
			let randNodeInt = Math.floor(Math.random() * Math.floor(config.nodeList.length));
			config.nodeUrl = config.nodeList[randNodeInt];
		}
		walletWatchdog.signalWalletUpdate();
	}

	updateConnectionSettings() {
		this.applyConnectionSettings();
		swal({
			type: 'success',
			title: i18n.t('settingsPage.nodeUpdatedNotice'),
			html: config.nodeUrl,
			timer: 2000,
			showConfirmButton: false,
		});
	}
}


if(wallet !== null && blockchainExplorer !== null)
	new SettingsView('#app');
else
	window.location.href = '#index';
