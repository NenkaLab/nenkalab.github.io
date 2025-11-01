const API_URL = 'https://my-ip.zabocho.dev';

// 전역 상태
let apiData = null;
let currentMainIP = null;

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', async () => {
    await loadIPInfo();
});

// IP 정보 가져오기
async function loadIPInfo() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const contentEl = document.getElementById('content');

    try {
        // API 호출
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`API 오류: ${response.status}`);
        }

        const data = await response.json();
        console.log('IP 데이터:', data);

        // 전역 상태에 저장
        apiData = data;

        // UI 업데이트
        loadingEl.classList.add('hidden');
        contentEl.classList.remove('hidden');

        // 메인 IP와 추가 IP 분리
        const mainIPs = findMainIPs(data.ipDetails);
        const additionalIPs = data.ipDetails.filter(ip => !mainIPs.includes(ip));

        // 메인 IP 렌더링 (첫 번째만)
        if (mainIPs.length > 0) {
            currentMainIP = mainIPs[0];
            renderMainIP(currentMainIP, data);
            
            // 나머지 메인 IP가 있으면 추가 IP에 포함
            if (mainIPs.length > 1) {
                additionalIPs.unshift(...mainIPs.slice(1));
            }
        }

        // 추가 IP 렌더링
        if (additionalIPs.length > 0) {
            renderAdditionalIPs(additionalIPs, data);
        }

        // 타임스탬프 업데이트
        updateTimestamp(data.timestamp);

    } catch (error) {
        console.error('IP 정보 로드 실패:', error);
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');
        document.getElementById('errorMessage').innerHTML = `
            오류 메시지:<br>
            <pre>${error.message || '알 수 없는 오류가 발생했습니다.'}</pre>

            잠시 후 다시 시도해 주세요.<br>
            (다시 시도해도 안되는 경우 API요청 사용량을 다 채운것이니 다음날 다시 시도하거나 다른 아이피 확인 사이트를 이용해주세요)
        `.split('\n').map(line => line.trim()).join('\n');
    }
}

// 메인 IP 찾기 (trustLevel이 high인 것)
function findMainIPs(ipDetails) {
    const mainIPs = ipDetails.filter(ip => ip.trustLevel === 'high');
    
    // high가 없으면 첫 번째 IP를 메인으로
    if (mainIPs.length === 0 && ipDetails.length > 0) {
        return [ipDetails[0]];
    }
    
    return mainIPs;
}

