<script lang="ts">
	export const prerender = true;
	export const ssr = true;
	import { i18n } from '$lib/i18n';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { setContext, onMount } from 'svelte';
    import '@material/web/all.js';
	import { argbFromHex, themeFromSourceColor, applyTheme } from "@material/material-color-utilities";
    import {styles as typescaleStyles} from '@material/web/typography/md-typescale-styles.js';
    import { browser } from '$app/environment';
	import Header from '$lib/components/Header.svelte';
	import Menu from '$lib/components/Menu.svelte';
	import Content from '$lib/components/Content.svelte';
	let { children } = $props();

	setContext('title', { title: null });
	setContext('side-menu', { isOpen: false });

	function themeChange() {
		let theme = localStorage.getItem('theme') || 'system';

		if (theme === 'system') {
			theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}

		const themeColor = themeFromSourceColor(argbFromHex('#985cbc'));

		applyTheme(themeColor, {target: document.documentElement, dark: (theme == 'dark')});
	}

	function langChange() {
		if (page.status >= 200 && page.status < 400) {
			let lang : any = localStorage.getItem('language') || 'en';

			const canonicalPath = i18n.route(page.url.pathname);
			const localisedPath = i18n.resolveRoute(canonicalPath, lang);
			goto(localisedPath);
		}
	}

	onMount(() => {
		if (browser) {
			let sheet = typescaleStyles.styleSheet;
			if (sheet) document.adoptedStyleSheets.push(sheet);
			
			window.addEventListener('themechanged', themeChange);
			window.addEventListener('languagechanged', langChange);

			themeChange();
			langChange();

			return () => {
				window.removeEventListener('themechanged', themeChange);
				window.removeEventListener('languagechanged', langChange);
			}
			
		}
	});

	import '../../node_modules/material-symbols/index.scss';
</script>

<!-- svelte-ignore css_unused_selector -->
<style lang="scss">
	.app-base-color {
		background-color: var(--md-sys-color-surface-variant);
		color: var(--md-sys-color-on-surface-variant)
	}

	.app-layout {
		display: flex;
		height: calc(100vh - 56px);
		overflow: hidden;
		position: relative;
	}
</style>

<div class="app-base-color">
	<ParaglideJS {i18n}>
		<div>
			<Header></Header>
			<main class="app-layout">
				<Menu></Menu>
				<Content>
					{@render children()}
				</Content>
			</main>
			<footer></footer>
		</div>
	</ParaglideJS>
</div>
