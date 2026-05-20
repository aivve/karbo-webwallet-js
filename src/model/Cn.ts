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

import {Mnemonic} from "./Mnemonic";
import {Constants} from "./Constants";

declare let Module : any;

let HASH_STATE_BYTES = 200;
let HASH_SIZE = 32;
let ADDRESS_CHECKSUM_SIZE = 4;
let INTEGRATED_ID_SIZE = 8;
let ENCRYPTED_PAYMENT_ID_TAIL = 141;
let CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX = config.addressPrefix;
let CRYPTONOTE_PUBLIC_INTEGRATED_ADDRESS_BASE58_PREFIX = config.integratedAddressPrefix;
let CRYPTONOTE_PUBLIC_SUBADDRESS_BASE58_PREFIX = config.subAddressPrefix;
if (config.testnet === true)
{
	CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX = config.addressPrefixTestnet;
	CRYPTONOTE_PUBLIC_INTEGRATED_ADDRESS_BASE58_PREFIX = config.integratedAddressPrefixTestnet;
	CRYPTONOTE_PUBLIC_SUBADDRESS_BASE58_PREFIX = config.subAddressPrefixTestnet;
}
let UINT64_MAX = new JSBigInt(2).pow(64);
let CURRENT_TX_VERSION = 2;
let OLD_TX_VERSION = 1;
let TRANSACTION_VERSION_CT = 2;
let CT_CONFIDENTIAL_OUTPUT_AMOUNT = "18446744073709551615";
let CT_MIN_DENOMINATION = new JSBigInt("10000000000");
let CT_DENOMINATIONS = [
	"10000000000", "20000000000", "30000000000", "40000000000", "50000000000", "60000000000", "70000000000", "80000000000", "90000000000",
	"100000000000", "200000000000", "300000000000", "400000000000", "500000000000", "600000000000", "700000000000", "800000000000", "900000000000",
	"1000000000000", "2000000000000", "3000000000000", "4000000000000", "5000000000000", "6000000000000", "7000000000000", "8000000000000", "9000000000000",
	"10000000000000", "20000000000000", "30000000000000", "40000000000000", "50000000000000", "60000000000000", "70000000000000", "80000000000000", "90000000000000",
	"100000000000000", "200000000000000", "300000000000000", "400000000000000", "500000000000000", "600000000000000", "700000000000000", "800000000000000", "900000000000000",
	"1000000000000000", "2000000000000000", "3000000000000000", "4000000000000000", "5000000000000000", "6000000000000000", "7000000000000000", "8000000000000000", "9000000000000000",
	"10000000000000000", "20000000000000000", "30000000000000000", "40000000000000000", "50000000000000000", "60000000000000000", "70000000000000000", "80000000000000000", "90000000000000000",
	"100000000000000000"
];
let CT_MAX_RING_SIZE = 16;
let CT_MAX_INPUTS = 512;
let CT_MAX_OUTPUTS = 256;
let TX_EXTRA_NONCE_MAX_COUNT = 255;
let TX_EXTRA_TAGS = {
	PADDING: '00',
	PUBKEY: '01',
	NONCE: '02',
	MERGE_MINING: '03',
	ADDITIONAL_PUBKEY: '04',
	ACCOUNT_REGISTRATION: '04'
};
let TX_EXTRA_NONCE_TAGS = {
	PAYMENT_ID: '00',
	ENCRYPTED_PAYMENT_ID: '01'
};
let KEY_SIZE = 32;
let STRUCT_SIZES = {
	GE_P3: 160,
	GE_P2: 120,
	GE_P1P1: 160,
	GE_CACHED: 160,
	EC_SCALAR: 32,
	EC_POINT: 32,
	KEY_IMAGE: 32,
	GE_DSMP: 160 * 8, // ge_cached * 8
	SIGNATURE: 64 // ec_scalar * 2
};

export namespace CnVars{
	export enum RCT_TYPE{
		Null = 0,
		Full = 1,
		Simple = 2,
		FullBulletproof = 3,
		SimpleBulletproof = 4,
	}

	export let H = "8b655970153799af2aeadc9ff1add0ea6c7251d54154cfa92c173a0dd39c1f94"; //base H for amounts
	export let l = JSBigInt("7237005577332262213973186563042994240857116359379907606001950938285454250989"); //curve order (not RCT specific)
	export let I = "0100000000000000000000000000000000000000000000000000000000000000"; //identity element
	export let Z = "0000000000000000000000000000000000000000000000000000000000000000"; //zero scalar
	//H2 object to speed up some operations
	export let H2 = ["8b655970153799af2aeadc9ff1add0ea6c7251d54154cfa92c173a0dd39c1f94", "8faa448ae4b3e2bb3d4d130909f55fcd79711c1c83cdbccadd42cbe1515e8712",
		"12a7d62c7791654a57f3e67694ed50b49a7d9e3fc1e4c7a0bde29d187e9cc71d", "789ab9934b49c4f9e6785c6d57a498b3ead443f04f13df110c5427b4f214c739",
		"771e9299d94f02ac72e38e44de568ac1dcb2edc6edb61f83ca418e1077ce3de8", "73b96db43039819bdaf5680e5c32d741488884d18d93866d4074a849182a8a64",
		"8d458e1c2f68ebebccd2fd5d379f5e58f8134df3e0e88cad3d46701063a8d412", "09551edbe494418e81284455d64b35ee8ac093068a5f161fa6637559177ef404",
		"d05a8866f4df8cee1e268b1d23a4c58c92e760309786cdac0feda1d247a9c9a7", "55cdaad518bd871dd1eb7bc7023e1dc0fdf3339864f88fdd2de269fe9ee1832d",
		"e7697e951a98cfd5712b84bbe5f34ed733e9473fcb68eda66e3788df1958c306", "f92a970bae72782989bfc83adfaa92a4f49c7e95918b3bba3cdc7fe88acc8d47",
		"1f66c2d491d75af915c8db6a6d1cb0cd4f7ddcd5e63d3ba9b83c866c39ef3a2b", "3eec9884b43f58e93ef8deea260004efea2a46344fc5965b1a7dd5d18997efa7",
		"b29f8f0ccb96977fe777d489d6be9e7ebc19c409b5103568f277611d7ea84894", "56b1f51265b9559876d58d249d0c146d69a103636699874d3f90473550fe3f2c",
		"1d7a36575e22f5d139ff9cc510fa138505576b63815a94e4b012bfd457caaada", "d0ac507a864ecd0593fa67be7d23134392d00e4007e2534878d9b242e10d7620",
		"f6c6840b9cf145bb2dccf86e940be0fc098e32e31099d56f7fe087bd5deb5094", "28831a3340070eb1db87c12e05980d5f33e9ef90f83a4817c9f4a0a33227e197",
		"87632273d629ccb7e1ed1a768fa2ebd51760f32e1c0b867a5d368d5271055c6e", "5c7b29424347964d04275517c5ae14b6b5ea2798b573fc94e6e44a5321600cfb",
		"e6945042d78bc2c3bd6ec58c511a9fe859c0ad63fde494f5039e0e8232612bd5", "36d56907e2ec745db6e54f0b2e1b2300abcb422e712da588a40d3f1ebbbe02f6",
		"34db6ee4d0608e5f783650495a3b2f5273c5134e5284e4fdf96627bb16e31e6b", "8e7659fb45a3787d674ae86731faa2538ec0fdf442ab26e9c791fada089467e9",
		"3006cf198b24f31bb4c7e6346000abc701e827cfbb5df52dcfa42e9ca9ff0802", "f5fd403cb6e8be21472e377ffd805a8c6083ea4803b8485389cc3ebc215f002a",
		"3731b260eb3f9482e45f1c3f3b9dcf834b75e6eef8c40f461ea27e8b6ed9473d", "9f9dab09c3f5e42855c2de971b659328a2dbc454845f396ffc053f0bb192f8c3",
		"5e055d25f85fdb98f273e4afe08464c003b70f1ef0677bb5e25706400be620a5", "868bcf3679cb6b500b94418c0b8925f9865530303ae4e4b262591865666a4590",
		"b3db6bd3897afbd1df3f9644ab21c8050e1f0038a52f7ca95ac0c3de7558cb7a", "8119b3a059ff2cac483e69bcd41d6d27149447914288bbeaee3413e6dcc6d1eb",
		"10fc58f35fc7fe7ae875524bb5850003005b7f978c0c65e2a965464b6d00819c", "5acd94eb3c578379c1ea58a343ec4fcff962776fe35521e475a0e06d887b2db9",
		"33daf3a214d6e0d42d2300a7b44b39290db8989b427974cd865db011055a2901", "cfc6572f29afd164a494e64e6f1aeb820c3e7da355144e5124a391d06e9f95ea",
		"d5312a4b0ef615a331f6352c2ed21dac9e7c36398b939aec901c257f6cbc9e8e", "551d67fefc7b5b9f9fdbf6af57c96c8a74d7e45a002078a7b5ba45c6fde93e33",
		"d50ac7bd5ca593c656928f38428017fc7ba502854c43d8414950e96ecb405dc3", "0773e18ea1be44fe1a97e239573cfae3e4e95ef9aa9faabeac1274d3ad261604",
		"e9af0e7ca89330d2b8615d1b4137ca617e21297f2f0ded8e31b7d2ead8714660", "7b124583097f1029a0c74191fe7378c9105acc706695ed1493bb76034226a57b",
		"ec40057b995476650b3db98e9db75738a8cd2f94d863b906150c56aac19caa6b", "01d9ff729efd39d83784c0fe59c4ae81a67034cb53c943fb818b9d8ae7fc33e5",
		"00dfb3c696328c76424519a7befe8e0f6c76f947b52767916d24823f735baf2e", "461b799b4d9ceea8d580dcb76d11150d535e1639d16003c3fb7e9d1fd13083a8",
		"ee03039479e5228fdc551cbde7079d3412ea186a517ccc63e46e9fcce4fe3a6c", "a8cfb543524e7f02b9f045acd543c21c373b4c9b98ac20cec417a6ddb5744e94",
		"932b794bf89c6edaf5d0650c7c4bad9242b25626e37ead5aa75ec8c64e09dd4f", "16b10c779ce5cfef59c7710d2e68441ea6facb68e9b5f7d533ae0bb78e28bf57",
		"0f77c76743e7396f9910139f4937d837ae54e21038ac5c0b3fd6ef171a28a7e4", "d7e574b7b952f293e80dde905eb509373f3f6cd109a02208b3c1e924080a20ca",
		"45666f8c381e3da675563ff8ba23f83bfac30c34abdde6e5c0975ef9fd700cb9", "b24612e454607eb1aba447f816d1a4551ef95fa7247fb7c1f503020a7177f0dd",
		"7e208861856da42c8bb46a7567f8121362d9fb2496f131a4aa9017cf366cdfce", "5b646bff6ad1100165037a055601ea02358c0f41050f9dfe3c95dccbd3087be0",
		"746d1dccfed2f0ff1e13c51e2d50d5324375fbd5bf7ca82a8931828d801d43ab", "cb98110d4a6bb97d22feadbc6c0d8930c5f8fc508b2fc5b35328d26b88db19ae",
		"60b626a033b55f27d7676c4095eababc7a2c7ede2624b472e97f64f96b8cfc0e", "e5b52bc927468df71893eb8197ef820cf76cb0aaf6e8e4fe93ad62d803983104",
		"056541ae5da9961be2b0a5e895e5c5ba153cbb62dd561a427bad0ffd41923199", "f8fef05a3fa5c9f3eba41638b247b711a99f960fe73aa2f90136aeb20329b888"];
}

export namespace CnRandom{
	// Generate a 256-bit / 64-char / 32-byte crypto random
	export function rand_32() {
		return Mnemonic.mn_random(256);
	}

	// Generate a 128-bit / 32-char / 16-byte crypto random
	export function rand_16() {
		return Mnemonic.mn_random(128);
	}

	// Generate a 64-bit / 16-char / 8-byte crypto random
	export function rand_8() {
		return Mnemonic.mn_random(64);
	}

	// Generate a 512-bit / 128-char / 64-byte crypto random. Used as the
	// entropy source for unbiased scalar reduction in random_scalar().
	export function rand_64() {
		return Mnemonic.mn_random(512);
	}

	// Sample a uniform scalar in [0, L). Draws 64 bytes of entropy and
	// reduces mod L — the standard unbiased pattern. The old implementation
	// reduced only 32 bytes (sc_reduce32), which is biased because L ≈ 2^252
	// is close to 2^256: values in the low half of [0, L) get hit one more
	// time than values in [2^256 − k·L, L), giving ~1/16 non-uniformity at
	// the high end. That bias propagated into EVERY scalar this webwallet
	// generates — pseudo blindings, Triptych proof randomness (rj/aj/sj/tj,
	// rhoP/rhoM/sigmaU), GK proof randomness (rj/a/s/t/rho), ring signature
	// nonces, Schnorr nonces. The fix mirrors random_scalar() in the
	// daemon's src/crypto/triptych.cpp and src/crypto/gk_proof.cpp.
	export function random_scalar() {
		return CnNativeBride.sc_reduce(CnRandom.rand_64());
	}
}

export namespace CnUtils{

	export function hextobin(hex : string) : Uint8Array{
		if (hex.length % 2 !== 0) throw "Hex string has invalid length!";
		let res = new Uint8Array(hex.length / 2);
		for (let i = 0; i < hex.length / 2; ++i) {
			res[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
		}
		return res;
	}

	export function bintohex(bin : Uint8Array|string) : string {
		let out = [];
		if(typeof bin === 'string'){
			for (let i = 0; i < bin.length; ++i) {
				out.push(("0" + bin[i].charCodeAt(0).toString(16)).slice(-2));
			}
		}else {
			for (let i = 0; i < bin.length; ++i) {
				out.push(("0" + bin[i].toString(16)).slice(-2));
			}
		}
		return out.join("");
	}

	//switch byte order for hex string
	export function swapEndian(hex : string){
		if (hex.length % 2 !== 0){return "length must be a multiple of 2!";}
		let data = "";
		for (let i=1; i <= hex.length / 2; i++){
			data += hex.substr(0 - 2 * i, 2);
		}
		return data;
	}

	//switch byte order charwise
	export function swapEndianC(string : string) : string{
		let data = "";
		for (let i=1; i <= string.length; i++){
			data += string.substr(0 - i, 1);
		}
		return data;
	}

//for most uses you'll also want to swapEndian after conversion
	//mainly to convert integer "scalars" to usable hexadecimal strings
	export function d2h(integer : number|string){
		if (typeof integer !== "string" && integer.toString().length > 15){throw "integer should be entered as a string for precision";}
		let padding = "";
		for (let i = 0; i < 63; i++){
			padding += "0";
		}
		return (padding + JSBigInt(integer).toString(16).toLowerCase()).slice(-64);
	}

	//integer (string) to scalar
	export function d2s(integer : number|string){
		if (typeof integer === "string") {
			return CnUtils.swapEndian(CnUtils.d2h(integer));
		} else {
			return CnUtils.swapEndian(CnUtils.d2h(integer.toString()));
		}

	}

	export function scalar_to_bigint(scalar : string) {
		if (scalar.length !== 64 || !CnUtils.valid_hex(scalar)) {
			throw "Invalid scalar";
		}
		return JSBigInt.parse(CnUtils.swapEndian(scalar), 16);
	}

	export function bigint_to_scalar(integer : any) {
		let reduced = new JSBigInt(integer).remainder(CnVars.l);
		if (reduced.compare(0) < 0) {
			reduced = reduced.add(CnVars.l);
		}
		return CnUtils.swapEndian(CnUtils.padLeft(reduced.toString(16).toLowerCase(), 64, "0"));
	}

	export function u64_to_le_hex(integer : number|string|any) {
		let n = new JSBigInt(integer);
		if (n.compare(0) < 0 || n.compare(UINT64_MAX) >= 0) {
			throw "amount overflows uint64";
		}
		let out = "";
		for (let i = 0; i < 8; ++i) {
			out += ("0" + n.remainder(256).toJSValue().toString(16)).slice(-2);
			n = n.divide(256);
		}
		return out;
	}

	export function le_hex_to_u64(hex : string) {
		if (hex.length !== 16 || !CnUtils.valid_hex(hex)) {
			throw "Invalid uint64 hex";
		}
		let out = JSBigInt.ZERO;
		for (let i = 7; i >= 0; --i) {
			out = out.multiply(256).add(parseInt(hex.slice(i * 2, i * 2 + 2), 16));
		}
		return out;
	}

	// hexadecimal to integer
	export function h2d(hex : any) {
		/*let vali = 0;
		for (let j = 7; j >= 0; j--) {
			vali = (vali * 256 + test[j].charCodeAt(0));
		}
		return vali;*/
		// return JSBigInt.parse(test,16);
		// let bytes = Crypto.hextobin(test);
		// console.log('bytes',bytes, test,swapEndianC(test));
		// console.log(JSBigInt.parse(swapEndianC(test),16).valueOf());
		// console.log(JSBigInt.parse(test.substr(0,12),16).valueOf());
		let vali = 0;
		for (let j = 7; j >= 0; j--) {
			// console.log(vali,vali*256,bytes[j]);
			vali = (vali * 256 + parseInt(hex.slice(j*2, j*2+2), 16));
		}
		return vali;
	}

	export function d2b(integer : number) : string{
		let integerStr = integer.toString();
		if (typeof integer !== "string" && integerStr.length > 15){throw "integer should be entered as a string for precision";}
		let padding = "";
		for (let i = 0; i < 63; i++){
			padding += "0";
		}
		let a = new JSBigInt(integerStr);
		if (a.toString(2).length > 64){throw "amount overflows uint64!";}
		return CnUtils.swapEndianC((padding + a.toString(2)).slice(-64));
	}

	export function ge_scalarmult(pub : string, sec : string) {
		if (pub.length !== 64 || sec.length !== 64) {
			throw "Invalid input length";
		}
		return CnUtils.bintohex(nacl.ll.ge_scalarmult(CnUtils.hextobin(pub), CnUtils.hextobin(sec)));
	}

	export function ge_add(p1 : string, p2 : string) {
		if (p1.length !== 64 || p2.length !== 64) {
			throw "Invalid input length!";
		}
		return bintohex(nacl.ll.ge_add(hextobin(p1), hextobin(p2)));
	}

	//curve and scalar functions; split out to make their host functions cleaner and more readable
	//inverts X coordinate -- this seems correct ^_^ -luigi1111
	export function ge_neg(point : string) {
		if (point.length !== 64){
			throw "expected 64 char hex string";
		}
		return point.slice(0,62) + ((parseInt(point.slice(62,63), 16) + 8) % 16).toString(16) + point.slice(63,64);
	}

	//order matters
	export function ge_sub(point1 : string, point2 : string) {
		let point2n = CnUtils.ge_neg(point2);
		return CnUtils.ge_add(point1, point2n);
	}

	export function sec_key_to_pub(sec : string) : string {
		if (sec.length !== 64) {
			throw "Invalid sec length";
		}
		return CnUtils.bintohex(nacl.ll.ge_scalarmult_base(hextobin(sec)));
	}

	export function valid_hex(hex : string) {
		let exp = new RegExp("[0-9a-fA-F]{" + hex.length + "}");
		return exp.test(hex);
	}

	export function ge_scalarmult_base(sec : string) : string{
		return CnUtils.sec_key_to_pub(sec);
	}

	export function derivation_to_scalar(derivation : string, output_index : number) {
		let buf = "";
		if (derivation.length !== (STRUCT_SIZES.EC_POINT * 2)) {
			throw "Invalid derivation length!";
		}
		buf += derivation;
		let enc = CnUtils.encode_varint(output_index);
		if (enc.length > 10 * 2) {
			throw "output_index didn't fit in 64-bit varint";
		}
		buf += enc;
		return Cn.hash_to_scalar(buf);
	}

	export function encode_varint(i : number|string) {
		let j = new JSBigInt(i);
		let out = '';
		// While i >= b10000000
		while (j.compare(0x80) >= 0) {
			// out.append i & b01111111 | b10000000
			out += ("0" + ((j.lowVal() & 0x7f) | 0x80).toString(16)).slice(-2);
			j = j.divide(new JSBigInt(2).pow(7));
		}
		out += ("0" + j.toJSValue().toString(16)).slice(-2);
		return out;
	}

	export function cn_fast_hash(input : string) {
		if (input.length % 2 !== 0 || !CnUtils.valid_hex(input)) {
			throw "Input invalid";
		}
		//update to use new keccak impl (approx 45x faster)
		//let state = this.keccak(input, inlen, HASH_STATE_BYTES);
		//return state.substr(0, HASH_SIZE * 2);
		return keccak_256(CnUtils.hextobin(input));
	}

	export function hex_xor(hex1 : string, hex2 : string) {
		if (!hex1 || !hex2 || hex1.length !== hex2.length || hex1.length % 2 !== 0 || hex2.length % 2 !== 0){throw "Hex string(s) is/are invalid!";}
		let bin1 = hextobin(hex1);
		let bin2 = hextobin(hex2);
		let xor = new Uint8Array(bin1.length);
		for (let i = 0; i < xor.length; i++){
			xor[i] = bin1[i] ^ bin2[i];
		}
		return bintohex(xor);
	}

	export function trimRight(str : string, char : string) {
		while (str[str.length - 1] == char) str = str.slice(0, -1);
		return str;
	}

	export function padLeft(str : string, len : number, char : string) {
		while (str.length < len) {
			str = char + str;
		}
		return str;
	}

	export function ge_double_scalarmult_base_vartime(c : string, P : string, r : string) : string{
		if (c.length !== 64 || P.length !== 64 || r.length !== 64) {
			throw "Invalid input length!";
		}
		return bintohex(nacl.ll.ge_double_scalarmult_base_vartime(hextobin(c), hextobin(P), hextobin(r)));
	}

	export function ge_double_scalarmult_postcomp_vartime(r : string, P : string, c : string, I : string) {
		if (c.length !== 64 || P.length !== 64 || r.length !== 64 || I.length !== 64) {
			throw "Invalid input length!";
		}
		let Pb = CnNativeBride.hash_to_ec_2(P);
		return bintohex(nacl.ll.ge_double_scalarmult_postcomp_vartime(hextobin(r), hextobin(Pb), hextobin(c), hextobin(I)));
	}

	export function decompose_amount_into_digits(amount : number|string) {
		amount = amount.toString();
		let ret = [];
		while (amount.length > 0) {
			//check so we don't create 0s
			if (amount[0] !== "0"){
				let digit = amount[0];
				while (digit.length < amount.length) {
					digit += "0";
				}
				ret.push(new JSBigInt(digit));
			}
			amount = amount.slice(1);
		}
		return ret;
	}

	export function decode_rct_ecdh(ecdh : {mask:string, amount:string}, key : string) {
		let first = Cn.hash_to_scalar(key);
		let second = Cn.hash_to_scalar(first);
		return {
			mask: CnNativeBride.sc_sub(ecdh.mask, first),
			amount: CnNativeBride.sc_sub(ecdh.amount, second),
		};
	}

	export function encode_rct_ecdh(ecdh : {mask:string, amount:string}, key : string) {
		let first = Cn.hash_to_scalar(key);
		let second = Cn.hash_to_scalar(first);
		return {
			mask: CnNativeBride.sc_add(ecdh.mask, first),
			amount: CnNativeBride.sc_add(ecdh.amount, second),
		};
	}
}

export namespace CnNativeBride{
	export function sc_reduce32(hex : string) {
		let input = CnUtils.hextobin(hex);
		if (input.length !== 32) {
			throw "Invalid input length";
		}
		let mem = Module._malloc(32);
		Module.HEAPU8.set(input, mem);
		Module.ccall('sc_reduce32', 'void', ['number'], [mem]);
		let output = Module.HEAPU8.subarray(mem, mem + 32);
		Module._free(mem);
		return CnUtils.bintohex(output);
	}

