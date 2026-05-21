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

import {WalletRepository, WalletVaultRecord} from "../model/WalletRepository";
import {DependencyInjectorInstance} from "../lib/numbersLab/DependencyInjector";
import {VueVar} from "../lib/numbersLab/VueAnnotate";
import {DestructableView} from "../lib/numbersLab/DestructableView";
import {Wallet} from "../model/Wallet";
import {AppState} from "../model/AppState";
import {Storage, StorageProtectionStatus} from "../model/Storage";
import {exportTextFile} from "../utils/FileExport";

class IndexView extends DestructableView{
	@VueVar(false) hasLocalWallet !: boolean;
	@VueVar(false) isWalletLoaded !: boolean;
	@VueVar([]) wallets !: WalletVaultRecord[];
	@VueVar('') activeWalletId !: string;
	@VueVar('walletVault.storageStatus.notAvailable') storageProtectionKey !: string;
	@VueVar('not_available') storageProtectionStatus !: string;

	constructor(container : string){
		super(container);
		this.isWalletLoaded = DependencyInjectorInstance().getInstance(Wallet.name,'default', false) !== null;
		this.refreshWallets();
		this.refreshStorageProtection();
		WalletRepository.consumeMigrationNotice().then((message: string|null) => {
			if (message !== null) {
				swal({
					type: 'info',
					title: i18n.t('walletVault.migrationNoticeTitle'),
					text: this.translateMigrationNotice(message),
					confirmButtonText: i18n.t('global.invalidPasswordModal.confirmText')
				});
			}
		});
		if (this.isWalletLoaded)
			AppState.enableLeftMenu();
		else
			AppState.disableLeftMenu();
	}

	destruct(): Promise<void> {
		return super.destruct();
	}

	refreshWallets(){
		WalletRepository.getWallets().then((wallets: WalletVaultRecord[]) => {
			this.wallets = wallets;
			this.hasLocalWallet = wallets.length > 0;
			let currentWalletId = WalletRepository.getCurrentWalletId();
			this.activeWalletId = currentWalletId === null ? '' : currentWalletId;
		});
	}

	refreshStorageProtection(){
		Storage.requestPersistentStorage().then((status: StorageProtectionStatus) => {
			this.storageProtectionStatus = status;
			if (status === 'enabled')
				this.storageProtectionKey = 'walletVault.storageStatus.enabled';
			else if (status === 'not_available')
				this.storageProtectionKey = 'walletVault.storageStatus.notAvailable';
			else
				this.storageProtectionKey = 'walletVault.storageStatus.notGranted';
		});
	}

	loadWallet(walletId: string){
		AppState.askUserOpenWallet(true, walletId);
	}

	renameWallet(wallet: WalletVaultRecord){
		let options: any = {
			title: i18n.t('walletVault.renameModal.title'),
			input: 'text',
			inputValue: wallet.name,
			showCancelButton: true,
			confirmButtonText: i18n.t('walletVault.renameModal.confirmText'),
			cancelButtonText: i18n.t('global.openWalletModal.cancelText')
		};
		swal(options).then((result: any) => {
			if (result.value) {
				WalletRepository.renameWallet(wallet.id, result.value).then(() => {
					this.refreshWallets();
				});
			}
		});
	}

	exportWallet(wallet: WalletVaultRecord){
		swal({
			title: i18n.t('global.openWalletModal.title'),
			input: 'password',
			showCancelButton: true,
			confirmButtonText: i18n.t('walletVault.actions.exportBackup'),
			cancelButtonText: i18n.t('global.openWalletModal.cancelText')
		}).then((result: any) => {
			if (!result.value)
				return;

			let password = result.value;
			WalletRepository.getLocalWalletWithPassword(password, wallet.id, false).then((openedWallet: Wallet|null) => {
				if (openedWallet === null) {
					swal({
						type: 'error',
						title: i18n.t('global.invalidPasswordModal.title'),
						text: i18n.t('global.invalidPasswordModal.content'),
						confirmButtonText: i18n.t('global.invalidPasswordModal.confirmText')
					});
					return;
				}

				// Re-encrypt as v3 (no device key) so the backup is portable across
				// devices. The stored blob is device-bound v4 when on Capacitor —
				// dumping it directly would produce an unrestorable backup.
				WalletRepository.getEncryptedForExport(openedWallet, password).then((encrypted) => {
					exportTextFile(JSON.stringify(encrypted), this.walletBackupFileName(wallet));
				});
			});
		});
	}

	removeWallet(wallet: WalletVaultRecord){
		swal({
			title: i18n.t('walletVault.actions.remove'),
			html: i18n.t('walletVault.removeModal.content'),
			showCancelButton: true,
			confirmButtonText: i18n.t('walletVault.actions.remove'),
			cancelButtonText: i18n.t('global.openWalletModal.cancelText'),
			type: 'warning'
		}).then((result:any) => {
			if (result.value) {
				if (WalletRepository.getCurrentWalletId() === wallet.id)
					AppState.disconnect();
				WalletRepository.deleteLocalCopy(wallet.id).then(() => {
					this.refreshWallets();
				});
			}
		});
	}

	formatWalletDate(value: string|null): string{
		if (value === null || value === '')
			return i18n.t('walletVault.neverOpened');
		return new Date(value).toLocaleString();
	}

	private translateMigrationNotice(message: string): string {
		if (message.indexOf('walletVault.') === 0)
			return i18n.t(message);
		return message;
	}

	private walletBackupFileName(wallet: WalletVaultRecord): string {
		let name = wallet.name.replace(/[^a-z0-9_\-]+/gi, '_').replace(/^_+|_+$/g, '');
		if (name === '')
			name = 'wallet';
		return name + '.karbowallet';
	}

}

let newIndexView = new IndexView('#app');


/*
function readFile(fileEnty:any){
	//console.log(fileEnty);
}

function writeFile(fileEntry, dataObj) {
	// Create a FileWriter object for our FileEntry (log.txt).
	fileEntry.createWriter(function (fileWriter) {

		fileWriter.onwriteend = function() {
			//console.log("Successful file write...");
			readFile(fileEntry);
		};

		fileWriter.onerror = function (e) {
			//console.log("Failed file write: " + e.toString());
		};

		// If data object is not passed in,
		// create a new Blob instead.
		if (!dataObj) {
			dataObj = new Blob(['some file data'], { type: 'text/plain' });
		}

		fileWriter.write(dataObj);
	});
}

function onErrorCreateFile(error){
	alert('onErrorCreateFile:'+JSON.stringify(error));
}
function onErrorLoadFs(error){
	alert('onErrorLoadFs:'+JSON.stringify(error));
}


window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs : any) {

	//console.log('file system open: ' + fs.name);
	fs.root.getFile(cordova.file.documentsDirectory+"newPersistentFile.txt", { create: true, exclusive: false }, function (fileEntry : any) {

		//console.log("fileEntry is file?" + fileEntry.isFile.toString());
		// fileEntry.name == 'someFile.txt'
		// fileEntry.fullPath == '/someFile.txt'
		writeFile(fileEntry, null);

	}, onErrorCreateFile);

}, onErrorLoadFs);

*/
