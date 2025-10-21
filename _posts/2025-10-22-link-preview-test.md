---
layout: post
title: "링크 프리뷰 기능 사용 예시"
date: 2025-10-22 12:00:00 +0900
categories: [Tech, Tutorial]
tags: [jekyll, link-preview, ui]
---

## 링크 프리뷰가 작동하는 경우

### 예시 1: 여러 외부 링크

웹 개발을 배우려면 [MDN Web Docs](https://developer.mozilla.org), [W3Schools](https://www.w3schools.com), 그리고 [freeCodeCamp](https://www.freecodecamp.org)를 추천합니다.

👆 이 문단 끝에 아이콘 버튼이 나타나고, 클릭하면 3개의 chip이 표시됩니다!

### 예시 2: 단일 외부 링크

최신 CSS 기능을 배우려면 [CSS-Tricks](https://css-tricks.com)를 방문해보세요.

### 예시 3: 기술 문서 링크

공식 문서는 [React Docs](https://react.dev)와 [Vue.js Guide](https://vuejs.org/guide/)에서 확인할 수 있습니다.

---

## 링크 프리뷰가 작동하지 않는 경우

### 예시 4: 내부 링크만

[홈페이지](/)나 [소개 페이지](/about)로 이동할 수 있습니다.

👆 내부 링크는 프리뷰가 생성되지 않습니다.

### 예시 5: 링크가 없는 문단

이것은 일반 텍스트만 있는 문단입니다. 링크가 없으므로 아이콘 버튼이 나타나지 않습니다.

### 예시 6: 코드 블록의 링크

```markdown
[GitHub](https://github.com)
```

코드 블록 내 링크는 처리되지 않습니다.

---

## 혼합 사용 예시

### 예시 7: 외부 + 내부 링크

프로젝트는 [GitHub](https://github.com)에 호스팅되어 있으며, 자세한 내용은 [프로젝트 페이지](/projects)에서 확인하세요.

👆 외부 링크(GitHub)만 프리뷰에 포함됩니다.

### 예시 8: 인용문 내 링크

> "좋은 디자인은 명백하다. 훌륭한 디자인은 투명하다." - [Joe Sparano](https://example.com)

인용문 안의 링크도 프리뷰가 생성됩니다!

---

## 프리뷰 팝업 내용

각 chip에 마우스를 올리면 다음 정보가 표시됩니다:

- 🖼️ **OG 이미지** (있는 경우)
- 📝 **페이지 제목**
- 💬 **설명** (150자까지)
- 🔗 **도메인 주소**
- 🚀 **방문하기 버튼**

---

## 팁 & 트릭

### 팁 1: 관련 링크 그룹화

같은 주제의 링크들을 한 문단에 모아두면 편리합니다:

**프론트엔드 프레임워크**: [React](https://react.dev), [Vue](https://vuejs.org), [Svelte](https://svelte.dev), [Angular](https://angular.io)

### 팁 2: 아이콘 버튼 스타일

아이콘 버튼은:
- 🎨 현재 테마와 자동 매칭
- 🌓 다크모드 지원
- 📱 모바일 친화적
- ⚡ 호버 애니메이션

### 팁 3: Chip 인터랙션

- **클릭**: 새 탭에서 링크 열기
- **호버**: 상세 정보 팝업
- **아이콘 재클릭**: chip 숨기기

---

## 성능 정보

- ✅ **빌드 타임 OG 데이터 수집** - 클라이언트 성능 영향 없음
- ✅ **7일 캐싱** - 빠른 재빌드
- ✅ **지연 로딩** - 필요할 때만 팝업 생성
- ✅ **최적화된 애니메이션** - 부드러운 UX

---

## 실제 사용 사례

### 기술 블로그 포스트

이 기능은 참고 자료가 많은 튜토리얼이나 리뷰 포스트에 특히 유용합니다. 예를 들어 [Vercel](https://vercel.com), [Netlify](https://netlify.com), [Cloudflare Pages](https://pages.cloudflare.com) 비교 글에서 각 서비스를 쉽게 미리볼 수 있습니다.

### 리소스 모음

유용한 도구: [Figma](https://figma.com), [Notion](https://notion.so), [Linear](https://linear.app), [Slack](https://slack.com)

---

**이제 여러분의 블로그에서 직접 사용해보세요!** 🎉