	// 64-byte → 32-byte modular reduction. The unbiased way to sample a
	// uniform scalar in [0, L): sc_reduce32 takes 32 bytes which are
	// non-uniform after reduction (L ≈ 2^252 < 2^256 means values in
	// [0, 2^256 − k·L) get hit one more time than the tail). 64 bytes of
	// entropy + sc_reduce gives effectively uniform output (bias ~2^-252).
	// Mirrors random_scalar() in the daemon's triptych.cpp / gk_proof.cpp.
	export function sc_reduce(hex64 : string) {
		let input = CnUtils.hextobin(hex64);
		if (input.length !== 64) {
			throw "Invalid input length (sc_reduce expects 64 bytes)";
		}
		let mem = Module._malloc(64);
		Module.HEAPU8.set(input, mem);
		Module.ccall('sc_reduce', 'void', ['number'], [mem]);
		// sc_reduce writes the 32-byte reduced scalar into the first 32 bytes.
		let output = Module.HEAPU8.subarray(mem, mem + 32);
		let hexOut = CnUtils.bintohex(output);
		Module._free(mem);
		return hexOut;
	}

	export function derive_secret_key(derivation : string, out_index : number, sec : string) {
		if (derivation.length !== 64 || sec.length !== 64) {
			throw "Invalid input length!";
		}
		let scalar_m = Module._malloc(STRUCT_SIZES.EC_SCALAR);
		let scalar_b = CnUtils.hextobin(CnUtils.derivation_to_scalar(derivation, out_index));
		Module.HEAPU8.set(scalar_b, scalar_m);
		let base_m = Module._malloc(KEY_SIZE);
		Module.HEAPU8.set(CnUtils.hextobin(sec), base_m);
		let derived_m = Module._malloc(STRUCT_SIZES.EC_SCALAR);
		Module.ccall("sc_add", "void", ["number", "number", "number"], [derived_m, base_m, scalar_m]);
		let res = Module.HEAPU8.subarray(derived_m, derived_m + STRUCT_SIZES.EC_SCALAR);
		Module._free(scalar_m);
		Module._free(base_m);
		Module._free(derived_m);
		return CnUtils.bintohex(res);
	}

	export function hash_to_ec(key : string) {
		if (key.length !== (KEY_SIZE * 2)) {
			throw "Invalid input length";
		}
		let h_m = Module._malloc(HASH_SIZE);
		let point_m = Module._malloc(STRUCT_SIZES.GE_P2);
		let point2_m = Module._malloc(STRUCT_SIZES.GE_P1P1);
		let res_m = Module._malloc(STRUCT_SIZES.GE_P3);
		let hash = CnUtils.hextobin(CnUtils.cn_fast_hash(key));
		Module.HEAPU8.set(hash, h_m);
		Module.ccall("ge_fromfe_frombytes_vartime", "void", ["number", "number"], [point_m, h_m]);
		Module.ccall("ge_mul8", "void", ["number", "number"], [point2_m, point_m]);
		Module.ccall("ge_p1p1_to_p3", "void", ["number", "number"], [res_m, point2_m]);
		let res = Module.HEAPU8.subarray(res_m, res_m + STRUCT_SIZES.GE_P3);
		Module._free(h_m);
		Module._free(point_m);
		Module._free(point2_m);
		Module._free(res_m);
		return CnUtils.bintohex(res);
	}

	//returns a 32 byte point via "ge_p3_tobytes" rather than a 160 byte "p3", otherwise same as above;
	export function hash_to_ec_2(key : string) {
		if (key.length !== (KEY_SIZE * 2)) {
			throw "Invalid input length";
		}
		let h_m = Module._malloc(HASH_SIZE);
		let point_m = Module._malloc(STRUCT_SIZES.GE_P2);
		let point2_m = Module._malloc(STRUCT_SIZES.GE_P1P1);
		let res_m = Module._malloc(STRUCT_SIZES.GE_P3);
		let hash = CnUtils.hextobin(CnUtils.cn_fast_hash(key));
		let res2_m = Module._malloc(KEY_SIZE);
		Module.HEAPU8.set(hash, h_m);
		Module.ccall("ge_fromfe_frombytes_vartime", "void", ["number", "number"], [point_m, h_m]);
		Module.ccall("ge_mul8", "void", ["number", "number"], [point2_m, point_m]);
		Module.ccall("ge_p1p1_to_p3", "void", ["number", "number"], [res_m, point2_m]);
		Module.ccall("ge_p3_tobytes", "void", ["number", "number"], [res2_m, res_m]);
		let res = Module.HEAPU8.subarray(res2_m, res2_m + KEY_SIZE);
		Module._free(h_m);
		Module._free(point_m);
		Module._free(point2_m);
		Module._free(res_m);
		Module._free(res2_m);
		return CnUtils.bintohex(res);
	}

	export function hash_to_ec_2_data(data : string) {
		if (data.length % 2 !== 0 || !CnUtils.valid_hex(data)) {
			throw "Invalid input";
		}
		let h_m = Module._malloc(HASH_SIZE);
		let point_m = Module._malloc(STRUCT_SIZES.GE_P2);
		let point2_m = Module._malloc(STRUCT_SIZES.GE_P1P1);
		let res_m = Module._malloc(STRUCT_SIZES.GE_P3);
		let res2_m = Module._malloc(KEY_SIZE);
		let hash = CnUtils.hextobin(CnUtils.cn_fast_hash(data));
		Module.HEAPU8.set(hash, h_m);
		Module.ccall("ge_fromfe_frombytes_vartime", "void", ["number", "number"], [point_m, h_m]);
		Module.ccall("ge_mul8", "void", ["number", "number"], [point2_m, point_m]);
		Module.ccall("ge_p1p1_to_p3", "void", ["number", "number"], [res_m, point2_m]);
		Module.ccall("ge_p3_tobytes", "void", ["number", "number"], [res2_m, res_m]);
		let res = Module.HEAPU8.subarray(res2_m, res2_m + KEY_SIZE);
		Module._free(h_m);
		Module._free(point_m);
		Module._free(point2_m);
		Module._free(res_m);
		Module._free(res2_m);
		return CnUtils.bintohex(res);
	}

	export function generate_key_image_2(pub : string, sec : string) {
		if (!pub || !sec || pub.length !== 64 || sec.length !== 64) {
			throw "Invalid input length";
		}
		let pub_m = Module._malloc(KEY_SIZE);
		let sec_m = Module._malloc(KEY_SIZE);
		Module.HEAPU8.set(CnUtils.hextobin(pub), pub_m);
		Module.HEAPU8.set(CnUtils.hextobin(sec), sec_m);
		if (Module.ccall("sc_check", "number", ["number"], [sec_m]) !== 0) {
			throw "sc_check(sec) != 0";
		}
		let point_m = Module._malloc(STRUCT_SIZES.GE_P3);
		let point2_m = Module._malloc(STRUCT_SIZES.GE_P2);
		let point_b = CnUtils.hextobin(CnNativeBride.hash_to_ec(pub));
		Module.HEAPU8.set(point_b, point_m);
		let image_m = Module._malloc(STRUCT_SIZES.KEY_IMAGE);
		Module.ccall("ge_scalarmult", "void", ["number", "number", "number"], [point2_m, sec_m, point_m]);
		Module.ccall("ge_tobytes", "void", ["number", "number"], [image_m, point2_m]);
		let res = Module.HEAPU8.subarray(image_m, image_m + STRUCT_SIZES.KEY_IMAGE);
		Module._free(pub_m);
		Module._free(sec_m);
		Module._free(point_m);
		Module._free(point2_m);
		Module._free(image_m);
		return CnUtils.bintohex(res);
	}

	//adds two scalars together
	export function sc_add(scalar1 : string, scalar2 : string) {
		if (scalar1.length !== 64 || scalar2.length !== 64) {
			throw "Invalid input length!";
		}
		let scalar1_m = Module._malloc(STRUCT_SIZES.EC_SCALAR);
		let scalar2_m = Module._malloc(STRUCT_SIZES.EC_SCALAR);
		Module.HEAPU8.set(CnUtils.hextobin(scalar1), scalar1_m);
		Module.HEAPU8.set(CnUtils.hextobin(scalar2), scalar2_m);
		let derived_m = Module._malloc(STRUCT_SIZES.EC_SCALAR);
		Module.ccall("sc_add", "void", ["number", "number", "number"], [derived_m, scalar1_m, scalar2_m]);
		let res = Module.HEAPU8.subarray(derived_m, derived_m + STRUCT_SIZES.EC_SCALAR);
		Module._free(scalar1_m);
		Module._free(scalar2_m);
		Module._free(derived_m);
		return CnUtils.bintohex(res);
	}

	//subtracts one scalar from another
	export function sc_sub(scalar1 : string, scalar2 : string) {
		if (scalar1.length !== 64 || scalar2.length !== 64) {
			throw "Invalid input length!";
		}
		let scalar1_m = Module._malloc(STRUCT_SIZES.EC_SCALAR);
		let scalar2_m = Module._malloc(STRUCT_SIZES.EC_SCALAR);
		Module.HEAPU8.set(CnUtils.hextobin(scalar1), scalar1_m);
		Module.HEAPU8.set(CnUtils.hextobin(scalar2), scalar2_m);
		let derived_m = Module._malloc(STRUCT_SIZES.EC_SCALAR);
		Module.ccall("sc_sub", "void", ["number", "number", "number"], [derived_m, scalar1_m, scalar2_m]);
		let res = Module.HEAPU8.subarray(derived_m, derived_m + STRUCT_SIZES.EC_SCALAR);
		Module._free(scalar1_m);
		Module._free(scalar2_m);
		Module._free(derived_m);
		return CnUtils.bintohex(res);
	}

	export function sc_mul(scalar1 : string, scalar2 : string) {
		if (scalar1.length !== 64 || scalar2.length !== 64 || !CnUtils.valid_hex(scalar1) || !CnUtils.valid_hex(scalar2)) {
			throw "Invalid input length!";
		}
		return CnUtils.bigint_to_scalar(CnUtils.scalar_to_bigint(scalar1).multiply(CnUtils.scalar_to_bigint(scalar2)));
	}

	export function sc_muladd(scalar1 : string, scalar2 : string, scalar3 : string) {
		return CnNativeBride.sc_add(CnNativeBride.sc_mul(scalar1, scalar2), scalar3);
	}

	// scalar^(L−2) mod L  →  the multiplicative inverse via Fermat's little
	// theorem. Only needed in the Triptych prover (the f_U response carries
	// x⁻¹ so that the U-ring equation closes against the key image base I).
	// L − 2 is hard-coded little-endian so the JS bignum layer doesn't have
	// to know about the Ed25519 group order.
	export function sc_invert(scalar : string) : string {
		if (scalar.length !== KEY_SIZE * 2 || !CnUtils.valid_hex(scalar)) {
			throw "Invalid scalar to invert";
		}
		// L − 2  where  L = 2^252 + 27742317777372353535851937790883648493,
		// encoded little-endian. Exponent for Fermat's little theorem.
		const exp = CnUtils.hextobin("ebd3f55c1a631258d69cf7a2def9de1400000000000000000000000000000010");
		// Accumulator starts at 1 (scalar one in 32-byte little-endian).
		let acc = "0100000000000000000000000000000000000000000000000000000000000000";
		let base = scalar;
		for (let byte_i = 0; byte_i < 32; ++byte_i) {
			for (let bit_i = 0; bit_i < 8; ++bit_i) {
				if ((exp[byte_i] >> bit_i) & 1) {
					acc = CnNativeBride.sc_mul(acc, base);
				}
				base = CnNativeBride.sc_mul(base, base);
			}
		}
		return acc;
	}

	//res = c - (ab) mod l; argument names copied from the signature implementation
	export function sc_mulsub(sigc : string, sec : string, k : string) {
		if (k.length !== KEY_SIZE * 2 || sigc.length !== KEY_SIZE * 2 || sec.length !== KEY_SIZE * 2 || !CnUtils.valid_hex(k) || !CnUtils.valid_hex(sigc) || !CnUtils.valid_hex(sec)) {
			throw "bad scalar";
		}
		let sec_m = Module._malloc(KEY_SIZE);
		Module.HEAPU8.set(CnUtils.hextobin(sec), sec_m);
		let sigc_m = Module._malloc(KEY_SIZE);
		Module.HEAPU8.set(CnUtils.hextobin(sigc), sigc_m);
		let k_m = Module._malloc(KEY_SIZE);
		Module.HEAPU8.set(CnUtils.hextobin(k), k_m);
		let res_m = Module._malloc(KEY_SIZE);

		Module.ccall("sc_mulsub", "void", ["number", "number", "number", "number"], [res_m, sigc_m, sec_m, k_m]);
		let res = Module.HEAPU8.subarray(res_m, res_m + KEY_SIZE);
		Module._free(k_m);
		Module._free(sec_m);
		Module._free(sigc_m);
		Module._free(res_m);
		return CnUtils.bintohex(res);
	}



