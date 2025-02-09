<script lang="ts">
	import { onMount } from "svelte";


    function back() {
        history.back();
    }

    onMount(() => {
        setTimeout(() => {
            // @ts-ignore
            document.querySelector("#b-tabs").shadowRoot.querySelector("md-divider")?.remove();
        }, 200);
    });
</script>

<style lang="scss">

.b-title {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 8px;
    margin-top: 0px;

    .back {
        padding: 8px;
        border-radius: 50%;
        overflow: hidden;
        position: relative;
        aspect-ratio: 1 / 1;

        background-color: transparent;
        border: 0;
        color: currentColor;
    }
}

md-tabs {    
    border-radius: 100px;
    border: 2px solid var(--md-sys-color-outline-variant);

    md-divider {
        display: none;

        &::before {
            display: none;
        }
    }
}

</style>

<h1 class="b-title">
    <button class="back" onclick="{back}">
        <md-ripple></md-ripple>
        <span class="material-symbols-rounded" translate="no">arrow_back</span>
    </button>
    Base64
</h1>

<md-tabs id="b-tabs">
    <md-primary-tab active>Encode</md-primary-tab>
    <md-primary-tab>Decode</md-primary-tab>
</md-tabs>

<section id="encode">
    <div>
        <md-outlined-text-field
            id="encode-input"
            label="Base64 를 입력하세요"
            type="textarea">
        </md-outlined-text-field>
        <md-outlined-text-field
            id="encode-output"
            label="출력"
            type="textarea">
        </md-outlined-text-field>
    </div>
</section>

<section id="decode">

</section>