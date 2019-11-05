import AuthService from '../auth/authService';

let HomeComponent = {

    preRender: async () => {
        console.log('home pre render');

        if (!AuthService.user.isAuthorized) {            
            var redirectUrl= '/#/signin';
            location = redirectUrl;
            return redirectUrl;
        }        

        return null;       
    },
    render: async () => {

        console.log('home render');

        return `        
        <div id="root_container">
            <form class="form_container">
                <h1>Welcome to Telegram</h1>        
                ${AuthService.user.name} ${AuthService.user.surname}
            </form>
        </div>  
        `;
    }    
    , after_render: async () => {
        console.log('home after render');
    }
};

export default HomeComponent;