	export function generate_ring_signature(prefix_hash : string, k_image : string, keys : string[], sec : string, real_index : number) {
		if (k_image.length !== STRUCT_SIZES.KEY_IMAGE * 2) {
			throw "invalid key image length";
		}
		if (sec.length !== KEY_SIZE * 2) {
			throw "Invalid secret key length";
		}
		if (prefix_hash.length !== HASH_SIZE * 2 || !CnUtils.valid_hex(prefix_hash)) {
			throw "Invalid prefix hash";
		}
		if (real_index >= keys.length || real_index < 0) {
			throw "real_index is invalid";
		}
		let _ge_tobytes = Module.cwrap("ge_tobytes", "void", ["number", "number"]);
		let _ge_p3_tobytes = Module.cwrap("ge_p3_tobytes", "void", ["number", "number"]);
		let _ge_scalarmult_base = Module.cwrap("ge_scalarmult_base", "void", ["number", "number"]);
		let _ge_scalarmult = Module.cwrap("ge_scalarmult", "void", ["number", "number", "number"]);
		let _sc_add = Module.cwrap("sc_add", "void", ["number", "number", "number"]);
		let _sc_sub = Module.cwrap("sc_sub", "void", ["number", "number", "number"]);
		let _sc_mulsub = Module.cwrap("sc_mulsub", "void", ["number", "number", "number", "number"]);
		let _sc_0 = Module.cwrap("sc_0", "void", ["number"]);
		let _ge_double_scalarmult_base_vartime = Module.cwrap("ge_double_scalarmult_base_vartime", "void", ["number", "number", "number", "number"]);
		let _ge_double_scalarmult_precomp_vartime = Module.cwrap("ge_double_scalarmult_precomp_vartime", "void", ["number", "number", "number", "number", "number"]);
		let _ge_frombytes_vartime = Module.cwrap("ge_frombytes_vartime", "number", ["number", "number"]);
		let _ge_dsm_precomp = Module.cwrap("ge_dsm_precomp", "void", ["number", "number"]);

		let buf_size = STRUCT_SIZES.EC_POINT * 2 * keys.length;
		let buf_m = Module._malloc(buf_size);
		let sig_size = STRUCT_SIZES.SIGNATURE * keys.length;
		let sig_m = Module._malloc(sig_size);

		// Struct pointer helper functions
		function buf_a(i : number) {
			return buf_m + STRUCT_SIZES.EC_POINT * (2 * i);
		}
		function buf_b(i : number) {
			return buf_m + STRUCT_SIZES.EC_POINT * (2 * i + 1);
		}
		function sig_c(i : number) {
			return sig_m + STRUCT_SIZES.EC_SCALAR * (2 * i);
		}
		function sig_r(i : number) {
			return sig_m + STRUCT_SIZES.EC_SCALAR * (2 * i + 1);
		}
		let image_m = Module._malloc(STRUCT_SIZES.KEY_IMAGE);
		Module.HEAPU8.set(CnUtils.hextobin(k_image), image_m);
		let i;
		let image_unp_m = Module._malloc(STRUCT_SIZES.GE_P3);
		let image_pre_m = Module._malloc(STRUCT_SIZES.GE_DSMP);
		let sum_m = Module._malloc(STRUCT_SIZES.EC_SCALAR);
		let k_m = Module._malloc(STRUCT_SIZES.EC_SCALAR);
		let h_m = Module._malloc(STRUCT_SIZES.EC_SCALAR);
		let tmp2_m = Module._malloc(STRUCT_SIZES.GE_P2);
		let tmp3_m = Module._malloc(STRUCT_SIZES.GE_P3);
		let pub_m = Module._malloc(KEY_SIZE);
		let sec_m = Module._malloc(KEY_SIZE);
		Module.HEAPU8.set(CnUtils.hextobin(sec), sec_m);
		if (_ge_frombytes_vartime(image_unp_m, image_m) != 0) {
			throw "failed to call ge_frombytes_vartime";
		}
		_ge_dsm_precomp(image_pre_m, image_unp_m);
		_sc_0(sum_m);
		for (i = 0; i < keys.length; i++) {
			if (i === real_index) {
				// Real key
				let rand = CnRandom.random_scalar();
				Module.HEAPU8.set(CnUtils.hextobin(rand), k_m);
				_ge_scalarmult_base(tmp3_m, k_m);
				_ge_p3_tobytes(buf_a(i), tmp3_m);
				let ec = CnNativeBride.hash_to_ec(keys[i]);
				Module.HEAPU8.set(CnUtils.hextobin(ec), tmp3_m);
				_ge_scalarmult(tmp2_m, k_m, tmp3_m);
				_ge_tobytes(buf_b(i), tmp2_m);
			} else {
				Module.HEAPU8.set(CnUtils.hextobin(CnRandom.random_scalar()), sig_c(i));
				Module.HEAPU8.set(CnUtils.hextobin(CnRandom.random_scalar()), sig_r(i));
				Module.HEAPU8.set(CnUtils.hextobin(keys[i]), pub_m);
				if (Module.ccall("ge_frombytes_vartime", "void", ["number", "number"], [tmp3_m, pub_m]) !== 0) {
					throw "Failed to call ge_frombytes_vartime";
				}
				_ge_double_scalarmult_base_vartime(tmp2_m, sig_c(i), tmp3_m, sig_r(i));
				_ge_tobytes(buf_a(i), tmp2_m);
				let ec = CnNativeBride.hash_to_ec(keys[i]);
				Module.HEAPU8.set(CnUtils.hextobin(ec), tmp3_m);
				_ge_double_scalarmult_precomp_vartime(tmp2_m, sig_r(i), tmp3_m, sig_c(i), image_pre_m);
				_ge_tobytes(buf_b(i), tmp2_m);
				_sc_add(sum_m, sum_m, sig_c(i));
			}
		}
		let buf_bin = Module.HEAPU8.subarray(buf_m, buf_m + buf_size);
		let scalar = Cn.hash_to_scalar(prefix_hash + CnUtils.bintohex(buf_bin));
		Module.HEAPU8.set(CnUtils.hextobin(scalar), h_m);
		_sc_sub(sig_c(real_index), h_m, sum_m);
		_sc_mulsub(sig_r(real_index), sig_c(real_index), sec_m, k_m);
		let sig_data = CnUtils.bintohex(Module.HEAPU8.subarray(sig_m, sig_m + sig_size));
		let sigs = [];
		for (let k = 0; k < keys.length; k++) {
			sigs.push(sig_data.slice(STRUCT_SIZES.SIGNATURE * 2 * k, STRUCT_SIZES.SIGNATURE * 2 * (k + 1)));
		}
		Module._free(image_m);
		Module._free(image_unp_m);
		Module._free(image_pre_m);
		Module._free(sum_m);
		Module._free(k_m);
		Module._free(h_m);
		Module._free(tmp2_m);
		Module._free(tmp3_m);
		Module._free(buf_m);
		Module._free(sig_m);
		Module._free(pub_m);
		Module._free(sec_m);
		return sigs;
	}

	export function generate_key_derivation(pub : any, sec : any){
		let generate_key_derivation_bind = (<any>self).Module_native.cwrap('generate_key_derivation', null, ['number', 'number', 'number']);

		let pub_b = CnUtils.hextobin(pub);
		let sec_b = CnUtils.hextobin(sec);
		let Module_native = (<any>self).Module_native;

		let pub_m = Module_native._malloc(KEY_SIZE);
		Module_native.HEAPU8.set(pub_b, pub_m);

		let sec_m = Module_native._malloc(KEY_SIZE);
		Module_native.HEAPU8.set(sec_b, sec_m);

		let derivation_m = Module_native._malloc(KEY_SIZE);
		let r = generate_key_derivation_bind(pub_m,sec_m,derivation_m);

		Module_native._free(pub_m);
		Module_native._free(sec_m);

		let res = Module_native.HEAPU8.subarray(derivation_m, derivation_m + KEY_SIZE);
		Module_native._free(derivation_m);

		return CnUtils.bintohex(res);
	}

	export function derive_public_key(derivation : string,
									  output_idx_in_tx : number,
									  pubSpend : string){
		let derive_public_key_bind = (<any>self).Module_native.cwrap('derive_public_key', null, ['number', 'number', 'number', 'number']);

		let derivation_b = CnUtils.hextobin(derivation);
		let pub_spend_b = CnUtils.hextobin(pubSpend);


		let Module_native = (<any>self).Module_native;

		let derivation_m = Module_native._malloc(KEY_SIZE);
		Module_native.HEAPU8.set(derivation_b, derivation_m);

		let pub_spend_m = Module_native._malloc(KEY_SIZE);
		Module_native.HEAPU8.set(pub_spend_b, pub_spend_m);

		let derived_key_m = Module_native._malloc(KEY_SIZE);
		let r = derive_public_key_bind(derivation_m, output_idx_in_tx, pub_spend_m, derived_key_m);

		Module_native._free(derivation_m);
		Module_native._free(pub_spend_m);

		let res = Module_native.HEAPU8.subarray(derived_key_m, derived_key_m + KEY_SIZE);
		Module_native._free(derived_key_m);

		return CnUtils.bintohex(res);
	}
}

export namespace Cn{

	export function hash_to_scalar(buf : string) : string{
		let hash = CnUtils.cn_fast_hash(buf);
		let scalar = CnNativeBride.sc_reduce32(hash);
		return scalar;
	}

	export function array_hash_to_scalar(array : string[]) : string{
		let buf = "";
		for (let i = 0; i < array.length; i++){
			if (typeof array[i] !== "string"){throw "unexpected array element";}
			buf += array[i];
		}
		return hash_to_scalar(buf);
	}


	export function generate_keys(seed : string) : {sec:string, pub:string}{
		if (seed.length !== 64) throw "Invalid input length!";
		let sec = CnNativeBride.sc_reduce32(seed);
		let pub = CnUtils.sec_key_to_pub(sec);
		return {
			sec: sec,
			pub: pub
		};
	}

	export function random_keypair() {
		return Cn.generate_keys(CnRandom.rand_32());
	}

	export function pubkeys_to_string(spend : string, view : string) {
		let prefix = CnUtils.encode_varint(CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX);
		let data = prefix + spend + view;
		let checksum = CnUtils.cn_fast_hash(data);
		return cnBase58.encode(data + checksum.slice(0, ADDRESS_CHECKSUM_SIZE * 2));
	}

	export function create_address(seed : string) : {
		spend:{
			sec:string,
			pub:string
		},
		view:{
			sec:string,
			pub:string
		},
		public_addr:string
	}{
		let keys = {
			spend:{
				sec:'',
				pub:''
			},
			view:{
				sec:'',
				pub:''
			},
			public_addr:''
		};
		let first;
		if (seed.length !== 64) {
			first = CnUtils.cn_fast_hash(seed);
		} else {
			first = seed; //only input reduced seeds or this will not give you the result you want
		}

		keys.spend = Cn.generate_keys(first);
		let second = seed.length !== 64 ? CnUtils.cn_fast_hash(first) : CnUtils.cn_fast_hash(keys.spend.sec);
		keys.view = Cn.generate_keys(second);
		keys.public_addr = Cn.pubkeys_to_string(keys.spend.pub, keys.view.pub);
		return keys;
	}

	export function decode_address(address : string) : {
		spend: string,
		view: string,
		intPaymentId: string|null
	}{
		let dec = cnBase58.decode(address);
		console.log(dec,CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX,CRYPTONOTE_PUBLIC_INTEGRATED_ADDRESS_BASE58_PREFIX);
		let expectedPrefix = CnUtils.encode_varint(CRYPTONOTE_PUBLIC_ADDRESS_BASE58_PREFIX);
		let expectedPrefixInt = CnUtils.encode_varint(CRYPTONOTE_PUBLIC_INTEGRATED_ADDRESS_BASE58_PREFIX);
		let expectedPrefixSub = CnUtils.encode_varint(CRYPTONOTE_PUBLIC_SUBADDRESS_BASE58_PREFIX);
		let prefix = dec.slice(0, expectedPrefix.length);
		console.log(prefix,expectedPrefixInt,expectedPrefix);
		if (prefix !== expectedPrefix && prefix !== expectedPrefixInt && prefix !== expectedPrefixSub) {
			throw "Invalid address prefix";
		}
		dec = dec.slice(expectedPrefix.length);
		let spend = dec.slice(0, 64);
		let view = dec.slice(64, 128);
		let checksum : string|null = null;
		let expectedChecksum : string|null = null;
		let intPaymentId : string|null = null;
		if (prefix === expectedPrefixInt){
			intPaymentId = dec.slice(128, 128 + (INTEGRATED_ID_SIZE * 2));
			checksum = dec.slice(128 + (INTEGRATED_ID_SIZE * 2), 128 + (INTEGRATED_ID_SIZE * 2) + (ADDRESS_CHECKSUM_SIZE * 2));
			expectedChecksum = CnUtils.cn_fast_hash(prefix + spend + view + intPaymentId).slice(0, ADDRESS_CHECKSUM_SIZE * 2);
		} else {
			checksum = dec.slice(128, 128 + (ADDRESS_CHECKSUM_SIZE * 2));
			expectedChecksum = CnUtils.cn_fast_hash(prefix + spend + view).slice(0, ADDRESS_CHECKSUM_SIZE * 2);
		}
		if (checksum !== expectedChecksum) {
			throw "Invalid checksum";
		}

		return {
			spend: spend,
			view: view,
			intPaymentId: intPaymentId
		};
	}

	export function is_subaddress(addr : string) {
		let decoded = cnBase58.decode(addr);
		let subaddressPrefix = CnUtils.encode_varint(CRYPTONOTE_PUBLIC_SUBADDRESS_BASE58_PREFIX);
		let prefix = decoded.slice(0, subaddressPrefix.length);

		return (prefix === subaddressPrefix);
	}

	export function valid_keys(view_pub : string, view_sec : string, spend_pub : string, spend_sec : string) {
		let expected_view_pub = CnUtils.sec_key_to_pub(view_sec);
		let expected_spend_pub = CnUtils.sec_key_to_pub(spend_sec);
		return (expected_spend_pub === spend_pub) && (expected_view_pub === view_pub);
	}

	export function decrypt_payment_id(payment_id8 : string, tx_public_key : string, acc_prv_view_key : string) {
		if (payment_id8.length !== 16) throw "Invalid input length2!";

		let key_derivation = CnNativeBride.generate_key_derivation(tx_public_key, acc_prv_view_key);

		let pid_key = CnUtils.cn_fast_hash(key_derivation + ENCRYPTED_PAYMENT_ID_TAIL.toString(16)).slice(0, INTEGRATED_ID_SIZE * 2);

		let decrypted_payment_id = CnUtils.hex_xor(payment_id8, pid_key);

		return decrypted_payment_id;
	}

	export function get_account_integrated_address(address : string, payment_id8 : string) {
		let decoded_address = decode_address(address);

		let prefix = CnUtils.encode_varint(CRYPTONOTE_PUBLIC_INTEGRATED_ADDRESS_BASE58_PREFIX);
		let data = prefix + decoded_address.spend  + decoded_address.view + payment_id8;

		let checksum = CnUtils.cn_fast_hash(data);

		return cnBase58.encode(data + checksum.slice(0, ADDRESS_CHECKSUM_SIZE * 2));
	}

	export function formatMoneyFull(units : number|string) {
		let unitsStr = (units).toString();
		let symbol = unitsStr[0] === '-' ? '-' : '';
		if (symbol === '-') {
			unitsStr = unitsStr.slice(1);
		}
		let decimal;
		if (unitsStr.length >= config.coinUnitPlaces) {
			decimal = unitsStr.substr(unitsStr.length - config.coinUnitPlaces, config.coinUnitPlaces);
		} else {
			decimal = CnUtils.padLeft(unitsStr, config.coinUnitPlaces, '0');
		}
		return symbol + (unitsStr.substr(0, unitsStr.length - config.coinUnitPlaces) || '0') + '.' + decimal;
	}

	export function formatMoneyFullSymbol(units : number|string) {
		return Cn.formatMoneyFull(units) + ' ' + config.coinSymbol;
	}

	export function formatMoney(units : number|string) {
		let f = CnUtils.trimRight(Cn.formatMoneyFull(units), '0');
		if (f[f.length - 1] === '.') {
			return f.slice(0, f.length - 1);
		}
		return f;
	}

	export function formatMoneySymbol(units : number|string) {
		return Cn.formatMoney(units) + ' ' + config.coinSymbol;
	}

	const LUHN36_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

	function luhnMod36Check(input: string): string {
		let factor = 2;
		let sum = 0;
		const n = 36;
		for (let i = input.length - 1; i >= 0; i--) {
			let codePoint = LUHN36_ALPHABET.indexOf(input[i].toUpperCase());
			if (codePoint < 0) throw 'invalid character in account number';
			let addend = factor * codePoint;
			factor = factor === 2 ? 1 : 2;
			addend = Math.floor(addend / n) + (addend % n);
			sum += addend;
		}
		let remainder = sum % n;
		let checkCodePoint = (n - remainder) % n;
		return LUHN36_ALPHABET[checkCodePoint];
	}

	export function isValidAccountNumber(str: string): boolean {
		let match = str.match(/^(\d+)-(\d+)-([0-9A-Za-z])$/);
		if (!match) return false;
		let height = match[1];
		let txIndex = match[2];
		let checkChar = match[3].toUpperCase();
		let input = height + txIndex;
		try {
			let expected = luhnMod36Check(input);
			return expected === checkChar;
		} catch (e) {
			return false;
		}
	}

}

export namespace CnTransactions{

	let pedersenHCache : string | null = null;

	export function ctConfidentialOutputAmount() {
		return CT_CONFIDENTIAL_OUTPUT_AMOUNT;
	}

	export function ctConfidentialOutputAmountRpc() {
		return -1;
	}

	export function ctMinimumDenomination() {
		return CT_MIN_DENOMINATION;
	}

	export function ctDenominations() {
		return CT_DENOMINATIONS.slice();
	}

	export function pedersenH() {
		if (pedersenHCache === null) {
			pedersenHCache = CnNativeBride.hash_to_ec_2_data(CnUtils.bintohex("CN-amount-generator"));
		}
		return pedersenHCache;
	}

	export function scalar_one() {
		return CnUtils.d2s(1);
	}

	export function sc_neg(scalar : string) {
		return CnNativeBride.sc_sub(CnVars.Z, scalar);
	}

	export function point_sum(points : string[]) {
		let sum = CnVars.I;
		for (let point of points) {
			sum = CnUtils.ge_add(sum, point);
		}
		return sum;
	}

	export function commit(amount : string, mask : string){
		if (!CnUtils.valid_hex(mask) || mask.length !== 64 || !CnUtils.valid_hex(amount) || amount.length !== 64){
			throw "invalid amount or mask!";
		}
		let C = CnUtils.ge_double_scalarmult_base_vartime(amount, CnTransactions.pedersenH(), mask);
		return C;
	}

	export function zeroCommit(amount : string){
		if (!CnUtils.valid_hex(amount) || amount.length !== 64){
			throw "invalid amount!";
		}
		let C = CnUtils.ge_double_scalarmult_base_vartime(amount, CnTransactions.pedersenH(), CnVars.Z);
		return C;
	}

	function check_ct_array_size(size : number, maxSize : number, fieldName : string) {
		if (size > maxSize) {
			throw "CT " + fieldName + " size " + size + " exceeds limit " + maxSize;
		}
	}

	function amount_mask(sharedSecret : string, outputIndex : number) {
		if (sharedSecret.length !== 64 || !CnUtils.valid_hex(sharedSecret)) {
			throw "Invalid shared secret";
		}
		if (outputIndex < 0 || Math.floor(outputIndex) !== outputIndex) {
			throw "Invalid CT output index";
		}
		return Cn.hash_to_scalar(sharedSecret + CnUtils.encode_varint(outputIndex) + CnUtils.bintohex("amount-mask-v1")).slice(0, 16);
	}

	// CT blinding factor = Hs(shared_secret || varint(output_index) || "ct-blinding-v1").
	//
	// The domain tag is CRITICAL. Without it this scalar equals derivation_to_scalar(),
	// which is the stealth scalar s in P = s*G + B_spend. A passive observer who knows
	// the recipient's public address B_spend could then compute r*G = P - B_spend and
	// recover the amount v from C = v*H + r*G by brute force over the 64 canonical
	// denominations — breaking CT confidentiality. Matches src/crypto/ct_ecdh.cpp.
	export function derive_ct_blinding(sharedSecret : string, outputIndex : number) : string {
		if (sharedSecret.length !== 64 || !CnUtils.valid_hex(sharedSecret)) {
			throw "Invalid shared secret";
		}
		if (outputIndex < 0 || Math.floor(outputIndex) !== outputIndex) {
			throw "Invalid CT output index";
		}
		return Cn.hash_to_scalar(sharedSecret + CnUtils.encode_varint(outputIndex) + CnUtils.bintohex("ct-blinding-v1"));
	}

	export function mask_amount(sharedSecret : string, outputIndex : number, amount : number|string|any) {
		let amountLe = CnUtils.u64_to_le_hex(amount);
		let mask = amount_mask(sharedSecret, outputIndex);
		return CnUtils.hex_xor(amountLe, mask);
	}

	export function unmask_amount(sharedSecret : string, outputIndex : number, maskedAmount : string) {
		if (maskedAmount.length !== 16 || !CnUtils.valid_hex(maskedAmount)) {
			throw "Invalid CT amount mask";
		}
		let mask = amount_mask(sharedSecret, outputIndex);
		return CnUtils.le_hex_to_u64(CnUtils.hex_xor(maskedAmount, mask));
	}

	export function decode_ct_amount(maskedAmount : string, commitment : string, derivation : string, outIndex : number) {
		let amount = CnTransactions.unmask_amount(derivation, outIndex, maskedAmount);
		let blinding = CnTransactions.derive_ct_blinding(derivation, outIndex);
		let expectedCommitment = CnTransactions.commit(CnUtils.d2s(amount.toString()), blinding);
		if (commitment && expectedCommitment !== commitment) {
			throw "CT output commitment mismatch";
		}
		return {
			amount: amount,
			blinding: blinding,
			commitment: expectedCommitment
		};
	}

