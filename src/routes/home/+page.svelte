<script lang="ts">
import * as m from '$lib/paraglide/messages.js';
let developerUrl = 'https://github.com/NenkaLab';
</script>

<style lang="scss">
a {
    color: currentColor;
}

p.box {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    padding: 8px 16px;
    background-color: var(--md-sys-color-surface-variant);
    border-radius: 4px;
    gap: 8px;
    min-height: 42px;

    .title {
        border-right: 2px solid color-mix(in srgb, currentColor 30%, transparent);
        padding-right: 8px;

        min-width: 80px;
        text-align: end;
    }

    a {
        overflow: hidden;
        text-overflow: ellipsis;
    }
}
.people-list {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;

    .people {
        color: currentColor;

        .ui {
            max-width: 80px;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;

            img {
                display: block;
                width: 100%;
                aspect-ratio: 1/1;
                border-radius: 50%;
                user-select: none;
            }
        }
    }
}
</style>

<span style="font-size: 3em;">👋</span>
<h1>{m.home_welcome()}</h1>
<p>{m.home_welcome_msg()}</p>
<br>
<h2>{m.home_what_can()}</h2>
<p>{m.home_what_can_msg()}</p>
<br>
<h2>{m.home_why_create()}</h2>
<p>
    {m.home_why_create_msg()}
    <small><br><del>{m.home_why_create_msg_small()}</del></small>
</p>
<br>
<h2>{m.home_can_add_function()}</h2>
<p>
    <a 
        href="https://github.com/NenkaLab/nenkalab.github.io/issues" 
        target="_blank" 
        rel="noopener noreferrer"
        translate="no"
        style="color: var(--md-sys-color-primary);">[Issue]</a>&nbsp;
    {m.home_can_add_function_msg()}
</p>
<br>
<hr style="margin: 16px 0px; opacity: .3;">
<h2>{m.home_contect()}</h2>
<p class="box">
    <span class="title" translate="no">{m.home_email()}</span>
    <a href="mailto:developerulls@gmail.com" target="_blank" rel="noopener noreferrer" translate="no">developerulls@gmail.com</a>
</p>
<p class="box">
    <span class="title" translate="no">{m.home_telegram()}</span>
    <a href="https://t.me/nenka_lab" target="_blank" rel="noopener noreferrer" translate="no">nenka.lab</a>
</p>
<p class="box">
    <span class="title" translate="no">{m.home_steam()}</span>
    <a href="https://steamcommunity.com/id/horo0503/" target="_blank" rel="noopener noreferrer" translate="no">Zabocho</a>
</p>
<p class="box">
    <span class="title" translate="no">{m.home_discord()}</span>
    <span translate="no">nenka.lab</span>
</p>
<div class="people-list">
    <a class="people" href="{developerUrl}" target="_blank" rel="noopener noreferrer">
        <figure class="ui">
            <img src="{developerUrl}.png" alt="Developer Profile" draggable="false">
            <figcaption translate="no">NenkaLab</figcaption>
        </figure>
    </a>
</div>