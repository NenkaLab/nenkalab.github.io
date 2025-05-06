import { paraglide } from "@inlang/paraglide-sveltekit/vite";
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	plugins: [
        sveltekit(), 
        paraglide({
            project: "./project.inlang",
            outdir: "./src/lib/paraglide"
        }),
        nodePolyfills({
            include: [
                'buffer',
                'crypto',
                'util',
                'stream',
                'zlib',
                'events',
                'path',
                'process',
            ],
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
            protocolImports: true,
        }),
    ]
});