	export function decodeRctSimple(rv : any, sk  :any, i : number, mask : any, hwdev : any=null) {
		// CHECK_AND_ASSERT_MES(rv.type == RCTTypeSimple || rv.type == RCTTypeSimpleBulletproof, false, "decodeRct called on non simple rctSig");
		// CHECK_AND_ASSERT_THROW_MES(i < rv.ecdhInfo.size(), "Bad index");
		// CHECK_AND_ASSERT_THROW_MES(rv.outPk.size() == rv.ecdhInfo.size(), "Mismatched sizes of rv.outPk and rv.ecdhInfo");
// console.log(i < rv.ecdhInfo.length ? undefined : 'Bad index');
// console.log(rv.outPk.length == rv.ecdhInfo.length ? undefined : 'Mismatched sizes of rv.outPk and rv.ecdhInfo');

		//mask amount and mask
		// console.log('decode',rv.ecdhInfo[i], sk, h2d(rv.ecdhInfo[i].amount));
		let ecdh_info = CnUtils.decode_rct_ecdh(rv.ecdhInfo[i], sk);
		// console.log('ecdh_info',ecdh_info);
		// mask = ecdh_info.mask;
		let amount = ecdh_info.amount;
		let C = rv.outPk[i].mask;

		// console.log('amount', amount);
		// console.log('C', C);
		// DP("C");
		// DP(C);
		// key Ctmp;
		// addKeys2(Ctmp, mask, amount, H);
		// DP("Ctmp");
		// DP(Ctmp);
		// if (equalKeys(C, Ctmp) == false) {
		// 	CHECK_AND_ASSERT_THROW_MES(false, "warning, amount decoded incorrectly, will be unable to spend");
		// }

		return CnUtils.h2d(amount);
	}

	export function decode_ringct(rv:any,
								  pub : any,
								  sec : any,
								  i : number,
								  mask : any,
								  amount : any,
								  derivation : string|null) : number|false
	{
		if(derivation===null)
			derivation = CnNativeBride.generate_key_derivation(pub, sec);//[10;11]ms

		let scalar1 = CnUtils.derivation_to_scalar(derivation, i);//[0.2ms;1ms]

		try
		{
			// console.log(rv.type,'RCTTypeSimple='+RCTTypeSimple,'RCTTypeFull='+RCTTypeFull);
			switch (rv.type)
			{
				case CnVars.RCT_TYPE.Simple:
					amount = CnTransactions.decodeRctSimple(rv,
						scalar1,
						i,
						mask);//[5;10]ms
					break;
				case CnVars.RCT_TYPE.Full:
					amount = CnTransactions.decodeRctSimple(rv,
						scalar1,
						i,
						mask);
					break;
				case CnVars.RCT_TYPE.SimpleBulletproof:
					amount = CnTransactions.decodeRctSimple(rv,
						scalar1,
						i,
						mask);
					break;
				case CnVars.RCT_TYPE.FullBulletproof:
					amount = CnTransactions.decodeRctSimple(rv,
						scalar1,
						i,
						mask);
					break;
				default:
					console.log('Unsupported rc type', rv.type);
					// cerr << "Unsupported rct type: " << rv.type << endl;
					return false;
			}
		}
		catch (e)
		{
			console.error(e);
			console.log("Failed to decode input " +i);
			return false;
		}

		return amount;
	}

	export function generate_key_image_helper(ack:{view_secret_key:any,spend_secret_key:string, public_spend_key:string}, tx_public_key:any, real_output_index:any,recv_derivation:string|null)
	{
		if(recv_derivation === null)
			recv_derivation = CnNativeBride.generate_key_derivation(tx_public_key, ack.view_secret_key);
		// recv_derivation = CnUtilNative.generate_key_derivation(tx_public_key, ack.view_secret_key);
		// console.log('recv_derivation', recv_derivation);

		// CHECK_AND_ASSERT_MES(r, false, "key image helper: failed to generate_key_derivation(" << tx_public_key << ", " << ack.m_view_secret_key << ")");
		//

		// let start = Date.now();

		let in_ephemeral_pub = CnNativeBride.derive_public_key(recv_derivation, real_output_index, ack.public_spend_key);
		// let in_ephemeral_pub = CnUtilNative.derive_public_key(recv_derivation, real_output_index, ack.public_spend_key);
		// console.log('in_ephemeral_pub',in_ephemeral_pub);


		// CHECK_AND_ASSERT_MES(r, false, "key image helper: failed to derive_public_key(" << recv_derivation << ", " << real_output_index <<  ", " << ack.m_account_address.m_spend_public_key << ")");
		//
		let in_ephemeral_sec = CnNativeBride.derive_secret_key(recv_derivation, real_output_index, ack.spend_secret_key);
		// let in_ephemeral_sec = CnNativeBride.derive_secret_key(recv_derivation, real_output_index, ack.spend_secret_key);
		// console.log('in_ephemeral_sec',in_ephemeral_sec);



		// let ki = CnNativeBride.generate_key_image_2(in_ephemeral_pub, in_ephemeral_sec);
		let ki = CnNativeBride.generate_key_image_2(in_ephemeral_pub, in_ephemeral_sec);

		// let end = Date.now();
		// console.log(end-start);

		return {
			ephemeral_pub:in_ephemeral_pub,
			ephemeral_sec:in_ephemeral_sec,
			key_image:ki
		};
	}

	//TODO duplicate above
	export function generate_key_image_helper_rct(keys : {view:{sec:string}, spend:{pub:string,sec:string}}, tx_pub_key : string, out_index : number, enc_mask : string | null) {
		let recv_derivation = CnNativeBride.generate_key_derivation(tx_pub_key, keys.view.sec);
		if (!recv_derivation) throw "Failed to generate key image";

		let mask;

		if (enc_mask === CnVars.I)
		{
			// this is for ringct coinbase txs (rct type 0). they are ringct tx that have identity mask
			mask = enc_mask; // enc_mask is idenity mask returned by backend.
		}
		else
		{
			// for other ringct types or for non-ringct txs to this.
			let temp0 = CnUtils.derivation_to_scalar(recv_derivation, out_index);
			let temp1 = Cn.hash_to_scalar(temp0);

			mask = enc_mask ? CnNativeBride.sc_sub(enc_mask, temp1) : CnVars.I; //decode mask, or d2s(1) if no mask
		}

		let ephemeral_pub = CnNativeBride.derive_public_key(recv_derivation, out_index, keys.spend.pub);
		if (!ephemeral_pub) throw "Failed to generate key image";
		let ephemeral_sec = CnNativeBride.derive_secret_key(recv_derivation, out_index, keys.spend.sec);
		let image = CnNativeBride.generate_key_image_2(ephemeral_pub, ephemeral_sec);
		return {
			in_ephemeral: {
				pub: ephemeral_pub,
				sec: ephemeral_sec,
				mask: mask
			},
			image: image
		};
	}

	export function estimateRctSize(inputs : number, mixin : number, outputs : number) {
		let size = 0;
		size += outputs * 6306;
		size += ((mixin + 1) * 4 + 32 + 8) * inputs; //key offsets + key image + amount
		size += 64 * (mixin + 1) * inputs + 64 * inputs; //signature + pseudoOuts/cc
		size += 74; //extra + whatever, assume long payment ID
		return size;
	}

	export function decompose_tx_destinations(dsts : {address:string, amount:number}[], rct : boolean) : {address:string, amount:number}[] {
		let out = [];
		if (rct) {
			for (let i = 0; i < dsts.length; i++) {
				let amount = new JSBigInt(dsts[i].amount);
				if (amount.compare(0) === 0) {
					continue;
				}
				let denominations = CnTransactions.decompose_ct_amount(amount);
				for (let denom of denominations) {
					out.push({
						address: dsts[i].address,
						amount: denom
					});
				}
			}
		} else {
			for (let i = 0; i < dsts.length; i++) {
				let digits = CnUtils.decompose_amount_into_digits(dsts[i].amount);
				for (let j = 0; j < digits.length; j++) {
					if (digits[j].compare(0) > 0) {
						out.push({
							address: dsts[i].address,
							amount: digits[j]
						});
					}
				}
			}
		}
		return out.sort(function(a,b){
			return new JSBigInt(a["amount"]).compare(b["amount"]);
		});
	}

	export function decompose_ct_amount(amount : any) {
		let remaining = new JSBigInt(amount);
		if (remaining.compare(0) <= 0) {
			throw "Cannot decompose zero CT amount";
		}
		let out = [];
		for (let i = CT_DENOMINATIONS.length - 1; i >= 0 && remaining.compare(0) > 0; --i) {
			let denom = new JSBigInt(CT_DENOMINATIONS[i]);
			while (remaining.compare(denom) >= 0) {
				out.push(denom);
				remaining = remaining.subtract(denom);
			}
		}
		if (remaining.compare(0) !== 0) {
			throw "Confidential transactions require amounts to be a multiple of " + CT_MIN_DENOMINATION.toString();
		}
		return out;
	}

	export function denomination_index(amount : any) {
		let amt = new JSBigInt(amount).toString();
		for (let i = 0; i < CT_DENOMINATIONS.length; ++i) {
			if (CT_DENOMINATIONS[i] === amt) {
				return i;
			}
		}
		return -1;
	}

	export function get_payment_id_nonce(payment_id : string, pid_encrypt : boolean) {
		if (payment_id.length !== 64 && payment_id.length !== 16) {
			throw "Invalid payment id";
		}
		let res = '';
		if (pid_encrypt) {
			res += TX_EXTRA_NONCE_TAGS.ENCRYPTED_PAYMENT_ID;
		} else {
			res += TX_EXTRA_NONCE_TAGS.PAYMENT_ID;
		}
		res += payment_id;
		return res;
	}

	export function abs_to_rel_offsets(offsets : any[]) {
		if (offsets.length === 0) return offsets;
		for (let i = offsets.length - 1; i >= 1; --i) {
			offsets[i] = new JSBigInt(offsets[i]).subtract(offsets[i - 1]).toString();
		}
		return offsets;
	}

	export function add_account_registration_to_extra(extra : string, spendPubKey : string, viewPubKey : string) {
		if (spendPubKey.length !== 64 || viewPubKey.length !== 64) throw "Invalid pubkey length";
		extra += TX_EXTRA_TAGS.ACCOUNT_REGISTRATION + spendPubKey + viewPubKey;
		return extra;
	}

	//TODO merge
	export function add_pub_key_to_extra(extra : string, pubkey : string) {
		if (pubkey.length !== 64) throw "Invalid pubkey length";
		// Append pubkey tag and pubkey
		extra += TX_EXTRA_TAGS.PUBKEY + pubkey;
		return extra;
	}

	//TODO merge
	export function add_additionnal_pub_keys_to_extra(extra : string, keys : string[]){
		//do not add if there is no additional keys
		console.log('Add additionnal keys to extra', keys);
		if(keys.length === 0)return extra;

		extra += TX_EXTRA_TAGS.ADDITIONAL_PUBKEY;
		// Encode count of keys
		extra += ('0' + (keys.length).toString(16)).slice(-2);
		for(let key of keys){
			if (key.length !== 64) throw "Invalid pubkey length";
			extra += key;
		}
		return extra;
	}

	//TODO merge
	export function add_nonce_to_extra(extra : string, nonce : string) {
		// Append extra nonce
		if ((nonce.length % 2) !== 0) {
			throw "Invalid extra nonce";
		}
		if ((nonce.length / 2) > TX_EXTRA_NONCE_MAX_COUNT) {
			throw "Extra nonce must be at most " + TX_EXTRA_NONCE_MAX_COUNT + " bytes";
		}
		// Add nonce tag
		extra += TX_EXTRA_TAGS.NONCE;
		// Encode length of nonce
		extra += ('0' + (nonce.length / 2).toString(16)).slice(-2);
		// Write nonce
		extra += nonce;
		return extra;
	}

	export type Ephemeral = {
		pub: string,
		sec: string,
		mask: string
	};

	export type Output = {
		index:string,
		key:string,
		commit:string,
		// Per-member bucket amount. For transparent ring members, the real
		// on-chain amount; for confidential ring members, CT_CONFIDENTIAL_OUTPUT_AMOUNT.
		// Optional only for backwards compatibility with code paths that still
		// derive the bucket from Source.ring_amount; the CT input serializer
		// requires this to be set on every Output.
		amount?:string,
	};

	export type Source = {
		outputs:CnTransactions.Output[],
		amount:any,
		// Bucket the *real* spend lives in. Kept for callers that haven't
		// migrated to per-Output amounts yet. New code should populate
		// Output.amount on every ring member instead.
		ring_amount?:any,
		real_out_tx_key:string,
		real_out:number,
		real_out_in_tx:number,
		mask:string|null,
		key_image:string,
		in_ephemeral:CnTransactions.Ephemeral,
	};

	export type Destination = {address:string,amount:number};

	// Per-ring-member output reference. Mirror of C++ RingMemberRef:
	// each member declares its own amount bucket and absolute offset, so
	// CT inputs can mix transparent and confidential ring members.
	export type RingMember = {
		amount: string,
		output_index: any,
	};

	export type Vin = {
		type:string,
		amount?:string,
		k_image:string,
		key_offsets?:any[],
		// Per-member ring references (preferred). Replaces the legacy
		// single-bucket ring_amount + ring_offsets pair for CT inputs.
		ring_members?:RingMember[],
		// Legacy single-bucket fields. Still accepted on parse for chain data
		// produced before the mixed-ring schema landed; new code must
		// populate ring_members.
		ring_amount?:string,
		ring_offsets?:any[],
		ring_pubkeys?:string[],
		ring_commits?:string[],
		pseudo_commit?:string
	};

	export type Vout = {
		amount: number,
		target:{
			type: string,
			data: {
				key?: string,
				target_key?: string,
				commitment?: string,
				masked_amount?: string
			}
		}
	};

	// Triptych spend proof. Vector lengths follow the on-wire rule:
	//   n ∈ {2, 3, 4} (ring sizes 4 / 8 / 16, full Triptych)
	//     I_bits, A, B, Q_P, Q_M, Q_U, z, za, zb : n entries each
	// f_P, f_M, f_U are always present. n=0 / n=1 are reserved as invalid
	// (the old n=0 Schnorr branch for ring size 1 was unsound and removed
	// from consensus; coinbase shielding goes through v2 KeyInput now).
	export type CTInputSignature = {
		I_bits:string[],
		A:string[],
		B:string[],
		Q_P:string[],
		Q_M:string[],
		Q_U:string[],
		z:string[],
		za:string[],
		zb:string[],
		f_P:string,
		f_M:string,
		f_U:string
	};

	export type CTOutputProof = {
		I:string[],
		A:string[],
		B:string[],
		Q:string[],
		z:string[],
		za:string[],
		zb:string[],
		f:string
	};

	export type TransactionKernel = {
		excessCommitment:string,
		sigE:string,
		sigS:string
	};

	export type EcdhInfo = {
		mask: string,
		amount: string
	}

	export type RangeProveSignature = {
		Ci:string[],
		bsig:{
			s: string[][],
			ee:string
		}
	};

	export type key = string;//32characters
	export type keyV = key[]; //vector of keys
	export type keyM = keyV[]; //matrix of keys (indexed by column first)

	export type RangeProveBulletproofSignature = {
		V : CnTransactions.keyV,

		A : CnTransactions.key,
		S : CnTransactions.key,
		T1 : CnTransactions.key,
		T2 : CnTransactions.key,

		taux : CnTransactions.key,
		mu : CnTransactions.key,

		L : CnTransactions.keyV,
		R : CnTransactions.keyV,

		a : CnTransactions.key,
		b : CnTransactions.key,
		t : CnTransactions.key;
	};

	export type MG_Signature = {
		ss: string[][],
		cc: string
	};

	export type RctSignature = {
		ecdhInfo:EcdhInfo[]
		outPk:string[],
		pseudoOuts:string[],
		txnFee:string,
		type:number,
		message?: string,
		p?: {
			rangeSigs: RangeProveSignature[],
			bulletproofs: RangeProveBulletproofSignature[],
			MGs: MG_Signature[]
		},
	}

	// Per-input authorization, parallel to tx.vin. Each slot is one of:
	//   null / undefined       — BaseInput (coinbase, no signature)
	//   string[]               — KeyInput legacy ring signature, one hex sig per ring member
	//   CTInputSignature       — ConfidentialInput Triptych spend proof
	// The variant alternative is implicit from tx.vin[i].type, so no per-slot
	// tag is written on the wire.
	export type InputSignature = string[] | CTInputSignature | null;

	export type Transaction = {
		unlock_time: number,
		version: number,
		extra: string,
		prvkey: string,
		vin: Vin[],
		vout: Vout[],
		rct_signatures:RctSignature,
		ct_proofs?:CTOutputProof[],
		kernel?:TransactionKernel,
		fee?:any,
		signatures:InputSignature[],
	};

	export function serialize_input(input : Vin) {
		let buf = "";
		switch (input.type) {
			case "input_to_key":
				buf += "02";
				buf += CnUtils.encode_varint(input.amount || "0");
				buf += CnUtils.encode_varint((input.key_offsets || []).length);
				for (let offset of (input.key_offsets || [])) {
					buf += CnUtils.encode_varint(offset);
				}
				buf += input.k_image;
				break;
			case "confidential_input":
			case "input_to_confidential":
				// Mixed-bucket ring schema: each member is (amount, outputIndex)
				// and the three parallel arrays (members, pubkeys, commits)
				// must have equal length. Members must be sorted by
				// (amount, outputIndex) strictly ascending (canonical form).
				let ringMembers = input.ring_members || [];
				let ringPubkeys = input.ring_pubkeys || [];
				let ringCommits = input.ring_commits || [];
				check_ct_array_size(ringMembers.length, CT_MAX_RING_SIZE, "ring_members");
				check_ct_array_size(ringPubkeys.length, CT_MAX_RING_SIZE, "ring_pubkeys");
				check_ct_array_size(ringCommits.length, CT_MAX_RING_SIZE, "ring_commits");
				if (ringPubkeys.length !== ringMembers.length) {
					throw "CT ring_pubkeys size does not match ring_members size";
				}
				if (ringCommits.length !== ringMembers.length) {
					throw "CT ring_commits size does not match ring_members size";
				}
				buf += "04";
				buf += CnUtils.encode_varint(ringMembers.length);
				for (let member of ringMembers) {
					buf += CnUtils.encode_varint(member.amount);
					buf += CnUtils.encode_varint(member.output_index);
				}
				buf += CnUtils.encode_varint(ringPubkeys.length);
				for (let pubkey of ringPubkeys) {
					buf += pubkey;
				}
				buf += CnUtils.encode_varint(ringCommits.length);
				for (let commit of ringCommits) {
					buf += commit;
				}
				buf += input.pseudo_commit || "";
				buf += input.k_image;
				break;
			default:
				throw "Unhandled vin type: " + input.type;
		}
		return buf;
	}

	export function serialize_output(vout : Vout) {
		let buf = "";
		buf += CnUtils.encode_varint(vout.amount);
		switch (vout.target.type) {
			case "txout_to_key":
				buf += "02";
				buf += vout.target.data.key;
				break;
			case "txout_to_confidential":
			case "txout_to_confidential_key":
				buf += "04";
				buf += vout.target.data.target_key || vout.target.data.key || "";
				buf += vout.target.data.commitment || "";
				buf += vout.target.data.masked_amount || "";
				break;
			default:
				throw "Unhandled txout target type: " + vout.target.type;
		}
		return buf;
	}

