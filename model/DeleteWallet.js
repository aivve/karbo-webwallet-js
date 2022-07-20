/*
 * Copyright (c) 2018, Gnock
 * Copyright (c) 2018, The Masari Project
 * Copyright (c) 2022, The Karbo developers
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
define(["require", "exports", "../model/WalletRepository", "../lib/numbersLab/DependencyInjector", "../model/Wallet", "../model/AppState"], function (require, exports, WalletRepository_1, DependencyInjector_1, Wallet_1, AppState_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DeleteWallet = void 0;
    var DeleteWallet = /** @class */ (function () {
        function DeleteWallet() {
        }
        DeleteWallet.deleteWallet = function () {
            //localStorage.clear();
            //window.location.href = '/';
            swal({
                title: i18n.t('settingsPage.deleteWalletModal.title'),
                html: i18n.t('settingsPage.deleteWalletModal.content'),
                showCancelButton: true,
                confirmButtonText: i18n.t('settingsPage.deleteWalletModal.confirmText'),
                cancelButtonText: i18n.t('settingsPage.deleteWalletModal.cancelText'),
                type: 'warning'
            }).then(function (result) {
                if (result.value) {
                    AppState_1.AppState.disconnect();
                    DependencyInjector_1.DependencyInjectorInstance().register(Wallet_1.Wallet.name, undefined, 'default');
                    WalletRepository_1.WalletRepository.deleteLocalCopy();
                    window.location.href = '#index';
                }
            });
        };
        return DeleteWallet;
    }());
    exports.DeleteWallet = DeleteWallet;
});
