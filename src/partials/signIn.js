import AuthService from "../auth/authService";
import Autocomplete from "../components/countries/combobox";
import { Countries } from "../components/countries/combobox";

let SigninComponent = {
    // preRender: async () => {
    //     console.log('signin pre render');
    // },
    render: async () => {

        // console.log('signin render');

        let country = 'RU';
        let phone = '+79185177860';

        {/* <div class="form_input autocomplete">
                <input id="tboxContriesList" name="tboxContriesList" type="text" placeholder="Country" required value="${country}">
            </div> */}

        return `                
        <div id="root_container">
        <form id="form_signin" novalidate class="form_container" autocomplete="off">
            <img class="logo" src="src/images/t_logo.png" alt="logo">
            <h3>Sign in to Telegram</h3>        
            <p class="signin_descr">Please confirm your country and enter your phone number</p>        
            <div class="chbContainer">
                <div class="chbWrapper">
                    <select class="autocomplete" name="cbxCountries" id="cbxCountries" required></select>
                </div>
            </div>  
            <div class="form_input">
                <input id="tboxPhoneNumber" name="tboxPhoneNumber" type="text" placeholder="Phone Number" required value="${phone}">
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
    </div>
        `;
    }
    , after_render: async () => {
        // console.log('signin after render');

        //// init combobox
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

            // AuthService.initPhoneCountry().then((result) => {
            //     alert(result);
            // });
        });

        document.getElementById("btnSubmitSigninForm").addEventListener("click", () => {

            AuthService.initPhoneCountry();

            // let country = document.getElementById("tboxContriesList").value;
            // let phone = document.getElementById("tboxPhoneNumber").value;

            // AuthService.sendCode(country, phone);

            // AuthService.authorize().then((userData) => {
            //     if (userData.isAuthorized) {                    
            //         location = '/#/';                    
            //     }
            //     else alert('Access Denied');
            // });

            return false;
        });
    }
};

export default SigninComponent;