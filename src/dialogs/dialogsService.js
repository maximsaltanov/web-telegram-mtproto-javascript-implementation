import $q from 'q';
import AuthServiceSingleton from '../auth/authService';
const AuthService = new AuthServiceSingleton().getInstance();

export default class DialogsService {

    constructor() {
        console.log('Dialogs Service Created');
    }

    // _getInputPeerByID(peerID) {
    //     if (!peerID) {
    //         return { _: 'inputPeerEmpty' }
    //     }
    //     if (peerID < 0) {
    //         var chatID = -peerID
    //         if (!AppChatsManager.isChannel(chatID)) {
    //             return {
    //                 _: 'inputPeerChat',
    //                 chat_id: chatID
    //             }
    //         } else {
    //             return {
    //                 _: 'inputPeerChannel',
    //                 channel_id: chatID,
    //                 access_hash: AppChatsManager.getChat(chatID).access_hash || 0
    //             }
    //         }
    //     }
    //     return {
    //         _: 'inputPeerUser',
    //         user_id: peerID,
    //         access_hash: AppUsersManager.getUser(peerID).access_hash || 0
    //     }
    // }

    getDialogs() {

        var deferred = $q.defer();

        AuthService.mtpApiManager.invokeApi('messages.getDialogs', {
            flags: 0,
            offset_date: 0,
            offset_id: 0,
            offset_peer: { _: 'inputPeerEmpty' },
            limit: 0
        }, {
            timeout: 300
        }).then(function (result) {
            console.log('get DIALOGS: ', result);
            deferred.resolve(result);
        }, (error) => {
            console.log('get DIALOGS error: ', error);
            deferred.reject(error);
        });

        return deferred.promise;
    }
}