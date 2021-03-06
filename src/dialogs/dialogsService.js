import $q from 'q';
import AuthServiceSingleton from '../auth/authService';
const AuthService = new AuthServiceSingleton().getInstance();

export default class DialogsService {

    constructor() {
        console.log('Dialogs Service Created');
        ////this.messages = null;        
    }

    getDialogs() {
        
        var deferred = $q.defer();

        AuthService.mtpApiManager.invokeApi('messages.getDialogs', {
            flags: 0,
            offset_date: 0,
            offset_id: 0,
            offset_peer: { _: 'inputPeerEmpty' },
            limit: 0
        }, {
            timeout: 4000
        }).then(function (result) {            
            console.log('get DIALOGS: ', result);
            deferred.resolve(result);
        }, (error) => {
            console.log('get DIALOGS error: ', error);
            deferred.reject(error);
        });

        return deferred.promise;
    }

    getPhotoLink(location){

        var deferred = $q.defer();

        AuthService.mtpApiManager.invokeApi('upload.getFile', {
            location: location,
            offset: 0,
            limit: 1024 * 1024
          }).then(function (result) {            
            console.log('get FILE: ', result);
            deferred.resolve(result);
        }, (error) => {
            console.log('get FILE error: ', error);
            deferred.reject(error);
        });
        
            // downloadSmallFile(photo_small).then(function (blob) {
                
            //     imgEl.prependTo(element).attr('src', FileManager.getUrl(blob, 'image/jpeg'))
            //   }, function (e) {
            //     console.log('Download image failed', e, peer.photo.photo_small, element[0])
            //   });        
        return deferred.promise;
    }

    _getInputPeerByID(peerId, hashId, isChannel) {
        if (!peerId) {
            return { _: 'inputPeerEmpty' };
        }
        if (peerId < 0) {
            var chatId = -peerId;
            if (!isChannel) {
                return {
                    _: 'inputPeerChat',
                    chat_id: chatId
                };
            } else {
                return {
                    _: 'inputPeerChannel',
                    channel_id: chatId,
                    access_hash: hashId || 0
                };
            }
        }
        if (!isChannel) return {
            _: 'inputPeerUser',
            user_id: peerId,
            access_hash: hashId || 0
        };
        
        return {
            _: 'inputPeerChannel',
            channel_id: peerId,
            access_hash: hashId || 0
        }; 
    }

    getMessages(peerId, hashId, isChannel) {

        var self = this;

        var deferred = $q.defer();

        var request = {
            peer: this._getInputPeerByID(peerId, hashId, isChannel),
            offset_id: 0,
            add_offset: 0,
            limit: 0
        };        
       
        AuthService.mtpApiManager.invokeApi('messages.getHistory', request, {
            timeout: 4000
        }).then(function (result) {            
            console.log('get MESSAGES: ', result);
            deferred.resolve(result);
        }, (error) => {
            console.log('get MESSAGES error: ', error);
            deferred.reject(error);
        });

        return deferred.promise;
    }
}