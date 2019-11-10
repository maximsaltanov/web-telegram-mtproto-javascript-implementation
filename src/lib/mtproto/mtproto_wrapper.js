import MtpAuthorizer from './mtpAuthorizer';
import { bytesToHex } from './bin_utils';
import { MtpNetworkerFactory } from './mtpNetworkFactory';
import $q from 'q';

const mtpAuthorizer = new MtpAuthorizer();
const mtpNetworkerFactory = new MtpNetworkerFactory();

export default function MtpApiManager() {

  var cachedNetworkers = {};
  // // var cachedUploadNetworkers = {};
  ////var cachedExportPromise = {};
  var baseDcID = false;

  ///var telegramMeNotified;
  ////!!!!MtpSingleInstanceService.start();

  // Storage.get('dc').then(function (dcID) {
  //   if (dcID) {
  //     baseDcID = dcID;
  //   }
  // });

  // function mtpSetUserAuth(dcID, userAuth) {
  //   var fullUserAuth = angular.extend({ dcID: dcID }, userAuth);
  //   Storage.set({
  //     dc: dcID,
  //     user_auth: fullUserAuth
  //   });

  //   ////!!!!telegramMeNotify(true);
  //   ////!!!!$rootScope.$broadcast('user_auth', fullUserAuth);

  //   baseDcID = dcID;
  // }

  // function mtpLogOut() {
  //   var storageKeys = [];
  //   for (var dcID = 1; dcID <= 5; dcID++) {
  //     storageKeys.push('dc' + dcID + '_auth_key');
  //   }

  //   ////WebPushApiManager.forceUnsubscribe();

  //   return Storage.get(storageKeys).then(function (storageResult) {
  //     var logoutPromises = [];
  //     for (var i = 0; i < storageResult.length; i++) {
  //       if (storageResult[i]) {
  //         logoutPromises.push(mtpInvokeApi('auth.logOut', {}, { dcID: i + 1, ignoreErrors: true }));
  //       }
  //     }

  //     return $q.all(logoutPromises).then(function () {
  //       Storage.remove('dc', 'user_auth');
  //       baseDcID = false;
  //       ////!!!!telegramMeNotify(false);
  //       return mtpClearStorage();
  //     }, function (error) {
  //       storageKeys.push('dc', 'user_auth');
  //       Storage.remove(storageKeys);
  //       baseDcID = false;
  //       error.handled = true;
  //       ////!!!!telegramMeNotify(false);
  //       return mtpClearStorage();
  //     });
  //   });
  // }

  // function mtpClearStorage() {
  //   var saveKeys = ['user_auth', 't_user_auth', 'dc', 't_dc'];
  //   for (var dcID = 1; dcID <= 5; dcID++) {
  //     saveKeys.push('dc' + dcID + '_auth_key');
  //     saveKeys.push('t_dc' + dcID + '_auth_key');
  //   }

  //   Storage.noPrefix();
  //   Storage.get(saveKeys).then(function (values) {
  //     Storage.clear().then(function () {
  //       var restoreObj = {};
  //       angular.forEach(saveKeys, function (key, i) {
  //         var value = values[i];
  //         if (value !== false && value !== undefined) {
  //           restoreObj[key] = value;
  //         }
  //       });

  //       Storage.noPrefix();
  //       return Storage.set(restoreObj);
  //     });
  //   });
  // }

  // function mtpGetNetworker(dcID, options) {
  //   options = options || {};

  //   var cache = cachedNetworkers;

  //   // // var cache = (options.fileUpload || options.fileDownload)
  //   // //   ? cachedUploadNetworkers
  //   // //   : cachedNetworkers;

  //   if (!dcID) {
  //     throw new Exception('get Networker without dcID');
  //   }

  //   // if (cache[dcID] !== undefined) {
  //   //   return qSync.when(cache[dcID]);
  //   // }

  //    var akk = 'dc' + dcID + '_auth_key';
  //     var ssk = 'dc' + dcID + '_server_salt';

  //   // // return Storage.get(akk, ssk).then(function (result) {
  //   // //   if (cache[dcID] !== undefined) {
  //   // //     return cache[dcID];
  //   // //   }

  //   // //   var authKeyHex = result[0];
  //   // //   var serverSaltHex = result[1];

  //   // //   // console.log('ass', dcID, authKeyHex, serverSaltHex)

  //   // //   if (authKeyHex && authKeyHex.length == 512) {
  //   // //     if (!serverSaltHex || serverSaltHex.length != 16) {
  //   // //       serverSaltHex = 'AAAAAAAAAAAAAAAA';
  //   // //     }

  //   // //     var authKey = bytesFromHex(authKeyHex);
  //   // //     var serverSalt = bytesFromHex(serverSaltHex);

  //   // //     return cache[dcID] = MtpNetworkerFactory.getNetworker(dcID, authKey, serverSalt, options);
  //   // //   }

  //   // //   if (!options.createNetworker) {
  //   // //     return $q.reject({ type: 'AUTH_KEY_EMPTY', code: 401 });
  //   // //   }        

  //   return mtpAuthorizer.auth(dcID).then(function (auth) {
  //     var storeObj = {};
  //     storeObj[akk] = bytesToHex(auth.authKey);
  //     storeObj[ssk] = bytesToHex(auth.serverSalt);      
  //     return cache[dcID] = mtpNetworkerFactory.getNetworker(dcID, auth.authKey, auth.serverSalt, options);      
      
  //   }, function (error) {
  //     console.log('Get networker error', error, error.stack);
  //     return $q.reject(error);
  //   });
  // }

  function mtpGetNetworker (dcID, options) {
    options = options || {};

    var cache = (options.fileUpload || options.fileDownload)
      ? cachedUploadNetworkers
      : cachedNetworkers;

    if (!dcID) {
      throw new Exception('get Networker without dcID');
    }

    // if (cache[dcID] !== undefined) {
    //   return qSync.when(cache[dcID]);
    // }

    var akk = 'dc' + dcID + '_auth_key';
    var ssk = 'dc' + dcID + '_server_salt';

    ////return Storage.get(akk, ssk).then(function (result) {
            
      return mtpAuthorizer.auth(dcID).then(function (auth) {
        var storeObj = {};
        storeObj[akk] = bytesToHex(auth.authKey);
        storeObj[ssk] = bytesToHex(auth.serverSalt);
        ////Storage.set(storeObj);

        return cache[dcID] = mtpNetworkerFactory.getNetworker(dcID, auth.authKey, auth.serverSalt, options);
      }, function (error) {
        console.log('Get networker error', error, error.stack);
        return $q.reject(error);
      });
    ////})
  }

  function mtpInvokeApi(method, params, options) {
    options = options || {};

    var deferred = $q.defer();

    var rejectPromise = function (error) {
      if (!error) {
        error = { type: 'ERROR_EMPTY' };
      } else if (!angular.isObject(error)) {
        error = { message: error };
      }

      deferred.reject(error);
      if (options.ignoreErrors) {
        return;
      }

      if (error.code == 406) {
        error.handled = true;
      }

      if (!options.noErrorBox) {
        error.input = method;
        error.stack = stack || (error.originalError && error.originalError.stack) || error.stack || (new Error()).stack;
        setTimeout(function () {
          if (!error.handled) {
            if (error.code == 401) {
              // mtpLogOut()['finally'](function () {
              //   if (location.protocol == 'http:' && !Config.Modes.http &&
              //     Config.App.domains.indexOf(location.hostname) != -1) {
              //     location.href = location.href.replace(/^http:/, 'https:');
              //   } else {
              //     location.hash = '/signin';
              //     AppRuntimeManager.reload();
              //   }
              // });
            } else {
              ErrorService.show({ error: error });
            }
            error.handled = true;
          }
        }, 100);
      }
    },
      dcID;

    var cachedNetworker;
    var stack = (new Error()).stack || 'empty stack';

    var performRequest = function (networker) {
      var performRequestPromise = (cachedNetworker = networker).wrapApiCall(method, params, options);

      return performRequestPromise.then(
        function (result) {
          deferred.resolve(result);
        },
        function (error) {
          console.error(dT(), 'Error', error.code, error.type, baseDcID, dcID);

          if (error.code == 401 && baseDcID == dcID) {
            // Storage.remove('dc', 'user_auth');
            // telegramMeNotify(false);
            rejectPromise(error);
          }

          else if (error.code == 401 && baseDcID && dcID != baseDcID) {
            if (cachedExportPromise[dcID] === undefined) {
              var exportDeferred = $q.defer();

              mtpInvokeApi('auth.exportAuthorization', { dc_id: dcID }, { noErrorBox: true }).then(function (exportedAuth) {
                mtpInvokeApi('auth.importAuthorization', {
                  id: exportedAuth.id,
                  bytes: exportedAuth.bytes
                }, { dcID: dcID, noErrorBox: true }).then(function () {
                  exportDeferred.resolve();
                }, function (e) {
                  exportDeferred.reject(e);
                });
              }, function (e) {
                exportDeferred.reject(e);
              });

              cachedExportPromise[dcID] = exportDeferred.promise;
            }

            cachedExportPromise[dcID].then(function () {
              (cachedNetworker = networker).wrapApiCall(method, params, options).then(function (result) {
                deferred.resolve(result);
              }, rejectPromise);
            }, rejectPromise);
          }
          else if (error.code == 303) {
            var newDcID = error.type.match(/^(PHONE_MIGRATE_|NETWORK_MIGRATE_|USER_MIGRATE_)(\d+)/)[2];
            if (newDcID != dcID) {
              if (options.dcID) {
                options.dcID = newDcID;
              } else {
                ////Storage.set({dc: baseDcID = newDcID});
              }

              mtpGetNetworker(newDcID, options).then(function (networker) {
                networker.wrapApiCall(method, params, options).then(function (result) {
                  deferred.resolve(result);
                }, rejectPromise);
              }, rejectPromise);
            }
          }
          else if (!options.rawError && error.code == 420) {
            var waitTime = error.type.match(/^FLOOD_WAIT_(\d+)/)[1] || 10;
            if (waitTime > (options.timeout || 60)) {
              return rejectPromise(error);
            }
            setTimeout(function () {
              performRequest(cachedNetworker);
            }, waitTime * 1000);
          }
          else if (!options.rawError && (error.code == 500 || error.type == 'MSG_WAIT_FAILED')) {
            var now = new Date().getTime();
            if (options.stopTime) {
              if (now >= options.stopTime) {
                return rejectPromise(error);
              }
            } else {
              options.stopTime = now + (options.timeout !== undefined ? options.timeout : 10) * 1000;
            }
            options.waitTime = options.waitTime ? Math.min(60, options.waitTime * 1.5) : 1;
            setTimeout(function () {
              performRequest(cachedNetworker);
            }, options.waitTime * 1000);
          } else {
            rejectPromise(error);
          }
        });
    };

    if (dcID = (options.dcID || baseDcID)) {
      mtpGetNetworker(dcID, options).then(performRequest, rejectPromise);
    } else {
      ////Storage.get('dc').then(function (baseDcID) {
      mtpGetNetworker(dcID = baseDcID || 2, options).then(performRequest, rejectPromise);
      ////})
    }

    return deferred.promise;
  }

  function mtpGetUserID() {
    ////return Storage.get('user_auth').then(function (auth) {
    ////!!!!telegramMeNotify(auth && auth.id > 0 || false);
    return auth.id || 0;
    ////});
  }

  function getBaseDcID() {
    return baseDcID || false;
  }

  return {
    getBaseDcID: getBaseDcID,
    getUserID: mtpGetUserID,
    invokeApi: mtpInvokeApi,
    getNetworker: mtpGetNetworker
    ////setUserAuth: mtpSetUserAuth,
    ////logOut: mtpLogOut
  };
};