	// Serialize one Triptych proof body. Header byte n ∈ {2,3,4} (ring 4/8/16)
	// followed by 9 × n point/scalar arrays and 3 final scalars. Empty-slot
	// signalling for v2 KeyInput slots is now done at the Transaction level
	// via the per-input variant — no n=0xFF sentinel here.
	function serialize_ct_input_sig(sig : CTInputSignature) : string {
		let nBits = sig.I_bits.length;
		let nQ = sig.Q_P.length;
		if (!((nBits === 2 || nBits === 3 || nBits === 4) && nQ === nBits)) {
			throw "Triptych: invalid proof shape on serialize (n_bits=" + nBits + ", n_q=" + nQ + ")";
		}
		if (sig.A.length    !== nBits || sig.B.length    !== nBits ||
		    sig.Q_M.length  !== nBits || sig.Q_U.length  !== nBits ||
		    sig.z.length    !== nBits || sig.za.length   !== nBits || sig.zb.length !== nBits) {
			throw "Triptych: vector length mismatch on serialize";
		}
		let buf = ("00" + nBits.toString(16)).slice(-2);
		for (let p of sig.I_bits) buf += p;
		for (let p of sig.A)      buf += p;
		for (let p of sig.B)      buf += p;
		for (let p of sig.Q_P)    buf += p;
		for (let p of sig.Q_M)    buf += p;
		for (let p of sig.Q_U)    buf += p;
		for (let s of sig.z)      buf += s;
		for (let s of sig.za)     buf += s;
		for (let s of sig.zb)     buf += s;
		buf += sig.f_P;
		buf += sig.f_M;
		buf += sig.f_U;
		return buf;
	}

	export function serialize_ct_body(tx : CnTransactions.Transaction) {
		let buf = "";
		let proofs = tx.ct_proofs || [];
		check_ct_array_size(proofs.length, CT_MAX_OUTPUTS, "ct_proofs");
		buf += CnUtils.encode_varint(proofs.length);
		for (let proof of proofs) {
			for (let field of ["I", "A", "B", "Q", "z", "za", "zb"]) {
				let values = (<any>proof)[field] || [];
				if (values.length !== 6) {
					throw "Invalid CT proof field length";
				}
				for (let value of values) {
					buf += value;
				}
			}
			buf += proof.f;
		}

		if (!tx.kernel) {
			throw "Missing CT transaction kernel";
		}
		buf += tx.kernel.excessCommitment;
		buf += tx.kernel.sigE;
		buf += tx.kernel.sigS;
		return buf;
	}

	export function serialize_tx(tx : CnTransactions.Transaction, headeronly : boolean = false) {
		let buf = "";
		buf += CnUtils.encode_varint(tx.version);
		if (tx.version === TRANSACTION_VERSION_CT) {
			check_ct_array_size(tx.vin.length, CT_MAX_INPUTS, "vin");
			check_ct_array_size(tx.vout.length, CT_MAX_OUTPUTS, "vout");
			buf += CnUtils.encode_varint(tx.fee || 0);
		} else {
			buf += CnUtils.encode_varint(tx.unlock_time);
		}

		buf += CnUtils.encode_varint(tx.vin.length);
		for (let input of tx.vin) {
			buf += CnTransactions.serialize_input(input);
		}

		buf += CnUtils.encode_varint(tx.vout.length);
		for (let output of tx.vout) {
			buf += CnTransactions.serialize_output(output);
		}

		if (!CnUtils.valid_hex(tx.extra)) {
			throw "Tx extra has invalid hex";
		}
		buf += CnUtils.encode_varint(tx.extra.length / 2);
		buf += tx.extra;

		if (!headeronly) {
			// Per-input authorization, parallel to tx.vin. Variant shape
			// selected by vin[i].type:
			//   input_to_gen / coinbase  → no bytes
			//   input_to_key             → ring sig: hex string per ring member
			//   confidential_input       → Triptych proof body
			const isCoinbaseOnly = tx.vin.length === 1 && tx.vin[0].type === "input_to_gen";
			const sigs = tx.signatures || [];
			if (!isCoinbaseOnly && sigs.length !== tx.vin.length) {
				throw "Signatures length != vin length";
			}
			for (let i = 0; i < tx.vin.length; i++) {
				const vinType = tx.vin[i].type;
				if (vinType === "input_to_gen") {
					continue;
				}
				const slot = sigs[i];
				if (vinType === "input_to_key") {
					if (!Array.isArray(slot)) {
						throw "Input " + i + " expected legacy ring signature (string[])";
					}
					for (let j = 0; j < slot.length; j++) {
						buf += slot[j];
					}
				} else if (vinType === "confidential_input" || vinType === "input_to_confidential") {
					if (!slot || Array.isArray(slot)) {
						throw "Input " + i + " expected Triptych proof (CTInputSignature)";
					}
					buf += serialize_ct_input_sig(slot as CTInputSignature);
				} else {
					throw "Unhandled vin type for authorization: " + vinType;
				}
			}
			if (tx.version === TRANSACTION_VERSION_CT) {
				buf += CnTransactions.serialize_ct_body(tx);
			}
		}
		return buf;
	}

	export function serialize_tx_with_hash (tx : CnTransactions.Transaction | any) {
		var hashes = "";
		var buf = "";
		buf += CnTransactions.serialize_tx(tx, false);
		hashes += CnUtils.cn_fast_hash(buf);

		return {
			raw: buf,
			hash: hashes,
			prvkey: tx.prvkey
		};
	};

	export function serialize_rct_tx_with_hash(tx : CnTransactions.Transaction) {
		let hashes = "";
		let buf = "";
		buf += CnTransactions.serialize_tx(tx, true);
		hashes += CnUtils.cn_fast_hash(buf);
		let buf2 = CnTransactions.serialize_rct_base(tx.rct_signatures);
		hashes += CnUtils.cn_fast_hash(buf2);
		buf += buf2;
		let buf3 = serializeRangeProofs(tx.rct_signatures);
		//add MGs
		let p = tx.rct_signatures.p;
		if(p)
			for (let i = 0; i < p.MGs.length; i++) {
				for (let j = 0; j < p.MGs[i].ss.length; j++) {
					buf3 += p.MGs[i].ss[j][0];
					buf3 += p.MGs[i].ss[j][1];
				}
				buf3 += p.MGs[i].cc;
			}

		hashes += CnUtils.cn_fast_hash(buf3);
		buf += buf3;
		let hash = CnUtils.cn_fast_hash(hashes);
		return {
			raw: buf,
			hash: hash,
			prvkey: tx.prvkey
		};
	}

	export function get_tx_prefix_hash(tx : CnTransactions.Transaction) {
		let prefix = CnTransactions.serialize_tx(tx, true);
		return CnUtils.cn_fast_hash(prefix);
	}

	export function serialize_tx_inputs(vin : Vin[]) {
		let buf = "";
		buf += CnUtils.encode_varint(vin.length);

		for (let i = 0; i < vin.length; ++i) {
			buf += CnTransactions.serialize_input(vin[i]);
		}

		return buf;
	}

	export function get_tx_inputs_hash(vin : Vin[]) {
		let serializedInputs = CnTransactions.serialize_tx_inputs(vin);
		return CnUtils.cn_fast_hash(serializedInputs);
	}

	export function generate_deterministic_tx_keys(vin : Vin[], senderViewSecretKey : string) {
		if (senderViewSecretKey.length !== 64 || !CnUtils.valid_hex(senderViewSecretKey)) {
			throw "Invalid sender view secret key";
		}

		let inputsHash = CnTransactions.get_tx_inputs_hash(vin);
		let txSecretKey = Cn.hash_to_scalar(senderViewSecretKey + inputsHash);
		return {
			sec: txSecretKey,
			pub: CnUtils.sec_key_to_pub(txSecretKey)
		};
	}

	export function is_zero_scalar(scalar : string) {
		return scalar === CnVars.Z;
	}

	export function add_scalar_mult(point : string, scalar : string, sum : string) {
		if (CnTransactions.is_zero_scalar(scalar)) {
			return sum;
		}
		return CnUtils.ge_add(sum, CnUtils.ge_scalarmult(point, scalar));
	}

	export function gk_compute_derived_ring(commitment : string) {
		let ring : string[] = [];
		let H = CnTransactions.pedersenH();
		for (let k = 0; k < CT_DENOMINATIONS.length; ++k) {
			let denomH = CnUtils.ge_scalarmult(H, CnUtils.d2s(CT_DENOMINATIONS[k]));
			ring.push(CnUtils.ge_sub(commitment, denomH));
		}
		return ring;
	}

	export function gk_compute_poly_coeffs(bits : number[], a : string[]) {
		let coeffs : string[][] = [];
		let zero = CnVars.Z;
		let one = CnTransactions.scalar_one();

		for (let k = 0; k < CT_DENOMINATIONS.length; ++k) {
			let poly = [one, zero, zero, zero, zero, zero, zero];
			let currentDegree = 0;

			for (let j = 0; j < 6; ++j) {
				let kBit = (k >> j) & 1;
				let lBit = bits[j];
				let factorConst = zero;
				let factorLinear = zero;

				if (kBit === 1) {
					factorConst = a[j];
					factorLinear = lBit ? one : zero;
				} else {
					factorConst = CnTransactions.sc_neg(a[j]);
					factorLinear = lBit ? zero : one;
				}

				let newPoly = [zero, zero, zero, zero, zero, zero, zero];
				for (let i = 0; i <= currentDegree + 1; ++i) {
					let term1 = CnNativeBride.sc_mul(factorConst, poly[i]);
					if (i > 0) {
						let term2 = CnNativeBride.sc_mul(factorLinear, poly[i - 1]);
						newPoly[i] = CnNativeBride.sc_add(term1, term2);
					} else {
						newPoly[i] = term1;
					}
				}
				currentDegree++;
				poly = newPoly;
			}

			coeffs[k] = poly;
		}
		return coeffs;
	}

	export function gk_challenge(txHash : string, D : string[], I : string[], A : string[], B : string[], Q : string[]) {
		return Cn.hash_to_scalar(
			CnUtils.bintohex("GK-KarboCT-v2") +
			D.join("") +
			I.join("") +
			A.join("") +
			B.join("") +
			Q.join("") +
			txHash
		);
	}

	export function gk_prove(commitment : string, amount : any, blinding : string, txHash : string) : CTOutputProof {
		let denominationIndex = CnTransactions.denomination_index(amount);
		if (denominationIndex < 0) {
			throw "Amount is not a canonical CT denomination";
		}

		let D = CnTransactions.gk_compute_derived_ring(commitment);
		let H = CnTransactions.pedersenH();
		let bits : number[] = [];
		for (let j = 0; j < 6; ++j) {
			bits[j] = (denominationIndex >> j) & 1;
		}

		let rj : string[] = [];
		let a : string[] = [];
		let s : string[] = [];
		let t : string[] = [];
		for (let j = 0; j < 6; ++j) {
			rj[j] = CnRandom.random_scalar();
			a[j] = CnRandom.random_scalar();
			s[j] = CnRandom.random_scalar();
			t[j] = CnRandom.random_scalar();
		}

		let I : string[] = [];
		let A : string[] = [];
		let B : string[] = [];
		for (let j = 0; j < 6; ++j) {
			let rG = CnUtils.ge_scalarmult_base(rj[j]);
			I[j] = bits[j] ? CnUtils.ge_add(rG, H) : rG;

			let sG = CnUtils.ge_scalarmult_base(s[j]);
			let aH = CnUtils.ge_scalarmult(H, a[j]);
			A[j] = CnUtils.ge_add(sG, aH);

			let tG = CnUtils.ge_scalarmult_base(t[j]);
			B[j] = bits[j] ? CnUtils.ge_add(tG, aH) : tG;
		}

		let polyCoeffs = CnTransactions.gk_compute_poly_coeffs(bits, a);
		let rho : string[] = [];
		let Q : string[] = [];
		for (let m = 0; m < 6; ++m) {
			rho[m] = CnRandom.random_scalar();
			let sum = CnUtils.ge_scalarmult_base(rho[m]);
			for (let k = 0; k < CT_DENOMINATIONS.length; ++k) {
				sum = CnTransactions.add_scalar_mult(D[k], polyCoeffs[k][m], sum);
			}
			Q[m] = sum;
		}

		let x = CnTransactions.gk_challenge(txHash, D, I, A, B, Q);
		let z : string[] = [];
		let za : string[] = [];
		let zb : string[] = [];
		for (let j = 0; j < 6; ++j) {
			z[j] = bits[j] ? CnNativeBride.sc_add(x, a[j]) : a[j];
			za[j] = CnNativeBride.sc_muladd(rj[j], x, s[j]);
			zb[j] = CnNativeBride.sc_muladd(rj[j], CnNativeBride.sc_sub(x, z[j]), t[j]);
		}

		let xPow = [CnTransactions.scalar_one(), x, CnVars.Z, CnVars.Z, CnVars.Z, CnVars.Z, CnVars.Z];
		for (let i = 2; i <= 6; ++i) {
			xPow[i] = CnNativeBride.sc_mul(xPow[i - 1], x);
		}

		let f = CnNativeBride.sc_mul(blinding, xPow[6]);
		for (let m = 0; m < 6; ++m) {
			f = CnNativeBride.sc_sub(f, CnNativeBride.sc_mul(rho[m], xPow[m]));
		}

		return {I: I, A: A, B: B, Q: Q, z: z, za: za, zb: zb, f: f};
	}

	// ── Triptych spend proof — see karbowanec's src/crypto/triptych.{h,cpp}
	// for the protocol algebra, transcript, and soundness sketch. The JS
	// implementation here mirrors the C++ prover step-for-step; the verifier
	// lives only on the daemon side.

	export function triptych_log2_ring(ringSize : number) : number {
		switch (ringSize) {
			case 4:  return 2;
			case 8:  return 3;
			case 16: return 4;
			default: return -1;
		}
	}

	// Triptych supports power-of-two ring sizes 4, 8, 16. Ring size 1 used
	// to take a Schnorr-branch carve-out for v5+ coinbase, but that proof
	// shape did not bind the same x in P=xG and I=x·Hp(P), so it was
	// removed from consensus. Phase B routes coinbase shielding through
	// v2 KeyInput with a legacy ring signature instead.
	export function triptych_ring_size_supported(ringSize : number) : boolean {
		return triptych_log2_ring(ringSize) > 0;
	}

	// Generic version of gk_compute_poly_coeffs. For each k ∈ [0, ringSize),
	// returns the n+1 coefficients of p_k(X) = product_j (l_j·X + a_j) if
	// bit_j(k)==1, else ((1−l_j)·X − a_j). Length: ringSize × (n+1).
	export function triptych_compute_poly_coeffs(bits : number[], a : string[], n : number, ringSize : number) {
		let coeffs : string[][] = [];
		let zero = CnVars.Z;
		let one = CnTransactions.scalar_one();
		for (let k = 0; k < ringSize; ++k) {
			let poly : string[] = new Array(n + 1).fill(zero);
			poly[0] = one;
			let currentDegree = 0;
			for (let j = 0; j < n; ++j) {
				let kBit = (k >> j) & 1;
				let lBit = bits[j];
				let factorConst : string;
				let factorLinear : string;
				if (kBit === 1) {
					factorConst = a[j];
					factorLinear = lBit ? one : zero;
				} else {
					factorConst = CnTransactions.sc_neg(a[j]);
					factorLinear = lBit ? zero : one;
				}
				let newPoly : string[] = new Array(n + 1).fill(zero);
				for (let i = 0; i <= currentDegree + 1; ++i) {
					let term1 = CnNativeBride.sc_mul(factorConst, poly[i]);
					if (i > 0) {
						let term2 = CnNativeBride.sc_mul(factorLinear, poly[i - 1]);
						newPoly[i] = CnNativeBride.sc_add(term1, term2);
					} else {
						newPoly[i] = term1;
					}
				}
				currentDegree++;
				poly = newPoly;
			}
			coeffs[k] = poly;
		}
		return coeffs;
	}

	// Canonical Fiat-Shamir transcript serialization. Matches the C++ daemon's
	// compute_challenge byte-for-byte: domain || message || ring_size_byte ||
	// every ring pubkey || every ring commit || pseudo || key image ||
	// I_bits/A/B (n_bits each) || Q_P/Q_M/Q_U (n_q each). Single funnel —
	// no ad-hoc hashing at call sites.
	export function triptych_challenge(
		message : string,
		ringSize : number,
		ringPubkeys : string[],
		ringCommitments : string[],
		pseudoCommitment : string,
		keyImage : string,
		I_bits : string[],
		A : string[],
		B : string[],
		Q_P : string[],
		Q_M : string[],
		Q_U : string[]
	) : string {
		// Domain separator distinct from GK ("GK-KarboCT-v2") and MLSAG
		// ("MLSAG-KarboCT-v1"); see triptych.h.
		let buf = CnUtils.bintohex("Triptych-KarboCT-v1");
		buf += message;
		// One-byte ring size header. ringSize ∈ {1, 4, 8, 16} → "01"/"04"/"08"/"10".
		buf += ("00" + ringSize.toString(16)).slice(-2);
		for (let pk of ringPubkeys) buf += pk;
		for (let c of ringCommitments) buf += c;
		buf += pseudoCommitment;
		buf += keyImage;
		for (let p of I_bits) buf += p;
		for (let p of A)      buf += p;
		for (let p of B)      buf += p;
		for (let p of Q_P)    buf += p;
		for (let p of Q_M)    buf += p;
		for (let p of Q_U)    buf += p;
		return Cn.hash_to_scalar(buf);
	}

