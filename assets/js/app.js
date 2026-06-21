// assets/js/app.js
import { tarotCards, spreads, typeConfig } from './tarot-data.js';

// --- 狀態變數 ---
let currentType = "";
let currentQuestion = "";
let currentSpread = "";
let selectedCards = [];
let drawnCards = [];
let shuffledDeck = [];
let mindsetCard = null;
let shuffleRemaining = 3;
let supportCards = {};
let supportCardCounts = {};
let deferredPrompt;

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupPWAInstall();
});

function setupEventListeners() {
    // 類型選擇事件
    document.querySelectorAll('.type-option').forEach(btn => {
        btn.addEventListener('click', function() {
            selectType(this.dataset.type);
        });
    });

    // 導航按鈕
    document.getElementById('backToTypeBtn').addEventListener('click', () => {
        document.getElementById('questionSection').classList.add('hidden');
        document.getElementById('typeSection').classList.remove('hidden');
    });

    document.getElementById('backToQuestionBtn').addEventListener('click', () => {
        document.getElementById('spreadSection').classList.add('hidden');
        document.getElementById('questionSection').classList.remove('hidden');
    });

    document.getElementById('nextBtn').addEventListener('click', showSpreadSelection);
    
    document.querySelectorAll('.spread-option').forEach(option => {
        option.addEventListener('click', function() {
            selectSpread(this.dataset.spread);
        });
    });

    document.getElementById('shuffleCardsBtn').addEventListener('click', performShuffle);
    document.getElementById('cutCardsBtn').addEventListener('click', performCut);
    document.getElementById('proceedToDrawBtn').addEventListener('click', proceedToDrawing);
    document.getElementById('revealBtn').addEventListener('click', revealResults);
    document.getElementById('newReadingBtn').addEventListener('click', startNewReading);

    // 歷史紀錄相關事件
    document.getElementById('showHistoryBtn').addEventListener('click', showHistory);
    document.getElementById('closeHistoryBtn').addEventListener('click', () => document.getElementById('historyModal').classList.add('hidden'));
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    
    // 分享按鈕
    document.getElementById('shareBtn').addEventListener('click', shareResult);
}

// --- 流程邏輯 ---

function selectType(type) {
    currentType = type;
    document.getElementById('questionExample').textContent = typeConfig[type].examples;
    document.getElementById('typeSection').classList.add('hidden');
    document.getElementById('questionSection').classList.remove('hidden');
}

function showSpreadSelection() {
    const question = document.getElementById('questionInput').value.trim();
    if (!question) { alert('請先輸入你的問題！'); return; }
    currentQuestion = question;
    document.getElementById('questionSection').classList.add('hidden');
    document.getElementById('spreadSection').classList.remove('hidden');

    const allowed = typeConfig[currentType].spreads;
    document.querySelectorAll('.spread-option').forEach(option => {
        option.style.display = allowed.includes(option.dataset.spread) ? 'block' : 'none';
    });
}

function selectSpread(spreadType) {
    currentSpread = spreadType;
    document.getElementById('spreadSection').classList.add('hidden');
    document.getElementById('shuffleSection').classList.remove('hidden');
    shuffleRemaining = 3;
    document.getElementById('shuffleCount').textContent = shuffleRemaining;
    document.getElementById('shuffleCardsBtn').classList.remove('hidden');
    document.getElementById('cutCardsBtn').classList.add('hidden');
    // 使用 import 進來的 tarotCards
    shuffledDeck = [...tarotCards];
}

// --- 洗牌與抽牌 ---

function performShuffle() {
    const shuffleDeck = document.getElementById('shuffleDeck');
    shuffleDeck.style.transform = 'rotate(10deg)';
    setTimeout(() => shuffleDeck.style.transform = 'rotate(-10deg)', 200);
    setTimeout(() => shuffleDeck.style.transform = 'rotate(0deg)', 400);
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }
    shuffleRemaining--;
    document.getElementById('shuffleCount').textContent = shuffleRemaining;
    if (shuffleRemaining <= 0) {
        document.getElementById('shuffleCardsBtn').classList.add('hidden');
        document.getElementById('cutCardsBtn').classList.remove('hidden');
    }
}


