import AuthServiceSingleton from '../auth/authService';
import DialogsService from '../dialogs/dialogsService';

const AuthService = new AuthServiceSingleton().getInstance();
const dialogsService = new DialogsService();

var user = null;

let HomeComponent = {

    preRender: async () => {
        console.log('home pre render');
        
        user = AuthService.getUser();
        console.log(user);

        if (user == null) {
            var redirectUrl = '/#/signin';
            location = redirectUrl;
            return redirectUrl;
        }

        user = JSON.parse(user);

        return null;
    },
    render: () => {

        console.log('home render');                
        
        return `        
        <div id="main_container">
            <div class="column-1">
                <div id="headerColumn1" class="column-1-header" style="display: none"></div>
                <div class="wrapper-column-1">
                    <div id="dialogs-container" class="column-1-dialogs">                
                    </div>
                </div>
            </div>
            <div class="column-2">
                <div id="headerColumn2" class="column-2-header" style="display: none">                    
                </div>
                <div class="wrapper-column-2">
                    <div id="messages-container" class="column-2-messages">
                        <div id="emptyMessageContainer" class="empty-messages" style="display: none">Please select a chat to start messaging</div>
                    </div>
                </div>
                <div id="footerColumn2" class="column-2-footer" style="display: none">                
                </div>
            </div>
            <div id="preloader" class="preloader"><img src="src/images/preloader.gif"></div>
        </div>
        `;      
    }
    , after_render: async () => {
        console.log('home after render');        

        //// show progress        
        HomeComponent.showPreloader();
        
        setTimeout(() => {
            HomeComponent.getDialogs();    
        }, 3000);
        
    },
    clearContainer: (container) => {
        while (container.firstChild) {
            container.removeChild(container.firstChild);        
        }      
    },
    showPreloader: (show = true) => {
        document.getElementById('preloader').style.display = !show ? 'none' : 'inline';        
    },    
    getMessages: (peerId, hashId, isChannel) => {                

        var messagesContainer = document.getElementById('messages-container');

        dialogsService.getMessages(peerId, hashId, isChannel).then((data) => {
            if (data && data.messages.length > 0){
                var content = '';

                data.messages.slice().reverse().forEach(function(item) {                
                    
                    if (item.message) {
                        var date = new Date(+item.date);
                        var hour = date.getHours();
                        var mins = date.getMinutes();
                        var time = (hour > 9 ? hour : '0' + hour) + ":" + (mins > 9 ? mins : '0' + mins);
                        
                        var className = isChannel || +peerId < 0 ? 'message-item-center' : 
                            (item.from_id == user.id ? 'message-item-right' : 'message-item-left');
                        content += `<div class="${className}">${item.message}<span class="time">${time}</span></div><div style="clear: both;"></div>`;
                    }
                });
                                                
                HomeComponent.clearContainer(messagesContainer);
                var messagesItemsDiv = document.createElement("div");                 
                messagesItemsDiv.innerHTML = content;
                messagesContainer.appendChild(messagesItemsDiv);            
                
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }

            document.getElementById('footerColumn2').style.display = 'block';
        }, (error) => {
            alert(error.error_message);            
            HomeComponent.clearContainer(messagesContainer);
        }).finally(() => HomeComponent.showPreloader(false));
    },
    getDialogs: () => {

        function getRandomColor() {
            var letters = '0123456789ABCDEF';
            var color = '#';
            for (var i = 0; i < 6; i++) {
              color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        }
        
        var dialogsContainer = document.getElementById('dialogs-container');        
        HomeComponent.clearContainer(dialogsContainer);

        function getDialogsInfo(item){                        
            var name = `${item.first_name ? item.first_name : ''} ${item.last_name ? ' ' + item.last_name : ''}`;
            var initials = item.last_name || item.first_name ? (item.last_name && item.first_name ? item.first_name.charAt(0) + item.last_name.charAt(0) : 
            item.first_name && item.first_name.length > 2 ? item.first_name.charAt(0) + item.first_name.charAt(1) :
            item.first_name && item.first_name.length > 2 ? item.first_name.charAt(0)+item.first_name.charAt(0): 'NA') : 'NA';

            return {
                name: name,
                initials: initials
            };
        }

        dialogsService.getDialogs().then((dialogs) => {            

            if (dialogs != null){

                var content = '';
                if (dialogs.chats && dialogs.chats.length > 0) {
                    
                    /// add channels
                    dialogs.chats.forEach(item => {                                    
                        content += `<div class="dialog-item" data-type="${item._}" data-title="${item.title}" 
                            data-id="${item.id}" data-hash="${item.access_hash}">
                            <div class="dialog-item-ava">                                         
                            </div>
                            <div class="dialog-item-content">
                                <div><b>${item.title}</b></div>                                
                            </div>
                        </div>`;
                        
                    });
                    
                    content += `<div class="dialog-item-sep"><div>`;                    
                }                                        

                if (dialogs.dialogs && dialogs.dialogs.length > 0) {                    
                    //// add dialogs
                    dialogs.dialogs.forEach(item => {
                        var peerId = item.peer.user_id || item.peer.channel_id;           
                        
                        var usr = dialogs.users.find(f => f.id == peerId);

                        if (usr) {
                            var info = getDialogsInfo(usr);                        
                            
                            content += `<div class="dialog-item" data-type="${item.peer._}" data-id="${peerId}" 
                                data-title="${info.name}">
                                <div class="dialog-item-ava">            
                                    <div class="numberCircle" style="background-color: ${getRandomColor()}">${info.initials.toUpperCase()}</div>
                                </div>
                                <div class="dialog-item-content">
                                    <div><b>${info.name}</b></div>
                                </div>
                            </div>`;  
                        }                      
                    });
                }

                if (content != ''){
                    var dialogItemsDiv = document.createElement("div");                        
                    dialogItemsDiv.innerHTML = content;
                    dialogsContainer.appendChild(dialogItemsDiv);                    
                }                

                function selectDialog() {                    
                    
                    //// show progress                     
                    HomeComponent.showPreloader();

                    /// get dialog parameters
                    var id = this.getAttribute('data-id');                    
                    var type = this.getAttribute('data-type');                                        
                    var hash = this.getAttribute('data-hash');
                    var title = this.getAttribute('data-title');                    
                    console.log('open message ', `id: ${id}, type:${type}, title:${title}`);
                    HomeComponent.getMessages(id, hash, type == "peerChannel" || type == "channel");

                    //// set current dialog as selected
                    var elements = document.querySelectorAll('.dialog-item');
                    elements.forEach((el) => el.classList.remove('selected'));                    
                    this.classList.add('selected');                    

                    //// set current dialog name in the header
                    var headerColumn2 = document.getElementById('headerColumn2');
                    headerColumn2.style.display = 'inline';
                    headerColumn2.innerHTML = `
                        <div id="headerItem" class="header-item">
                            <div class="header-item-ava"></div>
                            <div id="header-item-content" class="header-item-content">
                                <div><b>${title}</b></div>                        
                            </div>
                        </div>
                    `;                    
                }

                document.getElementsByClassName("dialog-item").forEach(function(element) {
                    element.addEventListener('click', selectDialog);
                });
            }        
            
            document.getElementById('headerColumn1').style.display = 'block';                        
            document.getElementById('emptyMessageContainer').style.display = 'block';                 

            HomeComponent.showPreloader(false);

        }, (error) => {
            console.log(error);

            HomeComponent.showPreloader(false);
        });              
    }
};

export default HomeComponent;