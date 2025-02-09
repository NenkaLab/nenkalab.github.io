<script lang="ts">
	import GroupItem from "$lib/components/GroupItem.svelte";


</script>

<style lang="scss">
.group {
    margin-bottom: 24px;

    .group-title {
        margin: 0%;
        font-size: 2em;
    }

    .group-list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, auto));
        grid-template-rows: repeat(auto-fill, minmax(60px, auto));
        grid-auto-flow: dense;
        gap: 16px;
        margin-top: 16px;
    }
}
</style>
<h1 class="asd">개발중입니다.</h1>

<section id="data-protection" class="group">
    <h1 class="group-title">Data Protection</h1>
    <div class="group-list">
        
        <GroupItem href="/utils/base64" title="Base64" message="Base64 인코딩/디코딩을 합니다."></GroupItem>
        <GroupItem href="/utils/sha" title="SHA" message="SHA 해싱을 합니다."></GroupItem>
        <GroupItem href="/utils/md5" title="MD5" message="MD5 해싱을 합니다."></GroupItem>
        <GroupItem href="/utils/aes" title="Aes" message="AES 암호화를 합니다."></GroupItem>
        <GroupItem href="/utils/filehash" title="File Hash" message="파일의 해시를 구합니다."></GroupItem>

    </div>
</section>

<section id="run-and-convert" class="group">
    <h1 class="group-title">Run & Convert</h1>
    <div class="group-list">
        
        <GroupItem href="/utils/imagebase64" title="Image Base64" message="이미지 Base64 인코딩/디코딩을 합니다."></GroupItem>
        <GroupItem href="/utils/runhtml" title="Run html" message="Html을 실행합니다."></GroupItem>
        <GroupItem href="/utils/runjs" title="Run js" message="Js를 실행합니다."></GroupItem>
        <GroupItem href="/utils/text-replace" title="Run js" message="Js를 실행합니다."></GroupItem>
        <GroupItem href="/utils/enko" title="한영타 변환" message="영타로 친 한글을 변환해줍니다."></GroupItem>

    </div>
</section>

<section id="networl-tools" class="group">
    <h1 class="group-title">Network Tools</h1>
    <div class="group-list">
        
        <GroupItem href="/utils/findmyip" title="Find my IP" message="내 아이피를 구해옵니다."></GroupItem>
        <GroupItem href="/utils/runhtml" title="Ping pong" message="주소나 아이피로 핑을 측정합니다."></GroupItem>

    </div>
</section>

<section id="time-tools" class="group">
    <h1 class="group-title">Time tools</h1>
    <div class="group-list">
        
        <GroupItem href="/utils/servtime" title="서버시간" message="해당되는 서버의 시간을 구해옵니다."></GroupItem>
        <GroupItem href="/utils/stopw" title="스톱워치" message="스톱워치 입니다."></GroupItem>
        <GroupItem href="/utils/curtime" title="현재시간" message="현재시간을 구해옵니다다."></GroupItem>

    </div>
</section>

<section id="voice-tools" class="group">
    <h1 class="group-title">Voice tools</h1>
    <div class="group-list">
        
        <GroupItem href="/utils/tts" title="TTS" message="간단한 TTS입니다."></GroupItem>
        <GroupItem href="/utils/stt" title="STT" message="소리를 텍스트로 변환합니다."></GroupItem>

    </div>
</section>