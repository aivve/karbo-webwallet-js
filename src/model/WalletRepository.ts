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

import {RawFullyEncryptedWallet, RawWallet, Wallet} from "./Wallet";
import {CoinUri} from "./CoinUri";
import {Storage} from "./Storage";

// Vault format history:
//   v1 (RawWallet)              — password padded to 32 bytes, no KDF
//   v2 (RawFullyEncryptedWallet) — same key derivation, simpler payload shape
//   v3 (RawKdfEncryptedWallet)  — PBKDF2-HMAC-SHA512(password, salt). Portable.
//   v4 (same shape, usesDeviceKey=true) — PBKDF2 key XOR'd with a hardware-backed
//        device key held in Android Keystore via @aparajita/capacitor-secure-storage.
//        Vault becomes device-bound: a stolen file is useless without the device.
// Local saves on Capacitor emit v4 when the device key is available, v3 otherwise.
// Exported backups always emit v3 so they remain restorable on a different device.
// v1/v2 still openable; auto-upgrades on next save.
export type RawKdfEncryptedWallet = {
	version: 3 | 4,
	kdf: 'pbkdf2',
	kdfHash: 'SHA-512',
	kdfIterations: number,
	salt: string,
	data: number[],
	nonce: string,
	usesDeviceKey?: boolean
}

const PBKDF2_DEFAULT_ITERATIONS = 600000;
const PBKDF2_SALT_BYTES = 16;
const DEVICE_KEY_STORAGE_KEY = 'karbo.deviceKey.v1';

export type WalletVaultRecord = {
	id:string,
	name:string,
	address:string,
	encryptedWalletData?:string,
	createdAt:string,
	updatedAt:string,
	lastOpenedAt:string|null,
	backupConfirmed:boolean
}

export type WalletVault = {
	version:number,
	activeWalletId:string|null,
	wallets:WalletVaultRecord[]
}

export class WalletRepository{

	private static readonly VAULT_STORAGE_KEY = 'wallet-vault';
	private static readonly LEGACY_WALLET_STORAGE_KEY = 'wallet';
	private static readonly MIGRATION_NOTICE_KEY = 'wallet-vault-migration-notice';
	private static currentWalletId:string|null = null;

	static hasOneStored() : Promise<boolean>{
		return WalletRepository.getWallets().then(function (wallets : WalletVaultRecord[]) {
			return wallets.length > 0;
		});
	}

	static createWalletId(): string {
		let bytes: Uint8Array;
		if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
			bytes = new Uint8Array(16);
			crypto.getRandomValues(bytes);
		} else {
			bytes = nacl.randomBytes(16);
		}

