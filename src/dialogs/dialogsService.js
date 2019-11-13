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
        return {
            _: 'inputPeerUser',
            user_id: peerId,
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

        // if (this.messages != null) {
        //     var item = this.messages.find((item) => item.id == peerId);
        //     if (item != null) {
        //         deferred.resolve(item);
        //     }
        // }        

        AuthService.mtpApiManager.invokeApi('messages.getHistory', request, {
            timeout: 4000
        }).then(function (result) {
            ////self.messages.push(result);
            console.log('get MESSAGES: ', result);
            deferred.resolve(result);
        }, (error) => {
            console.log('get MESSAGES error: ', error);
            deferred.reject(error);
        });

        return deferred.promise;
    }
}