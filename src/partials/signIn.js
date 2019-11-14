import AuthServiceSingleton from "../auth/authService";
import Autocomplete from "../components/countries/combobox";
import { Countries } from "../components/countries/combobox";

const AuthService = new AuthServiceSingleton().getInstance();

let SigninComponent = {
    currentFormId: 1,
    preRender: () => {
        console.log('signin pre render');

        // var userId = AuthService.mtpApiManager.getUserID();
        // if (userId) {
        //     var redirectUrl = '/';
        //     location = redirectUrl;
        //     return redirectUrl;
        // };

        // if (AuthService.getUser() != null)
        // {
        //     var redirectUrl= '/';
        //     location = redirectUrl;
        //     return redirectUrl;
        // };

        return null;
    },
    render: () => {

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
                <input id="tboxPhoneNumber" maxlength="12" name="tboxPhoneNumber" type="text" placeholder="Phone Number" required>
            </div>
            <div class="keep_me_in">                
                <p>
                    <input type="checkbox" id="keepMyIn" name="keepMyIn" checked>
                    <label for="keepMyIn">Keep me signed in</label>
                </p>
            </div>
            <div id="form_submit" class="form_submit">
                <input id="btnSubmitSigninForm" type="button" value="NEXT" style="display: none">
            </div>                        
        </form>
        <form id="form_2" novalidate class="form_container" autocomplete="off">        
            <img class="code" src="src/images/t_monkey1.png" alt="enter code">                
            <h3><span id="lblPhoneNumber"></span></h3>     
            <p class="form_descr width-160">We have sent you an SMS with the code.</p>             
            <div class="form_input">
                <input id="tboxCode" name="tboxCode" maxlength="12" type="text" placeholder="Code" required>
            </div>          
            <div class="form_submit">
                <input id="btnSubmitCodeForm" type="button" value="NEXT" style="display: none">
            </div>            
        </form>
        <form id="form_3" novalidate class="form_container" autocomplete="off">        
            <img class="profile" src="src/images/t_choose_ava.png" alt="choose profile picture">                
            <h3>Your Name</h3>     
            <p class="form_descr width-160">Enter your name and add a profile picture.</p>             
            <div class="form_input">
                <input id="tboxFirstname" name="tboxFirstname" type="text" placeholder="Name" required>
            </div>          
            <div class="form_input">
                <input id="tboxLastname" name="tboxLastname" type="text" placeholder="Last Name">
            </div>          
            <div class="form_submit">
                <input id="btnSubmitName" type="button" value="START MESSAGING">
            </div>            
        </form>
        <form id="form_4" novalidate class="form_container" autocomplete="off">        
            <img class="password" src="src/images/t_monkey3.png" alt="enter password">                
            <h3>Enter a Password</h3>     
            <p class="form_descr width-160">Your account is protected with an additional password.</p>             
            <div class="form_input">
                <input id="tboxPassword" name="tboxPassword" type="password" placeholder="Password" required>
            </div>          
            <div class="form_submit">
                <input id="btnSubmitPassword" type="button" value="NEXT">
            </div>            
        </form>        
    </div>
        `;
        //<img class="logo" src="src/images/t_monkey2.png" alt="invalid code">    
    }
    , after_render: async () => {

        var btnSubmitSigninForm, tboxPhoneNumber, tboxCountry;
        var btnSubmitCodeForm, tboxCode;

        //// show 1st form
        SigninComponent.showForm(1);

        function validateForm(formName) {
            switch (formName) {
                case "form1":
                    var form1Valid = tboxPhoneNumber.value.trim().length >= 9 && tboxCountry.value.trim().length >= 3;
                    btnSubmitSigninForm.style.display = form1Valid ? 'inline' : 'none';
                    break;
                case "form2":
                    var form2Valid = tboxCode.value.trim().length >= 4;
                    btnSubmitCodeForm.style.display = form2Valid ? 'inline' : 'none';
                    break;
            }
        }

        function onKeyUpEvent(event) {
            switch (event.target.getAttribute('id')) {
                case 'cbxCountries-input':
                case 'tboxPhoneNumber':
                    validateForm('form1');
                    break;
                case 'tboxCode':
                    validateForm('form2');
                    break;
            }
        }

        //// init sign in form


        //// init combo
        function createAutocomplete(node) {
            return new Autocomplete(node, (val) => {
                let country = Countries.find((item) => item.code == val);
                let phonePrefix = country.dial_code;
                tboxPhoneNumber.value = phonePrefix;
            });
        }

        function fillSelectElement(selectElement) {
            Countries.forEach((country) => {
                let option = document.createElement("option");
                option.text = country.name;
                option.value = country.code;
                selectElement.add(option);
            });
        }

        btnSubmitSigninForm = document.getElementById("btnSubmitSigninForm");
        tboxPhoneNumber = document.getElementById("tboxPhoneNumber");
        tboxCountry = null;

        const autocompletes = document.querySelectorAll(".autocomplete");
        autocompletes.forEach((selectElement) => {
            fillSelectElement(selectElement);
            createAutocomplete(selectElement);

            setTimeout(() => {
                tboxCountry = document.getElementById('cbxCountries-input');    
            }, 500);            
        });        

        //// get default country
        AuthService.initPhoneCountry().then((countryCode) => {
            let country = Countries.find((item) => item.code == countryCode);

            if (country != null) {
                let countryName = country.name;
                let phonePrefix = country.dial_code;
                
                tboxCountry.value = countryName;
                tboxPhoneNumber.value = phonePrefix;

                tboxCountry.addEventListener('keyup', onKeyUpEvent);
            }
        });

        //// set events
        tboxPhoneNumber.addEventListener('keyup', onKeyUpEvent);

        //// FORM 1 
        btnSubmitSigninForm.addEventListener("click", () => {

            let countryName = document.getElementById('cbxCountries-input').value;
            let country = Countries.find((item) => item.name == countryName);
            let phone = tboxPhoneNumber.value;

            AuthService.sendCode(country.code, phone).then((data) => {
                SigninComponent.showForm(2);
            }, (error) => {
                console.log(error);

                if (error.error_code == 400) {
                    switch (error.error_message) {
                        case 'PHONE_NUMBER_INVALID':
                            alert('Invalid phone number.');
                            break;
                        case 'PHONE_NUMBER_BANNED':
                            alert('The provided phone number is banned from telegram.');
                            break;
                        case 'PHONE_NUMBER_FLOOD':
                            alert('You asked for the code too many times.');
                            break;
                        case 'PHONE_PASSWORD_PROTECTED':
                            SigninComponent.showForm(4);
                            break;
                    }
                }
                else alert(`Error ${error.error_code}, Message ${error.error_message}`);
            });

            return false;
        });

        //// FORM 2            
        var tboxCode = document.getElementById("tboxCode");
        tboxCode.addEventListener('keyup', onKeyUpEvent);

        var btnSubmitCodeForm = document.getElementById("btnSubmitCodeForm");
        btnSubmitCodeForm.addEventListener("click", () => {
            let code = tboxCode.value;

            // var error = {
            //     code: 400,
            //     type: 'PHONE_NUMBER_UNOCCUPIED'
            // };                

            AuthService.signIn(code).then(() => {
                location = '/#/';
                return false;
            }, (error) => {

                console.log(error);

                if (error.error_code == 400) {
                    switch (error.error_message) {
                        case 'PHONE_CODE_INVALID':
                            alert('Invalid SMS code was sent.');
                            break;
                        case 'PHONE_CODE_EXPIRED':
                            alert('SMS expired.');
                            break;
                        case 'PHONE_NUMBER_BANNED':
                            alert('The provided phone number is banned from telegram.');
                            break;
                        case 'PHONE_NUMBER_UNOCCUPIED':
                            SigninComponent.showForm(3);
                            break;
                        case 'SESSION_PASSWORD_NEEDED':
                            SigninComponent.showForm(4);
                            break;
                    }
                }

            });

            return false;
        });

        document.getElementById("btnSubmitName").addEventListener("click", () => {

            let firstname = document.getElementById("tboxFirstname").value;
            let lastname = document.getElementById("tboxLastname").value;

            AuthService.signUp(firstname, lastname).then(() => {
                location = '/#/';
                return false;
            }, (error) => {

                console.log(error);

                if (error.error_code == 400) {
                    switch (error.error_message) {
                        case 'PHONE_CODE_EXPIRED':
                            alert('SMS expired.');
                            break;
                        case 'PHONE_NUMBER_FLOOD':
                            alert('You asked for the code too many times.');
                            break;
                        case 'FIRSTNAME_INVALID':
                            alert('Invalid first name.');
                            break;
                        case 'LASTNAME_INVALID':
                            alert('Invalid last name.');
                            break;
                    }
                }

            });

            return false;
        });

        document.getElementById("btnSubmitPassword").addEventListener("click", () => {
            
            ///let password = document.getElementById("tboxPassword").value;

            alert('Logging into accounts with two-factor authentication enabled is currently not possible. Please try later...');

            // AuthService.checkPassword(password).then(() => {
            //     location = '/#/';
            //     return false;
            // }, (error) => {

            //     console.log(error);
            //     alert(error.error_message);

            // });

            return false;
        });
    },
    showForm: (id) => {

        SigninComponent.currentFormId = id;

        switch(id){            
            case 2:                 
                document.getElementById('lblPhoneNumber').innerHTML = document.getElementById('tboxPhoneNumber').value;
                break;
        }

        //// display current form
        let formsCollection = document.getElementsByTagName("form");

        for (let i = 0; i < formsCollection.length; i++) {
            var form = formsCollection[i];
            var formId = form.getAttribute('id').split('_')[1];

            if (SigninComponent.currentFormId != formId) {
                formsCollection[i].style.display = "none";
            }
            else formsCollection[i].style.display = "inline-block";
        }
    }
};

export default SigninComponent;