---
layout: utils
title: "SHA 해싱"
description: "텍스트의 SHA 해시를 계산합니다"
date: 2025-10-23 01:19:00 +0900
categories: [SHA, Hash, Hashing]
tags: [Utils, 유틸]
---

<div class="max-w-5xl mx-auto py-12">

    <!-- 입력 영역 -->
    <div class="mb-6">
        <label for="inputText" class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            해시할 텍스트
        </label>
        <textarea id="inputText" 
                  class="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                  rows="6"
                  placeholder="여기에 해시할 텍스트를 입력하세요..."></textarea>
    </div>

    <!-- 해시 생성 버튼 -->
    <div class="mb-6">
        <button id="hashBtn" 
                class="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            해시 생성
        </button>
    </div>

    <!-- 출력 영역 -->
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
                  placeholder="해시 결과가 여기에 표시됩니다..."></textarea>
    </div>

    <hr class="border-zinc-200 dark:border-zinc-800 mb-8">

    <!-- 옵션 영역 -->
    <div>
        <h2 class="text-xl font-semibold text-zinc-900 dark:text-zinc-200 mb-4">옵션</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- SHA 버전 -->
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

            <!-- 자동 해시 -->
            <div class="flex items-center justify-between p-4 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800">
                <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">자동 해시</span>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="autoHash" class="sr-only peer">
                    <div class="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
            </div>
        </div>
    </div>

    <hr class="border-zinc-200 dark:border-zinc-800 mb-8">

    <!-- 변환 기록 -->
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

<script src="{{ '/assets/js/sha.js' | relative_url }}"></script>
<script src="{{ '/assets/js/sha-hasher.js' | relative_url }}"></script>
