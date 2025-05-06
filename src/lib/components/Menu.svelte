<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import pages from '$lib/page';
    import { browser } from '$app/environment';
	import Process from '$lib/process.svelte';
	import { page } from '$app/state';
	import type { MouseEventHandler } from 'svelte/elements';
	import Page from '../../routes/+page.svelte';
    const props = $props();

    let appSideMenu: Element | null;
    let appMenuToggle: Element | null;
    let appOverlayDim: Element | null;

    function menuOpen() {
        if (appSideMenu instanceof HTMLElement && appOverlayDim instanceof HTMLElement) {
            appSideMenu.classList.add('anim');
            appSideMenu.classList.add('open');
            appOverlayDim.classList.add('anim');
            appOverlayDim.classList.add('active');
            appOverlayDim.style.opacity = '.5';
            setTimeout(() => {
                if (appSideMenu instanceof HTMLElement && appOverlayDim instanceof HTMLElement) {
                    appSideMenu.classList.add('anim');
                    appOverlayDim.classList.add('anim');
                }
            }, 130);
        }
    }

    function menuClose() {
        if (appSideMenu instanceof HTMLElement && appOverlayDim instanceof HTMLElement) {
            appSideMenu.classList.add('anim');
            appOverlayDim.classList.add('anim');
            appSideMenu.classList.remove('open');
            appOverlayDim.style.opacity = '0';
            setTimeout(() => {
                if (appSideMenu instanceof HTMLElement && appOverlayDim instanceof HTMLElement) {
                    appSideMenu.classList.add('anim');
                    appOverlayDim.classList.add('anim');
                    let left = appSideMenu.getBoundingClientRect().left;

                    if (left <= -250) {
                        appOverlayDim.classList.remove('active');
                    }
                }
            }, 130);
        }
    }

    onMount(()=> {
        if (!browser) return;
        appMenuToggle = document.querySelector('#app-header > .menu_btn');

        appMenuToggle?.addEventListener('click', menuOpen);
        appOverlayDim?.addEventListener('click', menuClose);

        return () => {
            appMenuToggle?.removeEventListener('click', menuOpen);
            appOverlayDim?.removeEventListener('click', menuClose);
        }
    });
</script>

<style lang="scss">
.app-menu {

    ul {
        margin: 0px;
        padding: 0px;
        list-style-type: none;
        min-width: 250px;

        li {

            &[data-selected="true"] {
                a {
                    background: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 20%, transparent);
                    .text {
                        font-variation-settings: 'wght' 600;
                    }
                }
            }
            
            a {
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: 8px;
                color: currentColor;
                text-decoration: none;
                padding: 16px;
                margin: 0px 8px;
                border-radius: 100px;

                &:hover {
                    background: color-mix(in srgb, var(--md-sys-color-on-surface-variant) 30%, transparent);
                }
            }

            .title {
                display: block;
                padding: 16px 24px;
                font-variation-settings: 'wght' 600;
                font-size: 1.3em;
                text-decoration: none;
                color: currentColor;
                user-select: none;
                cursor: pointer;
                @media only screen and (min-width: 690px) {
                    display: none;
                }
            }
        }
    }
}

.dim {
    display: none;
}

@media only screen and (max-width: 689px) {
    #app-side-menu {
        position: fixed;
        top: 0px;
        left: 0px;
        bottom: 0px;
        left: 0px;
        z-index: 99;
        transform: translateX(-100%);

        background-color: var(--md-sys-color-surface-variant);
        color: var(--md-sys-color-on-surface-variant);
        border-top-right-radius: 24px;
        border-bottom-right-radius: 24px;
        touch-action: pan-x;

        &::before {
            content: '';
            position: absolute;
            top: 0px;
            bottom: 0px;
            right: -16px;
            width: 16px;
        }
        

        &.anim {
            transition: transform 130ms ease-in-out;
        }

        &.open {
            transform: translateX(0px);
        }
    }

    .dim {
        background-color: var(--md-sys-color-shadow);
        opacity: 0;
        position: fixed;
        display: none;
        z-index: 97;
        top: 0px;
        left: 0px;
        right: 0px;
        bottom: 0px;
        

        &.anim {
            transition: opacity 130ms ease-in-out;
        }

        &.active {
            display: block;
        }
    }
}
</style>

<aside id="app-side-menu" {...props} bind:this={appSideMenu}>
    <nav class="app-menu">
        <ul>
            <li>
                <span class="title">
                    nenka.lab
                </span>
            </li>
            {#each pages as p}
            <li data-selected={browser ? page.url.pathname.endsWith(p.path) : false}>
                <a href={p.path} onclick={menuClose}>
                    {#if browser ? page.url.pathname.endsWith(p.path) : false}
                    <span class="material-symbols-rounded" translate="no" style="
                    font-variation-settings: 'FILL' 1;
                    ">{p.icon}</span>
                    {:else}
                    <span class="material-symbols-rounded" translate="no">{p.icon}</span>
                    {/if}
                    <span class="text">{p.lang()}</span>
                </a>
            </li>
            {/each}
        </ul>
    </nav>
</aside>
<div class="dim" bind:this={appOverlayDim}></div>