	// Generate a Triptych spend proof. Mirrors src/crypto/triptych.cpp's
	// triptych_sign in the daemon. Ring sizes 4/8/16 use the full Triptych
	// construction; ring size 1 uses the Schnorr branch (the v5+ coinbase
	// carve-out — no decoys, no bit decomposition, just three Schnorr
	// proofs sharing one Fiat-Shamir challenge).
	export function triptych_sign_ct(message : string,
									 ringPubkeys : string[],
									 ringCommitments : string[],
									 pseudoCommitment : string,
									 trueIndex : number,
									 spendPrivkey : string,
									 realBlinding : string,
									 pseudoBlinding : string,
									 keyImage : string) : CTInputSignature {
		let ringSize = ringPubkeys.length;
		if (!CnTransactions.triptych_ring_size_supported(ringSize)) {
			throw "Triptych: unsupported ring size " + ringSize + " (must be 4, 8, or 16)";
		}
		if (trueIndex >= ringSize) {
			throw "Triptych: true_index out of range";
		}
		if (ringCommitments.length !== ringSize) {
			throw "Triptych: ring pubkeys/commitments size mismatch";
		}

		// Blinding-difference witness  z = r_real − r_pseudo.
		let zWitness = CnNativeBride.sc_sub(realBlinding, pseudoBlinding);

		// Derived rings: M_k = C_k − C', U_k = Hp(P_k). Both verifier and
		// prover can recompute these from the public ring; we cache them
		// once per proof.
		let M : string[] = [];
		let U : string[] = [];
		for (let k = 0; k < ringSize; ++k) {
			M.push(CnUtils.ge_sub(ringCommitments[k], pseudoCommitment));
			U.push(CnNativeBride.hash_to_ec_2(ringPubkeys[k]));
		}

		// Ring size 1 used to take a Schnorr-branch carve-out here, but
		// the simpler "two independent Schnorr proofs" shape did not bind
		// the same x in P=xG and I=x·Hp(P), so a holder could forge fresh
		// key images for the same spend. Coinbase shielding now goes
		// through v2 KeyInput with a sound single-member legacy ring sig
		// (Phase B), and ConfidentialInput never needs ring size 1.

		// ── Full Triptych branch (ring size 4/8/16; n ∈ {2,3,4}) ────────
		let n = CnTransactions.triptych_log2_ring(ringSize);

		// Bit decomposition of trueIndex.
		let bits : number[] = [];
		for (let j = 0; j < n; ++j) {
			bits[j] = (trueIndex >> j) & 1;
		}

		// Fresh randomness for the bit-commitment proof.
		let rj : string[] = [];
		let aj : string[] = [];
		let sj : string[] = [];
		let tj : string[] = [];
		for (let j = 0; j < n; ++j) {
			rj[j] = CnRandom.random_scalar();
			aj[j] = CnRandom.random_scalar();
			sj[j] = CnRandom.random_scalar();
			tj[j] = CnRandom.random_scalar();
		}

		// I_bits[j] = r_j·G + l_j·H ; A[j] = s_j·G + a_j·H ;
		// B[j] = t_j·G + l_j·a_j·H — exactly as in gk_prove.
		let H = CnTransactions.pedersenH();
		let I_bits : string[] = [];
		let A : string[] = [];
		let B : string[] = [];
		for (let j = 0; j < n; ++j) {
			let rG = CnUtils.ge_scalarmult_base(rj[j]);
			I_bits[j] = bits[j] ? CnUtils.ge_add(rG, H) : rG;
			let sG = CnUtils.ge_scalarmult_base(sj[j]);
			let aH = CnUtils.ge_scalarmult(H, aj[j]);
			A[j] = CnUtils.ge_add(sG, aH);
			let tG = CnUtils.ge_scalarmult_base(tj[j]);
			B[j] = bits[j] ? CnUtils.ge_add(tG, aH) : tG;
		}

		// Selector polynomial coefficients p_{k,m} (m = 0..n−1; the leading
		// degree-n coefficient is absorbed into f_R below).
		let polyCoeffs = CnTransactions.triptych_compute_poly_coeffs(bits, aj, n, ringSize);

		// Q polynomials for the three rings. Blinding bases:
		//   Q_P[m] = ρ_P[m]·G + Σ_k p_{k,m}·P_k   (P-ring, base G)
		//   Q_M[m] = ρ_M[m]·G + Σ_k p_{k,m}·M_k   (M-ring, base G)
		//   Q_U[m] = σ_U[m]·I + Σ_k p_{k,m}·U_k   (U-ring, base I — the
		//                                          Triptych trick that lets
		//                                          the response carry x⁻¹)
		let rhoP : string[] = [];
		let rhoM : string[] = [];
		let sigmaU : string[] = [];
		let Q_P : string[] = [];
		let Q_M : string[] = [];
		let Q_U : string[] = [];
		for (let m = 0; m < n; ++m) {
			rhoP[m] = CnRandom.random_scalar();
			rhoM[m] = CnRandom.random_scalar();
			sigmaU[m] = CnRandom.random_scalar();
			let sumP = CnUtils.ge_scalarmult_base(rhoP[m]);
			let sumM = CnUtils.ge_scalarmult_base(rhoM[m]);
			let sumU = CnUtils.ge_scalarmult(keyImage, sigmaU[m]);
			for (let k = 0; k < ringSize; ++k) {
				let coeff = polyCoeffs[k][m];
				if (CnTransactions.is_zero_scalar(coeff)) continue;
				sumP = CnUtils.ge_add(sumP, CnUtils.ge_scalarmult(ringPubkeys[k], coeff));
				sumM = CnUtils.ge_add(sumM, CnUtils.ge_scalarmult(M[k], coeff));
				sumU = CnUtils.ge_add(sumU, CnUtils.ge_scalarmult(U[k], coeff));
			}
			Q_P[m] = sumP;
			Q_M[m] = sumM;
			Q_U[m] = sumU;
		}

		// Fiat-Shamir challenge.
		let x_chal = CnTransactions.triptych_challenge(
			message, ringSize, ringPubkeys, ringCommitments,
			pseudoCommitment, keyImage,
			I_bits, A, B, Q_P, Q_M, Q_U);

		// Bit-commitment responses.
		let z : string[] = [];
		let za : string[] = [];
		let zb : string[] = [];
		for (let j = 0; j < n; ++j) {
			z[j] = bits[j] ? CnNativeBride.sc_add(x_chal, aj[j]) : aj[j];
			za[j] = CnNativeBride.sc_muladd(rj[j], x_chal, sj[j]);
			zb[j] = CnNativeBride.sc_muladd(rj[j], CnNativeBride.sc_sub(x_chal, z[j]), tj[j]);
		}

		// Powers of x_chal up to X^n.
		let xPow : string[] = [CnTransactions.scalar_one()];
		xPow[1] = x_chal;
		for (let i = 2; i <= n; ++i) {
			xPow[i] = CnNativeBride.sc_mul(xPow[i - 1], x_chal);
		}

		// Final responses:
		//   f_P = x · x_chal^n − Σ_m ρ_P[m]·x_chal^m
		//   f_M = z · x_chal^n − Σ_m ρ_M[m]·x_chal^m
		//   f_U = x⁻¹ · x_chal^n − Σ_m σ_U[m]·x_chal^m
		// f_U is the only place x⁻¹ enters the protocol — one Fermat
		// inversion per proof, no leak through the verifier's algebra.
		let xInv = CnNativeBride.sc_invert(spendPrivkey);
		let f_P = CnNativeBride.sc_mul(spendPrivkey, xPow[n]);
		let f_M = CnNativeBride.sc_mul(zWitness, xPow[n]);
		let f_U = CnNativeBride.sc_mul(xInv, xPow[n]);
		for (let m = 0; m < n; ++m) {
			f_P = CnNativeBride.sc_sub(f_P, CnNativeBride.sc_mul(rhoP[m], xPow[m]));
			f_M = CnNativeBride.sc_sub(f_M, CnNativeBride.sc_mul(rhoM[m], xPow[m]));
			f_U = CnNativeBride.sc_sub(f_U, CnNativeBride.sc_mul(sigmaU[m], xPow[m]));
		}

		return {
			I_bits, A, B,
			Q_P, Q_M, Q_U,
			z, za, zb,
			f_P, f_M, f_U
		};
	}


	export function generate_signature(hash : string, pub : string, sec : string) {
		let k = "";
		let e = CnVars.Z;
		let s = CnVars.Z;
		do {
			k = CnRandom.random_scalar();
			let comm = CnUtils.ge_scalarmult_base(k);
			e = Cn.hash_to_scalar(hash + pub + comm);
			s = CnNativeBride.sc_mulsub(e, sec, k);
		} while (e === CnVars.Z || s === CnVars.Z);

		return {e: e, s: s};
	}

	export function sign_transaction_kernel(excessScalar : string, txHash : string) : TransactionKernel {
		let excessPub = CnUtils.ge_scalarmult_base(excessScalar);
		let sig = CnTransactions.generate_signature(txHash, excessPub, excessScalar);
		return {
			excessCommitment: excessPub,
			sigE: sig.e,
			sigS: sig.s
		};
	}
	//xv: vector of secret keys, 1 per ring (nrings)
	//pm: matrix of pubkeys, indexed by size first
	//iv: vector of indexes, 1 per ring (nrings), can be a string
	//size: ring size
	//nrings: number of rings
	//extensible borromean signatures
	export function genBorromean(xv : string[], pm : string[][], iv : string, size : number, nrings : number){
		if (xv.length !== nrings){
			throw "wrong xv length " + xv.length;
		}
		if (pm.length !== size){
			throw "wrong pm size " + pm.length;
		}
		for (let i = 0; i < pm.length; i++){
			if (pm[i].length !== nrings){
				throw "wrong pm[" + i + "] length " + pm[i].length;
			}
		}
		if (iv.length !== nrings){
			throw "wrong iv length " + iv.length;
		}
		for (let i = 0; i < iv.length; i++){
			if (parseInt(iv[i]) >= size){
				throw "bad indices value at: " + i + ": " + iv[i];
			}
		}
		//signature struct
		let bb : {
			s: string[][],
			ee:string
		} = {
			s: [],
			ee: ""
		};
		//signature pubkey matrix
		let L : string[][] = [];
		//add needed sub vectors (1 per ring size)
		for (let i = 0; i < size; i++){
			bb.s[i] = [];
			L[i] = [];
		}
		//compute starting at the secret index to the last row
		let index;
		let alpha = [];
		for (let i = 0; i < nrings; i++){
			index = parseInt(''+iv[i]);
			alpha[i] = CnRandom.random_scalar();
			L[index][i] = CnUtils.ge_scalarmult_base(alpha[i]);
			for (let j = index + 1; j < size; j++){
				bb.s[j][i] = CnRandom.random_scalar();
				let c = Cn.hash_to_scalar(L[j-1][i]);
				L[j][i] = CnUtils.ge_double_scalarmult_base_vartime(c, pm[j][i], bb.s[j][i]);
			}
		}
		//hash last row to create ee
		let ltemp = "";
		for (let i = 0; i < nrings; i++){
			ltemp += L[size-1][i];
		}
		bb.ee = Cn.hash_to_scalar(ltemp);
		//compute the rest from 0 to secret index
		for (let i = 0; i < nrings; i++){
			let cc = bb.ee;
			let j = 0;
			for (j = 0; j < parseInt(iv[i]); j++){
				bb.s[j][i] = CnRandom.random_scalar();
				let LL = CnUtils.ge_double_scalarmult_base_vartime(cc, pm[j][i], bb.s[j][i]);
				cc = Cn.hash_to_scalar(LL);
			}
			bb.s[j][i] = CnNativeBride.sc_mulsub(xv[i], cc, alpha[i]);
		}
		return bb;
	}

	//proveRange gives C, and mask such that \sumCi = C
	//   c.f. http://eprint.iacr.org/2015/1098 section 5.1
	//   and Ci is a commitment to either 0 or s^i, i=0,...,n
	//   thus this proves that "amount" is in [0, s^n] (we assume s to be 4) (2 for now with v2 txes)
	//   mask is a such that C = aG + bH, and b = amount
	//commitMaskObj = {C: commit, mask: mask}
	export function proveRange(commitMaskObj : {C:string,mask:string}, amount : number, nrings : number, enc_seed : number, exponent : number){
		let size = 2;
		let C = CnVars.I; //identity
		let mask = CnVars.Z; //zero scalar
		let indices = CnUtils.d2b(amount); //base 2 for now
		let sig : RangeProveSignature = {
			Ci: [],
			bsig:{
				s:[],
				ee:''
			}
			//exp: exponent //doesn't exist for now
		};
		/*payload stuff - ignore for now
		seeds = new Array(3);
		for (let i = 0; i < seeds.length; i++){
		  seeds[i] = new Array(1);
		}
		genSeeds(seeds, enc_seed);
		*/
		let ai = [];
		let PM : string[][]= [];
		for (let i = 0; i < size; i++){
			PM[i] = [];
		}
		//start at index and fill PM left and right -- PM[0] holds Ci
		for (let i = 0; i < nrings; i++){
			ai[i] = CnRandom.random_scalar();
			let j : number = parseInt(indices[i]);
			PM[j][i] = CnUtils.ge_scalarmult_base(ai[i]);
			while (j > 0){
				j--;
				PM[j][i] = CnUtils.ge_add(PM[j+1][i], CnVars.H2[i]); //will need to use i*2 for base 4 (or different object)
			}
			j = parseInt(indices[i]);
			while (j < size - 1){
				j++;
				PM[j][i] = CnUtils.ge_sub(PM[j-1][i], CnVars.H2[i]); //will need to use i*2 for base 4 (or different object)
			}
			mask = CnNativeBride.sc_add(mask, ai[i]);
		}
		/*
		* some more payload stuff here
		*/
		//copy commitments to sig and sum them to commitment
		for (let i = 0; i < nrings; i++){
			//if (i < nrings - 1) //for later version
			sig.Ci[i] = PM[0][i];
			C = CnUtils.ge_add(C, PM[0][i]);
		}
		/* exponent stuff - ignore for now
		if (exponent){
		  n = JSBigInt(10);
		  n = n.pow(exponent).toString();
		  mask = sc_mul(mask, d2s(n)); //new sum
		}
		*/
		sig.bsig = CnTransactions.genBorromean(ai, PM, indices, size, nrings);
		commitMaskObj.C = C;
		commitMaskObj.mask = mask;
		return sig;
	}

	/*export function proveRangeBulletproof(commitMaskObj : {C:string,mask:string}, amount : string, nrings : number, enc_seed : number, exponent : number) : CnTransactions.RangeProveBulletproofSignature{
		let mask = CnRandom.random_scalar();

		let proof : CnTransactions.RangeProveBulletproofSignature = bulletproof_PROVE(amount, mask);

		CHECK_AND_ASSERT_THROW_MES(proof.V.length == 1, "V has not exactly one element");
		commitMaskObj.C = proof.V[0];
		commitMaskObj.mask = mask;
		return proof;
	}
	export function verBulletproof(proof : CnTransactions.RangeProveBulletproofSignature) : boolean{
		try { return bulletproof_VERIFY(proof); }
			// we can get deep throws from ge_frombytes_vartime if input isn't valid
		catch (e) { return false; }
	}*/

	// Gen creates a signature which proves that for some column in the keymatrix "pk"
	//   the signer knows a secret key for each row in that column
	// we presently only support matrices of 2 rows (pubkey, commitment)
	// this is a simplied MLSAG_Gen function to reflect that
	// because we don't want to force same secret column for all inputs
	export function MLSAG_Gen(message : string, pk : string[][], xx : string[], kimg : string, index : number){
		let cols = pk.length; //ring size
		if (index >= cols){throw "index out of range";}
		let rows = pk[0].length; //number of signature rows (always 2)
		if (rows !== 2){throw "wrong row count";}
		for (let i = 0; i < cols; i++){
			if (pk[i].length !== rows){throw "pk is not rectangular";}
		}
		if (xx.length !== rows){throw "bad xx size";}

		let c_old = "";
		let alpha = [];

		let rv : MG_Signature = {
			ss: [],
			cc: ''
		};
		for (let i = 0; i < cols; i++){
			rv.ss[i] = [];
		}
		let toHash = []; //holds 6 elements: message, pubkey, dsRow L, dsRow R, commitment, ndsRow L
		toHash[0] = message;

		//secret index (pubkey section)
		alpha[0] = CnRandom.random_scalar(); //need to save alphas for later
		toHash[1] = pk[index][0]; //secret index pubkey
		toHash[2] = CnUtils.ge_scalarmult_base(alpha[0]); //dsRow L
		toHash[3] = CnNativeBride.generate_key_image_2(pk[index][0], alpha[0]); //dsRow R (key image check)
		//secret index (commitment section)
		alpha[1] = CnRandom.random_scalar();
		toHash[4] = pk[index][1]; //secret index commitment
		toHash[5] = CnUtils.ge_scalarmult_base(alpha[1]); //ndsRow L

		c_old = Cn.array_hash_to_scalar(toHash);

		let i = (index + 1) % cols;
		if (i === 0){
			rv.cc = c_old;
		}
		while (i != index){
			rv.ss[i][0] = CnRandom.random_scalar(); //dsRow ss
			rv.ss[i][1] = CnRandom.random_scalar(); //ndsRow ss

			//!secret index (pubkey section)
			toHash[1] = pk[i][0];
			toHash[2] = CnUtils.ge_double_scalarmult_base_vartime(c_old, pk[i][0], rv.ss[i][0]);
			toHash[3] = CnUtils.ge_double_scalarmult_postcomp_vartime(rv.ss[i][0], pk[i][0], c_old, kimg);
			//!secret index (commitment section)
			toHash[4] = pk[i][1];
			toHash[5] = CnUtils.ge_double_scalarmult_base_vartime(c_old, pk[i][1], rv.ss[i][1]);
			c_old = Cn.array_hash_to_scalar(toHash); //hash to get next column c
			i = (i + 1) % cols;
			if (i === 0){
				rv.cc = c_old;
			}
		}
		for (i = 0; i < rows; i++){
			rv.ss[index][i] = CnNativeBride.sc_mulsub(c_old, xx[i], alpha[i]);
		}
		return rv;
	}

	//prepares for MLSAG_Gen
	export function proveRctMG(message : string, pubs : {dest:string, mask:string}[], inSk : {a:string, x:string}, kimg : string, mask : string, Cout : string, index : number){
		let cols = pubs.length;
		if (cols < 3){throw "cols must be > 2 (mixin)";}
		let xx : string[] = [];
		let PK : string[][] = [];
		//fill pubkey matrix (copy destination, subtract commitments)
		for (let i = 0; i < cols; i++){
			PK[i] = [];
			PK[i][0] = pubs[i].dest;
			PK[i][1] = CnUtils.ge_sub(pubs[i].mask, Cout);
		}
		xx[0] = inSk.x;
		xx[1] = CnNativeBride.sc_sub(inSk.a, mask);
		return CnTransactions.MLSAG_Gen(message, PK, xx, kimg, index);
	}

	export function serialize_rct_base(rv : RctSignature) {
		let buf = "";
		buf += CnUtils.encode_varint(rv.type);
		buf += CnUtils.encode_varint(rv.txnFee);
		if (rv.type === 2) {
			for (let i = 0; i < rv.pseudoOuts.length; i++) {
				buf += rv.pseudoOuts[i];
			}
		}
		if (rv.ecdhInfo.length !== rv.outPk.length) {
			throw "mismatched outPk/ecdhInfo!";
		}
		for (let i = 0; i < rv.ecdhInfo.length; i++) {
			buf += rv.ecdhInfo[i].mask;
			buf += rv.ecdhInfo[i].amount;
		}
		for (let i = 0; i < rv.outPk.length; i++) {
			buf += rv.outPk[i];
		}
		return buf;
	}

	export function serializeRangeProofs(rv : RctSignature) : string {
		let buf = "";
		let p = rv.p;
		if(p){
			if(p.rangeSigs.length)
				return CnTransactions.serializeRangeProofsClassic(rv);
			else if(p.bulletproofs.length)
				return CnTransactions.serializeRangeProofsBulletproof(rv);
			else
				throw new Error(' missing range proof or bulletproof range proof');
		}
		else
			throw new Error('invalid p signature');
		return buf;
	}

	export function serializeRangeProofsClassic(rv : RctSignature) : string {
		let buf = "";
		let p = rv.p;
		if(p && p.rangeSigs.length)
			for (let i = 0; i < p.rangeSigs.length; i++) {
				for (let j = 0; j < p.rangeSigs[i].bsig.s.length; j++) {
					for (let l = 0; l < p.rangeSigs[i].bsig.s[j].length; l++) {
						buf += p.rangeSigs[i].bsig.s[j][l];
					}
				}
				buf += p.rangeSigs[i].bsig.ee;
				for (let j = 0; j < p.rangeSigs[i].Ci.length; j++) {
					buf += p.rangeSigs[i].Ci[j];
				}
			}
		else
			throw new Error('invalid p signature. missing range proof');
		return buf;
	}

	export function serializeRangeProofsBulletproof(rv : RctSignature) : string {
		let buf = "";
		let p = rv.p;
		if(p)
			for (let i = 0; i < p.bulletproofs.length; i++) {
				throw new Error('bulletproof serialization not implemented');
			}
		else
			throw new Error('invalid p signature. missing bulletproof range proof');

		return buf;
	}

