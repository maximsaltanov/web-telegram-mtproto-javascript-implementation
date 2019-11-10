"use strict";

import '../styles/index.scss';
import SigninComponent     from '../partials/signIn';
import HomeComponent     from '../partials/home';
import Utils        from '../lib/utils';
import Error404Component from '../partials/error404';

// List of supported routes. Any url other than these routes will throw a 404 error
const routes = {
    '/'             : HomeComponent,
    '/signin'       : SigninComponent,
    '/error404'       : Error404Component
};

// The router code. Takes a URL, checks against the list of supported routes and then renders the corresponding content page.
const router = async () => {

    // Lazy load view element:    
    const content = null || document.getElementById('page_container');    
    
    // Get the parsed URl from the addressbar
    let request = Utils.parseRequestURL();

    // Parse the URL and if it has an id part, change it with the string ":id"
    let parsedURL = (request.resource ? '/' + request.resource : '/') + (request.id ? '/:id' : '') + (request.verb ? '/' + request.verb : '');
        
    // Get the page from our hash of supported routes.
    // If the parsed URL is not in our list of supported routes, select the 404 page instead
    let page = routes[parsedURL] ? routes[parsedURL] : Error404Component;
    
    if (page.preRender) {              
        if (await page.preRender() != null) return;        
    }

    content.innerHTML = await page.render();

    await page.after_render();
};

// Listen on hash change:
window.addEventListener('hashchange', router);

// Listen on page load:
window.addEventListener('load', router);
