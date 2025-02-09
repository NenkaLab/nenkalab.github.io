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

    let isDragging = false;
    let shiftX = 0;
    let captureId: number | null = null;

    function mapValue(x: number) {
        return (x + 250) / 500;
    }

    function menuOpen() {
        if (appSideMenu instanceof HTMLElement && appOverlayDim instanceof HTMLElement) {
            appSideMenu.classList.add('anim');
            appOverlayDim.classList.add('anim');
            appOverlayDim.classList.add('active');
            appSideMenu.style.left = '0px';
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
            appSideMenu.style.left = '-250px';
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

    /* 나중에 더 배우고
    function pointerDown(event: any) {

        if (!event.isPrimary) return true;

        event.preventDefault();
        if (appSideMenu instanceof HTMLElement && appOverlayDim instanceof HTMLElement) {
            if (event.target.hasPointerCapture(event.pointerId)) {
                event.target.releasePointerCapture(event.pointerId);
            }
            isDragging = true;
            shiftX = event.clientX - appSideMenu.getBoundingClientRect().left;
            appSideMenu.setPointerCapture(event.pointerId);
            appOverlayDim.classList.add('active');
            captureId = event.pointerId;
        }
    }

    function pointerMove(event: any) {
        if (isDragging) {
            if (appSideMenu instanceof HTMLElement && appOverlayDim instanceof HTMLElement) {
                let newLeft = event.clientX - shiftX;

                if (newLeft > 0) newLeft = 0;
                if (newLeft < -250) newLeft = -250;

                appSideMenu.style.left = newLeft + 'px';
                appOverlayDim.style.opacity = mapValue(newLeft) + '';
            }
        }
    }

    function pointerUp(event: any) {
        isDragging = false;
        if (appSideMenu instanceof HTMLElement && appOverlayDim instanceof HTMLElement) {
            if (captureId) {
                appSideMenu.releasePointerCapture(captureId);
                captureId = null;
            }
            let newLeft = appSideMenu.getBoundingClientRect().left;
            if (newLeft < -125) {
                menuClose();
            } else {
                menuOpen();
            }
        }
    }

    const noDrag = () => false;
    */

    onMount(()=> {
        if (!browser) return;
        appMenuToggle = document.querySelector('#app-header > .menu_btn');
        
        appMenuToggle?.addEventListener('click', menuOpen);
        appOverlayDim?.addEventListener('click', menuClose);

        /*
        appSideMenu?.addEventListener('pointerdown', pointerDown);

        appSideMenu?.addEventListener('dragstart', noDrag);

        window.addEventListener('pointermove', pointerMove);
        window.addEventListener('pointerup', pointerUp);
        */

        return () => {
            appMenuToggle?.removeEventListener('click', menuOpen);
            appOverlayDim?.removeEventListener('click', menuClose);

            /*
            appSideMenu?.removeEventListener('pointerdown', pointerDown);

            appSideMenu?.removeEventListener('dragstart', noDrag);

            window.removeEventListener('pointermove', pointerMove);
            window.removeEventListener('pointerup', pointerUp);
            */
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
        left: -250px;
        z-index: 99;

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
            transition: left 130ms ease-in-out;
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