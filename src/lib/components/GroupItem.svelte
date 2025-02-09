<script lang="ts">
export let href: string;
export let image: string | undefined = undefined;
export let title: string;
export let message: string;

</script>

<style lang="scss">
.group-list-item {
    position: relative;

    display: block;
    background-color: var(--md-sys-color-surface-variant);
    color: var(--md-sys-color-on-surface-variant);
    text-decoration: none;
    overflow: hidden;
    border-radius: 16px;
    width: 100%;

    @media only screen and (max-width: 915px) {
        max-width: 100%;
    }

    .content {
        display: flex;
        flex-direction: column;
        flex-wrap: nowrap;
        gap: 8px;
        padding: 16px;

        .image {
            user-select: none;
        }

        .title {
            font-size: 1.5em;
        }

        .message {

        }

    }
}
</style>

<a class="group-list-item" href="{href}">
    <md-ripple></md-ripple>
    <div class="content">
        {#if image != undefined}
        <img class="image" src="{image}" alt="{title}" draggable="false" onerror={(e: any) => {
            e.target.style.display = 'none';
        }}>
        {/if}
        <span class="title">{title}</span>
        <span class="message">{message}</span>
    </div>
</a>