function performCut() {
    // 1. 隨機切牌的基礎邏輯
    const cutPoint = Math.floor(Math.random() * (shuffledDeck.length - 20)) + 10;
    const topHalf = shuffledDeck.slice(0, cutPoint);
    const bottomHalf = shuffledDeck.slice(cutPoint);
    shuffledDeck = [...bottomHalf, ...topHalf];
    
    const isReversed = Math.random() < 0.5;
    mindsetCard = { ...shuffledDeck[0], reversed: isReversed };
    shuffledDeck = shuffledDeck.slice(1);
    shuffledDeck.push(mindsetCard);
    
    // 2. ✨ 核心關鍵：在這裡判斷是否為四季牌陣
    if (currentSpread === 'four_seasons') {
        // 如果是四季牌陣，直接隱藏洗牌切牌區
        document.getElementById('shuffleSection').classList.add('hidden');
        // 直接繞過心態牌顯示畫面，呼叫進入抽牌區的函數！
        proceedToDrawing();
    } else {
        // 其他原本的牌陣，照舊彈出心態牌畫面
        document.getElementById('shuffleSection').classList.add('hidden');
        document.getElementById('mindsetSection').classList.remove('hidden');
        displayMindsetCard();
    }
}

function createCardDeck() {
    const deck = document.getElementById('cardDeck');
    const container = document.querySelector('.fan-container');
    deck.innerHTML = '';
    const totalCards = shuffledDeck.length;
    const fanAngle = 140;
    const angleStep = fanAngle / (totalCards - 1);
    const startAngle = -fanAngle / 2;

    const containerWidth = container.offsetWidth;
    const radius = Math.min(280, containerWidth * 0.45); 
    const yOffset = containerWidth < 500 ? 120 : 150; 

    for (let i = 0; i < totalCards; i++) {
        const card = document.createElement('div');
        card.className = 'fan-card card-back rounded-lg flex items-center justify-center text-lg';
        card.innerHTML = '🌟';
        const angle = startAngle + (i * angleStep);
        const radian = (angle * Math.PI) / 180;
        const x = Math.sin(radian) * radius;
        const y = -Math.cos(radian) * radius * 0.4 + yOffset;
        card.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
        card.style.zIndex = 50 - Math.abs(i - Math.floor(totalCards / 2));
		// 🌟 修正點擊事件：不再直接綁定固定的 shuffledDeck[i]，改由點擊時依進度動態篩選
        card.addEventListener('click', function () { 
            if (this.classList.contains('selected')) return;
            
            // 呼叫篩選機制
            const targetCard = getFilteredCardByProgress();
            if (targetCard) {
                drawCard(this, targetCard);
            }
        });
        deck.appendChild(card);
    }
}

function getFilteredCardByProgress() {
    const currentCount = selectedCards.length; // 目前抽了幾張
    
    // 如果不是四季牌陣，則依照原本的邏輯，直接從還沒被抽過的牌中回傳第一張
    if (currentSpread !== 'four_seasons') {
        return shuffledDeck.find(card => !drawnCards.some(dc => dc.name === card.name));
    }
    
    // 🍁 四季牌陣專屬：根據進度，強制篩選對應的編號範圍
    let minId = 0, maxId = 77;
    if (currentCount === 0 || currentCount === 1) { minId = 22; maxId = 35; }      // 權杖
    else if (currentCount === 2 || currentCount === 3) { minId = 36; maxId = 49; } // 聖杯
    else if (currentCount === 4 || currentCount === 5) { minId = 50; maxId = 63; } // 寶劍
    else if (currentCount === 6 || currentCount === 7) { minId = 64; maxId = 77; } // 錢幣
    else if (currentCount === 8 || currentCount === 9) { minId = 0; maxId = 21; }  // 大牌

    // 從全牌組中篩選出符合該區間編號，且在本次占卜中「還沒被抽過」的牌
    const validPool = tarotCards.filter((card, index) => {
        return index >= minId && index <= maxId && !drawnCards.some(dc => dc.name === card.name);
    });

    if (validPool.length === 0) return null;
    // 從符合資格的剩餘牌池中，隨機選取一張
    const randomPicked = validPool[Math.floor(Math.random() * validPool.length)];
    return shuffledDeck.find(c => c.name === randomPicked.name);
}

