import Config from '../config';
import $q from 'q';

export default function CryptoWorker() {
    var webWorker = false;
    var naClEmbed = false;
    // var taskID = 0;
    // var awaiting = {};
    var webCrypto = Config.Modes.webcrypto && window.crypto && (window.crypto.subtle || window.crypto.webkitSubtle); /* || window.msCrypto && window.msCrypto.subtle*/
    var useSha1Crypto = webCrypto && webCrypto.digest !== undefined;
    var useSha256Crypto = webCrypto && webCrypto.digest !== undefined;

    function performTaskWorker(taskName, data, embed) {

        // var taskID = e.data.taskID, result;

        switch (taskName) {
            case 'factorize':
                result = pqPrimeFactorization(data.bytes);
                break;

            case 'mod-pow':
                result = bytesModPow(data.x, data.y, data.m);
                break;

            case 'sha1-hash':
                result = sha1HashSync(data.bytes);
                break;

            case 'aes-encrypt':
                result = aesEncryptSync(data.bytes, data.keyBytes, data.ivBytes);
                break;

            case 'aes-decrypt':
                result = aesDecryptSync(data.encryptedBytes, data.keyBytes, data.ivBytes);
                break;

            default:
                throw new Error('Unknown task: ' + data.task);
        }
    }

    // // var finalizeTask = function (taskID, result) {
    // //     var deferred = awaiting[taskID];
    // //     if (deferred !== undefined) {            
    // //         deferred.resolve(result);
    // //         delete awaiting[taskID];
    // //     }
    // // };

    // // if (Config.Modes.nacl && navigator.mimeTypes && navigator.mimeTypes['application/x-pnacl'] !== undefined) {

    // //     var listener = $('<div id="nacl_listener"><embed id="mtproto_crypto" width="0" height="0" src="nacl/mtproto_crypto.nmf" type="application/x-pnacl" /></div>').appendTo($('body'))[0];

    // //     listener.addEventListener('load', function (e) {
    // //         naClEmbed = listener.firstChild;
    // //         console.log(dT(), 'NaCl ready');
    // //     }, true);

    // //     listener.addEventListener('message', function (e) {
    // //         finalizeTask(e.data.taskID, e.data.result);
    // //     }, true);

    // //     listener.addEventListener('error', function (e) {
    // //         console.error('NaCl error', e);
    // //     }, true);
    // // }

    // // if (window.Worker) {        
    // //     var tmpWorker = new Worker('./scripts/crypto_worker.js');
    // //     tmpWorker.onmessage = function (e) {
    // //         if (!webWorker) {
    // //             webWorker = tmpWorker;
    // //         } else {
    // //             finalizeTask(e.data.taskID, e.data.result);
    // //         }
    // //     };

    // //     tmpWorker.onerror = function (error) {
    // //         console.error('CW error', error, error.stack);
    // //         webWorker = false;
    // //     };
    // // }

    // // function performTaskWorker(task, params, embed) {
    // //     // console.log(dT(), 'CW start', task)
    // //     var deferred = $q.defer();

    // //     awaiting[taskID] = deferred;

    // //     params.task = task;
    // //     params.taskID = taskID; 
    // //     (embed || webWorker).postMessage(params);

    // //     taskID++;

    // //     return deferred.promise;
    // // }

    return {
        sha1Hash: function (bytes) {
            if (useSha1Crypto) {

                // We don't use buffer since typedArray.subarray(...).buffer gives the whole buffer and not sliced one. webCrypto.digest supports typed array
                var deferred = $q.defer();
                var bytesTyped = Array.isArray(bytes) ? convertToUint8Array(bytes) : bytes;
                // console.log(dT(), 'Native sha1 start')
                webCrypto.digest({ name: 'SHA-1' }, bytesTyped).then(function (digest) {
                    ;
                    // console.log(dT(), 'Native sha1 done')
                    deferred.resolve(digest);
                }, function (e) {
                    console.error('Crypto digest error', e);
                    useSha1Crypto = false;
                    deferred.resolve(sha1HashSync(bytes));
                });

                return deferred.promise;
            }

            return sha1HashSync(bytes);
        },
        sha256Hash: function (bytes) {
            if (useSha256Crypto) {
                var deferred = $q.defer();
                var bytesTyped = Array.isArray(bytes) ? convertToUint8Array(bytes) : bytes;
                // console.log(dT(), 'Native sha1 start')
                webCrypto.digest({ name: 'SHA-256' }, bytesTyped).then(function (digest) {
                    // console.log(dT(), 'Native sha1 done')
                    deferred.resolve(digest);
                }, function (e) {
                    console.error('Crypto digest error', e);
                    useSha256Crypto = false;
                    deferred.resolve(sha256HashSync(bytes));
                });

                return deferred.promise;
            }

            return sha256HashSync(bytes);
        },
        aesEncrypt: function (bytes, keyBytes, ivBytes) {
            if (naClEmbed) {
                return performTaskWorker('aes-encrypt', {
                    bytes: addPadding(convertToArrayBuffer(bytes)),
                    keyBytes: convertToArrayBuffer(keyBytes),
                    ivBytes: convertToArrayBuffer(ivBytes)
                }, naClEmbed);
            }

            return convertToArrayBuffer(aesEncryptSync(bytes, keyBytes, ivBytes));
        },
        aesDecrypt: function (encryptedBytes, keyBytes, ivBytes) {
            if (naClEmbed) {
                return performTaskWorker('aes-decrypt', {
                    encryptedBytes: addPadding(convertToArrayBuffer(encryptedBytes)),
                    keyBytes: convertToArrayBuffer(keyBytes),
                    ivBytes: convertToArrayBuffer(ivBytes)
                }, naClEmbed);
            }

            return convertToArrayBuffer(aesDecryptSync(encryptedBytes, keyBytes, ivBytes));
        },
        factorize: function (bytes) {
            bytes = convertToByteArray(bytes);
            if (naClEmbed && bytes.length <= 8) {
                return performTaskWorker('factorize', { bytes: bytes }, naClEmbed);
            }
            if (webWorker) {
                return performTaskWorker('factorize', { bytes: bytes });
            }

            return pqPrimeFactorization(bytes);
        },
        modPow: function (x, y, m) {
            if (webWorker) {
                return performTaskWorker('mod-pow', {
                    x: x,
                    y: y,
                    m: m
                });
            }

            return bytesModPow(x, y, m);
        }
    };
};