import Config from '../lib/config';
import MtpApiManager from '../lib/mtproto/mtproto_wrapper';
import $q from 'q';

var mtpApiManager = new MtpApiManager();

const AuthService = { 
    credentials: {
        country: null,
        phone_full: null,
        phone_code_hash: null
    },
    user: {
        name: null,
        surname: null,
        isAuthorized: false        
    },
    initPhoneCountry: () => {    
        var deferred = $q.defer();        
        
        mtpApiManager.invokeApi('help.getNearestDc', {}, {dcID: 2, createNetworker: true}).then((nearestDcResult) => {            
            console.log('NEAREST DC: ', nearestDcResult);    
            AuthService.credentials.country = nearestDcResult.country;
            deferred.resolve(nearestDcResult.country);
        });

        return deferred.promise;
    },
    cancelCode: () => {        
        var deferred = $q.defer();        
                
        mtpApiManager.invokeApi('auth.cancelCode', {
            phone_number: AuthService.credentials.phone_full,
            phone_code_hash: AuthService.credentials.phone_code_hash
        }).then(() => deferred.resolve);

        return deferred.promise;
    },
    sendCode: (countryCode, phone) => {        

        var deferred = $q.defer();        
        
        AuthService.credentials.country = countryCode;
        AuthService.credentials.phone_full = phone;
                        
        mtpApiManager.invokeApi('auth.sendCode', {
            flags: 0,
            phone_number: AuthService.credentials.phone_full,
            api_id: Config.App.id,
            api_hash: Config.App.hash,
            lang_code: navigator.language || 'en'
        }).then(function (sentCode) {                            
            AuthService.credentials.phone_code_hash = sentCode.phone_code_hash;   
            console.log('sendCode success. hash=', AuthService.credentials.phone_code_hash);
            deferred.resolve(AuthService.credentials.phone_code_hash);                        

        }, function (error) {                
            console.log('sendCode error', error);
            
            // switch (error.type) {
            //     case 'PHONE_NUMBER_INVALID':
            //         /////
            //     break;  
            //     case 'PHONE_NUMBER_APP_SIGNUP_FORBIDDEN':                    
            //     /////
            //     break;
            // }

            deferred.reject(error);
        });

        return deferred.promise;
    },
    authorize: (phoneCode) => {

        var deferred = $q.defer();       

        var params = {
            phone_number: AuthService.credentials.phone_full,
            phone_code_hash: AuthService.credentials.phone_code_hash,
            phone_code: phoneCode
        };

        mtpApiManager.invokeApi('auth.signIn', params).then((data) => {
            console.log("auth success", data);        
            AuthService.user.isAuthorized = true;    
            deferred.resolve(data);                        

        }, (error) => {
            console.log(error);
            deferred.reject(error);
        });

        return deferred.promise;        
    }
};

export default AuthService;