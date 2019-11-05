let SigninComponent = {    
    render: async () => {
        let country = 'RU';
        let phone = '+79185177860';

        return `                
        <div id="root_container">
        <form id="form_signin" novalidate class="form_container">
            <img class="logo" src="src/images/t_logo.png" alt="logo">
            <h3>Sign in to Telegram</h3>        
            <p class="signin_descr">Please confirm your country and enter your phone number</p>        
            <div class="form_input autocomplete">
                <input id="tboxContriesList" name="tboxContriesList" type="text" placeholder="Country" required value="${country}">
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
        document.getElementById("btnSubmitSigninForm").addEventListener ("click",  () => {
            let country = document.getElementById("tboxContriesList").value;
            let phone = document.getElementById("tboxPhoneNumber").value;
            alert(`country ${country}, phone ${phone}`);
            return false;
        });
    }
};

export default SigninComponent;