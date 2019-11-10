import Config from '../config';

import MtpDcConfigurator from './mtpDcConfigurator';
import TLSerialization from './tlSerialization';
import TLDeserialization from './tlDeserialization';
import MtpTimeManager from './mtpTimeManager';
import CryptoWorker from './cryptoWorker';
import httpClient from './http';

import {
  nextRandomInt, bytesCmp, bytesToHex, sha1BytesSync, bytesToArrayBuffer, convertToUint8Array, bufferConcat
} from './bin_utils';

import $q from 'q';
import { generateSecureRandomBytes } from './vendor/jsbn_combined';
import Utils from '../utils';

const mtpDcConfigurator = new MtpDcConfigurator();
const mtpTimeManager = new MtpTimeManager();
const cryptoWorker = new CryptoWorker();

export function MtpNetworkerFactory() {
  var updatesProcessor;  
  var offlineInited = false;
  var akStopped = false;
  var chromeMatches = navigator.userAgent.match(/Chrome\/(\d+(\.\d+)?)/);
  var chromeVersion = chromeMatches && parseFloat(chromeMatches[1]) || false;
  var xhrSendBuffer = !('ArrayBufferView' in window) && (chromeVersion > 0 && chromeVersion < 30);  
  
  function MtpNetworker(dcID, authKey, serverSalt, options) {
    console.log('MtpNetworker');

    options = options || {};

    this.dcID = dcID;

    this.authKey = authKey;
    this.authKeyUint8 = convertToUint8Array(authKey);
    this.authKeyID = sha1BytesSync(authKey).slice(-8);

    this.serverSalt = serverSalt;

    this.upload = options.fileUpload || options.fileDownload || false;

    this.updateSession();

    this.lastServerMessages = [];

    this.checkConnectionPeriod = 0;

    this.sentMessages = {};

    this.pendingMessages = {};
    this.pendingAcks = [];
    this.pendingResends = [];
    this.connectionInited = false;
    
    this.longPollInt = setInterval(this.checkLongPoll.bind(this), 10000);

    this.checkLongPoll();

    if (!offlineInited) {
      offlineInited = true;
      // $rootScope.offline = true;
      // $rootScope.offlineConnecting = true;
    }

    // if (Config.Navigator.mobile) {
    //   this.setupMobileSleep();
    // }
  }

  MtpNetworker.prototype.updateSession = function () {
    console.log('updateSession');
    this.seqNo = 0;
    this.prevSessionID = this.sessionID;
    this.sessionID = new Array(8);

    this.sessionID = generateSecureRandomBytes(this.sessionID);    
  };

  // MtpNetworker.prototype.setupMobileSleep = function () {

  //   var self = this;

  //   $rootScope.$watch('idle.isIDLE', function (isIDLE) {
  //     if (isIDLE) {
  //       self.sleepAfter = new Date().getTime() + 30000;
  //     } else {
  //       delete self.sleepAfter;
  //       self.checkLongPoll();
  //     }
  //   });

  //   $rootScope.$on('push_received', function () {
  //     // console.log(dT(), 'push recieved', self.sleepAfter)
  //     if (self.sleepAfter) {
  //       self.sleepAfter = new Date().getTime() + 30000;
  //       self.checkLongPoll();
  //     }
  //   });
  // };

  MtpNetworker.prototype.updateSentMessage = function (sentMessageID) {
    console.log('updateSentMessage');

    var sentMessage = this.sentMessages[sentMessageID];
    if (!sentMessage) {
      return false;
    }

    var self = this;
    if (sentMessage.container) {
      var newInner = [];

      // angular.forEach(sentMessage.inner, function (innerSentMessageID) {
      //   var innerSentMessage = self.updateSentMessage(innerSentMessageID);
      //   if (innerSentMessage) {
      //     newInner.push(innerSentMessage.msg_id);
      //   }
      // });

      if (Object.keys(sentMessage.inner).length > 0) {

        ////(sentMessage.inner).forEach(function (innerSentMessageID) {
        for(var item in (sentMessage.inner)) {
          var innerSentMessageID = (sentMessage.inner)[item];
          var innerSentMessage = self.updateSentMessage(innerSentMessageID);
          if (innerSentMessage) {
            newInner.push(innerSentMessage.msg_id);
          }
        ///});
        }
      }

      sentMessage.inner = newInner;
    };

    sentMessage.msg_id = mtpTimeManager.generateID();
    sentMessage.seq_no = this.generateSeqNo(
      sentMessage.notContentRelated ||
      sentMessage.container
    );

    this.sentMessages[sentMessage.msg_id] = sentMessage;
    delete self.sentMessages[sentMessageID];

    return sentMessage;
  };

  MtpNetworker.prototype.generateSeqNo = function (notContentRelated) {
    console.log('generateSeqNo');

    var seqNo = this.seqNo * 2;

    if (!notContentRelated) {
      seqNo++;
      this.seqNo++;
    }

    return seqNo;
  };

  MtpNetworker.prototype.wrapMtpCall = function (method, params, options) {
    console.log('wrapMtpCall');

    var serializer = new TLSerialization({ mtproto: true });

    serializer.storeMethod(method, params);

    var messageID = mtpTimeManager.generateID();
    var seqNo = this.generateSeqNo();
    var message = {
      msg_id: messageID,
      seq_no: seqNo,
      body: serializer.getBytes()
    };

    // if (Config.Modes.debug) {
    //   console.log('MT call', method, params, messageID, seqNo);
    // }

    return this.pushMessage(message, options);
  };

  MtpNetworker.prototype.wrapMtpMessage = function (object, options) {
    console.log('wrapMtpMessage');

    options = options || {};

    var serializer = new TLSerialization({ mtproto: true });
    serializer.storeObject(object, 'Object');

    var messageID = MtpTimeManager.generateID();
    var seqNo = this.generateSeqNo(options.notContentRelated);
    var message = {
      msg_id: messageID,
      seq_no: seqNo,
      body: serializer.getBytes()
    };

    // if (Config.Modes.debug) {
    //   console.log('MT message', object, messageID, seqNo);
    // }

    return this.pushMessage(message, options);
  };

  MtpNetworker.prototype.wrapApiCall = function (method, params, options) {
    console.log('wrapApiCall');

    var serializer = new TLSerialization(options);

    if (!this.connectionInited) {
      serializer.storeInt(0xda9b0d0d, 'invokeWithLayer');
      serializer.storeInt(Config.Schema.API.layer, 'layer');
      serializer.storeInt(0xc7481da6, 'initConnection');
      serializer.storeInt(Config.App.id, 'api_id');
      serializer.storeString(navigator.userAgent || 'Unknown UserAgent', 'device_model');
      serializer.storeString(navigator.platform || 'Unknown Platform', 'system_version');
      serializer.storeString(Config.App.version, 'app_version');
      serializer.storeString(navigator.language || 'en', 'system_lang_code');
      serializer.storeString('', 'lang_pack');
      serializer.storeString(navigator.language || 'en', 'lang_code');
    }

    if (options.afterMessageID) {
      serializer.storeInt(0xcb9f372d, 'invokeAfterMsg');
      serializer.storeLong(options.afterMessageID, 'msg_id');
    }

    options.resultType = serializer.storeMethod(method, params);

    var messageID = mtpTimeManager.generateID();
    var seqNo = this.generateSeqNo();
    var message = {
      msg_id: messageID,
      seq_no: seqNo,
      body: serializer.getBytes(true),
      isAPI: true
    };

    ////if (Config.Modes.debug) {
    //  console.log('Api call', method, params, messageID, seqNo, options);
    // } else {
      console.log('Api call', method);
    // }

    return this.pushMessage(message, options);
  };

  MtpNetworker.prototype.checkLongPoll = function (force) {
    console.log('checkLongPoll');

    var isClean = this.cleanupSent();
    ////console.log('Check lp', this.longPollPending, new Date().getTime(), this.dcID, isClean);

    if (this.longPollPending && new Date().getTime() < this.longPollPending || this.offline || akStopped) {
      return false;
    }

    var self = this;

    // Storage.get('dc').then(function (baseDcID) {    
      var baseDcID = false;
      if (isClean && (
        baseDcID != self.dcID ||
        self.upload ||
        self.sleepAfter && new Date().getTime() > self.sleepAfter
      )) {
        ////console.warn('Send long-poll for DC is delayed', self.dcID, self.sleepAfter);
        return;
      }

      self.sendLongPoll();
    // });

  };

  MtpNetworker.prototype.sendLongPoll = function () {
    console.log('sendLongPoll');

    var maxWait = 25000;
    var self = this;

    this.longPollPending = new Date().getTime() + maxWait;
    ////console.log('Set lp', this.longPollPending, new Date().getTime());

    this.wrapMtpCall('http_wait', {
      max_delay: 500,
      wait_after: 150,
      max_wait: maxWait
    }, {
      noResponse: true,
      longPoll: true
    }).then(function () {
      delete self.longPollPending;

      ////setZeroTimeout(self.checkLongPoll.bind(self));
      self.checkLongPoll.bind(self);

    }, function (error) {
      console.log('Long-poll failed', error);
    });
  };

  MtpNetworker.prototype.pushMessage = function (message, options) {
    console.log('pushMessage', message);

    var deferred = $q.defer();
    
    ////this.sentMessages[message.msg_id] = angular.extend(message, options || {}, { deferred: deferred });    
    this.sentMessages[message.msg_id] = Object.assign(message, options || {}, { deferred: deferred });    

    ////if (Object.keys(this.pendingMessages).length > 0) {
      this.pendingMessages[message.msg_id] = 0;
    ////}

    if (!options || !options.noShedule) {
      this.sheduleRequest();
    }
    if (Utils.isObject(options)) {
      options.messageID = message.msg_id;
    }

    return deferred.promise;
  };

  MtpNetworker.prototype.pushResend = function (messageID, delay) {
    console.log('pushResend');

    var value = delay ? new Date().getTime() + delay : 0;
    var sentMessage = this.sentMessages[messageID];
    if (sentMessage.container) {
      for (var i = 0; i < sentMessage.inner.length; i++) {
        this.pendingMessages[sentMessage.inner[i]] = value;
      }
    } else {
      this.pendingMessages[messageID] = value;
    }

    // console.log('Resend due', messageID, this.pendingMessages)
    this.sheduleRequest(delay);
  };

  MtpNetworker.prototype.getMsgKey = function (dataWithPadding, isOut) {    

    console.log('getMsgKey');

    var authKey = this.authKeyUint8;
    var x = isOut ? 0 : 8;
    var msgKeyLargePlain = bufferConcat(authKey.subarray(88 + x, 88 + x + 32), dataWithPadding);
        
    return cryptoWorker.sha256Hash(msgKeyLargePlain).then(function (msgKeyLarge) {
      var msgKey = new Uint8Array(msgKeyLarge).subarray(8, 24);
      return msgKey;
    });    
  };

  MtpNetworker.prototype.getAesKeyIv = function (msgKey, isOut) {
    console.log('getAesKeyIv');

    var authKey = this.authKeyUint8;
    var x = isOut ? 0 : 8;
    var sha2aText = new Uint8Array(52);
    var sha2bText = new Uint8Array(52);
    var promises = {};

    sha2aText.set(msgKey, 0);
    sha2aText.set(authKey.subarray(x, x + 36), 16);                
    promises.sha2a = cryptoWorker.sha256Hash(sha2aText);

    sha2bText.set(authKey.subarray(40 + x, 40 + x + 36), 0);
    sha2bText.set(msgKey, 36);        
    promises.sha2b = cryptoWorker.sha256Hash(sha2bText);

    return $q.all(promises).then(function (result) {
      console.log('$q.all(promises)');
      var aesKey = new Uint8Array(32);
      var aesIv = new Uint8Array(32);
      var sha2a = new Uint8Array(result.sha2a);
      var sha2b = new Uint8Array(result.sha2b);

      aesKey.set(sha2a.subarray(0, 8));
      aesKey.set(sha2b.subarray(8, 24), 8);
      aesKey.set(sha2a.subarray(24, 32), 24);

      aesIv.set(sha2b.subarray(0, 8));
      aesIv.set(sha2a.subarray(8, 24), 8);
      aesIv.set(sha2b.subarray(24, 32), 24);

      return [aesKey, aesIv];
    });
  };

  MtpNetworker.prototype.checkConnection = function (event) {

    //$rootScope.offlineConnecting = true;

    console.log('Check connection', event);

    ////$timeout.cancel(this.checkConnectionPromise);
    clearTimeout(this.checkConnectionPromise);

    var serializer = new TLSerialization({ mtproto: true });
    var pingID = [nextRandomInt(0xFFFFFFFF), nextRandomInt(0xFFFFFFFF)];

    serializer.storeMethod('ping', { ping_id: pingID });

    var pingMessage = {
      msg_id: mtpTimeManager.generateID(),
      seq_no: this.generateSeqNo(true),
      body: serializer.getBytes()
    };

    var self = this;
    this.sendEncryptedRequest(pingMessage, { timeout: 15000 }).then(function (result) {
      //delete $rootScope.offlineConnecting;
      self.toggleOffline(false);
    }, function () {
      console.log('Delay ', self.checkConnectionPeriod * 1000);

      self.checkConnectionPromise = setTimeout(self.checkConnection.bind(self), parseInt(self.checkConnectionPeriod * 1000));
      ////self.checkConnectionPromise = $timeout(self.checkConnection.bind(self), parseInt(self.checkConnectionPeriod * 1000));

      self.checkConnectionPeriod = Math.min(60, self.checkConnectionPeriod * 1.5);

      // $timeout(function () {
      //   delete $rootScope.offlineConnecting;
      // }, 1000);
      
    });
  };

  MtpNetworker.prototype.toggleOffline = function (enabled) {
    console.log('toggleOffline');

    // console.log('toggle ', enabled, this.dcID, this.iii)
    if (this.offline !== undefined && this.offline == enabled) {
      return false;
    }

    this.offline = enabled;
    // $rootScope.offline = enabled;
    // $rootScope.offlineConnecting = false;

    if (this.offline) {
      ////$timeout.cancel(this.nextReqPromise);
      clearTimeout(this.nextReqPromise);

      delete this.nextReq;

      if (this.checkConnectionPeriod < 1.5) {
        this.checkConnectionPeriod = 0;
      }

      this.checkConnectionPromise = setTimeout(self.checkConnection.bind(self), parseInt(self.checkConnectionPeriod * 1000));
      ////this.checkConnectionPromise = $timeout(this.checkConnection.bind(this), parseInt(this.checkConnectionPeriod * 1000));

      this.checkConnectionPeriod = Math.min(30, (1 + this.checkConnectionPeriod) * 1.5);

      this.onOnlineCb = this.checkConnection.bind(this);

      $(document.body).on('online focus', this.onOnlineCb);
    } else {
      delete this.longPollPending;
      this.checkLongPoll();
      this.sheduleRequest();

      if (this.onOnlineCb) {
        $(document.body).off('online focus', this.onOnlineCb);
      }

      ////$timeout.cancel(this.checkConnectionPromise);
      clearTimeout(this.checkConnectionPromise);
    }
  };

  MtpNetworker.prototype.performSheduledRequest = function () {
    console.log('performSheduledRequest');

    // console.log(dT(), 'sheduled', this.dcID, this.iii)
    if (this.offline || akStopped) {
      console.log('Cancel sheduled');
      return false;
    }
    delete this.nextReq;
    if (this.pendingAcks.length) {
      var ackMsgIDs = [];
      for (var i = 0; i < this.pendingAcks.length; i++) {
        ackMsgIDs.push(this.pendingAcks[i]);
      }
      // console.log('acking messages', ackMsgIDs)
      this.wrapMtpMessage({ _: 'msgs_ack', msg_ids: ackMsgIDs }, { notContentRelated: true, noShedule: true });
    }

    if (this.pendingResends.length) {
      var resendMsgIDs = [];
      var resendOpts = { noShedule: true, notContentRelated: true };
      for (var i = 0; i < this.pendingResends.length; i++) {
        resendMsgIDs.push(this.pendingResends[i]);
      }
      // console.log('resendReq messages', resendMsgIDs)
      this.wrapMtpMessage({ _: 'msg_resend_req', msg_ids: resendMsgIDs }, resendOpts);
      this.lastResendReq = { req_msg_id: resendOpts.messageID, resend_msg_ids: resendMsgIDs };
    }

    var messages = [],
      message;

    var messagesByteLen = 0;
    var currentTime = new Date().getTime();
    var hasApiCall = false;
    var hasHttpWait = false;
    var lengthOverflow = false;
    var singlesCount = 0;
    var self = this;

    if (Object.keys(this.pendingMessages).length > 0) {
      
      for(var item in this.pendingMessages) {
        var value = this.sentMessages[item];
        var messageID = value.msg_id;

      ////(this.pendingMessages).forEach(function (value, messageID) {
      ////angular.forEach(this.pendingMessages, function (value, messageID) {      
        ////if (!value || value >= currentTime) {
          if (message = self.sentMessages[messageID]) {
            var messageByteLength = (message.body.byteLength || message.body.length) + 32;
            if (!message.notContentRelated &&
              lengthOverflow) {
              return;
            }
            if (!message.notContentRelated &&
              messagesByteLen &&
              messagesByteLen + messageByteLength > 655360) { // 640 Kb
              lengthOverflow = true;
              return;
            }
            if (message.singleInRequest) {
              singlesCount++;
              if (singlesCount > 1) {
                return;
              }
            }
            messages.push(message);
            messagesByteLen += messageByteLength;
            if (message.isAPI) {
              hasApiCall = true;
            }
            else if (message.longPoll) {
              hasHttpWait = true;
            }
          } else {
            // console.log(message, messageID)
          }
          delete self.pendingMessages[messageID];
        ////}

        messageID++;
      }
      ////}); 
    } 

    console.log(this.pendingMessages);

    if (hasApiCall && !hasHttpWait) {
      var serializer = new TLSerialization({ mtproto: true });
      serializer.storeMethod('http_wait', {
        max_delay: 500,
        wait_after: 150,
        max_wait: 3000
      });

      messages.push({
        msg_id: mtpTimeManager.generateID(),
        seq_no: this.generateSeqNo(),
        body: serializer.getBytes()
      });
    }

    if (!messages.length) {
      // console.log('no sheduled messages')
      return;
    }

    console.log(messages);

    var noResponseMsgs = [];

    if (messages.length > 1) {
      var container = new TLSerialization({ mtproto: true, startMaxLength: messagesByteLen + 64 });
      container.storeInt(0x73f1f8dc, 'CONTAINER[id]');
      container.storeInt(messages.length, 'CONTAINER[count]');      
      var innerMessages = [];
      for (var i = 0; i < messages.length; i++) {
        container.storeLong(messages[i].msg_id, 'CONTAINER[' + i + '][msg_id]');
        innerMessages.push(messages[i].msg_id);
        container.storeInt(messages[i].seq_no, 'CONTAINER[' + i + '][seq_no]');
        container.storeInt(messages[i].body.length, 'CONTAINER[' + i + '][bytes]');
        container.storeRawBytes(messages[i].body, 'CONTAINER[' + i + '][body]');
        if (messages[i].noResponse) {
          noResponseMsgs.push(messages[i].msg_id);
        }
      }

      var containerSentMessage = {
        msg_id: mtpTimeManager.generateID(),
        seq_no: this.generateSeqNo(true),
        container: true,
        inner: innerMessages
      };

      // message = angular.extend({ body: container.getBytes(true) }, containerSentMessage);
      message = Object.assign({}, { body: container.getBytes(true) }, containerSentMessage);

      this.sentMessages[message.msg_id] = containerSentMessage;

      if (Config.Modes.debug) {
        console.log('Container', innerMessages, message.msg_id, message.seq_no);
      }
    } else {
      if (message.noResponse) {
        noResponseMsgs.push(message.msg_id);
      }
      this.sentMessages[message.msg_id] = message;
    }

    console.log(this.sentMessages);

    this.pendingAcks = [];

    this.sendEncryptedRequest(message).then(function (result) {
      self.toggleOffline(false);
      // console.log('parse for', message)
      self.parseResponse(result.data).then(function (response) {
        // if (Config.Modes.debug) {
        //   console.log('Server response', self.dcID, response);
        // }

        self.processMessage(response.response, response.messageID, response.sessionID);

        ////angular.forEach(noResponseMsgs, function (msgID) {
        if (Object.keys(noResponseMsgs).length > 0) {
          for(var msgID in noResponseMsgs) {
          ////noResponseMsgs.forEach(function (msgID) {  
            if (self.sentMessages[msgID]) {
              var deferred = self.sentMessages[msgID].deferred;
              delete self.sentMessages[msgID];
              deferred.resolve();
            }
          }
          ////});
        }

        self.checkLongPoll();

        this.checkConnectionPeriod = Math.max(1.1, Math.sqrt(this.checkConnectionPeriod));
      });
    }, function (error) {
      console.error('Encrypted request failed', error);

      if (message.container) {
        ////angular.forEach(message.inner, function (msgID) {
        if (Object.keys(message.inner).length > 0) {
          ////(message.inner).forEach(function (msgID) {  
          for(var msgID in (message.inner)) {
            self.pendingMessages[msgID] = 0;
          }
          ////});
        }

        delete self.sentMessages[message.msg_id];
      } else {
        self.pendingMessages[message.msg_id] = 0;
      }

      ////angular.forEach(noResponseMsgs, function (msgID) {
      if (Object.keys(noResponseMsgs).length > 0) {
        ////noResponseMsgs.forEach(function (msgID) {  
        for(var msgID in noResponseMsgs) {
          if (self.sentMessages[msgID]) {
            var deferred = self.sentMessages[msgID].deferred;
            delete self.sentMessages[msgID];
            delete self.pendingMessages[msgID];
            deferred.reject();
          }
        }
        ////});
      }

      self.toggleOffline(true);
    });

    if (lengthOverflow || singlesCount > 1) {
      this.sheduleRequest();
    }
  };

  MtpNetworker.prototype.getEncryptedMessage = function (dataWithPadding) {
    console.log('getEncryptedMessage', dataWithPadding);

    var self = this;
    return self.getMsgKey(dataWithPadding, true).then(function (msgKey) {
      return self.getAesKeyIv(msgKey, true).then(function (keyIv) {
        // console.log(dT(), 'after msg key iv')
        return cryptoWorker.aesEncrypt(dataWithPadding, keyIv[0], keyIv[1]).then(function (encryptedBytes) {
          // console.log(dT(), 'Finish encrypt')
          return {
            bytes: encryptedBytes,
            msgKey: msgKey
          };
        });
      });
    });
  };

  MtpNetworker.prototype.getDecryptedMessage = function (msgKey, encryptedData) {
    console.log('getDecryptedMessage');

    // console.log(dT(), 'get decrypted start')
    return this.getAesKeyIv(msgKey, false).then(function (keyIv) {
      // console.log(dT(), 'after msg key iv')
      return cryptoWorker.aesDecrypt(encryptedData, keyIv[0], keyIv[1]);
    });
  };

  MtpNetworker.prototype.sendEncryptedRequest = function (message, options) {
    console.log('sendEncryptedRequest', message);

    var self = this;
    options = options || {};

    // // var arr = [
    // //   220,
    // //   248,
    // //   241,
    // //   115,
    // //   2,
    // //   0,
    // //   0,
    // //   0,
    // //   204,
    // //   235,
    // //   5,
    // //   106,
    // //   25,
    // //   165,
    // //   199,
    // //   93,
    // //   1,
    // //   0,
    // //   0,
    // //   0,
    // //   164,
    // //   0,
    // //   0,
    // //   0,
    // //   13,
    // //   13,
    // //   155,
    // //   218,
    // //   74,
    // //   0,
    // //   0,
    // //   0,
    // //   166,
    // //   29,
    // //   72,
    // //   199,
    // //   192,
    // //   9,
    // //   0,
    // //   0,
    // //   114,
    // //   77,
    // //   111,
    // //   122,
    // //   105,
    // //   108,
    // //   108,
    // //   97,
    // //   47,
    // //   53,
    // //   46,
    // //   48,
    // //   32,
    // //   40,
    // //   87,
    // //   105,
    // //   110,
    // //   100,
    // //   111,
    // //   119,
    // //   115,
    // //   32,
    // //   78,
    // //   84,
    // //   32,
    // //   49,
    // //   48,
    // //   46,
    // //   48,
    // //   59,
    // //   32,
    // //   87,
    // //   105,
    // //   110,
    // //   54,
    // //   52,
    // //   59,
    // //   32,
    // //   120,
    // //   54,
    // //   52,
    // //   41,
    // //   32,
    // //   65,
    // //   112,
    // //   112,
    // //   108,
    // //   101,
    // //   87,
    // //   101,
    // //   98,
    // //   75,
    // //   105,
    // //   116,
    // //   47,
    // //   53,
    // //   51,
    // //   55,
    // //   46,
    // //   51,
    // //   54,
    // //   32,
    // //   40,
    // //   75,
    // //   72,
    // //   84,
    // //   77,
    // //   76,
    // //   44,
    // //   32,
    // //   108,
    // //   105,
    // //   107,
    // //   101,
    // //   32,
    // //   71,
    // //   101,
    // //   99,
    // //   107,
    // //   111,
    // //   41,
    // //   32,
    // //   67,
    // //   104,
    // //   114,
    // //   111,
    // //   109,
    // //   101,
    // //   47,
    // //   55,
    // //   56,
    // //   46,
    // //   48,
    // //   46,
    // //   51,
    // //   57,
    // //   48,
    // //   52,
    // //   46,
    // //   57,
    // //   55,
    // //   32,
    // //   83,
    // //   97,
    // //   102,
    // //   97,
    // //   114,
    // //   105,
    // //   47,
    // //   53,
    // //   51,
    // //   55,
    // //   46,
    // //   51,
    // //   54,
    // //   0,
    // //   5,
    // //   87,
    // //   105,
    // //   110,
    // //   51,
    // //   50,
    // //   0,
    // //   0,
    // //   5,
    // //   48,
    // //   46,
    // //   55,
    // //   46,
    // //   48,
    // //   0,
    // //   0,
    // //   2,
    // //   101,
    // //   110,
    // //   0,
    // //   0,
    // //   0,
    // //   0,
    // //   0,
    // //   2,
    // //   101,
    // //   110,
    // //   0,
    // //   38,
    // //   48,
    // //   179,
    // //   31,
    // //   252,
    // //   195,
    // //   38,
    // //   106,
    // //   25,
    // //   165,
    // //   199,
    // //   93,
    // //   3,
    // //   0,
    // //   0,
    // //   0,
    // //   16,
    // //   0,
    // //   0,
    // //   0,
    // //   159,
    // //   53,
    // //   153,
    // //   146,
    // //   244,
    // //   1,
    // //   0,
    // //   0,
    // //   150,
    // //   0,
    // //   0,
    // //   0,
    // //   184,
    // //   11,
    // //   0,
    // //   0
    // // ];

    // //   var msgBody = new Int32Array(220);        
    // //   var i = 0;
    // //   arr.forEach((ite) => {
    // //     msgBody[i] = ite;
    // //     i++;
    // //   });

    // // message.body = msgBody;

    // // this.serverSalt = [
    // //   80,
    // //   86,
    // //   120,
    // //   141,
    // //   216,
    // //   161,
    // //   75,
    // //   8
    // // ];

    // // this.sessionID = [
    // //   186,
    // //   161,
    // //   203,
    // //   6,
    // //   251,
    // //   52,
    // //   37,
    // //   223
    // // ];

    // // message.msg_id = 6757551294468230588;
    // // message.seq_no = 4;
    
    var data = new TLSerialization({ startMaxLength: message.body.length + 2048 });

    data.storeIntBytes(this.serverSalt, 64, 'salt');
    data.storeIntBytes(this.sessionID, 64, 'session_id');

    data.storeLong(message.msg_id, 'message_id');
    data.storeInt(message.seq_no, 'seq_no');

    data.storeInt(message.body.length, 'message_data_length');
    data.storeRawBytes(message.body, 'message_data');

    var dataBuffer = data.getBuffer();

    var paddingLength = (16 - (data.offset % 16)) + 16 * (1 + nextRandomInt(5));
    var padding = new Array(paddingLength);

    padding = generateSecureRandomBytes(padding);    

    // padding = [
    //     48,
    //     208,
    //     211,
    //     87,
    //     46,
    //     41,
    //     187,
    //     34,
    //     220,
    //     250,
    //     55,
    //     85,
    //     51,
    //     241,
    //     28,
    //     127,
    //     221,
    //     197,
    //     54,
    //     195
    //   ];

    var dataWithPadding = bufferConcat(dataBuffer, padding);
    // console.log(dT(), 'Adding padding', dataBuffer, padding, dataWithPadding)
    // console.log(dT(), 'auth_key_id', bytesToHex(self.authKeyID))

    return this.getEncryptedMessage(dataWithPadding).then(function (encryptedResult) {
      console.log('getEncryptedMessageResult', encryptedResult);
      // console.log(dT(), 'Got encrypted out message'/*, encryptedResult*/)
      var request = new TLSerialization({ startMaxLength: encryptedResult.bytes.byteLength + 256 });
      request.storeIntBytes(self.authKeyID, 64, 'auth_key_id');
      request.storeIntBytes(encryptedResult.msgKey, 128, 'msg_key');
      request.storeRawBytes(encryptedResult.bytes, 'encrypted_data');

      var requestData = xhrSendBuffer ? request.getBuffer() : request.getArray();

      var requestPromise;
      
      // var url = "https://venus.web.telegram.org/apiw1";
      ////var url = Config.App.ipAddr;
      var url = mtpDcConfigurator.chooseServer(self.dcID, self.upload);      

      var baseError = { code: 406, type: 'NETWORK_BAD_RESPONSE', url: url };

      try {
                        
        options = Object.assign({}, options || {}, {
            responseType: 'arraybuffer',
            transformRequest: null
        });
        
        console.log("url", url);
        console.log("requestData", requestData);
        console.log("options", options);      

        requestPromise = httpClient.post(url, requestData, options);

        // requestPromise = httpClient.post(url, requestData, {
        //   responseType: 'arraybuffer',
        //   transformRequest: null
        // });

      } catch (e) {
        requestPromise = $q.reject(e);
      }
      return requestPromise.then(
        function (result) {
          if (!result.data || !result.data.byteLength) {
            return $q.reject(baseError);
          }
          return result;
        },
        function (error) {
          if (!error.message && !error.type) {
            // error = angular.extend(baseError, { type: 'NETWORK_BAD_REQUEST', originalError: error });                        
            error = Object.assign({}, baseError, { type: 'NETWORK_BAD_REQUEST', originalError: error });
          }
          return $q.reject(error);
        }
      );
    });
  };

  MtpNetworker.prototype.parseResponse = function (responseBuffer) {
    console.log('parseResponse');

    // console.log(dT(), 'Start parsing response')
    var self = this;
    var deserializer = new TLDeserialization(responseBuffer);

    var authKeyID = deserializer.fetchIntBytes(64, false, 'auth_key_id');
    if (!bytesCmp(authKeyID, this.authKeyID)) {
      throw new Error('[MT] Invalid server auth_key_id: ' + bytesToHex(authKeyID));
    }
    var msgKey = deserializer.fetchIntBytes(128, true, 'msg_key');
    var encryptedData = deserializer.fetchRawBytes(responseBuffer.byteLength - deserializer.getOffset(), true, 'encrypted_data');

    return self.getDecryptedMessage(msgKey, encryptedData).then(function (dataWithPadding) {
      // console.log(dT(), 'after decrypt')
      return self.getMsgKey(dataWithPadding, false).then(function (calcMsgKey) {
        if (!bytesCmp(msgKey, calcMsgKey)) {
          console.warn('[MT] msg_keys', msgKey, bytesFromArrayBuffer(calcMsgKey));
          throw new Error('[MT] server msgKey mismatch');
        }
        // console.log(dT(), 'after msgKey check')

        var deserializer = new TLDeserialization(dataWithPadding, { mtproto: true });

        var salt = deserializer.fetchIntBytes(64, false, 'salt');
        var sessionID = deserializer.fetchIntBytes(64, false, 'session_id');
        var messageID = deserializer.fetchLong('message_id');

        if (!bytesCmp(sessionID, self.sessionID) &&
          (!self.prevSessionID || !bytesCmp(sessionID, self.prevSessionID))) {
          console.warn('Sessions', sessionID, self.sessionID, self.prevSessionID);
          throw new Error('[MT] Invalid server session_id: ' + bytesToHex(sessionID));
        }

        var seqNo = deserializer.fetchInt('seq_no');

        var totalLength = dataWithPadding.byteLength;

        var messageBodyLength = deserializer.fetchInt('message_data[length]');
        var offset = deserializer.getOffset();

        if ((messageBodyLength % 4) || messageBodyLength > totalLength - offset) {
          throw new Error('[MT] Invalid body length: ' + messageBodyLength);
        }

        var messageBody = deserializer.fetchRawBytes(messageBodyLength, true, 'message_data');

        var offset = deserializer.getOffset();
        var paddingLength = totalLength - offset;

        if (paddingLength < 12 || paddingLength > 1024) {
          throw new Error('[MT] Invalid padding length: ' + paddingLength);
        }

        var buffer = bytesToArrayBuffer(messageBody);
        var deserializerOptions = {
          mtproto: true,
          override: {
            mt_message: function (result, field) {
              result.msg_id = this.fetchLong(field + '[msg_id]');
              result.seqno = this.fetchInt(field + '[seqno]');
              result.bytes = this.fetchInt(field + '[bytes]');

              var offset = this.getOffset();

              try {
                result.body = this.fetchObject('Object', field + '[body]');
              } catch (e) {
                console.error('parse error', e.message, e.stack);
                result.body = { _: 'parse_error', error: e };
              }
              if (this.offset != offset + result.bytes) {
                // console.warn(dT(), 'set offset', this.offset, offset, result.bytes)
                // console.log(dT(), result)
                this.offset = offset + result.bytes;
              }
              // console.log(dT(), 'override message', result)
            },
            mt_rpc_result: function (result, field) {
              result.req_msg_id = this.fetchLong(field + '[req_msg_id]');

              var sentMessage = self.sentMessages[result.req_msg_id];
              var type = sentMessage && sentMessage.resultType || 'Object';

              if (result.req_msg_id && !sentMessage) {
                // console.warn(dT(), 'Result for unknown message', result)
                return;
              }
              result.result = this.fetchObject(type, field + '[result]');
              // console.log(dT(), 'override rpc_result', sentMessage, type, result)
            }
          }
        };

        var deserializer = new TLDeserialization(buffer, deserializerOptions);
        var response = deserializer.fetchObject('', 'INPUT');

        return {
          response: response,
          messageID: messageID,
          sessionID: sessionID,
          seqNo: seqNo
        };
      });
    });
  };

  MtpNetworker.prototype.applyServerSalt = function (newServerSalt) {

    console.log('applyServerSalt');

    var serverSalt = longToBytes(newServerSalt);

    var storeObj = {};
    storeObj['dc' + this.dcID + '_server_salt'] = bytesToHex(serverSalt);

    ////Storage.set(storeObj);

    this.serverSalt = serverSalt;
    return true;
  };

  MtpNetworker.prototype.sheduleRequest = function (delay) {
    console.log('sheduleRequest');

    if (this.offline) {
      this.checkConnection('forced shedule');
    }

    var nextReq = new Date().getTime() + delay;

    if (delay && this.nextReq && this.nextReq <= nextReq) {
      return false;
    }

    // console.log(dT(), 'shedule req', delay)
    // console.trace()

    ////$timeout.cancel(this.nextReqPromise);

    if (delay > 0) {
      ////this.nextReqPromise = $timeout(this.performSheduledRequest.bind(this), delay || 0);
      this.nextReqPromise = setTimeout(self.performSheduledRequest.bind(self), delay || 0);
    } else {
      ////self.performSheduledRequest.bind(self);
      ////setZeroTimeout(this.performSheduledRequest.bind(this));
      this.performSheduledRequest();
    }

    this.nextReq = nextReq;
  };

  MtpNetworker.prototype.ackMessage = function (msgID) {
    console.log('ackMessage');

    // console.log('ack message', msgID)
    this.pendingAcks.push(msgID);
    this.sheduleRequest(30000);
  };

  MtpNetworker.prototype.reqResendMessage = function (msgID) {
    
    console.log('reqResendMessage', msgID);
    this.pendingResends.push(msgID);
    this.sheduleRequest(100);
  };

  MtpNetworker.prototype.cleanupSent = function () {
    console.log('cleanupSent');

    var self = this;
    var notEmpty = false;
    ////console.log('clean start', this.dcID/*, this.sentMessages*/);
    ////angular.forEach(this.sentMessages, function (message, msgID) {
    if (Object.keys(this.sentMessages).length > 0) {
      ////this.sentMessages.forEach(function (message, msgID) {        
      for(var item in this.sentMessages) {
        var message = this.sentMessages[item];
        var msgID = message.msg_id;
        ////console.log('clean iter', msgID, message);
        if (message.notContentRelated && self.pendingMessages[msgID] === undefined) {
          ////console.log('clean notContentRelated', msgID);
          delete self.sentMessages[msgID];
        }
        else if (message.container) {
          for (var i = 0; i < message.inner.length; i++) {
            if (self.sentMessages[message.inner[i]] !== undefined) {
              // console.log('clean failed, found', msgID, message.inner[i], self.sentMessages[message.inner[i]].seq_no)
              notEmpty = true;
              return;
            }
          }
          ////console.log('clean container', msgID);
          delete self.sentMessages[msgID];
        } else {
          notEmpty = true;
        }
        msgID++;
      }
      ////});
    }

    return !notEmpty;
  };

  MtpNetworker.prototype.processMessageAck = function (messageID) {
    console.log('processMessageAck');

    var sentMessage = this.sentMessages[messageID];

    if (sentMessage && !sentMessage.acked) {
      delete sentMessage.body;
      sentMessage.acked = true;

      return true;
    }

    return false;
  };

  MtpNetworker.prototype.processError = function (rawError) {
    console.log('processError');

    var matches = (rawError.error_message || '').match(/^([A-Z_0-9]+\b)(: (.+))?/) || [];
    rawError.error_code = uintToInt(rawError.error_code);

    return {
      code: !rawError.error_code || rawError.error_code <= 0 ? 500 : rawError.error_code,
      type: matches[1] || 'UNKNOWN',
      description: matches[3] || ('CODE#' + rawError.error_code + ' ' + rawError.error_message),
      originalError: rawError
    };
  };

  MtpNetworker.prototype.processMessage = function (message, messageID, sessionID) {
    console.log('processMessage');

    var msgidInt = parseInt(messageID.toString(10).substr(0, -10), 10);

    if (msgidInt % 2) {
      console.warn('[MT] Server even message id: ', messageID, message);
      return;
    }

    // console.log('process message', message, messageID, sessionID)
    switch (message._) {
      case 'msg_container':
        var len = message.messages.length;
        for (var i = 0; i < len; i++) {
          this.processMessage(message.messages[i], message.messages[i].msg_id, sessionID);
        }
        break;

      case 'bad_server_salt':
        ////console.log('Bad server salt', message);
        var sentMessage = this.sentMessages[message.bad_msg_id];
        if (!sentMessage || sentMessage.seq_no != message.bad_msg_seqno) {
          ////console.log(message.bad_msg_id, message.bad_msg_seqno);
          throw new Error('[MT] Bad server salt for invalid message');
        }

        this.applyServerSalt(message.new_server_salt);
        this.pushResend(message.bad_msg_id);
        this.ackMessage(messageID);
        break;

      case 'bad_msg_notification':
        ////console.log('Bad msg notification', message);
        var sentMessage = this.sentMessages[message.bad_msg_id];
        if (!sentMessage || sentMessage.seq_no != message.bad_msg_seqno) {
          ////console.log(message.bad_msg_id, message.bad_msg_seqno);
          throw new Error('[MT] Bad msg notification for invalid message');
        }

        if (message.error_code == 16 || message.error_code == 17) {
          if (mtpTimeManager.applyServerTime(
            bigStringInt(messageID).shiftRight(32).toString(10)
          )) {
            ////console.log('Update session');
            this.updateSession();
          }
          var badMessage = this.updateSentMessage(message.bad_msg_id);
          this.pushResend(badMessage.msg_id);
          this.ackMessage(messageID);
        }

        break;

      case 'message':
        if (this.lastServerMessages.indexOf(messageID) != -1) {
          // console.warn('[MT] Server same messageID: ', messageID)
          this.ackMessage(messageID);
          return;
        }
        this.lastServerMessages.push(messageID);

        if (this.lastServerMessages.length > 100) {
          this.lastServerMessages.shift();
        }

        this.processMessage(message.body, message.msg_id, sessionID);
        break;

      case 'new_session_created':
        this.ackMessage(messageID);

        this.processMessageAck(message.first_msg_id);
        this.applyServerSalt(message.server_salt);

        var self = this;

        // Storage.get('dc').then(function (baseDcID) {
        //   if (baseDcID == self.dcID && !self.upload && updatesProcessor) {
            updatesProcessor(message, true);
        //   }
        // });

        break;

      case 'msgs_ack':
        for (var i = 0; i < message.msg_ids.length; i++) {
          this.processMessageAck(message.msg_ids[i]);
        }
        break;

      case 'msg_detailed_info':
        if (!this.sentMessages[message.msg_id]) {
          this.ackMessage(message.answer_msg_id);
          break;
        }
      case 'msg_new_detailed_info':
        if (this.pendingAcks.indexOf(message.answer_msg_id)) {
          break;
        }
        this.reqResendMessage(message.answer_msg_id);
        break;

      case 'msgs_state_info':
        this.ackMessage(message.answer_msg_id);
        if (this.lastResendReq && this.lastResendReq.req_msg_id == message.req_msg_id && this.pendingResends.length) {
          var i, badMsgID, pos;

          for (i = 0; i < this.lastResendReq.resend_msg_ids.length; i++) {
            badMsgID = this.lastResendReq.resend_msg_ids[i];
            pos = this.pendingResends.indexOf(badMsgID);
            if (pos != -1) {
              this.pendingResends.splice(pos, 1);
            }
          }
        }
        break;

      case 'rpc_result':
        this.ackMessage(messageID);

        var sentMessageID = message.req_msg_id;
        var sentMessage = this.sentMessages[sentMessageID];

        this.processMessageAck(sentMessageID);

        if (sentMessage) {
          var deferred = sentMessage.deferred;
          if (message.result._ == 'rpc_error') {
            var error = this.processError(message.result);
            console.log('Rpc error', error);
            if (deferred) {
              deferred.reject(error);
            }
          } else {
            if (deferred) {
              if (Config.Modes.debug) {
                console.log('Rpc response', message.result);
              } else {
                var dRes = message.result._;

                if (!dRes) {
                  if (message.result.length > 5) {
                    dRes = '[..' + message.result.length + '..]';
                  } else {
                    dRes = message.result;
                  }
                }

                console.log('Rpc response', dRes);
              }

              sentMessage.deferred.resolve(message.result);
            }
            if (sentMessage.isAPI) {
              this.connectionInited = true;
            }
          }

          delete this.sentMessages[sentMessageID];
        }

        break;

      default:
        this.ackMessage(messageID);

        // console.log('Update', message)
        if (updatesProcessor) {
          updatesProcessor(message, true);
        }
        break;
    };
  };

  function startAll() {
    console.log('startAll');

    if (akStopped) {
      akStopped = false;
      updatesProcessor({ _: 'new_session_created' }, true);
    }
  }

  function stopAll() {
    console.log('stopAll');

    akStopped = true;
  }

  return {
    getNetworker: function (dcID, authKey, serverSalt, options) {
      console.log('getNetworker');

      return new MtpNetworker(dcID, authKey, serverSalt, options);
    },
    setUpdatesProcessor: function (callback) {
      console.log('setUpdatesProcessor');

      updatesProcessor = callback;
    },
    stopAll: stopAll,
    startAll: startAll
  };
}