function drawCard(cardElement, selectedCard) {
    const totalNeeded = spreads[currentSpread].cardCount;
    if (selectedCards.length >= totalNeeded) return;
    
    const isReversed = Math.random() < 0.5;
    
    // 寫入抽卡資訊
    drawnCards.push({
        ...selectedCard,
        reversed: isReversed,
        position: spreads[currentSpread].positions[selectedCards.length]
    });
    
    selectedCards.push(cardElement);
    
    // 從當前洗好的牌中移除已被抽出的這張牌
    const idx = shuffledDeck.indexOf(selectedCard);
    if (idx !== -1) shuffledDeck.splice(idx, 1);
    cardElement.classList.add('selected');

    const currentDrawn = selectedCards.length;
    const remaining = totalNeeded - currentDrawn;
    const infoText = document.querySelector('#drawSection p');

    if (remaining > 0) {
        // 🌟 核心動態提示：依據下一個即將被抽取的位置，提示玩家該抽哪一類
        let categoryPrompt = "";
        if (currentSpread === 'four_seasons') {
            if (currentDrawn === 1) categoryPrompt = " ➔ <span class='text-orange-300'>續抽【權杖心態牌】</span>";
            else if (currentDrawn === 2) categoryPrompt = " ➔ <span class='text-pink-400'>請抽【聖杯元素牌】</span>";
            else if (currentDrawn === 3) categoryPrompt = " ➔ <span class='text-pink-300'>續抽【聖杯心態牌】</span>";
            else if (currentDrawn === 4) categoryPrompt = " ➔ <span class='text-blue-400'>請抽【寶劍元素牌】</span>";
            else if (currentDrawn === 5) categoryPrompt = " ➔ <span class='text-blue-300'>續抽【寶劍心態牌】</span>";
            else if (currentDrawn === 6) categoryPrompt = " ➔ <span class='text-yellow-400'>請抽【錢幣元素牌】</span>";
            else if (currentDrawn === 7) categoryPrompt = " ➔ <span class='text-yellow-300'>續抽【錢幣心態牌】</span>";
            else if (currentDrawn === 8) categoryPrompt = " ➔ <span class='text-purple-400 font-bold'>請抽【中央大牌核心】</span>";
            else if (currentDrawn === 9) categoryPrompt = " ➔ <span class='text-purple-300 font-bold'>續抽【大牌心態牌】</span>";
        }
        
        infoText.innerHTML = `還需抽取 <span id="cardsNeeded" class="text-yellow-300 font-bold">${remaining}</span> 張 (進度: ${currentDrawn}/${totalNeeded})${categoryPrompt}`;
    } else {
        infoText.innerHTML = `<span class="text-green-400 font-bold">✨ 抽牌已完成 (${totalNeeded}/${totalNeeded})</span>`;
        document.getElementById('revealBtn').classList.remove('hidden');
    }
}

function proceedToDrawing() {
    document.getElementById('mindsetSection').classList.add('hidden');
    document.getElementById('drawSection').classList.remove('hidden');
    const total = spreads[currentSpread].cardCount;
	if (currentSpread === 'four_seasons') {
        document.querySelector('#drawSection p').innerHTML = `還需抽取 <span id="cardsNeeded" class="text-yellow-300 font-bold">${total}</span> 張 (進度: 0/${total}) ➔ <span class="text-orange-400">請抽【權杖元素牌】</span>`;
    } else {
        document.querySelector('#drawSection p').innerHTML = `還需抽取 <span id="cardsNeeded" class="text-yellow-300 font-bold">${total}</span> 張 (進度: 0/${total})`;
    }
    createCardDeck();
    document.querySelector('#drawSection p').innerHTML = `還需抽取 <span id="cardsNeeded" class="text-yellow-300 font-bold">${total}</span> 張 (進度: 0/${total})`;
    createCardDeck();
}

// --- 輔助牌功能 (需要將抽牌函式暴露到 window 或調整呼叫方式) ---
// 由於轉為 module，HTML onclick 無法直接存取全域函式，這裡將其掛載到 window
window.drawSupportCard = function(position) {
    if (shuffledDeck.length === 0) { alert('沒有剩餘的牌可以抽取了！'); return; }
    if (!supportCards[position]) { supportCards[position] = []; supportCardCounts[position] = 0; }
    if (supportCardCounts[position] >= 2) { alert('此位置已達到輔助牌上限！'); return; }
    
    const cardIndex = Math.floor(Math.random() * shuffledDeck.length);
    const supportCard = { ...shuffledDeck[cardIndex], reversed: Math.random() < 0.5 };
    shuffledDeck.splice(cardIndex, 1);
    supportCards[position].push(supportCard);
    supportCardCounts[position]++;
    
    displaySupportCard(position, supportCard, supportCardCounts[position]);
    updateSupportButton(position);
    
    // 更新歷史紀錄中的此筆資料 (若有儲存機制)
    // 簡單實作：若要儲存輔助牌，需更新 LocalStorage 中最後一筆資料
}

