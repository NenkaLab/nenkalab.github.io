<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import type { MdOutlinedTextField, MdTabs, MdOutlinedSelect, MdFilledButton } from "@material/web/all";
    import * as axios from 'axios';
    import { fileTypeFromBuffer } from 'file-type';
    // import { Agent } from 'http';
    import * as monaco from 'monaco-editor';
    import { Uri } from 'monaco-editor';
	import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
	import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
	import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
	import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
	import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
	import Error from "../../+error.svelte";

    let urlInput!: MdOutlinedTextField;
    let loadBtn!: MdFilledButton;

    let editorElement!: HTMLDivElement;
	let editor!: monaco.editor.IStandaloneCodeEditor;
	let model!: monaco.editor.ITextModel;

    function loadCode(
        code: string,
        language: string | undefined = undefined,
        url: Uri | undefined = undefined
    ) {
		model = monaco.editor.createModel(code, language, url);

		editor.setModel(model);
	}

    async function fetchUrl(url: string) {
        try {
            const wfs = new axios.Axios();
            const response = await wfs.get(url, {
                // 인증서 오류 무시
                // httpsAgent: new Agent({
                //     keepAlive: true
                // }),
                // 타임아웃 설정
                timeout: 10000,
                // 리다이렉트 허용
                maxRedirects: 5,
                // 모든 상태 코드에 대해 resolve 처리
                validateStatus: () => true,
                responseType: 'arraybuffer'

            });

            return {
                status: response.status,
                headers: response.headers,
                data: response.data,
            };
        } catch (error: Error | any) {
            // 네트워크 오류 등 발생해도 오류 대신 결과 반환
            return {
                status: 0,
                headers: {},
                data: null,
                error: error.toString()
            };
        }
    }

    onMount(async () => {
		self.MonacoEnvironment = {
			getWorker: function (_: any, label: string) {
				if (label === 'json') {
					return new jsonWorker();
				}
				if (label === 'css' || label === 'scss' || label === 'less') {
					return new cssWorker();
				}
				if (label === 'html' || label === 'handlebars' || label === 'razor') {
					return new htmlWorker();
				}
				if (label === 'typescript' || label === 'javascript') {
					return new tsWorker();
				}
				return new editorWorker();
			}
		};

		monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

		editor = monaco.editor.create(editorElement, {
			automaticLayout: true,
			theme: 'vs-dark'
		});

        loadBtn.addEventListener('click', async () => {
            const url = urlInput.value;
            if (url.trim().length == 0) return;
            const result = await fetchUrl(url);

            const data = result.data;
            if (data) {
                const buf = Buffer.from(data, 'binary');
                const ext = await fileTypeFromBuffer(buf);
                console.log(ext);
                loadCode(buf.toString(), ext?.ext, Uri.parse(url));
            } else {
                alert(`status : ${result.status}\nerror : ${result.error}`);
            }
        });
	});

	onDestroy(() => {
		monaco?.editor.getModels().forEach((model) => model.dispose());
		editor?.dispose();
	});

    
    function back() {
        history.back();
    }
</script>
<style lang="scss">

#content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    height: -webkit-fill-available;
}

#source {
    width: 100%;
    height: 100%;
}

.b-title {
    display: flex;
    align-items: center;
    flex-wrap: nowrap;
    gap: 8px;
    margin-top: 0px;
    width: 100%;

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

</style>

<div id="content">

    <h1 class="b-title">
        <button class="back" onclick="{back}">
            <md-ripple></md-ripple>
            <span class="material-symbols-rounded" translate="no">arrow_back</span>
        </button>
        View Source
    </h1>


    <md-outlined-text-field
        id="url"
        label="http://..."
        type="text"
        bind:this={urlInput}>
    </md-outlined-text-field>
    <md-filled-button bind:this={loadBtn}>
        Fetch
    </md-filled-button>

    <div id="source" bind:this={editorElement}></div>
</div>