	export function get_pre_mlsag_hash(rv : RctSignature) {
		let hashes = "";
		hashes += rv.message;
		hashes += CnUtils.cn_fast_hash(CnTransactions.serialize_rct_base(rv));
		let buf = CnTransactions.serializeRangeProofs(rv);
		hashes += CnUtils.cn_fast_hash(buf);
		return CnUtils.cn_fast_hash(hashes);
	}

	//message is normal prefix hash
	//inSk is vector of x,a
	//kimg is vector of kimg
	//destinations is vector of pubkeys (we skip and proxy outAmounts instead)
	//inAmounts is vector of strings
	//outAmounts is vector of strings
	//mixRing is matrix of pubkey, commit (dest, mask)
	//amountKeys is vector of scalars
	//indices is vector
	//txnFee is string
	export function genRct(
		message : string,
		inSk : {x:string,a:string}[],
		kimg : string[],
		/*destinations, */inAmounts : string[],
		outAmounts : number[],
		mixRing : {dest:string, mask:string}[][],
		amountKeys : string[],
		indices : number[],
		txnFee : string,
		bulletproof : boolean = false
	){
		console.log('MIXIN:', mixRing);
		if (outAmounts.length !== amountKeys.length ){throw "different number of amounts/amount_keys";}
		for (let i = 0; i < mixRing.length; i++){
			if (mixRing[i].length <= indices[i]){throw "bad mixRing/index size";}
		}
		if (mixRing.length !== inSk.length){throw "mismatched mixRing/inSk";}
		if (inAmounts.length !== inSk.length){throw "mismatched inAmounts/inSk";}
		if (indices.length !== inSk.length){throw "mismatched indices/inSk";}

		console.log('======t');

		let rv : RctSignature = {
			type: inSk.length === 1 ? CnVars.RCT_TYPE.Full : CnVars.RCT_TYPE.Simple,
			message: message,
			outPk: [],
			p: {
				rangeSigs: [],
				bulletproofs: [],
				MGs: []
			},
			ecdhInfo: [],
			txnFee: txnFee.toString(),
			pseudoOuts: []
		};

		let sumout = CnVars.Z;
		let cmObj = {
			C: '',
			mask: ''
		};

		console.log('====a');

		let p = rv.p;
		if(p) {
			let nrings = 64; //for base 2/current
			//compute range proofs, etc
			for (let i = 0; i < outAmounts.length; i++) {
				let teststart = new Date().getTime();
				if(!bulletproof)
					p.rangeSigs[i] = CnTransactions.proveRange(cmObj, outAmounts[i], nrings, 0, 0);
				// else
				// 	p.bulletproofs[i] = CnTransactions.proveRangeBulletproof(cmObj, outAmounts[i], nrings, 0, 0);

				let testfinish = new Date().getTime() - teststart;
				console.log("Time take for range proof " + i + ": " + testfinish);
				rv.outPk[i] = cmObj.C;
				sumout = CnNativeBride.sc_add(sumout, cmObj.mask);
				rv.ecdhInfo[i] = CnUtils.encode_rct_ecdh({mask: cmObj.mask, amount: CnUtils.d2s(outAmounts[i])}, amountKeys[i]);
			}
			console.log('====a');

			//simple
			console.log('-----------rv type', rv.type);
			if (rv.type === CnVars.RCT_TYPE.Simple) {
				let ai = [];
				let sumpouts = CnVars.Z;
				//create pseudoOuts
				let i = 0;
				for (; i < inAmounts.length - 1; i++) {
					ai[i] = CnRandom.random_scalar();
					sumpouts = CnNativeBride.sc_add(sumpouts, ai[i]);
					rv.pseudoOuts[i] = commit(CnUtils.d2s(inAmounts[i]), ai[i]);
				}
				ai[i] = CnNativeBride.sc_sub(sumout, sumpouts);
				rv.pseudoOuts[i] = commit(CnUtils.d2s(inAmounts[i]), ai[i]);
				let full_message = CnTransactions.get_pre_mlsag_hash(rv);
				for (let i = 0; i < inAmounts.length; i++) {
					p.MGs.push(CnTransactions.proveRctMG(full_message, mixRing[i], inSk[i], kimg[i], ai[i], rv.pseudoOuts[i], indices[i]));
				}
			} else {
				let sumC = CnVars.I;
				//get sum of output commitments to use in MLSAG
				for (let i = 0; i < rv.outPk.length; i++) {
					sumC = CnUtils.ge_add(sumC, rv.outPk[i]);
				}
				sumC = CnUtils.ge_add(sumC, CnUtils.ge_scalarmult(CnVars.H, CnUtils.d2s(rv.txnFee)));
				let full_message = CnTransactions.get_pre_mlsag_hash(rv);
				p.MGs.push(CnTransactions.proveRctMG(full_message, mixRing[0], inSk[0], kimg[0], sumout, sumC, indices[0]));
			}
		}

		return rv;
	}

	export function construct_ct_tx(
		keys : {
			view: {
				pub: string,
				sec: string
			},
			spend: {
				pub: string,
				sec: string
			}
		},
		sources : CnTransactions.Source[],
		dsts : CnTransactions.Destination[],
		fee_amount : any,
		payment_id : string,
		pid_encrypt : boolean,
		realDestViewKey : string|undefined,
		accountRegistration:boolean = false
	){
		let extra = '';
		if (accountRegistration) {
			extra = CnTransactions.add_account_registration_to_extra(extra, keys.spend.pub, keys.view.pub);
		}

		let tx : CnTransactions.Transaction = {
			unlock_time: 0,
			version: TRANSACTION_VERSION_CT,
			fee: fee_amount,
			extra: extra,
			prvkey: '',
			vin: [],
			vout: [],
			rct_signatures:{
				ecdhInfo:[],
				outPk:[],
				pseudoOuts:[],
				txnFee:'',
				type:0,
			},
			ct_proofs: [],
			kernel: {
				excessCommitment: CnVars.I,
				sigE: CnVars.Z,
				sigS: CnVars.Z
			},
			signatures:[]
		};

		for (let i = 0; i < sources.length; ++i) {
			if (sources[i].real_out >= sources[i].outputs.length) {
				throw "real index >= outputs.length";
			}
			let keyImageHelper = CnTransactions.generate_key_image_helper({
				view_secret_key: keys.view.sec,
				spend_secret_key: keys.spend.sec,
				public_spend_key: keys.spend.pub
			}, sources[i].real_out_tx_key, sources[i].real_out_in_tx, null);
			if (keyImageHelper.ephemeral_pub !== sources[i].outputs[sources[i].real_out].key) {
				throw "in_ephemeral.pub != source.real_out.key";
			}
			sources[i].key_image = keyImageHelper.key_image;
			sources[i].in_ephemeral = {
				pub: keyImageHelper.ephemeral_pub,
				sec: keyImageHelper.ephemeral_sec,
				mask: sources[i].mask || CnVars.Z
			};
		}

		sources.sort(function(a,b){
			return JSBigInt.parse(a.key_image, 16).compare(JSBigInt.parse(b.key_image, 16)) * -1 ;
		});

		let inputs_money = JSBigInt.ZERO;
		let inContexts : CnTransactions.Ephemeral[] = [];
		let pseudoBlindings : string[] = [];
		let pseudoCommitments : string[] = [];
		// Per-source flag: real spend is a transparent KeyOutput. Such inputs
		// emit a v2 KeyInput (legacy ring sig in tx.signatures[i]) so the
		// visible amount enters the CT pool. Confidential reals stay as
		// ConfidentialInput + Triptych proof.
		let sourceIsTransparent : boolean[] = [];

		for (let i = 0; i < sources.length; ++i) {
			inputs_money = inputs_money.add(sources[i].amount);
			inContexts.push(sources[i].in_ephemeral);

			// Build per-member ring references. Each output is self-describing:
			// transparent → its real amount; confidential → CT sentinel.
			// Fall back to Source.ring_amount (legacy single-bucket) when an
			// Output.amount isn't set so existing callers don't break.
			let sourceBucket = "" + (sources[i].ring_amount || CT_CONFIDENTIAL_OUTPUT_AMOUNT);
			let ringMembers : CnTransactions.RingMember[] = [];
			let ringPubkeys : string[] = [];
			let ringCommits : string[] = [];
			for (let j = 0; j < sources[i].outputs.length; ++j) {
				let memberAmount = sources[i].outputs[j].amount;
				if (memberAmount === undefined || memberAmount === null || memberAmount === '') {
					memberAmount = sourceBucket;
				}
				ringMembers.push({
					amount: "" + memberAmount,
					output_index: sources[i].outputs[j].index,
				});
				ringPubkeys.push(sources[i].outputs[j].key);
				ringCommits.push(sources[i].outputs[j].commit);
			}

			// Canonical ordering: members must be sorted by (amount, outputIndex)
			// strictly ascending. We permute the parallel arrays AND remap
			// sources[i].real_out + sources[i].outputs so subsequent signing
			// (which still reads sources[i].real_out) lines up with the on-chain
			// ring order.
			let memberPerm = ringMembers.map((m, idx) => idx);
			memberPerm.sort((a, b) => {
				let ma = ringMembers[a], mb = ringMembers[b];
				let amountCmp = new JSBigInt(ma.amount).compare(new JSBigInt(mb.amount));
				if (amountCmp !== 0) return amountCmp;
				return new JSBigInt(ma.output_index).compare(new JSBigInt(mb.output_index));
			});
			ringMembers = memberPerm.map(idx => ringMembers[idx]);
			ringPubkeys = memberPerm.map(idx => ringPubkeys[idx]);
			ringCommits = memberPerm.map(idx => ringCommits[idx]);
			sources[i].outputs = memberPerm.map(idx => sources[i].outputs[idx]);
			sources[i].real_out = memberPerm.indexOf(sources[i].real_out);
			if (sources[i].real_out < 0) {
				throw "CT input lost real ring member during canonicalisation at index " + i;
			}

			// Decide input shape from the real ring member's bucket. CT_CONFIDENTIAL_OUTPUT_AMOUNT
			// signals a ConfidentialOutput on-chain; anything else is a transparent KeyOutput.
			let realBucket = ringMembers[sources[i].real_out].amount;
			let isTransparent = realBucket !== CT_CONFIDENTIAL_OUTPUT_AMOUNT && realBucket !== "" + CT_CONFIDENTIAL_OUTPUT_AMOUNT;
			sourceIsTransparent.push(isTransparent);

			if (isTransparent) {
				// All ring members must share the same transparent bucket as the real spend —
				// the on-chain verifier resolves the ring via scanOutputKeysForIndexes which
				// only accepts KeyOutput targets in a single amount bucket.
				for (let j = 0; j < ringMembers.length; ++j) {
					if (ringMembers[j].amount !== realBucket) {
						throw "Transparent CT input " + i + " has cross-bucket ring member at slot " + j;
					}
				}
				// Pseudo-commitment is deterministic for transparent: amount*H + 0*G.
				// Blinding stays zero so the excess kernel gets no contribution from this slot
				// (matches the consensus verifier's reconstruction).
				let zeroBlinding = CnVars.Z;
				let pseudoCommitment = CnTransactions.commit(CnUtils.d2s(new JSBigInt(sources[i].amount).toString()), zeroBlinding);
				pseudoBlindings.push(zeroBlinding);
				pseudoCommitments.push(pseudoCommitment);

				// Emit KeyInput. Offsets are relative-encoded from the sorted absolute
				// outputIndex list (same encoding as v1 plain txs).
				let absOffsets = ringMembers.map(m => m.output_index);
				let relOffsets = CnTransactions.abs_to_rel_offsets(absOffsets);
				tx.vin.push({
					type: "input_to_key",
					amount: "" + sources[i].amount,
					k_image: sources[i].key_image,
					key_offsets: relOffsets,
					// Keep ring metadata around in-memory so the signing pass below
					// can look up ringPubkeys without re-sorting; not part of the
					// on-wire shape for input_to_key.
					ring_members: ringMembers,
					ring_pubkeys: ringPubkeys,
					ring_commits: ringCommits,
				});
			} else {
				let pseudoBlinding = CnRandom.random_scalar();
				let pseudoCommitment = CnTransactions.commit(CnUtils.d2s(new JSBigInt(sources[i].amount).toString()), pseudoBlinding);
				pseudoBlindings.push(pseudoBlinding);
				pseudoCommitments.push(pseudoCommitment);

				tx.vin.push({
					type: "confidential_input",
					ring_members: ringMembers,
					ring_pubkeys: ringPubkeys,
					ring_commits: ringCommits,
					pseudo_commit: pseudoCommitment,
					k_image: sources[i].key_image
				});
			}
		}

		let txkey = CnTransactions.generate_deterministic_tx_keys(tx.vin, keys.view.sec);
		tx.prvkey = txkey.sec;

		if (payment_id) {
			if (pid_encrypt && payment_id.length !== INTEGRATED_ID_SIZE * 2) {
				throw "payment ID must be " + INTEGRATED_ID_SIZE + " bytes to be encrypted!";
			}
			if (pid_encrypt && realDestViewKey) {
				let pid_key = CnUtils.cn_fast_hash(CnNativeBride.generate_key_derivation(realDestViewKey, txkey.sec) + ENCRYPTED_PAYMENT_ID_TAIL.toString(16)).slice(0, INTEGRATED_ID_SIZE * 2);
				payment_id = CnUtils.hex_xor(payment_id, pid_key);
			}
			extra = CnTransactions.add_nonce_to_extra(extra, CnTransactions.get_payment_id_nonce(payment_id, pid_encrypt));
		}
		tx.extra = extra;

		let num_stdaddresses = 0;
		let num_subaddresses = 0;
		let single_dest_subaddress : string = '';
		let unique_dst_addresses : {[key : string] : number} = {};
		for (let i = 0; i < dsts.length; ++i) {
			if (new JSBigInt(dsts[i].amount).compare(0) <= 0) {
				throw "CT output amount must be positive";
			}
			let destKeys = Cn.decode_address(dsts[i].address);
			if(destKeys.view === keys.view.pub) {
				continue;
			}
			if(typeof unique_dst_addresses[dsts[i].address] === 'undefined'){
				unique_dst_addresses[dsts[i].address] = 1;
				if(Cn.is_subaddress(dsts[i].address)){
					++num_subaddresses;
					single_dest_subaddress = dsts[i].address;
				}else{
					++num_stdaddresses;
				}
			}
		}

		if (num_stdaddresses == 0 && num_subaddresses == 1) {
			let uniqueSubaddressDecoded = Cn.decode_address(single_dest_subaddress);
			txkey.pub = CnUtils.ge_scalarmult(uniqueSubaddressDecoded.spend, txkey.sec);
		}

		let additional_tx_keys : string[] = [];
		let additional_tx_public_keys : string[] = [];
		let need_additional_txkeys : boolean = num_subaddresses > 0 && (num_stdaddresses > 0 || num_subaddresses > 1);
		let outputBlindings : string[] = [];
		let outputAmounts : any[] = [];
		let outputCommitments : string[] = [];
		let outputs_money = JSBigInt.ZERO;

		let out_index = 0;
		for (let i = 0; i < dsts.length; ++i) {
			let amount = new JSBigInt(dsts[i].amount);
			let denominationIndex = CnTransactions.denomination_index(amount);
			if (denominationIndex < 0) {
				throw "CT output amount is not a canonical denomination";
			}

			let destKeys = Cn.decode_address(dsts[i].address);
			let additional_txkey : {sec:string, pub:string} = {sec:'', pub:''};
			if(need_additional_txkeys){
				additional_txkey = Cn.random_keypair();
				if(Cn.is_subaddress(dsts[i].address)) {
					additional_txkey.pub = CnUtils.ge_scalarmult(destKeys.spend, additional_txkey.sec);
				}else {
					additional_txkey.pub = CnUtils.ge_scalarmult_base(additional_txkey.sec);
				}
			}

			let out_derivation;
			if(destKeys.view === keys.view.pub) {
				out_derivation = CnNativeBride.generate_key_derivation(txkey.pub, keys.view.sec);
			} else {
				if(Cn.is_subaddress(dsts[i].address) && need_additional_txkeys)
					out_derivation = CnNativeBride.generate_key_derivation(destKeys.view, additional_txkey.sec);
				else
					out_derivation = CnNativeBride.generate_key_derivation(destKeys.view, txkey.sec);
			}

			if (need_additional_txkeys){
				additional_tx_public_keys.push(additional_txkey.pub);
				additional_tx_keys.push(additional_txkey.sec);
			}

			let blinding = CnTransactions.derive_ct_blinding(out_derivation, out_index);
			let commitment = CnTransactions.commit(CnUtils.d2s(amount.toString()), blinding);
			let maskedAmount = CnTransactions.mask_amount(out_derivation, out_index, amount.toString());
			let out_ephemeral_pub = CnNativeBride.derive_public_key(out_derivation, out_index, destKeys.spend);

			tx.vout.push({
				amount: 0,
				target:{
					type: "txout_to_confidential",
					data: {
						target_key: out_ephemeral_pub,
						commitment: commitment,
						masked_amount: maskedAmount
					}
				}
			});
			outputBlindings.push(blinding);
			outputAmounts.push(amount);
			outputCommitments.push(commitment);
			outputs_money = outputs_money.add(amount);
			++out_index;
		}

		tx.extra = CnTransactions.add_pub_key_to_extra(tx.extra, txkey.pub);
		tx.extra = CnTransactions.add_additionnal_pub_keys_to_extra(tx.extra, additional_tx_public_keys);

		if (outputs_money.add(fee_amount).compare(inputs_money) > 0) {
			throw "outputs money (" + Cn.formatMoneyFull(outputs_money) + ") + fee (" + Cn.formatMoneyFull(fee_amount) + ") > inputs money (" + Cn.formatMoneyFull(inputs_money) + ")";
		}

		let signingHash = CnTransactions.get_tx_prefix_hash(tx);
		tx.ct_proofs = [];
		for (let i = 0; i < outputCommitments.length; ++i) {
			tx.ct_proofs.push(CnTransactions.gk_prove(outputCommitments[i], outputAmounts[i], outputBlindings[i], signingHash));
		}

		tx.signatures = [];
		// Per-input signing dispatch — one variant slot per input:
		//   transparent (KeyInput)        → string[] (legacy ring sig per ring member)
		//   confidential (ConfidentialInput) → CTInputSignature (Triptych proof)
		// Triptych signing dominates the per-input cost; log wall-clock for each.
		const tStart = performance.now();
		let tLast = tStart;
		for (let i = 0; i < sources.length; ++i) {
			if (sourceIsTransparent[i]) {
				let ringPubkeys = (tx.vin[i].ring_pubkeys || []);
				let sigs = CnNativeBride.generate_ring_signature(
					signingHash,
					tx.vin[i].k_image,
					ringPubkeys,
					inContexts[i].sec,
					sources[i].real_out
				);
				tx.signatures.push(sigs);
				const tNow = performance.now();
				console.debug("[KeyInput] input " + i +
					" ring=" + ringPubkeys.length +
					" legacy-sig in " + (tNow - tLast).toFixed(1) + " ms");
				tLast = tNow;
			} else {
				tx.signatures.push(CnTransactions.triptych_sign_ct(
					signingHash,
					(tx.vin[i].ring_pubkeys || []),
					(tx.vin[i].ring_commits || []),
					pseudoCommitments[i],
					sources[i].real_out,
					inContexts[i].sec,
					inContexts[i].mask,
					pseudoBlindings[i],
					tx.vin[i].k_image
				));
				const tNow = performance.now();
				console.debug("[Triptych] input " + i +
					" ring=" + (tx.vin[i].ring_pubkeys || []).length +
					" signed in " + (tNow - tLast).toFixed(1) + " ms");
				tLast = tNow;
			}
		}
		if (sources.length > 1) {
			console.debug("[v2-sign] " + sources.length +
				" inputs signed in " + (tLast - tStart).toFixed(1) + " ms total");
		}

		let sumPseudo = CnVars.Z;
		let sumOutputs = CnVars.Z;
		for (let blind of pseudoBlindings) {
			sumPseudo = CnNativeBride.sc_add(sumPseudo, blind);
		}
		for (let blind of outputBlindings) {
			sumOutputs = CnNativeBride.sc_add(sumOutputs, blind);
		}
		tx.kernel = CnTransactions.sign_transaction_kernel(CnNativeBride.sc_sub(sumPseudo, sumOutputs), signingHash);
		return tx;
	}