// IP 교체 함수 (클릭 시 호출)
function swapIP(clickedIP) {
    currentMainIP = clickedIP;

    // 메인 IP 다시 렌더링
    clearMainSections();
    renderMainIP(clickedIP, apiData);

    // 그리드 다시 렌더링
    const allIPs = apiData.ipDetails
        .sort((a, b) => {
            // 신뢰도 순서: high > medium > low
            const trustOrder = { 'high': 3, 'medium': 2, 'low': 1 };
            return (trustOrder[b.trustLevel] || 0) - (trustOrder[a.trustLevel] || 0);
        });

    renderAdditionalIPs(allIPs, apiData, clickedIP);

    // 스크롤을 맨 위로 부드럽게 이동
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 메인 섹션 초기화
function clearMainSections() {
    document.getElementById('mainIpv4Section').classList.add('hidden');
    document.getElementById('mainIpv6Section').classList.add('hidden');
}

// 메인 IP 렌더링
function renderMainIP(ipDetail, data) {
    const version = ipDetail.version;
    const sectionId = `main${version === 'ipv4' ? 'Ipv4' : 'Ipv6'}Section`;
    const ipId = `main${version === 'ipv4' ? 'Ipv4' : 'Ipv6'}`;
    const sourceId = `main${version === 'ipv4' ? 'Ipv4' : 'Ipv6'}Source`;
    const infoId = `main${version === 'ipv4' ? 'Ipv4' : 'Ipv6'}Info`;
    const mapContainerId = `main${version === 'ipv4' ? 'Ipv4' : 'Ipv6'}MapContainer`;
    const mapId = `main${version === 'ipv4' ? 'Ipv4' : 'Ipv6'}Map`;

    // 섹션 표시
    document.getElementById(sectionId).classList.remove('hidden');

    // IP 주소 표시
    document.getElementById(ipId).textContent = ipDetail.address;

    // 출처 정보
    const sourceText = `${ipDetail.description} (신뢰도: ${getTrustLevelText(ipDetail.trustLevel)})`;
    document.getElementById(sourceId).textContent = sourceText;

    // 상세 정보 카드
    const infoContainer = document.getElementById(infoId);
    infoContainer.innerHTML = '';

    // 위치 정보
    if (data.location) {
        if (data.location.country) {
            infoContainer.appendChild(createInfoCard('🌍 국가', data.location.country));
        }
        if (data.location.city) {
            infoContainer.appendChild(createInfoCard('🏙️ 도시', data.location.city));
        }
        if (data.location.region) {
            infoContainer.appendChild(createInfoCard('📍 지역', data.location.region));
        }
        if (data.location.timezone) {
            infoContainer.appendChild(createInfoCard('🕐 타임존', data.location.timezone));
        }
        if (data.location.postalCode) {
            infoContainer.appendChild(createInfoCard('📮 우편번호', data.location.postalCode));
        }
        if (data.location.latitude && data.location.longitude) {
            const coords = `${data.location.latitude}, ${data.location.longitude}`;
            infoContainer.appendChild(createInfoCard('🧭 좌표', coords));
        }
    }

    // 네트워크 정보
    if (data.network) {
        if (data.network.asOrganization) {
            infoContainer.appendChild(createInfoCard('🌐 ISP', data.network.asOrganization));
        }
        if (data.network.asn) {
            infoContainer.appendChild(createInfoCard('🔢 ASN', `AS${data.network.asn}`));
        }
        if (data.network.colo) {
            infoContainer.appendChild(createInfoCard('🖥️ 데이터센터 (Cloudflare)', data.network.colo));
        }
    }

    // 연결 정보
    if (data.connection) {
        if (data.connection.httpProtocol) {
            infoContainer.appendChild(createInfoCard('🔗 프로토콜', data.connection.httpProtocol));
        }
        if (data.connection.tlsVersion) {
            infoContainer.appendChild(createInfoCard('🔒 TLS', data.connection.tlsVersion));
        }
        if (data.connection.clientTcpRtt) {
            infoContainer.appendChild(createInfoCard('⚡ RTT', `${data.connection.clientTcpRtt}ms`));
        }
    }

    // 지도 표시 (OpenStreetMap + Google Maps 버튼)
    if (data.location && data.location.latitude && data.location.longitude) {
        const mapContainer = document.getElementById(mapContainerId);
        const mapFrame = document.getElementById(mapId);
        
        mapContainer.classList.remove('hidden');
        
        // OpenStreetMap 임베드
        mapFrame.src = getOpenStreetMapEmbedUrl(data.location.latitude, data.location.longitude);
        
        // Google Maps 버튼 추가
        const mapWrapper = mapFrame.parentElement;
        
        // 기존 버튼 제거
        const existingBtn = mapWrapper.querySelector('.google-maps-btn');
        if (existingBtn) {
            existingBtn.remove();
        }
        
        const googleMapsBtn = createGoogleMapsButton(data.location.latitude, data.location.longitude);
        mapWrapper.appendChild(googleMapsBtn);
    }
}

// Google Maps 버튼 생성
function createGoogleMapsButton(lat, lng) {
    const button = document.createElement('a');
    button.href = getGoogleMapsUrl(lat, lng);
    button.target = '_blank';
    button.rel = 'noopener noreferrer';
    button.className = 'google-maps-btn mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-zinc-700 border-2 border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-600 rounded-lg transition-colors font-medium shadow-sm hover:shadow';
    button.innerHTML = `
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
        </svg>
        구글 지도로 자세히 보기
    `;
    return button;
}

// 추가 IP 렌더링
function renderAdditionalIPs(ipDetails, data, highlightIP = null) {
    const section = document.getElementById('additionalIpsSection');
    const list = document.getElementById('additionalIpsList');

    if (ipDetails.length === 0) {
        section.classList.add('hidden');
        return;
    }

    section.classList.remove('hidden');
    list.innerHTML = '';

    ipDetails.forEach(ipDetail => {
        const card = createAdditionalIPCard(ipDetail, data, highlightIP);
        list.appendChild(card);
    });
}

// 추가 IP 카드 생성 (간결한 버전 + 클릭 가능)
function createAdditionalIPCard(ipDetail, data, highlightIP) {
    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-zinc-800 rounded-lg shadow border-2 border-zinc-200 dark:border-zinc-700 p-4 hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer transform hover:-translate-y-1';
    
    if (highlightIP && ipDetail.address === highlightIP.address) {
        card.classList.add('border-amber-400', 'dark:border-amber-500', 'shadow-xl', '-translate-y-1');
    }

    // 클릭 이벤트 추가 (선택된 IP가 아니면)
    if (!highlightIP) {
        card.onclick = () => swapIP(ipDetail);
    }

    // IP 주소 헤더
    const header = document.createElement('div');
    header.className = 'mb-3';
    header.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg mh-0 font-mono font-bold text-zinc-900 dark:text-zinc-100 break-all font-pretendard">
                ${ipDetail.address}
            </h2>
            <span class="px-2 py-1 ${ipDetail.version === 'ipv4' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'} text-xs font-semibold rounded">
                ${ipDetail.version.toUpperCase()}
            </span>
        </div>
        <div class="flex items-center gap-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTrustLevelClass(ipDetail.trustLevel)}">
                ${getTrustLevelText(ipDetail.trustLevel)}
            </span>
            <span class="text-xs text-zinc-500 dark:text-zinc-400">
                ${ipDetail.source}
            </span>
        </div>
    `;
    card.appendChild(header);

    // 간단한 정보 (1-2줄)
    const infoPreview = document.createElement('div');
    infoPreview.className = 'text-sm text-zinc-600 dark:text-zinc-400 mb-3 space-y-1';
    
    if (data.location && data.location.city && data.location.country) {
        const locationLine = document.createElement('div');
        locationLine.className = 'flex items-center gap-1.5';
        locationLine.innerHTML = `
            <span>📍</span>
            <span>${data.location.city}, ${data.location.country}</span>
        `;
        infoPreview.appendChild(locationLine);
    }
    
    if (data.network && data.network.asOrganization) {
        const ispLine = document.createElement('div');
        ispLine.className = 'flex items-center gap-1.5';
        ispLine.innerHTML = `
            <span>🌐</span>
            <span class="truncate">${data.network.asOrganization}</span>
        `;
        infoPreview.appendChild(ispLine);
    }

    card.appendChild(infoPreview);

    // "클릭하여 자세히 보기" 힌트
    const clickHint = document.createElement('div');
    clickHint.className = 'flex items-center justify-center gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-700 text-xs font-medium text-blue-600 dark:text-blue-400';
    clickHint.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
        </svg>
        클릭하여 자세히 보기
    `;
    card.appendChild(clickHint);

    return card;
}

// 정보 카드 생성 (메인 IP용)
function createInfoCard(label, value) {
    const card = document.createElement('div');
    card.className = 'bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700';
    card.innerHTML = `
        <p class="text-lg text-zinc-500 dark:text-zinc-400 mt-0 mb-2">${label}</p>
        <p class="text-3xl font-semibold text-zinc-900 dark:text-zinc-100 break-all my-0">${value}</p>
    `;
    return card;
}

// OpenStreetMap 임베드 URL 생성
function getOpenStreetMapEmbedUrl(lat, lng) {
    const zoom = 13;
    const delta = 0.01;
    lat = parseFloat(lat);
    lng = parseFloat(lng);
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng-delta},${lat-delta},${lng+delta},${lat+delta}&layer=mapnik&marker=${lat},${lng}&zoom=${zoom}`;
}

// OpenStreetMap 링크 URL 생성
function getOpenStreetMapUrl(lat, lng) {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=13#map=13/${lat}/${lng}`;
}

// Google Maps 링크 URL 생성
function getGoogleMapsUrl(lat, lng) {
    return `https://www.google.com/maps?q=${lat},${lng}&ll=${lat},${lng}&z=13`;
}

// 신뢰도 텍스트 변환
function getTrustLevelText(level) {
    const map = {
        'high': '높음',
        'medium': '중간',
        'low': '낮음'
    };
    return map[level] || level;
}

// 신뢰도 클래스 변환
function getTrustLevelClass(level) {
    const map = {
        'high': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        'medium': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
        'low': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    };
    return map[level] || 'bg-zinc-100 dark:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300';
}

// 타임스탬프 업데이트
function updateTimestamp(isoString) {
    const date = new Date(isoString);
    const formatted = date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('timestamp').textContent = formatted;
}