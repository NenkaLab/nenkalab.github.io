// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}

		interface Title {
			title: string | null | undefined | unknown;
		}

		interface Menu {
			isOpen: boolean | null | undefined | unknown;
		}
	}

	interface Window {
		navigation: Navigation;
	}

	interface Navigation {
		canGoBack: boolean;
	}
}

export {};
