<script lang="ts">
    import pages from '$lib/page';
    import { browser } from '$app/environment';
    import { fade } from 'svelte/transition';
    const props = $props();
    const children = props.children;
</script>

<style lang="scss">

.app-content {
    background-color: var(--md-sys-color-surface);
    color: var(--md-sys-color-on-surface);

    $round: 24px;

    width: 100%;
    border-radius: $round;
    padding: $round;
    // margin: 0px 16px 16px 16px;
    overflow: auto;

    @media only screen and (max-width: 689px) {
        margin: 0%;
        border-bottom-right-radius: 0px;
        border-bottom-left-radius: 0px;
    }

    &::-webkit-scrollbar {
        width: 8px;
    }
    &::-webkit-scrollbar-button {
        height: $round;
    }
    &::-webkit-scrollbar-track {
        background-color: transparent;
    }
    &::-webkit-scrollbar-thumb {
        background-color: var(--md-sys-color-on-surface);
        border-radius: 8px;
    }
}
</style>

<article class="app-content">
    {@render children()}
</article>