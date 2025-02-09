<script lang="ts">
	import { browser } from '$app/environment';
    import { page } from '$app/state';
	import { i18n } from '$lib/i18n';
    import { goto } from '$app/navigation';
	import type { MdFilledButton, MdOutlinedButton } from '@material/web/all';
	import { onMount } from 'svelte';
    import * as m from '$lib/paraglide/messages.js';

let goBack: MdFilledButton;
let goHome: MdOutlinedButton;

function back() {
    history.back();
}
function home() {
    let lang : any = localStorage.getItem('language') || 'en';

    const canonicalPath = i18n.route('/');
    const localisedPath = i18n.resolveRoute(canonicalPath, lang);
    goto(localisedPath);
}

onMount(() => {
    if (!browser) return;

    if (goBack && goHome) {
        if ('canGoBack' in window.navigation) {
            if (!window.navigation.canGoBack) {
                goBack.style.display = 'none';
            } else {
                goBack.style.display = '';
            }
        }
        
        goBack.addEventListener('click', back);
        goHome.addEventListener('click', home);

        return () => {
            goBack.removeEventListener('click', back);
            goHome.removeEventListener('click', home);
        }
    }
});

</script>

<style lang="scss">
#error-page {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    .status {
        font-size: 3em;
    }

    .message {
        font-size: 1.5em;
    }

    .btns {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin: 8px;
    }
}
</style>

<div id="error-page">
    <span class="status">{page.status}</span>
    <span class="message">{page.error?.message}</span>
    <div class="btns">
        <md-filled-button class="go-back" bind:this={goBack}>{m.error_go_back()}</md-filled-button>
        <md-outlined-button class="go-home" bind:this={goHome}>{m.error_go_home()}</md-outlined-button>
    </div>
</div>