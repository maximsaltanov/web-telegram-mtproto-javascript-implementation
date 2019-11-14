import Config from '../lib/config';
import MtpApiManager from '../lib/mtproto/mtpApiManager';
import $q from 'q';
import Storage from '../lib/storageService';

const storage = new Storage();

class AuthService {

    constructor() {
        this.dcID = 2;

        this.mtpApiManager = new MtpApiManager();

        this.credentials = {
            country: 'RU',
            phone_full: null,            
            phone_code_valid: false,
            phone_unoccupied: false,
            password_needed: false,
            phone_code_hash: null,
            phone_code: null
        };

        this.user = {
            id: null,
            first_name: null,
            last_name: null,
            phone: null
        };

        console.log('Auth Service Created');        
    }

    setUser(user){                
        storage.set('auth_user', user);        
    }

    getUser(){        
        return storage.get('auth_user');        
    }

    initPhoneCountry() {
        var self = this;

        var deferred = $q.defer();

        this.mtpApiManager.invokeApi('help.getNearestDc', {}, { dcID: 2, createNetworker: true }).then((nearestDcResult) => {
            console.log('get NEAREST DC: ', nearestDcResult);
            self.credentials.country = nearestDcResult.country;
            deferred.resolve(nearestDcResult.country);
        }, (error) => {
            console.log('get NEAREST DC error', error);
            deferred.reject();
        });

        return deferred.promise;
    }    

    // checkPassword(password) {

    //     var deferred = $q.defer();

    //     var passwordHash = this.mtpApiManager.makePasswordHash(password);
                
    //     this.mtpApiManager.invokeApi('auth.checkPassword', { password_hash: passwordHash }).then(() => { 
    //         console.log('check password success');
    //         deferred.resolve();
    //     }, (error) => {
    //         console.log('check password error', error);
    //         deferred.reject(error);
    //     });

    //     return deferred.promise;
    // }

    cancelCode() {
        var self = this;

        var deferred = $q.defer();

        var request = {
            phone_number: self.credentials.phone_full,
            phone_code_hash: self.credentials.phone_code_hash            
        };
        
        this.mtpApiManager.invokeApi('auth.cancelCode', request).then(() => { 
            console.log('cancel code success');
            deferred.resolve();
        }, (error) => {
            console.log('Cancel Code error', error);
            deferred.reject(error);
        });

        return deferred.promise;
    }

    sendCode(countryCode, phone) {

        var self = this;

        var deferred = $q.defer();

        this.credentials.country = countryCode;
        this.credentials.phone_full = phone;

        var request = {
            flags: 0,
            phone_number: this.credentials.phone_full,
            api_id: Config.App.id,
            api_hash: Config.App.hash,
            lang_code: navigator.language || 'en'
        };        

        this.mtpApiManager.invokeApi('auth.sendCode', request).then(function (sentCode) {
            console.log('sendCode success. hash=', sentCode);            
            self.credentials.phone_code_hash = sentCode.phone_code_hash;            
            deferred.resolve(sentCode.phone_code_hash);            

        }, function (error) {
            console.log('Send Code error', error);
            deferred.reject(error);
        });

        return deferred.promise;
    }

    signIn(phoneCode) {

        var deferred = $q.defer();

        var self = this;
        
        var request = {
            phone_number: this.credentials.phone_full,
            phone_code_hash: this.credentials.phone_code_hash,
            phone_code: phoneCode
        };                

        this.mtpApiManager.invokeApi('auth.signIn', request).then((data) => {
            console.log("signIn success", data);            
            self.setUser(data.user);
            ////self.mtpApiManager.setUserAuth(self.dcID, data.user.id);            
            deferred.resolve(data.user);
        }, (error) => {
            console.log('Sign In error', error);
            deferred.reject(error);
        });

        return deferred.promise;
    }

    signUp(firstname, lastname) {

        var deferred = $q.defer();

        var self = this;

        var params = {
            phone_number: this.credentials.phone_full,
            phone_code_hash: this.credentials.phone_code_hash,
            first_name: firstname,
            last_name: lastname
        };

        this.mtpApiManager.invokeApi('auth.signUp', params).then((data) => {
            console.log("signUp success", data);
            self.credentials.user = data.user;
            self.mtpApiManager.setUserAuth(self.dcID, data.user.id);
            deferred.resolve(data);
        }, (error) => {
            console.log('Sign Up error', error);
            deferred.reject(error);
        });

        return deferred.promise;
    }
}

export default class AuthServiceSingleton {
    constructor() {
        if (!AuthServiceSingleton.instance) {
            AuthServiceSingleton.instance = new AuthService();
        }
    }

    getInstance() {
        return AuthServiceSingleton.instance;
    }
}