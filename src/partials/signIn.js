import AuthServiceSingleton from "../auth/authService";
import Autocomplete from "../components/countries/combobox";
import { Countries } from "../components/countries/combobox";
import Utils from "../lib/utils";

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
                <input id="tboxPhoneNumber" maxlength="12" name="tboxPhoneNumber" onclick="this.setSelectionRange(0, this.value.length)" type="text" placeholder="Phone Number" required>
                <span class="floating-label">Phone Number</span>
            </div>
            <div class="keep_me_in">                
                <p>
                    <input type="checkbox" id="keepMyIn" name="keepMyIn" checked>
                    <label for="keepMyIn">Keep me signed in</label>
                </p>
            </div>
            <div id="form_submit" class="form_submit">
                <input id="btnSubmitSigninForm" type="button" value="NEXT" style="display: none">
                <input id="btnSubmitSigninFormWait" type="button" value="PLEASE WAIT..." style="display: none">
            </div>                        
        </form>
        <form id="form_2" novalidate class="form_container" autocomplete="off">        
            <img id="imgValidCode" class="code" src="src/images/t_monkey1.png" alt="enter code">                              
            <h3>
                <span id="lblPhoneNumber"></span>
                <img id="btnEditPhone" class="editPhone" src="src/images/edit_1x.png" style="display: none" />
            </h3>     
            <p class="form_descr width-160">We have sent you an SMS with the code.</p>             
            <div class="form_input">
                <input id="tboxCode" name="tboxCode" maxlength="12" type="text" placeholder="Code" onclick="this.setSelectionRange(0, this.value.length)">
                <span class="floating-label">Code</span>
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
                <input id="tboxFirstname" name="tboxFirstname" maxlength="30" type="text" placeholder="Name" required onclick="this.setSelectionRange(0, this.value.length)">
                <span class="floating-label">Name</span>
            </div>          
            <div class="form_input">
                <input id="tboxLastname" name="tboxLastname" maxlength="30" type="text" placeholder="Last Name" onclick="this.setSelectionRange(0, this.value.length)">
                <span class="floating-label">Last Name (optional)</span>
            </div>          
            <div class="form_submit">
                <input id="btnSubmitName" type="button" value="START MESSAGING" style="display: none">
            </div>            
        </form>
        <form id="form_4" novalidate class="form_container" autocomplete="off">        
            <img class="password" src="src/images/t_monkey3.png" alt="enter password">                
            <h3>Enter a Password</h3>     
            <p class="form_descr width-160">Your account is protected with an additional password.</p>             
            <div class="form_input">
                <input id="tboxPassword" name="tboxPassword" type="password" maxlength="30" placeholder="Password" required>
                <span class="floating-label">Password</span>
            </div>          
            <div class="form_submit">
                <input id="btnSubmitPassword" type="button" value="NEXT" style="display: none">
            </div>            
        </form>        
    </div>
        `;        
    }
    , after_render: async () => {
    
        var btnSubmitSigninForm, tboxPhoneNumber, tboxCountry;
        var btnSubmitCodeForm, tboxCode;
        var btnSubmitName, tboxFirstname, tboxLastname;        

        function validateForm(formName) {
            switch (formName) {
                case "form1":
                    var form1Valid = tboxPhoneNumber.value.trim().length >= 9 && tboxCountry.value.trim().length >= 3;
                    btnSubmitSigninForm.style.display = form1Valid ? 'inline' : 'none';
                    break;
                case "form2":
                    var form2CodeValid = tboxCode.checkValidity();
                    var form2Valid = tboxCode.value.trim().length >= 4 && form2CodeValid;
                    btnSubmitCodeForm.style.display = form2Valid ? 'inline' : 'none';                    
                    document.getElementById("imgValidCode").src = form2CodeValid ? 'src/images/t_monkey1.png' : 'src/images/t_monkey2.png';
                    document.getElementById("btnEditPhone").style.display = form2CodeValid ? 'none' : 'inline';
                    break;
                case "form3":
                    var form3Valid = tboxFirstname.value.trim().length >= 1;
                    btnSubmitName.style.display = form3Valid ? 'inline' : 'none';   
                    break;
                case "form4":
                    var form4Valid = tboxPassword.value.trim().length >= 4;
                    btnSubmitPassword.style.display = form4Valid ? 'inline' : 'none';   
                    break;
            }
        }

        //// global input key up handler
        function onKeyUpEvent(event) {
            event.target.setCustomValidity('');
            switch (event.target.getAttribute('id')) {
                case 'cbxCountries-input':
                case 'tboxPhoneNumber':
                    validateForm('form1');
                    break;
                case 'tboxCode':
                    validateForm('form2');
                    break;
                case 'tboxFirstname':
                case 'tboxLastname':
                    validateForm('form3');
                case "tboxPassword":
                    validateForm('form4');
                    break;
            }
        }

        //// FORM 1
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

        //// set regexes
        Utils.setInputFilter(tboxPhoneNumber, function(value) {
            return /^\+\d*$/.test(value); 
        });        

        //// fill countries
        const autocompletes = document.querySelectorAll(".autocomplete");
        autocompletes.forEach((selectElement) => {
            fillSelectElement(selectElement);
            createAutocomplete(selectElement);

            setTimeout(() => {
                tboxCountry = document.getElementById('cbxCountries-input');    

                Utils.setInputFilter(tboxCountry, function(value) {
                    return /^[A-Za-z -]+$/.test(value); 
                });
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
        
        btnSubmitSigninForm.addEventListener("click", () => {

            let countryName = document.getElementById('cbxCountries-input').value;
            let country = Countries.find((item) => item.name == countryName);
            let phone = tboxPhoneNumber.value;

            btnSubmitSigninForm.style.display = 'none';
            btnSubmitSigninFormWait.style.display = 'inline';

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
            }).finally(() =>{ 
                btnSubmitSigninForm.style.display = 'inline';
                btnSubmitSigninFormWait.style.display = 'none';
            });

            // setTimeout(()=> {
            //     btnSubmitSigninForm.style.display = 'inline';
            //     btnSubmitSigninFormWait.style.display = 'none';
            // }, 4000);

            return false;
        });

        //// FORM 2            
        var tboxCode = document.getElementById("tboxCode");

        //// set regexes
        Utils.setInputFilter(tboxCode, function(value) {
            return /^\d*$/.test(value); 
        });  

        tboxCode.addEventListener('keyup', onKeyUpEvent);

        var btnSubmitCodeForm = document.getElementById("btnSubmitCodeForm");
        btnSubmitCodeForm.addEventListener("click", () => {
            let code = tboxCode.value;
            
            AuthService.signIn(code).then(() => {
                location = '/#/';
                return false;
            }, (error) => {

                console.log(error);

                if (error.error_code == 400) {
                    switch (error.error_message) {
                        case 'PHONE_CODE_INVALID':                            
                        case 'PHONE_CODE_EXPIRED':
                            tboxCode.setCustomValidity("Invalid field.");
                            validateForm('form2');                            
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

        //// FORM 3
        tboxFirstname = document.getElementById("tboxFirstname");
        tboxLastname = document.getElementById("tboxLastname");

        tboxFirstname.addEventListener('keyup', onKeyUpEvent);
        tboxLastname.addEventListener('keyup', onKeyUpEvent);

        btnSubmitName = document.getElementById("btnSubmitName");

        //// set regexes
        Utils.setInputFilter(tboxFirstname, function(value) {
            return /^[ A-Za-z-`']+$/.test(value); 
        });  
        Utils.setInputFilter(tboxLastname, function(value) {
            return /^[ A-Za-z -`']+$/.test(value); 
        }); 

        btnSubmitName.addEventListener("click", () => {

            let firstname = tboxFirstname.value;
            let lastname = tboxLastname.value;

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

        //// FORM 4
        var tboxPassword = document.getElementById("tboxPassword");
        var btnSubmitPassword = document.getElementById("btnSubmitPassword");

        tboxPassword.addEventListener('keyup', onKeyUpEvent);

        btnSubmitPassword.addEventListener("click", () => {
            
            let password = tboxPassword.value;

            alert('Logging into accounts with two-factor authentication enabled is currently not possible. Please try later...');

            // AuthService.checkPassword(password).then(() => {
            //     //location = '/#/';
            //     return false;
            // }, (error) => {

            //     console.log(error);
            //     alert(error.error_message);
            // });

            return false;
        });

        //// show 1st form
        SigninComponent.showForm(1);
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