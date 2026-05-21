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

import {Router} from "./lib/numbersLab/Router";
import {DependencyInjectorInstance} from "./lib/numbersLab/DependencyInjector";
import {Mnemonic} from "./model/Mnemonic";
import {DestructableView} from "./lib/numbersLab/DestructableView";
import {VueClass, VueVar, VueWatched} from "./lib/numbersLab/VueAnnotate";
import {Wallet} from "./model/Wallet";
import {Storage} from "./model/Storage";
import {Translations} from "./model/Translations";
import {Transaction} from "./model/Transaction";
import {WalletWatchdog} from "./model/WalletWatchdog";
import {CoinUri} from "./model/CoinUri";

//========================================================
//bridge for cnUtil with the new mnemonic class
//========================================================
(<any>window).mn_random = Mnemonic.mn_random;
(<any>window).mn_encode = Mnemonic.mn_encode;
(<any>window).mn_decode = Mnemonic.mn_decode;

//========================================================
//====================Translation code====================
//========================================================
const i18n = new VueI18n({
	locale: 'en',
	fallbackLocale: 'en',
});
(<any>window).i18n = i18n;

let browserUserLang = ''+(navigator.language || (<any>navigator).userLanguage);
browserUserLang = browserUserLang.toLowerCase().split('-')[0];

Storage.getItem('user-lang', browserUserLang).then(function(userLang : string){
	Translations.loadLangTranslation(userLang).catch(function () {
		Translations.loadLangTranslation('en');
	});
});

//========================================================
//====================Theme loading=======================
//========================================================
Storage.getItem('user-theme', 'dark').then(function(userTheme : string){
	document.documentElement.setAttribute('data-theme', userTheme);
	let metaThemeColor = document.querySelector('meta[name="theme-color"]');
	if (metaThemeColor) {
		metaThemeColor.setAttribute('content', userTheme === 'light' ? '#eef4ff' : '#111827');
	}
});

Storage.requestPersistentStorage();

//========================================================
//===========Bottom Navigation active state===============
//========================================================

function updateActiveNav() {
	let hash = window.location.hash;
	let page = 'index';
	if (hash.indexOf('#!') !== -1) {
		page = hash.substr(2);
	} else if (hash.indexOf('#') !== -1) {
		page = hash.substr(1);
	}
	// Remove query params
	if (page.indexOf('?') !== -1) {
		page = page.substr(0, page.indexOf('?'));
	}

	let navItems = document.querySelectorAll('#bottomNav .nav-item');
	for (let i = 0; i < navItems.length; i++) {
		let item = navItems[i] as HTMLElement;
		let itemPage = item.getAttribute('data-page') || '';
		if (itemPage === page) {
			item.classList.add('active');
		} else {
			item.classList.remove('active');
		}
	}
}

//========================================================
//=================Top Header Vue binding=================
//========================================================

@VueClass()
class TopHeaderView extends Vue{
	@VueVar('Disconnected') syncStatusText !: string;
	@VueVar('status-disconnected') syncStatusClass !: string;
	@VueVar('Disconnected') syncStatusTitle !: string;

	intervalRefresh : number = 0;

	constructor(containerName:any,vueData:any=null){
		super(vueData);

		this.refreshSyncStatus();
		this.intervalRefresh = <any>setInterval(() => {
			this.refreshSyncStatus();
		}, 1000);
	}

	private setSyncStatus(text:string, className:string, title:string){
		this.syncStatusText = text;
		this.syncStatusClass = className;
		this.syncStatusTitle = title;
	}

	private translateTopHeaderStatus(key:string, params:any = {}): string{
		return '' + i18n.t('topHeader.syncStatus.'+key, params);
	}

