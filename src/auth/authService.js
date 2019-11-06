import Config from '../lib/config';
import MtpApiManager from '../lib/mtproto/mtproto_wrapper';

var mtpApiManager = new MtpApiManager();

const AuthService = { 
    credentials: {
        phone_full: null,
        phone_code_hash: null
    },
    user: {
        name: null,
        surname: null,
        isAuthorized: false        
    },
    initPhoneCountry: async () => {        
        mtpApiManager.invokeApi('help.getNearestDc', {}, {dcID: 2, createNetworker: true}).then(function (nearestDcResult) {
            var resss = nearestDcResult;
        });
    },
    sendCode: async (country, phone) => {        
        
        ////AuthService.credentials.phone_full = (country || '') + (phone || '');
        AuthService.credentials.phone_full = phone;
        
        ////var authKeyStarted = tsNow();
        
        mtpApiManager.invokeApi('auth.sendCode', {
            flags: 0,
            phone_number: AuthService.credentials.phone_full,
            api_id: Config.App.id,
            api_hash: Config.App.hash,
            lang_code: navigator.language || 'en'
        }).then(function (sentCode) {                            
            AuthService.credentials.phone_code_hash = sentCode.phone_code_hash;
            
            ////applySentCode(sentCode);

        }, function (error) {                
            console.log('sendCode error', error);

            // switch (error.type) {
            //     case 'PHONE_NUMBER_INVALID':
            //     $scope.error = {field: 'phone'};
            //     error.handled = true;
            //     break;

            //     case 'PHONE_NUMBER_APP_SIGNUP_FORBIDDEN':
            //         $scope.error = {field: 'phone'};
            //         break;
            //     }

            });
    },
    authorize: async () => {
        AuthService.user.name = 'Max';
        AuthService.user.surname = 'S';
        AuthService.user.isAuthorized = true;
        return AuthService.user;
    }
};

export default AuthService;