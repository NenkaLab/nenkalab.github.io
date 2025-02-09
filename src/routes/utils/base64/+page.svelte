<script lang="ts">
	import type { MdOutlinedTextField, MdTabs } from "@material/web/all";
	import { onMount } from "svelte";


    function back() {
        history.back();
    }


    let tab: MdTabs;

    let encodePage: HTMLElement;
    let encodeInput: MdOutlinedTextField;
    let encodeOutput: MdOutlinedTextField;

    let decodePage: HTMLElement;
    let decodeInput: MdOutlinedTextField;
    let decodeOutput: MdOutlinedTextField;

    function b64EncodeUnicode(str: string): string {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
            return String.fromCharCode(parseInt(p1, 16))
        }))
    }

    function b64DecodeUnicode(str: string): string {
        return decodeURIComponent(Array.prototype.map.call(atob(str), function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        }).join(''))
    }


    function changeTab(event: any) {
        if (event.target.activeTabIndex == 0) {
            encodePage.classList.remove('hide');
            decodePage.classList.add('hide');
        } else {
            encodePage.classList.add('hide');
            decodePage.classList.remove('hide');
        }
    }

    onMount(() => {
        setTimeout(() => {
            // @ts-ignore
            document.querySelector("#b-tabs").shadowRoot.querySelector("md-divider")?.remove();
        }, 200);

        tab.addEventListener('change', changeTab);

        return () => {
            tab.removeEventListener('change', changeTab);
        }
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

.hide {
    display: none;
}

</style>

<h1 class="b-title">
    <button class="back" onclick="{back}">
        <md-ripple></md-ripple>
        <span class="material-symbols-rounded" translate="no">arrow_back</span>
    </button>
    Base64
</h1>

<md-tabs id="b-tabs" bind:this={tab}>
    <md-primary-tab active>Encode</md-primary-tab>
    <md-primary-tab>Decode</md-primary-tab>
</md-tabs>

<section id="encode" bind:this={encodePage}>
    <div>
        <md-outlined-text-field
            id="encode-input"
            label="텍스트를 입력하세요"
            type="textarea"
            style="width: 300px;height: 200px;"
            bind:this={encodeInput}
            oninput="{() => {
                encodeOutput.value = b64EncodeUnicode(encodeInput.value);
            }}">
        </md-outlined-text-field>
        <md-outlined-text-field
            id="encode-output"
            label="출력"
            type="textarea"
            style="width: 300px;height: 200px;"
            bind:this={encodeOutput}>
        </md-outlined-text-field>
    </div>
</section>

<section id="decode" class="hide" bind:this={decodePage}>
    <div>
        <md-outlined-text-field
            id="decode-input"
            label="Base64 를 입력하세요"
            type="textarea"
            style="width: 300px;height: 200px;"
            bind:this={decodeInput}
            oninput="{() => {
                decodeOutput.value = b64DecodeUnicode(decodeInput.value);
            }}">
        </md-outlined-text-field>
        <md-outlined-text-field
            id="decode-output"
            label="출력"
            type="textarea"
            style="width: 300px;height: 200px;"
            bind:this={decodeOutput}>
        </md-outlined-text-field>
    </div>
</section>