const AuthService = { 
    user: {
        name: null,
        surname: null,
        isAuthorized: false
    },
    authorize: async () => {
        AuthService.user.name = 'Max';
        AuthService.user.surname = 'S';
        AuthService.user.isAuthorized = true;
        return AuthService.user;
    }
};

export default AuthService;