<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
    import { setContext, getContext, onMount, onDestroy } from 'svelte';

    const { title }: App.Title = getContext('title');
    const { isOpen }: App.Menu = getContext('side-menu');

    function onMenuClick() {
        setContext('side-menu', { isOpen: !isOpen });
    }

    const props = $props();
</script>

<svelte:head>
    {#if title == null}
    <title>{m.title_default()}</title>
    {:else}
    <title>{m.title_named({ name: title })}</title>
    {/if}
</svelte:head>

<!-- svelte-ignore css_unused_selector -->
<style lang="scss">
#app-header {
    position: sticky;
    top: 0px;
    left: 0px;
    right: 0px;
    padding: 16px 24px;
    height: 56px;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;

    background-color: var(--md-sys-color-surface-variant);
    color: var(--md-sys-color-on-surface-variant);

    > .menu_btn {
        display: none;
        @media only screen and (max-width: 689px) {
            display: flex;
        }

        background-color: transparent;
        border: none;
        padding: 8px;
        border: 100%;
        aspect-ratio: 1/1;
        color: currentColor;
        cursor: pointer;
    }

    > .title {
        font-variation-settings: 'wght' 600;
        font-size: 1.3em;
        text-decoration: none;
        color: currentColor;
        user-select: none;
        cursor: pointer;
    }
}
</style>

<header id="app-header" {...props}>
    <button class="menu_btn" aria-label="{m.nav_menu_btn()}" onclick={onMenuClick}>
        <span class="material-symbols-rounded" translate="no">menu</span>
    </button>
    {#if title == null}
    <a class="title" href="/">{m.title_default()}</a>
    {:else}
    <a class="title" href="/">{m.title_named({ name: title })}</a>
    {/if}
</header>