	export function construct_tx(
		keys : {
			view: {
				pub: string,
				sec: string
			},
			spend: {
				pub: string,
				sec: string
			}
		},
		sources : CnTransactions.Source[],
		dsts : CnTransactions.Destination[],
		fee_amount : any/*JSBigInt*/,
		payment_id : string,
		pid_encrypt : boolean,
		realDestViewKey : string|undefined,
		unlock_time : number = 0,
		rct:boolean,
		accountRegistration:boolean = false
	){
		if (rct) {
			return CnTransactions.construct_ct_tx(keys, sources, dsts, fee_amount, payment_id, pid_encrypt, realDestViewKey, accountRegistration);
		}

		let extra = '';
		if (accountRegistration) {
			extra = CnTransactions.add_account_registration_to_extra(extra, keys.spend.pub, keys.view.pub);
		}
		let tx : CnTransactions.Transaction = {
			unlock_time: unlock_time,
			version: rct ? CURRENT_TX_VERSION : OLD_TX_VERSION,
			extra: extra,
			prvkey: '',
			vin: [],
			vout: [],
			rct_signatures:{
				ecdhInfo:[],
				outPk:[],
				pseudoOuts:[],
				txnFee:'',
				type:0,
			},
			signatures:[]
		};

		if (rct) {
			tx.rct_signatures = {ecdhInfo: [], outPk: [], pseudoOuts: [], txnFee: "", type: 0};
		} else {
			tx.signatures = [];
		}

		let in_contexts = [];
		let inputs_money = JSBigInt.ZERO;
		let i, j;

		console.log('Sources: ');
		//run the for loop twice to sort ins by key image
		//first generate key image and other construction data to sort it all in one go
		for (i = 0; i < sources.length; i++) {
			console.log(i + ': ' + Cn.formatMoneyFull(sources[i].amount));
			if (sources[i].real_out >= sources[i].outputs.length) {
				throw "real index >= outputs.length";
			}
			// inputs_money = inputs_money.add(sources[i].amount);

			// sets res.mask among other things. mask is identity for non-rct transactions
			// and for coinbase ringct (type = 0) txs.
			let res = CnTransactions.generate_key_image_helper_rct(keys, sources[i].real_out_tx_key, sources[i].real_out_in_tx, sources[i].mask); //mask will be undefined for non-rct
			// in_contexts.push(res.in_ephemeral);

			// now we mark if this is ringct coinbase txs. such transactions
			// will have identity mask. Non-ringct txs will have  sources[i].mask set to null.
			// this only works if beckend will produce masks in get_unspent_outs for
			// coinbaser ringct txs.
			//is_rct_coinbases.push((sources[i].mask ? sources[i].mask === I : 0));

			console.log('res.in_ephemeral.pub', res, res.in_ephemeral.pub, sources, i);
			if (res.in_ephemeral.pub !== sources[i].outputs[sources[i].real_out].key) {
				throw "in_ephemeral.pub != source.real_out.key";
			}
			sources[i].key_image = res.image;
			sources[i].in_ephemeral = res.in_ephemeral;
		}
		//sort ins
		sources.sort(function(a,b){
			return JSBigInt.parse(a.key_image, 16).compare(JSBigInt.parse(b.key_image, 16)) * -1 ;
		});
		//copy the sorted sources data to tx
		for (i = 0; i < sources.length; i++) {
			inputs_money = inputs_money.add(sources[i].amount);
			in_contexts.push(sources[i].in_ephemeral);
			let input_to_key : CnTransactions.Vin = {
				type:"input_to_key",
				amount:sources[i].amount,
				k_image:sources[i].key_image,
				key_offsets:[],
			};
			for (j = 0; j < sources[i].outputs.length; ++j) {
				console.log('add to key offsets',sources[i].outputs[j].index, j, sources[i].outputs);
				(input_to_key.key_offsets || []).push(sources[i].outputs[j].index);
			}
			console.log('key offsets before abs',input_to_key.key_offsets);
			input_to_key.key_offsets = CnTransactions.abs_to_rel_offsets(input_to_key.key_offsets || []);
			console.log('key offsets after abs',input_to_key.key_offsets);
			tx.vin.push(input_to_key);
		}
		let txkey = CnTransactions.generate_deterministic_tx_keys(tx.vin, keys.view.sec);
		tx.prvkey = txkey.sec;

		if (payment_id) {
			if (pid_encrypt && payment_id.length !== INTEGRATED_ID_SIZE * 2) {
				throw "payment ID must be " + INTEGRATED_ID_SIZE + " bytes to be encrypted!";
			}
			console.log("Adding payment id: " + payment_id);
			if (pid_encrypt && realDestViewKey) { //get the derivation from our passed viewkey, then hash that + tail to get encryption key
				let pid_key = CnUtils.cn_fast_hash(CnNativeBride.generate_key_derivation(realDestViewKey, txkey.sec) + ENCRYPTED_PAYMENT_ID_TAIL.toString(16)).slice(0, INTEGRATED_ID_SIZE * 2);
				console.log("Txkeys:", txkey, "Payment ID key:", pid_key);
				payment_id = CnUtils.hex_xor(payment_id, pid_key);
			}
			let nonce = CnTransactions.get_payment_id_nonce(payment_id, pid_encrypt);
			console.log("Extra nonce: " + nonce);
			extra = CnTransactions.add_nonce_to_extra(extra, nonce);
		}
		tx.extra = extra;

		let outputs_money = JSBigInt.ZERO;
		let out_index = 0;
		let amountKeys = []; //rct only

		let num_stdaddresses = 0;
		let num_subaddresses = 0;
		let single_dest_subaddress : string = '';

		let unique_dst_addresses : {[key : string] : number} = {};

		for (i = 0; i < dsts.length; ++i) {
			if (new JSBigInt(dsts[i].amount).compare(0) < 0) {
				throw "dst.amount < 0"; //amount can be zero if no change
			}
			let destKeys = Cn.decode_address(dsts[i].address);

			if(destKeys.view === keys.view.pub)//change address
				continue;

			if(typeof unique_dst_addresses[dsts[i].address] === 'undefined'){
				unique_dst_addresses[dsts[i].address] = 1;

				if(Cn.is_subaddress(dsts[i].address)){
					++num_subaddresses;
					single_dest_subaddress = dsts[i].address;
				}else{
					++num_stdaddresses;
				}
			}
		}

		console.log('Destinations resume:', unique_dst_addresses, num_stdaddresses, num_subaddresses );

		if (num_stdaddresses == 0 && num_subaddresses == 1) {
			let uniqueSubaddressDecoded = Cn.decode_address(single_dest_subaddress);
			txkey.pub = CnUtils.ge_scalarmult(uniqueSubaddressDecoded.spend, txkey.sec);
		}

		let additional_tx_keys : string[] = [];
		let additional_tx_public_keys : string[] = [];
		let need_additional_txkeys : boolean = num_subaddresses > 0 && (num_stdaddresses > 0 || num_subaddresses > 1);


		for (i = 0; i < dsts.length; ++i) {
			let destKeys = Cn.decode_address(dsts[i].address);

			let additional_txkey : {sec:string, pub:string} = {sec:'', pub:''};
			if(need_additional_txkeys){
				additional_txkey = Cn.random_keypair();
				if(Cn.is_subaddress(dsts[i].address)) {
					// R = rD for subaddresses
					additional_txkey.pub = CnUtils.ge_scalarmult(destKeys.spend, additional_txkey.sec);
				}else
					additional_txkey.pub = CnUtils.ge_scalarmult_base(additional_txkey.sec);
			}
			let out_derivation;
			if(destKeys.view === keys.view.pub) {
				out_derivation = CnNativeBride.generate_key_derivation(txkey.pub, keys.view.sec);
			} else {
				if(Cn.is_subaddress(dsts[i].address) && need_additional_txkeys)
					out_derivation = CnNativeBride.generate_key_derivation(destKeys.view, additional_txkey.sec);
				else
					out_derivation = CnNativeBride.generate_key_derivation(destKeys.view, txkey.sec);
			}

			if (need_additional_txkeys){
				additional_tx_public_keys.push(additional_txkey.pub);
				additional_tx_keys.push(additional_txkey.sec);
			}

			if (rct) {
				amountKeys.push(CnUtils.derivation_to_scalar(out_derivation, out_index));
			}
			let out_ephemeral_pub = CnNativeBride.derive_public_key(out_derivation, out_index, destKeys.spend);
			let out : CnTransactions.Vout = {
				amount: dsts[i].amount,
				target:{
					type: "txout_to_key",
					data: {
						key: out_ephemeral_pub
					}
				}
			};
			// txout_to_key
			tx.vout.push(out);
			++out_index;
			outputs_money = outputs_money.add(dsts[i].amount);
		}

		// add pub key to extra after we know whether to use R = rG or R = rD
		tx.extra = CnTransactions.add_pub_key_to_extra(tx.extra, txkey.pub);
		tx.extra = CnTransactions.add_additionnal_pub_keys_to_extra(tx.extra, additional_tx_public_keys);

		if (outputs_money.add(fee_amount).compare(inputs_money) > 0) {
			throw "outputs money (" + Cn.formatMoneyFull(outputs_money) + ") + fee (" + Cn.formatMoneyFull(fee_amount) + ") > inputs money (" + Cn.formatMoneyFull(inputs_money) + ")";
		}
		if (!rct) {
			for (i = 0; i < sources.length; ++i) {
				let src_keys : string[] = [];
				for (j = 0; j < sources[i].outputs.length; ++j) {
					src_keys.push(sources[i].outputs[j].key);
				}
				let sigs = CnNativeBride.generate_ring_signature(CnTransactions.get_tx_prefix_hash(tx), tx.vin[i].k_image, src_keys,
					in_contexts[i].sec, sources[i].real_out);
				tx.signatures.push(sigs);
			}
		} else { //rct
			let txnFee = fee_amount;
			let keyimages = [];
			let inSk = [];
			let inAmounts = [];
			let mixRing : {dest:string, mask:string}[][] = [];
			let indices = [];
			for (i = 0; i < tx.vin.length; i++) {
				keyimages.push(tx.vin[i].k_image);
				inSk.push({
					x: in_contexts[i].sec,
					a: in_contexts[i].mask,
				});
				inAmounts.push(tx.vin[i].amount || "0");
				if (in_contexts[i].mask !== CnVars.I) {
					//if input is rct (has a valid mask), 0 out amount
					tx.vin[i].amount = "0";
				}
				mixRing[i] = [];
				for (j = 0; j < sources[i].outputs.length; j++) {
					mixRing[i].push({
						dest: sources[i].outputs[j].key,
						mask: sources[i].outputs[j].commit,
					});
				}
				indices.push(sources[i].real_out);
			}
			let outAmounts: number[] = [];
			for (i = 0; i < tx.vout.length; i++) {
				outAmounts.push(tx.vout[i].amount);
				tx.vout[i].amount = 0; //zero out all rct outputs
			}
			console.log('rc signature----');
			let tx_prefix_hash = CnTransactions.get_tx_prefix_hash(tx);
			console.log('rc signature----');
			tx.rct_signatures = CnTransactions.genRct(tx_prefix_hash, inSk, keyimages, /*destinations, */inAmounts, outAmounts, mixRing, amountKeys, indices, txnFee);

		}
		console.log(tx);
		return tx;
	}

	export function create_transaction(pub_keys:{spend:string,view:string},
									   sec_keys:{spend:string,view:string},
									   dsts : CnTransactions.Destination[],
									   outputs : any[],
									   mix_outs:any[] = [],
									   fake_outputs_count:number,
									   fee_amount : any/*JSBigInt*/,
									   payment_id : string,
									   pid_encrypt : boolean,
									   realDestViewKey : string|undefined,
									   unlock_time : number = 0,
									   rct:boolean,
									   accountRegistration:boolean = false
	) : CnTransactions.Transaction{
		let i, j;
		if (dsts.length === 0) {
			throw 'Destinations empty';
		}
		if (mix_outs.length !== outputs.length && fake_outputs_count !== 0) {
			throw 'Wrong number of mix outs provided (' + outputs.length + ' outputs, ' + mix_outs.length + ' mix outs)';
		}
		for (i = 0; i < mix_outs.length; i++) {
			if ((mix_outs[i].outs || []).length < fake_outputs_count) {
				throw 'Not enough outputs to mix with';
			}
		}
		let keys = {
			view: {
				pub: pub_keys.view,
				sec: sec_keys.view
			},
			spend: {
				pub: pub_keys.spend,
				sec: sec_keys.spend
			}
		};
		if (!Cn.valid_keys(keys.view.pub, keys.view.sec, keys.spend.pub, keys.spend.sec)) {
			throw "Invalid secret keys!";
		}
		let needed_money = JSBigInt.ZERO;
		for (i = 0; i < dsts.length; ++i) {
			needed_money = needed_money.add(dsts[i].amount);
			if (needed_money.compare(UINT64_MAX) !== -1) {
				throw "Output overflow!";
			}
		}
		let found_money = JSBigInt.ZERO;
		let sources : CnTransactions.Source[] = [];
		console.log('Selected transfers: ', outputs);
		for (i = 0; i < outputs.length; ++i) {
			found_money = found_money.add(outputs[i].amount);
			if (found_money.compare(UINT64_MAX) !== -1) {
				throw "Input overflow!";
			}
			let src : CnTransactions.Source = {
				outputs: [],
				amount: '',
				ring_amount: '',
				real_out_tx_key:'',
				real_out:0,
				real_out_in_tx:0,
				mask:null,
				key_image:'',
				in_ephemeral:{
					pub: '',
					sec: '',
					mask: ''
				}
			};
			src.amount = new JSBigInt(outputs[i].amount).toString();
			let isConfidentialRealOutput = !!(outputs[i].ctCommitment || outputs[i].ctMaskedAmount || outputs[i].commitment || outputs[i].masked_amount);
			src.ring_amount = outputs[i].ring_amount || outputs[i].ringAmount || (isConfidentialRealOutput ? CT_CONFIDENTIAL_OUTPUT_AMOUNT : src.amount);
			if (mix_outs.length !== 0) { // if mixin
				// Sort fake outputs by global index
				console.log('mix outs before sort',mix_outs[i].outs);
				mix_outs[i].outs.sort(function(a:any, b:any) {
					return new JSBigInt(a.global_index).compare(b.global_index);
				});
				j = 0;

				console.log('mix outs sorted',mix_outs[i].outs);

				while ((src.outputs.length < fake_outputs_count) && (j < mix_outs[i].outs.length)) {
					let out = mix_outs[i].outs[j];
					console.log('chekcing mixin');
					console.log("out: ", out);
					console.log("output ", i, ": ", outputs[i]);
					if (new JSBigInt(out.global_index).compare(outputs[i].global_index) === 0) {
						console.log('got mixin the same as output, skipping');
						j++;
						continue;
					}
					let mixCommitment = out.commitment || out.ctCommitment || out.ct_commitment || out.commit || '';
					if (!mixCommitment && out.rct) {
						mixCommitment = out.rct.slice(0, 64);
					}
					if (rct && !mixCommitment) {
						if (src.ring_amount === CT_CONFIDENTIAL_OUTPUT_AMOUNT) {
							throw "mix CT outs missing commitment";
						}
						mixCommitment = CnTransactions.zeroCommit(CnUtils.d2s(src.amount));
					}
					let oe : Output = {
						index:out.global_index.toString(),
						key:out.public_key || out.key || out.target_key,
						commit:mixCommitment,
						amount: src.ring_amount, // bucket this decoy was queried from
					};
					/*
					if (rct){
						if (out.rct){
							oe.commit = out.rct.slice(0,64); //add commitment from rct mix outs
						} else {
							if (outputs[i]['rct']) {throw "mix rct outs missing commit";}
							oe.commit = zeroCommit(CnUtils.d2s(src.amount)); //create identity-masked commitment for non-rct mix input
						}
					}

					 */
					src.outputs.push(oe);
					j++;
				}
			} // end of if mixin
			let real_oe : Output = {
				index:new JSBigInt(outputs[i].global_index || 0).toString(),
				key:outputs[i].public_key || outputs[i].key || outputs[i].target_key,
				commit:'',
				amount: src.ring_amount, // bucket the real spend lives in
			};
			if (rct) {
				real_oe.commit = outputs[i].ctCommitment || outputs[i].commitment || '';
				if (outputs[i].rct && !real_oe.commit) {
					real_oe.commit = outputs[i].rct.slice(0, 64);
				}
				if (!real_oe.commit) {
					real_oe.commit = CnTransactions.zeroCommit(CnUtils.d2s(src.amount));
				}
			}
			console.log('OUT FOR REAL:',outputs[i].global_index);
			/*
			if (rct){
				if (outputs[i].rct) {
					real_oe.commit = outputs[i].rct.slice(0,64); //add commitment for real input
				} else {
					console.log('ZERO COMMIT');
					real_oe.commit = zeroCommit(CnUtils.d2s(src.amount)); //create identity-masked commitment for non-rct input
				}
			}

			 */
			let real_index = src.outputs.length;
			for (j = 0; j < src.outputs.length; j++) {
				if (new JSBigInt(real_oe.index).compare(src.outputs[j].index) < 0) {
					real_index = j;
					break;
				}
			}
			// Add real_oe to outputs
			console.log('inserting real ouput at index', real_index, real_oe, outputs[i], i);
			src.outputs.splice(real_index, 0, real_oe);
			src.real_out_tx_key = outputs[i].tx_pub_key;
			// Real output entry index
			src.real_out = real_index;
			src.real_out_in_tx = outputs[i].index;
			console.log('check mask', outputs, rct, i);
			if (rct) {
				src.mask = outputs[i].ctBlinding || outputs[i].mask || null;
				if (!src.mask && src.ring_amount === CT_CONFIDENTIAL_OUTPUT_AMOUNT) {
					throw "Missing CT blinding for selected confidential output";
				}
				if (!src.mask) {
					src.mask = CnVars.Z;
				}
			}
			/*
			if (rct){
				if (outputs[i].rct) {
					src.mask = outputs[i].rct.slice(64,128); //encrypted or idenity mask for coinbase txs.
				} else {
					console.log('NULL MASK');
					src.mask = null; //will be set by generate_key_image_helper_rct
				}
			}

			 */
			sources.push(src);
		}
		console.log('sources: ', sources);
		let change = {
			amount: JSBigInt.ZERO
		};
		let cmp = needed_money.compare(found_money);
		if (cmp < 0) {
			change.amount = found_money.subtract(needed_money);
			if (change.amount.compare(fee_amount) !== 0) {
				throw "early fee calculation != later";
			}
		} else if (cmp > 0) {
			throw "Need more money than found! (have: " + Cn.formatMoney(found_money) + " need: " + Cn.formatMoney(needed_money) + ")";
		}
		return CnTransactions.construct_tx(keys, sources, dsts, fee_amount, payment_id, pid_encrypt, realDestViewKey, unlock_time, rct, accountRegistration);
	}
}

