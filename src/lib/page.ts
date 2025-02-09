import * as m from '$lib/paraglide/messages.js';

declare interface Page { 
    path: string;
    lang: Function;
    icon: string;
}

declare type PageList = Page[];

const list: PageList = [
    { path: '/home', lang: () => m.nav_home(), icon: 'home' },
    { path: '/utils', lang: () => m.nav_utils(), icon: 'auto_awesome_mosaic' },
    { path: '/settings', lang: () => m.nav_settings(), icon: 'settings' },
    { path: '/license', lang: () => m.nav_license(), icon: 'info' },
];

export default list;