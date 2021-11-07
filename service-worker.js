"use strict";
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
importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.2.0/workbox-sw.js');
workbox.precaching.precacheAndRoute([
  {
    "url": "api.html",
    "revision": "88c8d3402892d2d8281efc71ba6a8ced"
  },
  {
    "url": "api.js",
    "revision": "dbc90fc2e497a450d640a40d3673460b"
  },
  {
    "url": "assets/css/font-awesome.css",
    "revision": "c495654869785bc3df60216616814ad1"
  },
  {
    "url": "assets/css/font-awesome.min.css",
    "revision": "269550530cc127b6aa5a35925a7de6ce"
  },
  {
    "url": "assets/css/main.css",
    "revision": "cebff7fa850343228a352926110cac1a"
  },
  {
    "url": "assets/img/coin_white.png",
    "revision": "c392292dd4fa339a13a254d154f29a5c"
  },
  {
    "url": "assets/img/favicon.ico",
    "revision": "eea7c4035a78dfc8c182cf88734eb2e5"
  },
  {
    "url": "assets/img/icons/icon-128x128.png",
    "revision": "3fad3322911d1b0d6290461dfc1c8e25"
  },
  {
    "url": "assets/img/icons/icon-144x144.png",
    "revision": "6bf40237cdd6bb8ebac8acc7100421a6"
  },
  {
    "url": "assets/img/icons/icon-152x152.png",
    "revision": "8e224473fb46737bce5cab9776efbedd"
  },
  {
    "url": "assets/img/icons/icon-192x192.png",
    "revision": "f8fc712e5e0ff2c899b63b15e50652a8"
  },
  {
    "url": "assets/img/icons/icon-256x256.png",
    "revision": "e16b9eab1132efcac3e60e120d507f7f"
  },
  {
    "url": "assets/img/icons/icon-402x402.png",
    "revision": "94eb376ad133b4bf229bee96fe81ff15"
  },
  {
    "url": "assets/img/landing/75-usersthink-stock-image.jpg",
    "revision": "7a00bbf57aacc5303e846055b6dae1cb"
  },
  {
    "url": "assets/img/landing/balancing.jpg",
    "revision": "d460c7427f9adc5ba695d633e1d0aadc"
  },
  {
    "url": "assets/img/logo_vertical.png",
    "revision": "39c108ce84cd099e9964f2b1e5c206ec"
  },
  {
    "url": "assets/img/logo.png",
    "revision": "f20c663fdbe7ac21246e84606f6c1fdd"
  },
  {
    "url": "assets/img/logoQrCode.jpg",
    "revision": "0d56d4f6972bd21dedfe0ce10f24a661"
  },
  {
    "url": "assets/img/logoQrCode.png",
    "revision": "682c122db179cee3cd4e167551f3d4f6"
  },
  {
    "url": "config.js",
    "revision": "656c0b8e585e43f3af31c39470fd58c9"
  },
  {
    "url": "d/vue-i118n.js",
    "revision": "5e60d2e13017ae982538f352d04a961c"
  },
  {
    "url": "index.html",
    "revision": "58ab3fbc810bbd053c8f65a4cd730981"
  },
  {
    "url": "index.js",
    "revision": "c1bc3c5cdb077a5d08525df17c9aca26"
  },
  {
    "url": "lib/base58.js",
    "revision": "3d523c0162d6911fd675c9ed1b7389a8"
  },
  {
    "url": "lib/biginteger.js",
    "revision": "f5a873c5716a9d3481501cad3f3e5ca7"
  },
  {
    "url": "lib/cn_utils_native.js",
    "revision": "94d65c88ed19007552b6593fa6fc68d1"
  },
  {
    "url": "lib/cn_utils.js",
    "revision": "8213bb904d8e05c118ff7b0fd1e14843"
  },
  {
    "url": "lib/crypto.js",
    "revision": "d51c76b2e08308f8cca1f68c5c298a6f"
  },
  {
    "url": "lib/decoder.min.js",
    "revision": "889b2bf53f2adc26ca2688e012c4e00b"
  },
  {
    "url": "lib/FileSaver.min.js",
    "revision": "e8fdc5ad52084fa417f1fec6b6de3b29"
  },
  {
    "url": "lib/jquery-3.2.1.min.js",
    "revision": "c9f5aeeca3ad37bf2aa006139b935f0a"
  },
  {
    "url": "lib/jspdf.min.js",
    "revision": "27385efc6fa2eccc9dde7da0081b1a98"
  },
  {
    "url": "lib/kjua-0.1.1.min.js",
    "revision": "ca69d4f40f8c17ff592123dc35c1ea18"
  },
  {
    "url": "lib/mnemonic.js",
    "revision": "f30940176ec1e71b5a5f0c9b784a98b9"
  },
  {
    "url": "lib/nacl-fast-cn.js",
    "revision": "1fe1387eb865d9e843697a9d315d95b1"
  },
  {
    "url": "lib/nacl-fast.js",
    "revision": "08ac00aebba1f9457fc7927655e982c5"
  },
  {
    "url": "lib/nacl-fast.min.js",
    "revision": "72444801c9affc1654ef12860c67e976"
  },
  {
    "url": "lib/nacl-util.min.js",
    "revision": "c7b843b9e9b5aad102c855c600c7edc8"
  },
  {
    "url": "lib/nacl.js",
    "revision": "bf72b0a25fc3edf0c1a638aa43642714"
  },
  {
    "url": "lib/nacl.min.js",
    "revision": "d8eaf281c8890a60ebe82840456edc33"
  },
  {
    "url": "lib/numbersLab/Context.js",
    "revision": "40c29d848d2e19cdff2399a1f4a0ec08"
  },
  {
    "url": "lib/numbersLab/DependencyInjector.js",
    "revision": "3a74b2036a4e4730d2454b96732fb562"
  },
  {
    "url": "lib/numbersLab/DestructableView.js",
    "revision": "c34f21327cd00c4b69dd88f33a60b7fc"
  },
  {
    "url": "lib/numbersLab/Logger.js",
    "revision": "8c2a28644d0112f8934f6ac54ada17ac"
  },
  {
    "url": "lib/numbersLab/Observable.js",
    "revision": "84e5ac65bf05cee513a1fb77801de7b8"
  },
  {
    "url": "lib/numbersLab/Router.js",
    "revision": "a953a6888f51569be1a2d699c4ef986e"
  },
  {
    "url": "lib/numbersLab/VueAnnotate.js",
    "revision": "322eccaecb8cbbfba7b1f7a10ba9cf3b"
  },
  {
    "url": "lib/polyfills/core.min.js",
    "revision": "6ff449122255e7a91fb884ea7016c601"
  },
  {
    "url": "lib/polyfills/crypto.js",
    "revision": "13647291f45a582eee64e000b09d9567"
  },
  {
    "url": "lib/polyfills/textEncoding/encoding-indexes.js",
    "revision": "50f27403be5972eae4831f5b69db1f80"
  },
  {
    "url": "lib/polyfills/textEncoding/encoding.js",
    "revision": "cfc731bd62baec239b2c4daf33b5e810"
  },
  {
    "url": "lib/require.js",
    "revision": "bebd45d1f406bbe61424136b03e50895"
  },
  {
    "url": "lib/sha3.js",
    "revision": "9f298ac7e4ee707645a8d711f3ed916b"
  },
  {
    "url": "lib/sweetalert2.js",
    "revision": "4b69bbd418e85d6efdac5630ed40d76e"
  },
  {
    "url": "lib/vue-i18n.js",
    "revision": "e6661e4c9407136f4aca71aaea06b35e"
  },
  {
    "url": "lib/vue.min.js",
    "revision": "5283b86cbf48a538ee3cbebac633ccd4"
  },
  {
    "url": "manifest.json",
    "revision": "8a7c17cb329614fcee4fbebc7319e762"
  },
  {
    "url": "model/AppState.js",
    "revision": "23206380da5169bf1d416df9fd9a5de4"
  },
  {
    "url": "model/blockchain/BlockchainExplorer.js",
    "revision": "f38ab86de3e385035147b61190c1e1ff"
  },
  {
    "url": "model/blockchain/BlockchainExplorerRpc2.js",
    "revision": "5ece619deea399d28fe86aaa9956963d"
  },
  {
    "url": "model/CnUtilNative.js",
    "revision": "687b1716aed7a5836bb73a41578e9fb6"
  },
  {
    "url": "model/CoinUri.js",
    "revision": "465bc77c246f454800b620dc482bb36f"
  },
  {
    "url": "model/Constants.js",
    "revision": "b1cbabd41b94bf64be95526bf46c4f23"
  },
  {
    "url": "model/CryptoUtils.js",
    "revision": "54f70670077e370d773fb2abc3e00c49"
  },
  {
    "url": "model/KeysRepository.js",
    "revision": "21b99ca7d7216025105901917b9f5012"
  },
  {
    "url": "model/MathUtil.js",
    "revision": "7f559b68c432164e2ad261f162d57335"
  },
  {
    "url": "model/Mnemonic.js",
    "revision": "10fe4d111971235b8c1d8e45129074d6"
  },
  {
    "url": "model/MnemonicLang.js",
    "revision": "5e8a6217a74c3dc5f50d7e8d2f8fa25f"
  },
  {
    "url": "model/Nfc.js",
    "revision": "5e79dba2eccb2e4a6be22903911ef4d0"
  },
  {
    "url": "model/Password.js",
    "revision": "c0c85c860432cce2a11c6c713d4c4898"
  },
  {
    "url": "model/QRReader.js",
    "revision": "075c42294139c4d342d3dfe3b64ef850"
  },
  {
    "url": "model/Storage.js",
    "revision": "ef81f34a9d7f8db75d2e6bb8709fae5f"
  },
  {
    "url": "model/Transaction.js",
    "revision": "6556ac66ce454f35478e31bca87013ed"
  },
  {
    "url": "model/TransactionsExplorer.js",
    "revision": "8d16672f800c3efeb27a44b45d8eb213"
  },
  {
    "url": "model/Translations.js",
    "revision": "554041f979415c00deb2710211c461fc"
  },
  {
    "url": "model/Wallet.js",
    "revision": "2df688e3200c5ace74d65f3fe26fb65a"
  },
  {
    "url": "model/WalletRepository.js",
    "revision": "4f1e05406d46dfb7150e408730402845"
  },
  {
    "url": "pages/account.html",
    "revision": "b938152f372b839a3c55283c477546c7"
  },
  {
    "url": "pages/account.js",
    "revision": "92bfb24e3176b03ba401e0323b89871c"
  },
  {
    "url": "pages/changeWalletPassword.html",
    "revision": "cf44f48e8c60b3c2e19e22e825a89724"
  },
  {
    "url": "pages/changeWalletPassword.js",
    "revision": "ed9d0d811f01dc4e195535b023e2593f"
  },
  {
    "url": "pages/createWallet.html",
    "revision": "413543ffbf94919ce6b5be51d309bc55"
  },
  {
    "url": "pages/createWallet.js",
    "revision": "387393d07682d1338b4cb8d9b05fd1e4"
  },
  {
    "url": "pages/disconnect.html",
    "revision": "d41d8cd98f00b204e9800998ecf8427e"
  },
  {
    "url": "pages/disconnect.js",
    "revision": "3594698740c48755bfb42a88ac737180"
  },
  {
    "url": "pages/donate.html",
    "revision": "fda62c03370cd2985abca5ec62e51f6a"
  },
  {
    "url": "pages/donate.js",
    "revision": "fbd9a3915391c25ee01c7fd7fbe777f2"
  },
  {
    "url": "pages/export.html",
    "revision": "0829e8dcf1a904dbbe1be305abf85900"
  },
  {
    "url": "pages/export.js",
    "revision": "6ccba9e694dab3f45ba3adbb15de9b53"
  },
  {
    "url": "pages/import.html",
    "revision": "45f5c149574bd7cf2bc91794c4adee55"
  },
  {
    "url": "pages/import.js",
    "revision": "16a4b5d6f0489c94418372e05af982d6"
  },
  {
    "url": "pages/importFromFile.html",
    "revision": "b824f9fc68ce358032faecd70b0e099b"
  },
  {
    "url": "pages/importFromFile.js",
    "revision": "7498a3f7e079ebe259b83cf4f842bb53"
  },
  {
    "url": "pages/importFromKeys.html",
    "revision": "1388fc183805920f522c5cb26e3c2714"
  },
  {
    "url": "pages/importFromKeys.js",
    "revision": "1329f834d698a900362b4ccb63a8caf2"
  },
  {
    "url": "pages/importFromMnemonic.html",
    "revision": "367f09264b3c3008ee0eda752d4a0ea7"
  },
  {
    "url": "pages/importFromMnemonic.js",
    "revision": "fe14e2777e848981929da58dfd7a192d"
  },
  {
    "url": "pages/importFromQr.html",
    "revision": "172fc490fa9a97ed146895e0f35aeedc"
  },
  {
    "url": "pages/importFromQr.js",
    "revision": "6c1426944dbe8791907c86970ee0ffbc"
  },
  {
    "url": "pages/index.html",
    "revision": "c42d7382287dd53d53487539ba229cbe"
  },
  {
    "url": "pages/index.js",
    "revision": "bebc03756da9c036b7a1aa7fd55231bd"
  },
  {
    "url": "pages/network.html",
    "revision": "5599f69a2b219269be5b59b992471045"
  },
  {
    "url": "pages/network.js",
    "revision": "1e23fc640a6ad459c26a335695b83a23"
  },
  {
    "url": "pages/privacyPolicy.html",
    "revision": "0bdfeea940590b665b5764b4167c4de2"
  },
  {
    "url": "pages/privacyPolicy.js",
    "revision": "a06e415fe7eaf88807bf25d83989dc1c"
  },
  {
    "url": "pages/receive.html",
    "revision": "03a8854fc21dcd40a88a8d55a6eca392"
  },
  {
    "url": "pages/receive.js",
    "revision": "7d59040e4af92990151f309d47ea4091"
  },
  {
    "url": "pages/send.html",
    "revision": "59aba6b0b0bd7b1d9ec175ea348146b8"
  },
  {
    "url": "pages/send.js",
    "revision": "bdbb744d589f1ea976533f69476abeda"
  },
  {
    "url": "pages/settings.html",
    "revision": "71c337ed5704bab6e85110722b86978a"
  },
  {
    "url": "pages/settings.js",
    "revision": "1f779169c04d9757581cd7259cfe6fd8"
  },
  {
    "url": "pages/support.html",
    "revision": "2b1792ba4adf2bc99c52ebca9a3b194b"
  },
  {
    "url": "pages/support.js",
    "revision": "b9dc72108aa6602ee5e3eb8614c4913d"
  },
  {
    "url": "pages/termsOfUse.html",
    "revision": "166cea85fdc9cb5429a2fbe06a94723b"
  },
  {
    "url": "pages/termsOfUse.js",
    "revision": "1e0462ca4750db68f111cd17bbd9d740"
  },
  {
    "url": "providers/BlockchainExplorerProvider.js",
    "revision": "d18a3f35721765ac104887de560afe93"
  },
  {
    "url": "service-worker-raw.js",
    "revision": "3f7443e2724e74587330aff15f93149e"
  },
  {
    "url": "translations/de.json",
    "revision": "1e7c41f507682cbac894ae420f7974a4"
  },
  {
    "url": "translations/en.json",
    "revision": "4454003bd8bf1dfd9de7e1e680e49cf6"
  },
  {
    "url": "translations/fa.json",
    "revision": "c78e8aace71f772eb167886cac42c024"
  },
  {
    "url": "translations/fr.json",
    "revision": "6969f78255450df4b9a578bd27c017ea"
  },
  {
    "url": "translations/gr.json",
    "revision": "52bf269d95b738ca5c76582fff5d81b8"
  },
  {
    "url": "translations/hu.json",
    "revision": "10e0a8cd2a8b468b4c44400b8f88de34"
  },
  {
    "url": "translations/it.json",
    "revision": "85f4c0e5724dd3e8a03cb620c2168814"
  },
  {
    "url": "translations/ru.json",
    "revision": "0461c57224aa1fe6a323ba80a36dfc5a"
  },
  {
    "url": "translations/sr.json",
    "revision": "8bf689d525348c926bd39a66a70adf30"
  },
  {
    "url": "translations/uk.json",
    "revision": "826507f7f6987fe9a0e200e43e9999e5"
  },
  {
    "url": "utils/Url.js",
    "revision": "bea48b6015e471205293f17c12d76e6c"
  },
  {
    "url": "workers/TransferProcessing.js",
    "revision": "6aaf527698a3bbcdd9763e891b78bc58"
  },
  {
    "url": "workers/TransferProcessingEntrypoint.js",
    "revision": "506e2d1b5a99e6b5c7da305ea66f0c8b"
  }
]);
self.addEventListener('message', function (event) {
    if (!event.data) {
        return;
    }
    switch (event.data) {
        case 'force-activate':
            self.skipWaiting();
            self.clients.claim();
            self.clients.matchAll().then(function (clients) {
                clients.forEach(function (client) { return client.postMessage('reload-window-update'); });
            });
            break;
        default:
            // NOOP
            break;
    }
});
