import AuthServiceSingleton from '../auth/authService';
import DialogsService from '../dialogs/dialogsService';

const AuthService = new AuthServiceSingleton().getInstance();
const dialogsService = new DialogsService();

var user = null;

let HomeComponent = {
    
    preRender: async () => {
        console.log('home pre render');
    
        ///var userId = AuthService.mtpApiManager.getUserID();        

        user = AuthService.getUser();
        console.log(user);

        if (user == null)
        {
            var redirectUrl= '/#/signin';
            location = redirectUrl;
            return redirectUrl;
        }        
        
        user = JSON.parse(user);                

        return null;       
    },
    render: async () => {

        console.log('home render');     
        
        dialogsService.getDialogs().then((data) => {                    
            console.log('success !!!');
        }, (error) => {
            console.log(error);
        });
        
        return `        
        <div id="root_container">
            <form class="form_container">
                <h1>Welcome to Telegram</h1>        
                ${user["first_name"]} ${user.last_name}
            </form>
        </div>  
        `;
    }    
    , after_render: async () => {
        console.log('home after render');
    }
};

export default HomeComponent;