function updateSupportButton(position) {
    const remaining = 2 - supportCardCounts[position];
    const countId = position === 'mindset' ? 'mindset-support-count' : `support-count-${position}`;
    const countElement = document.getElementById(countId);
    if (countElement) {
        countElement.textContent = remaining;
        if (remaining <= 0) {
            const button = countElement.closest('button');
            if (button) {
                button.disabled = true;
                button.classList.add('opacity-50', 'cursor-not-allowed');
                button.innerHTML = '✨ 輔助牌已滿 (0/2)';
            }
        }
    }
}

// --- 占卜結果顯示 ---

function revealResults() {
    document.getElementById('drawSection').classList.add('hidden');
    document.getElementById('resultSection').classList.remove('hidden');
    document.getElementById('questionDisplay').textContent = `問題：${currentQuestion}`;
    document.getElementById('spreadName').textContent = `牌陣：${spreads[currentSpread].name}`;
	
    const mcContainer = document.getElementById('resultMindsetCard');
    if (currentSpread === 'four_seasons') {
        mcContainer.style.display = 'none';
    } else {
        mcContainer.style.display = 'block';
    }
    
    if (navigator.share) {
        document.getElementById('shareBtn').classList.remove('hidden');
        document.getElementById('shareBtn').classList.add('flex');
    }
    
    // 顯示分享按鈕
    if (navigator.share) {
        document.getElementById('shareBtn').classList.remove('hidden');
        document.getElementById('shareBtn').classList.add('flex');
    }
    
    displayResults();
    saveReadingToHistory(); // 儲存結果
}

function displayResults() {
    const mc = document.getElementById('resultMindsetCard');
    const mo = mindsetCard.reversed ? '逆位' : '正位';
    
    mc.innerHTML = `
        <div class="bg-gradient-to-r from-purple-900/30 to-blue-900/10 rounded-lg p-6 mb-6 border border-yellow-300/30">
            <div class="flex items-center gap-6">
                ${imageOrFallbackHTML(mindsetCard, 'lg')}
                <div class="flex-1 text-left">
                    <h3 class="text-xl font-semibold text-yellow-300 mb-1">💭 心態牌</h3>
                    <h4 class="text-lg font-medium text-white mb-2">${mindsetCard.name} (${mo})</h4>
                    <p class="text-blue-200">${mindsetCard.reversed ? mindsetCard.reversedMeaning : mindsetCard.meaning}</p>
                </div>
            </div>
            <div class="text-center mt-6">
                <button onclick="window.drawSupportCard('mindset')" class="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 py-2 px-4 rounded-lg transition-all duration-300 text-sm">
                    ✨ 抽取輔助牌 (<span id="mindset-support-count">2</span>/2)
                </button>
            </div>
            <div id="mindset-support-cards" class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3"></div>
        </div>`;
      
    renderSpreadVisual();

    const rc = document.getElementById('resultCards'); 
    rc.innerHTML = '';
    drawnCards.forEach((card, index) => {
        const div = document.createElement('div');
        div.id = `detail-card-${index}`;
        div.className = "bg-gradient-to-r from-blue-900/20 to-indigo-900/10 rounded-lg p-6 mb-4 border border-blue-400/20";
        div.innerHTML = `
            <div class="flex items-center gap-5">
                ${imageOrFallbackHTML(card, 'lg')}
                <div class="flex-1 text-left">
                    <h3 class="text-lg font-semibold text-blue-300 mb-1">${index + 1}. ${card.position}</h3>
                    <h4 class="text-white">${card.name} (${card.reversed ? '逆位' : '正位'})</h4>
                    <p class="text-blue-200">${card.reversed ? card.reversedMeaning : card.meaning}</p>
                </div>
            </div>
            <div class="text-center mt-6">
                <button onclick="window.drawSupportCard(${index})" class="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 py-2 px-4 rounded-lg transition-all duration-300 text-sm">
                    ✨ 抽取輔助牌 (<span id="support-count-${index}">2</span>/2)
                </button>
            </div>
            <div id="support-cards-${index}" class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3"></div>`;
        rc.appendChild(div);
    });
}

