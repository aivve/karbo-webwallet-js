/*
 * Biometric unlock helper.
 *
 * Wraps @aparajita/capacitor-biometric-auth (the prompt) plus
 * @aparajita/capacitor-secure-storage (Keystore-backed credential storage).
 *
 * SECURITY NOTE: This is UI-gated, not crypto-gated. The stored wallet password
 * sits in EncryptedSharedPreferences (AES-GCM keyed from the AndroidKeyStore),
 * so a stolen vault file alone can't reveal it. But on an unlocked, rooted device
 * an attacker could read the secure-storage entry without triggering the
 * biometric prompt — the prompt is a UX gate, not a cryptographic one.
 *
 * Upgrading to crypto-gated biometrics (BiometricPrompt + CryptoObject + a
 * Keystore key with setUserAuthenticationRequired(true)) requires a custom
 * native plugin and is tracked as future work.
 */

const BIOMETRIC_PASSWORD_KEY_PREFIX = 'karbo.biometric.password.';

function getCapacitorPlugin(name: string): any {
	let capacitor: any = (window as any).Capacitor;
	if (!capacitor || !capacitor.Plugins || !capacitor.Plugins[name])
		return null;
	return capacitor.Plugins[name];
}

export class Biometric {

	static isSupported(): Promise<boolean> {
		let auth = getCapacitorPlugin('BiometricAuth');
		let storage = getCapacitorPlugin('SecureStorage');
		if (auth === null || storage === null)
			return Promise.resolve(false);

		return Promise.resolve(auth.checkBiometry()).then(function (result: any) {
			return !!(result && result.isAvailable);
		}).catch(function () {
			return false;
		});
	}

	static isEnabledForWallet(walletId: string): Promise<boolean> {
		let storage = getCapacitorPlugin('SecureStorage');
		if (storage === null)
			return Promise.resolve(false);
		return Promise.resolve(storage.get({ key: BIOMETRIC_PASSWORD_KEY_PREFIX + walletId }))
			.then(function (result: any) {
				return !!(result && typeof result.value === 'string' && result.value !== '');
			}).catch(function () {
				return false;
			});
	}

	// Prompts biometric; on success returns the stored password, else null.
	static unlockPassword(walletId: string, reason: string): Promise<string|null> {
		let auth = getCapacitorPlugin('BiometricAuth');
		let storage = getCapacitorPlugin('SecureStorage');
		if (auth === null || storage === null)
			return Promise.resolve(null);

		return Promise.resolve(auth.authenticate({ reason: reason }))
			.then(function () {
				return storage.get({ key: BIOMETRIC_PASSWORD_KEY_PREFIX + walletId });
			}).then(function (result: any) {
				if (result && typeof result.value === 'string' && result.value !== '')
					return result.value;
				return null;
			}).catch(function () {
				return null;
			});
	}

	// Prompts biometric; on success stores the password for future unlocks.
	static enableForWallet(walletId: string, password: string, reason: string): Promise<boolean> {
		let auth = getCapacitorPlugin('BiometricAuth');
		let storage = getCapacitorPlugin('SecureStorage');
		if (auth === null || storage === null)
			return Promise.resolve(false);

		return Promise.resolve(auth.authenticate({ reason: reason }))
			.then(function () {
				return storage.set({ key: BIOMETRIC_PASSWORD_KEY_PREFIX + walletId, value: password });
			}).then(function () {
				return true;
			}).catch(function () {
				return false;
			});
	}

	static disableForWallet(walletId: string): Promise<void> {
		let storage = getCapacitorPlugin('SecureStorage');
		if (storage === null)
			return Promise.resolve();
		return Promise.resolve(storage.remove({ key: BIOMETRIC_PASSWORD_KEY_PREFIX + walletId }))
			.then(function () {}, function () {});
	}
}