		let hex = '';
		for (let i = 0; i < bytes.length; ++i) {
			let part = bytes[i].toString(16);
			if (part.length === 1)
				part = '0' + part;
			hex += part;
		}
		return 'wallet_' + hex;
	}

	static getCurrentWalletId(): string|null {
		return WalletRepository.currentWalletId;
	}

	static setCurrentWalletId(walletId: string|null) {
		WalletRepository.currentWalletId = walletId;
	}

	private static emptyVault(): WalletVault {
		return {
			version: 2,
			activeWalletId: null,
			wallets: []
		};
	}

	private static hasElectronStorage(): boolean {
		return typeof window !== 'undefined' && typeof window.karboStorage !== 'undefined';
	}

	private static normalizeWalletRecord(rawRecord: any): WalletVaultRecord|null {
		if (rawRecord === null || typeof rawRecord !== 'object' || typeof rawRecord.id !== 'string')
			return null;

		let now = new Date().toISOString();
		return {
			id: rawRecord.id,
			name: typeof rawRecord.name === 'string' && rawRecord.name.trim() !== '' ? rawRecord.name : 'Wallet',
			address: typeof rawRecord.address === 'string' ? rawRecord.address : '',
			encryptedWalletData: typeof rawRecord.encryptedWalletData === 'string' ? rawRecord.encryptedWalletData : undefined,
			createdAt: typeof rawRecord.createdAt === 'string' ? rawRecord.createdAt : now,
			updatedAt: typeof rawRecord.updatedAt === 'string' ? rawRecord.updatedAt : now,
			lastOpenedAt: typeof rawRecord.lastOpenedAt === 'string' ? rawRecord.lastOpenedAt : null,
			backupConfirmed: rawRecord.backupConfirmed === true
		};
	}

	private static normalizeVault(rawVault: any): WalletVault|null {
		if (rawVault === null || typeof rawVault === 'undefined')
			return null;

		if (typeof rawVault === 'string') {
			try {
				rawVault = JSON.parse(rawVault);
			} catch (e) {
				return null;
			}
		}

		if (typeof rawVault !== 'object' || !Array.isArray(rawVault.wallets))
			return null;

		let vault = WalletRepository.emptyVault();
		vault.activeWalletId = typeof rawVault.activeWalletId === 'string' ? rawVault.activeWalletId : null;
		for (let rawRecord of rawVault.wallets) {
			let record = WalletRepository.normalizeWalletRecord(rawRecord);
			if (record !== null)
				vault.wallets.push(record);
		}

		if (vault.activeWalletId !== null && WalletRepository.findRecord(vault, vault.activeWalletId) === null)
			vault.activeWalletId = vault.wallets.length > 0 ? vault.wallets[0].id : null;

		return vault;
	}

	private static loadVault(): Promise<WalletVault|null> {
		if (WalletRepository.hasElectronStorage() && window.karboStorage) {
			return window.karboStorage.listWallets().then(function (rawVault: any) {
				return WalletRepository.normalizeVault(rawVault);
			});
		}

		return Storage.getItem(WalletRepository.VAULT_STORAGE_KEY, null).then(function (rawVault: any) {
			return WalletRepository.normalizeVault(rawVault);
		});
	}

	private static writeVault(vault: WalletVault): Promise<void> {
		if (WalletRepository.hasElectronStorage() && window.karboStorage) {
			return window.karboStorage.saveVault(vault);
		}

		return Storage.setItem(WalletRepository.VAULT_STORAGE_KEY, JSON.stringify(vault));
	}

	static ensureVault(): Promise<WalletVault> {
		return WalletRepository.loadVault().then(function (existingVault: WalletVault|null) {
			if (existingVault !== null)
				return existingVault;

			return Storage.getItem(WalletRepository.LEGACY_WALLET_STORAGE_KEY, null).then(function (legacyWallet: any) {
				if (legacyWallet !== null) {
					let now = new Date().toISOString();
					let walletId = WalletRepository.createWalletId();
					let migratedVault: WalletVault = {
						version: 2,
						activeWalletId: walletId,
						wallets: [{
							id: walletId,
							name: 'Wallet 1',
							address: '',
							encryptedWalletData: legacyWallet,
							createdAt: now,
							updatedAt: now,
							lastOpenedAt: null,
							backupConfirmed: true
						}]
					};

					return WalletRepository.writeVault(migratedVault).then(function () {
						return Storage.setItem(
							WalletRepository.MIGRATION_NOTICE_KEY,
							'walletVault.migrationNoticeContent'
						).then(function () {
							return migratedVault;
						});
					});
				}

				let emptyVault = WalletRepository.emptyVault();
				return WalletRepository.writeVault(emptyVault).then(function () {
					return emptyVault;
				});
			});
		});
	}

	static consumeMigrationNotice(): Promise<string|null> {
		return Storage.getItem(WalletRepository.MIGRATION_NOTICE_KEY, null).then(function (message: string|null) {
			if (message === null)
				return null;
			return Storage.remove(WalletRepository.MIGRATION_NOTICE_KEY).then(function () {
				return message;
			});
		});
	}

	static getWallets(): Promise<WalletVaultRecord[]> {
		return WalletRepository.ensureVault().then(function (vault: WalletVault) {
			return vault.wallets.slice();
		});
	}

	static getActiveWalletId(): Promise<string|null> {
		return WalletRepository.ensureVault().then(function (vault: WalletVault) {
			return vault.activeWalletId;
		});
	}

	static setActiveWalletId(walletId: string|null): Promise<void> {
		return WalletRepository.ensureVault().then(function (vault: WalletVault) {
			if (walletId !== null && WalletRepository.findRecord(vault, walletId) === null)
				throw 'missing_wallet';
			vault.activeWalletId = walletId;
			WalletRepository.currentWalletId = walletId;

			if (WalletRepository.hasElectronStorage() && window.karboStorage)
				return window.karboStorage.setActiveWalletId(walletId);
			return WalletRepository.writeVault(vault);
		});
	}

	private static findRecord(vault: WalletVault, walletId: string): WalletVaultRecord|null {
		for (let wallet of vault.wallets) {
			if (wallet.id === walletId)
				return wallet;
		}
		return null;
	}

	private static getNextWalletName(vault: WalletVault): string {
		return 'Wallet ' + (vault.wallets.length + 1);
	}

	private static resolveWalletId(vault: WalletVault, walletId?: string|null): string|null {
		if (typeof walletId === 'string' && WalletRepository.findRecord(vault, walletId) !== null)
			return walletId;
		if (WalletRepository.currentWalletId !== null && WalletRepository.findRecord(vault, WalletRepository.currentWalletId) !== null)
			return WalletRepository.currentWalletId;
		if (vault.activeWalletId !== null && WalletRepository.findRecord(vault, vault.activeWalletId) !== null)
			return vault.activeWalletId;
		if (vault.wallets.length > 0)
			return vault.wallets[0].id;
		return null;
	}

	private static getEncryptedWalletData(record: WalletVaultRecord): Promise<string|null> {
		if (typeof record.encryptedWalletData === 'string')
			return Promise.resolve(record.encryptedWalletData);
		if (WalletRepository.hasElectronStorage() && window.karboStorage)
			return window.karboStorage.loadWallet(record.id);
		return Promise.resolve(null);
	}
	
	private static isKdfWallet(rawWallet : any) : boolean {
		return rawWallet !== null
			&& typeof rawWallet === 'object'
			&& (rawWallet.version === 3 || rawWallet.version === 4)
			&& rawWallet.kdf === 'pbkdf2'
			&& typeof rawWallet.salt === 'string'
			&& typeof rawWallet.kdfIterations === 'number';
	}

	// Returns the SecureStorage plugin handle if present, or null on web/desktop.
	// We deliberately don't import the plugin — the AMD/ES5 build has no bundler.
	// The plugin auto-registers on window.Capacitor.Plugins.SecureStorage when
	// installed and `npx cap sync android` has run.
	private static getSecureStorage() : any {
		let capacitor : any = (window as any).Capacitor;
		if (!capacitor || !capacitor.Plugins || !capacitor.Plugins.SecureStorage)
			return null;
		return capacitor.Plugins.SecureStorage;
	}

	// Returns the per-install device key, or null on platforms without secure storage.
	// Never throws — caller falls back to v3 (PBKDF2 only) if this returns null.
	private static getDeviceKey() : Promise<Uint8Array|null> {
		let secureStorage = WalletRepository.getSecureStorage();
		if (secureStorage === null)
			return Promise.resolve(null);

		return Promise.resolve(secureStorage.get({ key: DEVICE_KEY_STORAGE_KEY })).then(function (result : any) {
			if (result && typeof result.value === 'string' && result.value !== '')
				return nacl.util.decodeBase64(result.value);
			return null;
		}).catch(function () {
			return null;
		});
	}

	private static getOrCreateDeviceKey() : Promise<Uint8Array|null> {
		let secureStorage = WalletRepository.getSecureStorage();
		if (secureStorage === null)
			return Promise.resolve(null);

		return WalletRepository.getDeviceKey().then(function (existing : Uint8Array|null) {
			if (existing !== null)
				return existing;
			let fresh = nacl.randomBytes(32);
			let encoded = nacl.util.encodeBase64(fresh);
			return Promise.resolve(secureStorage.set({ key: DEVICE_KEY_STORAGE_KEY, value: encoded })).then(function () {
				return fresh;
			}).catch(function () {
				return null;
			});
		});
	}

	private static xorBytes(a : Uint8Array, b : Uint8Array) : Uint8Array {
		let out = new Uint8Array(a.length);
		for (let i = 0; i < a.length; ++i)
			out[i] = a[i] ^ b[i];
		return out;
	}

	private static derivePbkdf2Key(password : string, saltBytes : Uint8Array, iterations : number) : Promise<Uint8Array> {
		let subtle : any = typeof crypto !== 'undefined' && (<any>crypto).subtle ? (<any>crypto).subtle : null;
		if (subtle === null)
			return Promise.reject('webcrypto_unavailable');

		let passwordBytes = new (<any>TextEncoder)("utf8").encode(password);
		return subtle.importKey(
			'raw',
			passwordBytes,
			{ name: 'PBKDF2' },
			false,
			['deriveBits']
		).then(function (keyMaterial : any) {
			return subtle.deriveBits(
				{ name: 'PBKDF2', salt: saltBytes, iterations: iterations, hash: 'SHA-512' },
				keyMaterial,
				256
			);
		}).then(function (derived : ArrayBuffer) {
			return new Uint8Array(derived);
		});
	}

	private static decodeLegacyWithPassword(rawWallet : RawWallet|RawFullyEncryptedWallet, password : string) : Wallet|null{
		if(password.length > 32)
			password = password.substr(0 , 32);
		if(password.length < 32){
			password = ('00000000000000000000000000000000'+password).slice(-32);
		}
		let privKey = new (<any>TextEncoder)("utf8").encode(password);
		// Fix cyrillic (non-latin) passwords
		if(privKey.length > 32){
		   privKey = privKey.slice(-32);
		}

		let nonce = new (<any>TextEncoder)("utf8").encode(rawWallet.nonce);

		let decodedRawWallet = null;

		if(typeof (<any>rawWallet).data !== 'undefined'){//RawFullyEncryptedWallet
			let rawFullyEncrypted : RawFullyEncryptedWallet = <any>rawWallet;
			let encrypted = new Uint8Array(<any>rawFullyEncrypted.data);
			let decrypted = nacl.secretbox.open(encrypted, nonce, privKey);
			if(decrypted === null)
				return null;

			try {
				decodedRawWallet = JSON.parse(new TextDecoder("utf8").decode(decrypted));
			}catch (e) {
				decodedRawWallet = null;
			}
		}else{//RawWallet
			let oldRawWallet : RawWallet = <any>rawWallet;
			let encrypted = new Uint8Array(<any>oldRawWallet.encryptedKeys);
			let decrypted = nacl.secretbox.open(encrypted, nonce, privKey);
			if(decrypted === null)
				return null;

			oldRawWallet.encryptedKeys = new TextDecoder("utf8").decode(decrypted);
			decodedRawWallet = oldRawWallet;
		}

		if(decodedRawWallet !== null){
			let wallet = Wallet.loadFromRaw(decodedRawWallet);
			if(wallet.coinAddressPrefix !== config.addressPrefix)
				return null;
			return wallet;
		}
		return null;
	}

	static decodeWithPassword(rawWallet : RawWallet|RawFullyEncryptedWallet|RawKdfEncryptedWallet, password : string) : Promise<Wallet|null>{
		if (!WalletRepository.isKdfWallet(rawWallet))
			return Promise.resolve(WalletRepository.decodeLegacyWithPassword(<any>rawWallet, password));

		let kdfWallet : RawKdfEncryptedWallet = <any>rawWallet;
		let saltBytes = nacl.util.decodeBase64(kdfWallet.salt);
		let needsDeviceKey = kdfWallet.version === 4 && kdfWallet.usesDeviceKey === true;

		let deviceKeyPromise : Promise<Uint8Array|null> = needsDeviceKey
			? WalletRepository.getDeviceKey()
			: Promise.resolve(null);

		return Promise.all([
			WalletRepository.derivePbkdf2Key(password, saltBytes, kdfWallet.kdfIterations),
			deviceKeyPromise
		]).then(function (parts : [Uint8Array, Uint8Array|null]) {
			let pbkdfKey = parts[0];
			let deviceKey = parts[1];

			if (needsDeviceKey && deviceKey === null)
				return null; // v4 vault but device key gone (reinstall, secure-storage cleared) — unrecoverable from local file alone; user must restore from mnemonic
			let privKey = needsDeviceKey && deviceKey !== null
				? WalletRepository.xorBytes(pbkdfKey, deviceKey)
				: pbkdfKey;

			let nonce = new (<any>TextEncoder)("utf8").encode(kdfWallet.nonce);
			let encrypted = new Uint8Array(kdfWallet.data);
			let decrypted = nacl.secretbox.open(encrypted, nonce, privKey);
			if (decrypted === null)
				return null;
			let decodedRawWallet : any = null;
			try {
				decodedRawWallet = JSON.parse(new TextDecoder("utf8").decode(decrypted));
			} catch (e) {
				return null;
			}
			let wallet = Wallet.loadFromRaw(decodedRawWallet);
			if (wallet.coinAddressPrefix !== config.addressPrefix)
				return null;
			return wallet;
		});
	}

	static getLocalWalletWithPassword(password : string, walletId? : string|null, markOpened: boolean = true) : Promise<Wallet|null>{
		return WalletRepository.ensureVault().then((vault: WalletVault) => {
			let resolvedWalletId = WalletRepository.resolveWalletId(vault, walletId);
			if (resolvedWalletId === null)
				return null;

			let record = WalletRepository.findRecord(vault, resolvedWalletId);
			if (record === null)
				return null;

			return WalletRepository.getEncryptedWalletData(record).then((encryptedWalletData: string|null) => {
				if (encryptedWalletData === null)
					return null;

				return this.decodeWithPassword(JSON.parse(encryptedWalletData), password).then((wallet: Wallet|null) => {
					if (wallet === null)
						return null;
					if (!markOpened)
						return wallet;
					let now = new Date().toISOString();
					record.address = wallet.getPublicAddress();
					record.lastOpenedAt = now;
					record.updatedAt = now;
					vault.activeWalletId = resolvedWalletId;
					WalletRepository.currentWalletId = resolvedWalletId;
					return WalletRepository.writeVault(vault).then(function () {
						return wallet;
					});
				});
			});
		});
	}
	
	static save(wallet : Wallet, password : string, walletId? : string|null, walletName? : string|null, backupConfirmed: boolean = true, makeActive: boolean = true) : Promise<void>{
		return WalletRepository.ensureVault().then((vault: WalletVault) => {
			let resolvedWalletId = WalletRepository.resolveWalletId(vault, walletId);
			if (resolvedWalletId === null || (typeof walletId === 'string' && WalletRepository.findRecord(vault, walletId) === null))
				resolvedWalletId = typeof walletId === 'string' ? walletId : WalletRepository.createWalletId();

			let existingRecord = WalletRepository.findRecord(vault, resolvedWalletId);
			let now = new Date().toISOString();
			let address = wallet.getPublicAddress();

			return this.getEncryptedForLocalStorage(wallet, password).then((encryptedWallet: RawKdfEncryptedWallet) => {
				let encryptedWalletData = JSON.stringify(encryptedWallet);

				if (existingRecord === null) {
					existingRecord = {
						id: resolvedWalletId!,
						name: walletName !== null && typeof walletName === 'string' && walletName.trim() !== '' ? walletName.trim() : WalletRepository.getNextWalletName(vault),
						address: address,
						encryptedWalletData: encryptedWalletData,
						createdAt: now,
						updatedAt: now,
						lastOpenedAt: now,
						backupConfirmed: backupConfirmed
					};
					vault.wallets.push(existingRecord);
				} else {
					existingRecord.address = address;
					existingRecord.encryptedWalletData = encryptedWalletData;
					existingRecord.updatedAt = now;
					existingRecord.backupConfirmed = existingRecord.backupConfirmed || backupConfirmed;
					if (typeof walletName === 'string' && walletName.trim() !== '')
						existingRecord.name = walletName.trim();
				}

				if (makeActive && (WalletRepository.currentWalletId === null || WalletRepository.currentWalletId === resolvedWalletId)) {
					vault.activeWalletId = resolvedWalletId;
					WalletRepository.currentWalletId = resolvedWalletId;
				}
				return WalletRepository.writeVault(vault);
			});
		});
	}

	private static buildEncryptedWallet(wallet : Wallet, password : string, deviceKey : Uint8Array|null) : Promise<RawKdfEncryptedWallet> {
		let saltBytes = nacl.randomBytes(PBKDF2_SALT_BYTES);
		let rawSalt = nacl.util.encodeBase64(saltBytes);
		let iterations = PBKDF2_DEFAULT_ITERATIONS;

		return WalletRepository.derivePbkdf2Key(password, saltBytes, iterations).then(function (pbkdfKey : Uint8Array) {
			let privKey = deviceKey !== null ? WalletRepository.xorBytes(pbkdfKey, deviceKey) : pbkdfKey;

			let rawNonce = nacl.util.encodeBase64(nacl.randomBytes(16));
			let nonce = new (<any>TextEncoder)("utf8").encode(rawNonce);

			let rawWallet = wallet.exportToRaw();
			let uint8EncryptedContent = new (<any>TextEncoder)("utf8").encode(JSON.stringify(rawWallet));

			let encrypted : Uint8Array = nacl.secretbox(uint8EncryptedContent, nonce, privKey);
			let tabEncrypted : number[] = [];
			for(let i = 0; i < encrypted.length; ++i){
				tabEncrypted.push(encrypted[i]);
			}

			let result : RawKdfEncryptedWallet = {
				version: deviceKey !== null ? 4 : 3,
				kdf: 'pbkdf2',
				kdfHash: 'SHA-512',
				kdfIterations: iterations,
				salt: rawSalt,
				data: tabEncrypted,
				nonce: rawNonce
			};
			if (deviceKey !== null)
				result.usesDeviceKey = true;
			return result;
		});
	}

	// Portable backup — never uses the device key, restorable on any device.
	static getEncryptedForExport(wallet : Wallet, password : string) : Promise<RawKdfEncryptedWallet> {
		return WalletRepository.buildEncryptedWallet(wallet, password, null);
	}

	// Local-storage form — uses device key when available so a stolen vault file
	// can't be brute-forced off-device. Falls back to v3 (portable) on web/desktop
	// and when secure storage is unavailable.
	static getEncryptedForLocalStorage(wallet : Wallet, password : string) : Promise<RawKdfEncryptedWallet> {
		return WalletRepository.getOrCreateDeviceKey().then(function (deviceKey : Uint8Array|null) {
			return WalletRepository.buildEncryptedWallet(wallet, password, deviceKey);
		});
	}

	// Back-compat alias; prefer getEncryptedForExport for new code.
	static getEncrypted(wallet : Wallet, password : string) : Promise<RawKdfEncryptedWallet> {
		return WalletRepository.getEncryptedForExport(wallet, password);
	}

	static renameWallet(walletId: string, name: string): Promise<void> {
		let cleanName = name.trim();
		if (cleanName === '')
			cleanName = 'Wallet';

		return WalletRepository.ensureVault().then(function (vault: WalletVault) {
			let record = WalletRepository.findRecord(vault, walletId);
			if (record === null)
				throw 'missing_wallet';
			record.name = cleanName;
			record.updatedAt = new Date().toISOString();

			if (WalletRepository.hasElectronStorage() && window.karboStorage)
				return window.karboStorage.renameWallet(walletId, cleanName);
			return WalletRepository.writeVault(vault);
		});
	}

	static getEncryptedWalletBackup(walletId: string): Promise<string|null> {
		return WalletRepository.ensureVault().then(function (vault: WalletVault) {
			let record = WalletRepository.findRecord(vault, walletId);
			if (record === null)
				return null;
			return WalletRepository.getEncryptedWalletData(record);
		});
	}

	static deleteLocalCopy(walletId? : string|null) : Promise<void>{
		return WalletRepository.ensureVault().then(function (vault: WalletVault) {
			let resolvedWalletId = WalletRepository.resolveWalletId(vault, walletId);
			if (resolvedWalletId === null)
				return Promise.resolve();

			let filteredWallets: WalletVaultRecord[] = [];
			for (let record of vault.wallets) {
				if (record.id !== resolvedWalletId)
					filteredWallets.push(record);
			}
			vault.wallets = filteredWallets;

			if (vault.activeWalletId === resolvedWalletId)
				vault.activeWalletId = vault.wallets.length > 0 ? vault.wallets[0].id : null;
			if (WalletRepository.currentWalletId === resolvedWalletId)
				WalletRepository.currentWalletId = null;

			if (WalletRepository.hasElectronStorage() && window.karboStorage)
				return window.karboStorage.deleteWallet(resolvedWalletId);
			return WalletRepository.writeVault(vault);
		});
	}


	static downloadEncryptedPdf(wallet : Wallet){
		if(wallet.keys.priv.spend === '')
			throw 'missing_spend';

		let coinWalletUri = CoinUri.encodeWalletKeys(
			wallet.getPublicAddress(),
			wallet.keys.priv.spend,
			wallet.keys.priv.view,
			wallet.creationHeight
		);

		let publicQrCode = kjua({
			render: 'canvas',
			text: wallet.getPublicAddress(),
			size:300,
		});

		let privateSpendQrCode = kjua({
			render: 'canvas',
			text: coinWalletUri,
			size:300,
		});

		let doc = new jsPDF('landscape');

		//creating background
		doc.setFillColor(48,70,108);
		doc.rect(0,0,297,210, 'F');

		//white blocks
		doc.setFillColor(255,255,255);
		doc.rect(108,10,80,80, 'F');
		doc.rect(10,115,80,80, 'F');

		//blue blocks
		doc.setFillColor(0, 160, 227);
		doc.rect(108,115,80,80, 'F');

		//blue background for texts
		doc.setFillColor(0, 160, 227);

		doc.rect(108,15,80,20, 'F');
		doc.rect(10,120,80,20, 'F');

		doc.setTextColor(255, 255, 255);
		doc.setFontSize(30);
		doc.text(15, 135, "Public address");
		doc.text(123,30, "Private key");

		//lines
		doc.setDrawColor(255,255,255);
		doc.setLineWidth(1);
		doc.line(99,0,99,210);
		doc.line(198,0,198,210);
		doc.line(0,105,297,105);

		//adding qr codes
		doc.addImage(publicQrCode.toDataURL(), 'JPEG', 28, 145, 45, 45);
		doc.addImage(privateSpendQrCode.toDataURL(), 'JPEG', 126, 40, 45, 45);

		//wallet help
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(10);
		doc.text(110, 120, "To deposit funds to this paper wallet, send ");
		doc.text(110, 125, "Karbo to the public address");

		doc.text(110, 135, "DO NOT REVEAL THE PRIVATE KEY");

		//adding karbo logo
		let c : HTMLCanvasElement|null = <HTMLCanvasElement>document.getElementById('canvasExport');
		if(c !== null) {
			let ctx = c.getContext("2d");
			let img: ImageBitmap | null = <ImageBitmap | null>document.getElementById("verticalLogo");
			if (ctx !== null && img !== null) {
				c.width = img.width;
				c.height = img.height;
				ctx.drawImage(img, 0, 0);

				let ratio = img.width/45;
				let smallHeight = img.height/ratio;
				doc.addImage(c.toDataURL(), 'JPEG', 224, 106+(100-smallHeight)/2, 45, smallHeight);
			}
		}

		try {
			doc.save('keys.pdf');
		} catch(e) {
			alert('Error ' + e);
		}

	}



}