function getVisualCardHTML(cardIndex, labelOverride = "") {
    if (cardIndex >= drawnCards.length) return `<div class="w-16 h-24 border border-white/10 rounded"></div>`;
    
    const card = drawnCards[cardIndex];
    const src = getCardImagePath(card);
    const revClass = card.reversed ? 'transform rotate-180' : '';
    const label = labelOverride || card.position;
    // 增加 alt 屬性
    const altText = `${card.name} (${card.reversed ? '逆位' : '正位'})`;
    
    return `
        <div class="visual-card-container mx-2 mb-2 transition-transform hover:scale-110 duration-300 cursor-pointer" onclick="document.getElementById('detail-card-${cardIndex}').scrollIntoView({behavior: 'smooth'})">
            <div class="relative w-20 h-32 md:w-24 md:h-36 rounded-lg bg-gray-800 shadow-xl border border-yellow-500/40 overflow-hidden group">
                <img src="${src}" class="w-full h-full object-cover ${revClass}" loading="lazy" alt="${altText}"
                     onerror="this.closest('.visual-card-container').innerHTML='<div class=\\'w-20 h-32 bg-gray-700 flex items-center justify-center text-xs text-center p-1\\'>${card.name}</div>'"/>
            </div>
            <div class="spread-grid-label max-w-[6rem]">${label}</div>
        </div>
    `;
}

function renderSpreadVisual() {
    const container = document.getElementById('resultSpreadVisual');
    container.innerHTML = '';
    let html = '';
    
    // (這裡保留原有的 switch-case 邏輯，為節省篇幅省略，內容與原檔案相同，僅需確保呼叫的是新的 getVisualCardHTML)
    // 為了確保檔案完整，這裡簡化重複代碼，實際使用請填回原本的 switch case
    switch(currentSpread) {
        case 'timeflow': 
            html = `<div class="flex items-center gap-4">${getVisualCardHTML(0)}<div class="text-yellow-500/50">➔</div>${getVisualCardHTML(1)}<div class="text-yellow-500/50">➔</div>${getVisualCardHTML(2)}</div>`; break;
        case 'advice': html = `<div class="flex items-center gap-8">${getVisualCardHTML(0)}${getVisualCardHTML(1)}</div>`; break;
        case 'relationship': html = `<div class="flex flex-col items-center gap-4"><div>${getVisualCardHTML(3, '4.結果')}</div><div>${getVisualCardHTML(2, '3.過程')}</div><div class="flex gap-12 border-t border-white/10 pt-2">${getVisualCardHTML(0, '1.抽牌人現況')}${getVisualCardHTML(1, '2.對方現況')}</div></div>`; break;
        case 'choice': html = `<div class="relative flex flex-col items-center gap-2"><div class="flex gap-24 md:gap-32">${getVisualCardHTML(3)}${getVisualCardHTML(4)}</div><div class="flex gap-12 md:gap-16 mt-2">${getVisualCardHTML(1)}${getVisualCardHTML(2)}</div><div class="mt-2">${getVisualCardHTML(0)}</div></div>`; break;
        case 'ushape': html = `<div class="flex items-end gap-4 md:gap-8"><div class="flex flex-col gap-2">${getVisualCardHTML(0)}${getVisualCardHTML(1)}${getVisualCardHTML(2)}</div><div class="pb-2">${getVisualCardHTML(3)}</div><div class="flex flex-col-reverse gap-2">${getVisualCardHTML(4)}${getVisualCardHTML(5)}${getVisualCardHTML(6)}</div></div>`; break;
        case 'davidstar': html = `<div class="flex flex-col gap-8 items-center"><div class="flex flex-col items-center"><div class="flex flex-col items-center gap-2"><div>${getVisualCardHTML(3, '4.原因')}</div><div class="flex gap-16">${getVisualCardHTML(1, '2.現在')}${getVisualCardHTML(2, '3.未來')}</div></div></div><div class="flex flex-col items-center"><div class="flex flex-col items-center gap-2"><div class="flex gap-16">${getVisualCardHTML(5, '6.對策')}${getVisualCardHTML(4, '5.環境')}</div><div>${getVisualCardHTML(0, '1.過去')}</div></div></div></div>`; break;
        case 'period_1': html = `<div class="flex justify-center">${getVisualCardHTML(0)}</div>`; break;
        case 'period_3': html = `<div class="flex items-center gap-4 justify-center">${[0,1,2].map(i => getVisualCardHTML(i)).join('<div class="text-yellow-500/50">➔</div>')}</div>`; break;
        case 'period_7': html = `<div class="flex flex-wrap justify-center gap-4">${drawnCards.map((_, i) => getVisualCardHTML(i)).join('')}</div>`; break;
        case 'period_12': html = `<div class="grid grid-cols-3 md:grid-cols-4 gap-4">${drawnCards.map((_, i) => getVisualCardHTML(i)).join('')}</div>`; break;
		case 'four_seasons':
            html = `
                <div class="flex flex-col items-center justify-center space-y-4 my-2 max-w-full scale-90 md:scale-100">
                    <div class="flex flex-col items-center p-2 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
                        <span class="text-xs text-yellow-400 font-bold mb-1">🪙 北方：錢幣 (財運/資源)</span>
                        <div class="flex space-x-1">${getVisualCardHTML(6, '元素')}${getVisualCardHTML(7, '心態')}</div>
                    </div>

                    <div class="flex items-center justify-center space-x-2 md:space-x-6 w-full">
                        <div class="flex flex-col items-center p-2 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                            <span class="text-xs text-orange-400 font-bold mb-1">🌿 西方：權杖 (工作/行動)</span>
                            <div class="flex space-x-1">${getVisualCardHTML(0, '元素')}${getVisualCardHTML(1, '心態')}</div>
                        </div>

                        <div class="flex flex-col items-center p-2 bg-purple-500/10 border border-yellow-300/30 rounded-lg shadow-lg">
                            <span class="text-xs text-yellow-300 font-bold mb-1">✨ 中央：大牌 (整體心靈)</span>
                            <div class="flex space-x-1">${getVisualCardHTML(8, '核心')}${getVisualCardHTML(9, '心態')}</div>
                        </div>

                        <div class="flex flex-col items-center p-2 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                            <span class="text-xs text-blue-400 font-bold mb-1">⚔️ 東方：寶劍 (想法/思緒)</span>
                            <div class="flex space-x-1">${getVisualCardHTML(4, '元素')}${getVisualCardHTML(5, '心態')}</div>
                        </div>
                    </div>

                    <div class="flex flex-col items-center p-2 bg-pink-500/5 border border-pink-500/10 rounded-lg">
                        <span class="text-xs text-pink-400 font-bold mb-1">🏆 南方：聖杯 (情感/情緒)</span>
                        <div class="flex space-x-1">${getVisualCardHTML(2, '元素')}${getVisualCardHTML(3, '心態')}</div>
                    </div>
                </div>
            `;
            break;
    }
    container.innerHTML = html;
}

