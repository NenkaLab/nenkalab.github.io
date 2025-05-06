<script lang="ts">
	import type { MdOutlinedTextField, MdTabs, MdOutlinedSelect } from "@material/web/all";
	import { onMount } from "svelte";
    import MultiEncodingBase64 from "$lib/base64";
    import type { EncodingOptions, EncodingResult } from "$lib/base64";
    import * as m from '$lib/paraglide/messages.js';

    const base64 = new MultiEncodingBase64();

    const encodings = [
        'AUTO-DETECT', // Will be ignored
        'UTF-8',
        'ASCII', // Often treated as subset of UTF-8 or ISO-8859-1 by decoders
        'ISO-8859-1',
        'ISO-8859-2',
        'ISO-8859-6', // Arabic
        'ISO-8859-15',
        'Windows-1252', // Often aliased/compatible with ISO-8859-1 in browsers
        'ArmSCII-8', // Unlikely to be supported natively
        'BIG-5', // Traditional Chinese
        'CP850', // DOS Latin 1
        'CP866', // DOS Cyrillic
        'CP932', // Japanese (Shift-JIS variant)
        'CP936', // Simplified Chinese (GBK)
        'CP950', // Traditional Chinese (Big5 variant)
        'CP50220', 'CP50221', 'CP50222', // ISO-2022-JP variants
        'CP51932', // EUC-JP variant
        'EUC-CN', // Simplified Chinese
        'EUC-JP', // Japanese
        'EUC-KR', // Korean
        'EUC-TW', // Traditional Chinese
        'GB18030', // Chinese standard
        'HZ', // Simplified Chinese
        'ISO-2022-JP', // Japanese
        'ISO-2022-KR', // Korean
        'ISO-8859-3', 'ISO-8859-4', 'ISO-8859-5', // Cyrillic
        'ISO-8859-7', // Greek
        'ISO-8859-8', // Hebrew
        'ISO-8859-9', // Turkish
        'ISO-8859-10', 'ISO-8859-13', 'ISO-8859-14', 'ISO-8859-16',
        'JIS', // Ambiguous, likely refers to ISO-2022-JP or Shift_JIS
        'KOI8-R', // Russian
        'KOI8-U', // Ukrainian
        'SJIS', // Alias for Shift_JIS / CP932
        'UCS-2', 'UCS-2BE', 'UCS-2LE', // Older Unicode (often handled by UTF-16)
        'UCS-4', 'UCS-4BE', 'UCS-4LE', // Older Unicode (often handled by UTF-32)
        'UHC', // Korean (Windows variant of EUC-KR)
        'UTF-7', // Rarely used/supported, security risks
        'UTF-16', 'UTF-16BE', 'UTF-16LE',
        'UTF-32', 'UTF-32BE', 'UTF-32LE', // Less common than UTF-8/16
        'UTF7-IMAP', // Variant of UTF-7
        'Windows-1251', // Cyrillic
        'Windows-1254'  // Turkish
    ];

    base64.setSupportedEncodings(encodings);

    function back() {
        history.back();
    }


    let tab: MdTabs;

    let encodePage: HTMLElement;
    let encodeInput: MdOutlinedTextField;
    let encodeOutput: MdOutlinedTextField;
    let encodePassword: MdOutlinedTextField;
    let encodeEncoding: MdOutlinedSelect;
    let encodeCurEncoding: string = 'utf-8';

    let decodePage: HTMLElement;
    let decodeInput: MdOutlinedTextField;
    let decodeOutput: MdOutlinedTextField;
    let decodePassword: MdOutlinedTextField;
    let decodeEncoding: MdOutlinedSelect;
    let decodeCurEncoding: string = 'utf-8';

    async function b64EncodeUnicode() {
        let value = encodeInput.value;
        let encoding = encodeEncoding.value;
        let password = encodePassword.value;
        encodeCurEncoding = encoding;
        encodeOutput.value = await base64.encode(value, { password, encoding, compress: !!password }) ?? 'Error';
    }

    async function b64DecodeUnicode() {
        let value = decodeInput.value;
        let encoding = decodeEncoding.value;
        let password = decodePassword.value;
        decodeCurEncoding = encoding;
        decodeOutput.value = await base64.decode(value, { password, encoding, compress: !!password }) ?? 'Error';
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

.options {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;

    .item {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 16px;
    }
}

md-outlined-select::part(menu) {
    --md-menu-container-color: var(--md-sys-color-surface);
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
    <div class="options">
        <div class="encoding item">
            <span class="text">{m.utils_base64_encoding()}</span>
            <md-outlined-select 
                required 
                id="encode-encoding-select" 
                bind:this={encodeEncoding}
                onchange="{b64EncodeUnicode}">
                {#each base64.getSupportedEncodings() as supported}
                    {#if encodeCurEncoding == supported}
                        <md-select-option selected value="{supported}">
                            <div slot="headline">{supported.toUpperCase()}</div>
                        </md-select-option>
                    {:else}
                        <md-select-option value="{supported}">
                            <div slot="headline">{supported.toUpperCase()}</div>
                        </md-select-option>
                    {/if}
                {/each}
            </md-outlined-select>
        </div>
        <div class="password item">
            <span class="text">{m.utils_base64_password()}</span>
            <md-outlined-text-field
                id="encode-password-input"
                label="{m.utils_base64_enter_password()}"
                type="password"
                bind:this={encodePassword}
                oninput="{b64EncodeUnicode}">
            </md-outlined-text-field>
        </div>
    </div>
    <div class="io">
        <md-outlined-text-field
            id="encode-input"
            label="{m.utils_base64_encode_input()}"
            type="textarea"
            style="width: 300px;height: 200px;"
            bind:this={encodeInput}
            oninput="{b64EncodeUnicode}">
        </md-outlined-text-field>
        <md-outlined-text-field
            id="encode-output"
            label="{m.utils_base64_encode_output()}"
            type="textarea"
            style="width: 300px;height: 200px;"
            bind:this={encodeOutput}>
        </md-outlined-text-field>
    </div>
</section>

<section id="decode" class="hide" bind:this={decodePage}>

    <div class="options">
        <div class="encoding item">
            <span class="text">{m.utils_base64_encoding()}</span>
            <md-outlined-select 
                required
                id="decode-encoding-select"
                bind:this={decodeEncoding}
                onchange="{b64DecodeUnicode}">
                {#each base64.getSupportedEncodings() as supported}
                    {#if decodeCurEncoding == supported}
                        <md-select-option selected value="{supported}">
                            <div slot="headline">{supported.toUpperCase()}</div>
                        </md-select-option>
                    {:else}
                        <md-select-option value="{supported}">
                            <div slot="headline">{supported.toUpperCase()}</div>
                        </md-select-option>
                    {/if}
                {/each}
            </md-outlined-select>
        </div>
        <div class="password item">
            <span class="text">{m.utils_base64_password()}</span>
            <md-outlined-text-field
                id="encode-password-input"
                label="{m.utils_base64_enter_password()}"
                type="password"
                bind:this={decodePassword}
                oninput="{b64DecodeUnicode}">
            </md-outlined-text-field>
        </div>
    </div>

    <div class="io">
        <md-outlined-text-field
            id="decode-input"
            label="Base64 를 입력하세요"
            type="textarea"
            style="width: 300px;height: 200px;"
            bind:this={decodeInput}
            oninput="{b64DecodeUnicode}">
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