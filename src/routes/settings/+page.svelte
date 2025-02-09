<script lang="ts">
    import { setContext, getContext, onMount } from "svelte";
    import { browser } from "$app/environment";

    import { MdOutlinedSelect } from "@material/web/all";
    import * as m from '$lib/paraglide/messages.js';

    let themeSelect: MdOutlinedSelect;
    let languageSelect: MdOutlinedSelect;

    function onThemeChanged(event: any) {
        let themeCode = themeSelect?.value ?? 'system';
        localStorage.setItem('theme', themeCode);
        window.dispatchEvent(new Event('themechanged'));
    }

    function onLanguageChanged(event: any) {
        let langCode = languageSelect?.value ?? 'en';
        localStorage.setItem('language', langCode);
        window.dispatchEvent(new Event('languagechanged'));
    }

    onMount(() => {
        if (!browser) return;

        if (themeSelect && languageSelect) {

            let theme = localStorage.getItem('theme') ?? 'system';
            let lang = localStorage.getItem('language') ?? 'en';

            if (theme) themeSelect.value = theme;
            if (lang) languageSelect.value = lang;

            themeSelect.addEventListener('change', onThemeChanged);
            languageSelect.addEventListener('change', onLanguageChanged);

            return () => {
                themeSelect.removeEventListener('change', onThemeChanged);
                languageSelect.removeEventListener('change', onLanguageChanged);
            }
        }
    });
</script>

<style lang="scss">
    md-outlined-select::part(menu) {
        --md-menu-container-color: var(--md-sys-color-surface);
    }

    .item {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;

        max-width: 690px;

        .text {
            font-size: 1.3em;
        }
    }
</style>

<div class="item">
    <span class="text">{m.settings_theme_title()}</span>
    <md-outlined-select required id="theme-select" bind:this={themeSelect}>
        <md-select-option selected value="system">
            <div slot="headline">{m.settings_theme_system()}</div>
        </md-select-option>
        <md-select-option value="light">
            <div slot="headline">{m.settings_theme_light()}</div>
        </md-select-option>
        <md-select-option value="dark">
            <div slot="headline">{m.settings_theme_dark()}</div>
        </md-select-option>
    </md-outlined-select>
</div>

<div class="item">
    <span class="text">{m.settings_language_title()}</span>
    <md-outlined-select required id="lang-select" bind:this={languageSelect}>
        <md-select-option selected value="en">
            <div slot="headline" translate="no">English</div>
        </md-select-option>
        <md-select-option value="ko">
            <div slot="headline" translate="no">한국어</div>
        </md-select-option>
        <md-select-option value="ja">
            <div slot="headline" translate="no">日本語</div>
        </md-select-option>
        <md-select-option value="cn">
            <div slot="headline" translate="no">中文</div>
        </md-select-option>
    </md-outlined-select>
</div>