	refreshSyncStatus(){
		let wallet : Wallet = DependencyInjectorInstance().getInstance(Wallet.name, 'default', false);
		let walletWatchdog : WalletWatchdog = DependencyInjectorInstance().getInstance(WalletWatchdog.name, 'default', false);

		if(wallet === null || walletWatchdog === null || walletWatchdog.stopped){
			this.setSyncStatus(
				this.translateTopHeaderStatus('disconnected'),
				'status-disconnected',
				this.translateTopHeaderStatus('disconnectedTitle')
			);
			return;
		}

		let currentHeight = wallet.lastHeight;
		let maximumHeight = walletWatchdog.lastMaximumHeight;

		if(maximumHeight <= 0){
			this.setSyncStatus(
				this.translateTopHeaderStatus('connecting'),
				'status-syncing',
				this.translateTopHeaderStatus('connectingTitle')
			);
			return;
		}

		if(currentHeight > maximumHeight)
			currentHeight = maximumHeight;

		if(currentHeight + 2 < maximumHeight){
			let progress = Math.floor(((currentHeight + 1) / maximumHeight) * 1000) / 10;
			if(progress < 0) progress = 0;
			if(progress > 99.9) progress = 99.9;

			let displayHeight = currentHeight + 1;
			this.setSyncStatus(
				this.translateTopHeaderStatus('syncing', {progress: progress}),
				'status-syncing',
				this.translateTopHeaderStatus('syncingTitle', {current: displayHeight, total: maximumHeight})
			);
			return;
		}

		this.setSyncStatus(
			this.translateTopHeaderStatus('synced'),
			'status-synced',
			this.translateTopHeaderStatus('syncedTitle')
		);
	}
}
let topHeaderView = new TopHeaderView('#topHeader');

//========================================================
//=================Copyright / Language===================
//========================================================

@VueClass()
class CopyrightView extends Vue{

	@VueVar('en') language !: string;

	constructor(containerName:any,vueData:any=null){
		super(vueData);

		Translations.getLang().then((userLang : string) => {
			this.language = userLang;
		});
	}

	@VueWatched()
	languageWatch(){
		Translations.setBrowserLang(this.language);
		Translations.loadLangTranslation(this.language);
	}
}
let copyrightView = new CopyrightView('#copyright');

//========================================================
//=================Bottom Nav Vue binding=================
//========================================================

@VueClass()
class BottomNavView extends Vue{
	constructor(containerName:any,vueData:any=null){
		super(vueData);
	}
}
let bottomNavView = new BottomNavView('#bottomNav');

//========================================================
//==================Loading the right page================
//========================================================

let isCordovaApp = document.URL.indexOf('http://') === -1
	&& document.URL.indexOf('https://') === -1;

let isCapacitorApp = !!(window as any).Capacitor;
let isNativeApp = isCordovaApp || isCapacitorApp;

let promiseLoadingReady : Promise<void>;

window.native = false;
if(isNativeApp){
	window.native = true;
	$('body').addClass('native');

	if(isCordovaApp){
		let promiseLoadingReadyResolve : null|Function = null;
		let promiseLoadingReadyReject : null|Function = null;
		promiseLoadingReady = new Promise<void>(function(resolve, reject){
			promiseLoadingReadyResolve = resolve;
			promiseLoadingReadyReject = reject;
		});
		let cordovaJs = document.createElement('script');
		cordovaJs.type = 'text/javascript';
		cordovaJs.src = 'cordova.js';
		document.body.appendChild(cordovaJs);

		let timeoutCordovaLoad = setTimeout(function(){
			if(promiseLoadingReadyResolve)
				promiseLoadingReadyResolve();
		}, 10*1000);
		document.addEventListener('deviceready', function(){
			if(promiseLoadingReadyResolve)
				promiseLoadingReadyResolve();
			clearInterval(timeoutCordovaLoad);
		}, false);
	}else{
		promiseLoadingReady = Promise.resolve();
	}
}else
	promiseLoadingReady = Promise.resolve();

promiseLoadingReady.then(function(){
	let router = new Router('./','../../');
	window.onhashchange = function () {
		router.changePageFromHash();
		updateActiveNav();
	};
	updateActiveNav();

	if (isCapacitorApp) {
		registerKarboDeepLinkHandler();
	}
});

