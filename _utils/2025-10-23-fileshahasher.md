---
layout: utils
title: "파일 SHA 해싱"
description: "파일의 SHA 해시를 계산합니다"
date: 2025-10-23 13:00:00 +0900
categories: [SHA, Hash, Hashing, File]
tags: [Utils, 유틸]
---

<div class="max-w-5xl mx-auto py-12">

    <div class="mb-6">
        <label class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            해시할 파일
        </label>
        <div id="fileDropZone" class="flex flex-col items-center justify-center w-full h-48 border-2 border-zinc-300 dark:border-zinc-700 border-dashed rounded-lg cursor-pointer bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
            <div class="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                <svg class="w-10 h-10 mb-3 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-4-4V6a2 2 0 012-2h10a2 2 0 012 2v6a4 4 0 01-4 4H7z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v7m0 0l-3-3m3 3l3-3"></path></svg>
                <p class="mb-2 text-sm text-zinc-500 dark:text-zinc-400"><span class="font-semibold">클릭하여 파일을 선택</span>하거나 파일을 끌어다 놓으세요</p>
                <p id="fileName" class="text-xs text-zinc-400 dark:text-zinc-500">선택된 파일 없음</p>
            </div>
            <input id="fileInput" type="file" class="hidden" />
        </div>
    </div>

    <div class="mb-6">
        <button id="hashBtn" 
                class="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                disabled>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            파일 해시 생성
        </button>
    </div>

    <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
            <label for="outputText" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                해시 결과 (Hex)
            </label>
            <button id="copyBtn" 
                    class="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                복사
            </button>
        </div>
        <textarea id="outputText" 
                  class="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200 resize-none font-mono"
                  rows="4"
                  readonly
                  placeholder="파일을 선택하면 해시 결과가 여기에 표시됩니다..."></textarea>
    </div>

    <hr class="border-zinc-200 dark:border-zinc-800 mb-8">

    <div class="mb-8">
        <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-200 mb-4">옵션</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="shaVersion" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    SHA 알고리즘
                </label>
                <select id="shaVersion" 
                        class="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 focus:ring-2 focus:ring-green-500">
                    <option value="sha1">SHA-1 (Insecure)</option>
                    <option value="sha224">SHA-224</option>
                    <option value="sha256" selected>SHA-256 (Default)</option>
                    <option value="sha384">SHA-384</option>
                    <option value="sha512">SHA-512</option>
                    <option value="sha3-512">SHA-3 (512-bit)</option>
                    <option value="sha3-384">SHA-3 (384-bit)</option>
                    <option value="sha3-256">SHA-3 (256-bit)</option>
                    <option value="sha3-224">SHA-3 (224-bit)</option>
                </select>
            </div>
        </div>
    </div>

    <hr class="border-zinc-200 dark:border-zinc-800 mb-8">

    <div>
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-200">변환 기록</h2>
            <button id="clearHistory" 
                    class="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">
                전체 삭제
            </button>
        </div>
        <div id="historyList" class="space-y-2">
            <p class="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8">아직 변환 기록이 없습니다</p>
        </div>
    </div>
</div>

<script src="{{ '/assets/js/sha-file.js' | relative_url }}"></script>
<script src="{{ '/assets/js/sha-file-hasher.js' | relative_url }}"></script>