function displaySupportCard(position, card, cardNumber) {
    const ori = card.reversed ? '逆位' : '正位';
    const html = `
        <div class="bg-yellow-900/20 backdrop-blur-sm rounded-lg p-4 border border-yellow-400/30 mt-2">
            <div class="flex items-center gap-3">
                ${imageOrFallbackHTML(card, 'md')}
                <div class="flex-1 text-left">
                    <h5 class="text-sm font-semibold text-yellow-400 mb-1">輔助牌 ${cardNumber}</h5>
                    <h6 class="text-white text-xs mb-1">${card.name} (${ori})</h6>
                    <p class="text-blue-200 text-xs">${card.reversed ? card.reversedMeaning : card.meaning}</p>
                </div>
            </div>
        </div>`;
    const containerId = position === 'mindset' ? 'mindset-support-cards' : `support-cards-${position}`;
    document.getElementById(containerId).insertAdjacentHTML('beforeend', html);
}

function startNewReading() {
    currentType = ""; currentQuestion = ""; currentSpread = "";
    selectedCards = []; drawnCards = []; shuffledDeck = []; mindsetCard = null;
    shuffleRemaining = 3; supportCards = {}; supportCardCounts = {};
    document.getElementById('questionInput').value = "";
    document.getElementById('resultSection').classList.add('hidden');
    document.getElementById('typeSection').classList.remove('hidden');
    document.getElementById('resultSpreadVisual').innerHTML = '';
}

function getCardImagePath(card){
    let idx = tarotCards.findIndex(c => c.name === card.name);
    if(idx === -1) idx = tarotCards.findIndex(c => c.name.trim() === card.name.trim());
    return `assets/cards/${String(idx).padStart(2,'0')}.jpg`;
}