function buildSendHashFromKarboUri(url : string) : string|null {
	// Wallet-restore URIs share the karbowanec: prefix but should never auto-route
	// into the send flow — the user could end up sending to the address they
	// intended to import. Refuse to handle those here.
	if (/[?&](spend_key|view_key|mnemonic_seed)=/.test(url))
		return null;

	let parsed : any = null;
	try {
		parsed = CoinUri.decodeTx(url);
	} catch (e) {
		parsed = null;
	}
	if (parsed === null || !parsed.address)
		return null;

	let params : string[] = ['address=' + encodeURIComponent(parsed.address)];
	if (typeof parsed.amount === 'string' && parsed.amount !== '')
		params.push('amount=' + encodeURIComponent(parsed.amount));
	if (typeof parsed.paymentId === 'string' && parsed.paymentId !== '')
		params.push('paymentId=' + encodeURIComponent(parsed.paymentId));
	if (typeof parsed.recipientName === 'string' && parsed.recipientName !== '')
		params.push('destName=' + encodeURIComponent(parsed.recipientName));
	if (typeof parsed.description === 'string' && parsed.description !== '')
		params.push('txDesc=' + encodeURIComponent(parsed.description));

	return '#!send?' + params.join('&');
}

function navigateToKarboUri(url : string) {
	let hash = buildSendHashFromKarboUri(url);
	if (hash === null)
		return;
	if (window.location.hash === hash) {
		window.location.hash = '#!index';
		setTimeout(function(){ window.location.hash = hash; }, 0);
	} else {
		window.location.hash = hash;
	}
}

function registerKarboDeepLinkHandler() {
	let capacitor : any = (window as any).Capacitor;
	if (!capacitor || !capacitor.Plugins || !capacitor.Plugins.App)
		return;
	let appPlugin : any = capacitor.Plugins.App;

	if (typeof appPlugin.getLaunchUrl === 'function') {
		appPlugin.getLaunchUrl().then(function (result : any) {
			if (result && typeof result.url === 'string')
				navigateToKarboUri(result.url);
		}).catch(function () {});
	}

	if (typeof appPlugin.addListener === 'function') {
		appPlugin.addListener('appUrlOpen', function (event : any) {
			if (event && typeof event.url === 'string')
				navigateToKarboUri(event.url);
		});
	}
}

//========================================================
//==================Service worker for web================
//========================================================

if (!isNativeApp && 'serviceWorker' in navigator) {
	const showRefreshUI = function(registration : any){
		swal({
			type:'info',
			title:i18n.t('global.newVersionModal.title'),
			html:i18n.t('global.newVersionModal.content'),
			confirmButtonText:i18n.t('global.newVersionModal.confirmText'),
			showCancelButton: true,
			cancelButtonText:i18n.t('global.newVersionModal.cancelText'),
		}).then(function(value : any){
			if(!value.dismiss){
				registration.waiting.postMessage('force-activate');
			}
		});
	};

	const onNewServiceWorker = function(registration:any, callback : Function){
		if (registration.waiting) {
			return callback();
		}

		const listenInstalledStateChange = () => {
			registration.installing.addEventListener('statechange', (event : Event) => {
				if ((<any>event.target).state === 'installed') {
					callback();
				}
			});
		};

		if (registration.installing) {
			return listenInstalledStateChange();
		}

		registration.addEventListener('updatefound', listenInstalledStateChange);
	};

	navigator.serviceWorker.addEventListener('message', (event) => {
		if (!event.data) {
			return;
		}

		switch (event.data) {
			case 'reload-window-update':
				window.location.reload();
				break;
			default:
				break;
		}
	});

	navigator.serviceWorker.register('/service-worker.js').then(function (registration) {
		if (!navigator.serviceWorker.controller) {
			return;
		}

		onNewServiceWorker(registration, () => {
			showRefreshUI(registration);
		});
	});
}
