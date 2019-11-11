import AuthService from "../auth/authService";
import Autocomplete from "../components/countries/combobox";
import { Countries } from "../components/countries/combobox";

let SigninComponent = {    
    currentWizardStep: 0,
    // preRender: async () => {
    //     console.log('signin pre render');
    // },    
    render: async () => {

        // console.log('signin render');                

        return `                
        <div id="root_container">        
        <form id="form_1" novalidate class="form_container" autocomplete="off">            
            <img class="logo" src="src/images/t_logo.png" alt="Telegram">
            <h3>Sign in to Telegram</h3>        
            <p class="form_descr">Please confirm your country and enter your phone number</p>        
            <div class="chbContainer">
                <div class="chbWrapper">
                    <select class="autocomplete" name="cbxCountries" id="cbxCountries" required></select>
                </div>
            </div>  
            <div class="form_input">
                <input id="tboxPhoneNumber" name="tboxPhoneNumber" type="text" placeholder="Phone Number" required>
            </div>
            <div class="keep_me_in">                
                <p>
                    <input type="checkbox" id="keepMyIn" name="keepMyIn" checked>
                    <label for="keepMyIn">Keep me signed in</label>
                </p>
            </div>
            <div class="form_submit">
                <input id="btnSubmitSigninForm" type="button" value="NEXT">
            </div>            
        </form>
        <form id="form_2" novalidate class="form_container" autocomplete="off">        
            <img class="logo" src="src/images/t_monkey1.png" alt="enter code">                
            <h3>+79185177860</h3>     
            <p class="form_descr width-160">We have sent you an SMS with the code.</p>             
            <div class="form_input">
                <input id="tboxCode" name="tboxCode" type="text" placeholder="Code" required>
            </div>          
            <div class="form_submit">
                <input id="btnSubmitCodeForm" type="button" value="NEXT">
            </div>
            <div class="form_submit">
                <input id="btnCancelCode" type="button" value="CANCEL">
            </div>
        </form>
    </div>
        `;
        //<img class="logo" src="src/images/t_monkey2.png" alt="invalid code">    
    }
    , after_render: async () => {
        // console.log('signin after render');
        SigninComponent.currentWizardStep = 0;
        SigninComponent.nextForm();

        //// init sign in form
        if (SigninComponent.currentWizardStep == 1){
            //// init combo
            function createAutocomplete(node) {
                return new Autocomplete(node);
            }

            function fillSelectElement(selectElement) {
                Countries.forEach((country) => {
                    let option = document.createElement("option");
                    option.text = country.name;
                    option.value = country.code;
                    selectElement.add(option);
                });
            }

            const autocompletes = document.querySelectorAll(".autocomplete");
            autocompletes.forEach((selectElement) => {
                fillSelectElement(selectElement);
                createAutocomplete(selectElement);            
            });
            
            //// get default country
            SigninComponent.initPhoneCountry();        

            //// next 
            document.getElementById("btnSubmitSigninForm").addEventListener("click", () => {                                                           

                let countryName = document.getElementById('cbxCountries-input').value;                
                let country = Countries.find((item) => item.name == countryName);            
                let phone = document.getElementById("tboxPhoneNumber").value;                

                console.log('country code', country.code);
                console.log('phone', phone);

                AuthService.sendCode(country.code, phone).then(() => {
                    SigninComponent.nextForm();
                });

                return false;
            });

            document.getElementById("btnSubmitCodeForm").addEventListener("click", () => {     
                let code = document.getElementById("tboxCode").value;                

                AuthService.authorize(code).then(() => {
                    var redirectUrl= '/#/';
                    location = redirectUrl;
                    return redirectUrl;       
                });
                
                return false;
            });

            document.getElementById("btnCancelCode").addEventListener("click", () => {                                                           

                AuthService.cancelCode().then(() => {
                    SigninComponent.currentWizardStep = 0;
                    SigninComponent.nextForm();
                });

                return false;
            });            
        }
    },    
    nextForm: () => {
        
        SigninComponent.currentWizardStep++;

        switch(SigninComponent.currentWizardStep)        
        {
            case 1:
                break;
            case 2:
                break;
            case 3:
                // AuthService.user = {
                //     name: "Maxim",
                //     surname: "Saltanov",
                //     isAuthorized: true      
                // };

                // var redirectUrl= '/#/';
                // location = redirectUrl;
                // return redirectUrl;                                
        }        

        //// display current form
        let formsCollection = document.getElementsByTagName("form");

        for(let i=0; i < formsCollection.length; i++) {            
            if (SigninComponent.currentWizardStep != i + 1){
                formsCollection[i].style.display = "none"; 
            }            
            else formsCollection[i].style.display = "inline-block"; 
        }                             
    },    
    initPhoneCountry: () => {
        //// !!!!
        // AuthService.initPhoneCountry().then((countryCode) => {
        //     let country = Countries.find((item) => item.code == countryCode);            

        //     if (country != null)
        //     {
        //         let countryName = country.name;
        //         let phonePrefix = country.dial_code;

        //         document.getElementById('cbxCountries-input').value = countryName;                
        //         document.getElementById('tboxPhoneNumber').value = phonePrefix;
        //     }            
        // });       

        setTimeout(() => {
            let countryName = 'Russia';
            let phonePrefix = '+79185177860';        
    
            document.getElementById('cbxCountries-input').value = countryName;                
            document.getElementById('tboxPhoneNumber').value = phonePrefix;    
        }, 300);            
    }
};

export default SigninComponent;