function imageOrFallbackHTML(card, sizeClass) {
    const reversed = card.reversed ? 'rws-reversed' : '';
    const src = getCardImagePath(card);
    // 增加 alt
    const altText = `${card.name} (${card.reversed ? '逆位' : '正位'})`;
    return `
        <div class="rws-card-frame">
            <img class="rws-img ${sizeClass||'lg'} ${reversed}" src="${src}" loading="lazy" alt="${altText}"
                 onerror="this.closest('.rws-card-frame').classList.add('no-img')"/>
            <div class="rws-fallback ${reversed}">
                <div class="text-base text-white">${card.name}</div>
            </div>
        </div>`;
}

function displayMindsetCard() {
    const el = document.getElementById('mindsetCard');
    const ori = mindsetCard.reversed ? '逆位' : '正位';
    // 增加 alt
    const altText = `${mindsetCard.name} (${ori})`;
    el.innerHTML = `
        <div class="flex items-center justify-center gap-6">
            ${imageOrFallbackHTML(mindsetCard, 'xl')}
            <div class="flex-1 text-left">
                <h3 class="text-2xl font-semibold text-yellow-300 mb-2">💭 心態牌 - ${ori}</h3>
                <p class="text-blue-200 text-lg">${mindsetCard.reversed ? mindsetCard.reversedMeaning : mindsetCard.meaning}</p>
            </div>
        </div>`;
}

function setupPWAInstall() {
    const installBtn = document.getElementById('installAppBtn');
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); deferredPrompt = e;
        if(installBtn) {
            installBtn.classList.remove('hidden');
            installBtn.addEventListener('click', () => {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') { installBtn.classList.add('hidden'); }
                    deferredPrompt = null;
                });
            });
        }
    });
}

// --- 新增功能：歷史紀錄 ---

function saveReadingToHistory() {
    const history = JSON.parse(localStorage.getItem('tarotHistory') || '[]');
    const newRecord = {
        date: new Date().toLocaleString('zh-TW'),
        question: currentQuestion,
        spread: spreads[currentSpread].name,
        mindset: { name: mindsetCard.name, reversed: mindsetCard.reversed },
        cards: drawnCards.map(c => ({ name: c.name, reversed: c.reversed, position: c.position }))
    };
    history.unshift(newRecord); // 加到最前面
    if (history.length > 50) history.pop(); // 只留最新的 50 筆
    localStorage.setItem('tarotHistory', JSON.stringify(history));
}

function showHistory() {
    const modal = document.getElementById('historyModal');
    const list = document.getElementById('historyList');
    const history = JSON.parse(localStorage.getItem('tarotHistory') || '[]');
    
    list.innerHTML = '';
    if (history.length === 0) {
        list.innerHTML = '<div class="text-center text-gray-400 py-4">目前沒有歷史紀錄</div>';
    } else {
        history.forEach(record => {
            const item = document.createElement('div');
            item.className = 'bg-white/5 rounded p-3 border border-white/10 text-sm';
            item.innerHTML = `
                <div class="flex justify-between text-yellow-300 mb-1">
                    <span>${record.date}</span>
                    <span class="font-bold">${record.spread}</span>
                </div>
                <div class="text-white font-medium mb-2">Q: ${record.question}</div>
                <div class="text-blue-200 text-xs">
                    心態: ${record.mindset.name} (${record.mindset.reversed?'逆':'正'})<br>
                    ${record.cards.map(c => `${c.position}: ${c.name} (${c.reversed?'逆':'正'})`).join(' / ')}
                </div>
            `;
            list.appendChild(item);
        });
    }
    modal.classList.remove('hidden');
}

function clearHistory() {
    if(confirm('確定要清除所有歷史紀錄嗎？')) {
        localStorage.removeItem('tarotHistory');
        showHistory();
    }
}

// --- 新增功能：分享 ---
async function shareResult() {
    const text = `🔮 布克塔羅占卜結果\n\n問題：${currentQuestion}\n牌陣：${spreads[currentSpread].name}\n\n心態牌：${mindsetCard.name} (${mindsetCard.reversed?'逆位':'正位'})\n\n${drawnCards.map(c => `${c.position}：${c.name} (${c.reversed?'逆位':'正位'})`).join('\n')}\n\n快來試試！`;
    
    if (navigator.share) {
        try {
            await navigator.share({
                title: '布克塔羅占卜結果',
                text: text,
                url: window.location.href
            });
        } catch (err) {
            console.error('Share failed:', err);
        }
    } else {
        alert('您的瀏覽器不支援分享功能，請手動複製結果。');
    }
}
