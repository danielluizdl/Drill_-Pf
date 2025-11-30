const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];

// --- DEFINIÇÕES DE FORMATO ---
const POS_8MAX = [
    {id:'sb', label:'SB'}, {id:'bb', label:'BB'},
    {id:'str', label:'STR'}, {id:'utg', label:'UTG'},
    {id:'utg1', label:'UTG+1'}, {id:'mp', label:'MP'},
    {id:'co', label:'CO'}, {id:'btn', label:'BTN'}
];
const POS_6MAX = [
    {id:'sb', label:'SB'}, {id:'bb', label:'BB'},
    {id:'utg', label:'UTG'}, {id:'mp', label:'MP'},
    {id:'co', label:'CO'}, {id:'btn', label:'BTN'}
];

// ESTADO GLOBAL
let currentFormat = 8; 
let activePositions = POS_8MAX;
let rangeData = { grid: {} };
let selectedEditorPositions = new Set();
let currentScenario = {};
let currentAnte = 0;
let isDrawing = false;

initHandMatrix();

// --- NAVEGAÇÃO ---
function switchTab(tabId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.header-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-'+tabId).classList.add('active');
    
    // Mapeia botões do header
    const btnMap = {'home':0, 'format':1, 'editor':1, 'table-editor':1, 'drill':2};
    if(btnMap[tabId] !== undefined) document.querySelectorAll('.header-btn')[btnMap[tabId]].classList.add('active');

    // Se entrar na mesa, gera a lista de configuração
    if(tabId === 'table-editor') {
        initTableConfigList();
    }
}

// --- LÓGICA DE FORMATO ---
function setTableFormat(size) {
    currentFormat = size;
    if(size === 6) {
        activePositions = POS_6MAX;
        currentAnte = 0; // Ante 0 no 6-max
    } else {
        activePositions = POS_8MAX;
        currentAnte = 0.5; // Ante 0.5 no 8-max
    }
    
    document.getElementById('format-label').innerText = `(${size}-Max)`;
    document.getElementById('ante-input').value = currentAnte;
    
    initEditorUI(); // Recria os botões de posição do editor
    resetRangeGrid(); // Limpa o grid para o novo range
    switchTab('editor');
}

// --- EDITOR UI ---
function initEditorUI() {
    const container = document.getElementById('editor-pos-select');
    container.innerHTML = '';
    selectedEditorPositions.clear();
    
    activePositions.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'pos-btn';
        btn.innerText = p.label;
        btn.onclick = () => {
            if(selectedEditorPositions.has(p.label)) {
                selectedEditorPositions.delete(p.label);
                btn.classList.remove('selected');
            } else {
                selectedEditorPositions.add(p.label);
                btn.classList.add('selected');
            }
        };
        container.appendChild(btn);
    });
}

// --- MATRIZ ---
function initHandMatrix() {
    const m = document.getElementById('hand-matrix');
    m.innerHTML = '';
    for(let i=0; i<13; i++){ for(let j=0; j<13; j++){
        let h = i===j ? RANKS[i]+RANKS[j] : (i<j ? RANKS[i]+RANKS[j]+'s' : RANKS[j]+RANKS[i]+'o');
        let div = document.createElement('div'); div.className = 'cell'; div.dataset.hand = h;
        div.innerHTML = `<div class="cell-bg"></div><span>${h}</span>`;
        div.onmousedown = () => { isDrawing = true; applyBrush(h); };
        div.onmouseenter = () => { if(isDrawing) applyBrush(h); };
        m.appendChild(div);
        rangeData.grid[h] = {fold:100, call:0, raise:0, allin:0};
    }}
    window.onmouseup = () => isDrawing = false;
}

// --- PINTURA (Mantido Simples) ---
function updateBrush(type, val) {
    val = parseInt(val); if(val<0) val=0; if(val>100) val=100;
    // (Lógica completa de sliders fica aqui, simplificada para o exemplo)
    let c = parseInt(document.getElementById('pct-call').value)||0;
    let r = parseInt(document.getElementById('pct-raise').value)||0;
    let a = parseInt(document.getElementById('pct-allin').value)||0;
    if(type==='call') c=val; if(type==='raise') r=val; if(type==='allin') a=val;
    let f = 100 - (c+r+a); if(f<0) f=0;
    document.getElementById('pct-fold').value = f;
    document.getElementById('pct-call').value = c;
    document.getElementById('pct-raise').value = r;
    document.getElementById('pct-allin').value = a;
}
function applyBrush(h) {
    // Pega valores e pinta (Lógica igual ao anterior)
    let c = parseInt(document.getElementById('pct-call').value)||0;
    let r = parseInt(document.getElementById('pct-raise').value)||0;
    let a = parseInt(document.getElementById('pct-allin').value)||0;
    let f = 100-(c+r+a);
    rangeData.grid[h] = {fold:f, call:c, raise:r, allin:a};
    const bg = document.querySelector(`.cell[data-hand="${h}"] .cell-bg`);
    let p1=a, p2=p1+r, p3=p2+c;
    bg.style.background = `linear-gradient(to right, #8b5cf6 0% ${p1}%, #ef4444 ${p1}% ${p2}%, #10b981 ${p2}% ${p3}%, transparent ${p3}% 100%)`;
}
function resetRangeGrid() {
    Object.keys(rangeData.grid).forEach(h => {
        rangeData.grid[h] = {fold:100, call:0, raise:0, allin:0};
        const bg = document.querySelector(`.cell[data-hand="${h}"] .cell-bg`);
        if(bg) bg.style.background = 'transparent';
    });
}

// --- EDITOR MESA ---
function initTableConfigList() {
    const list = document.getElementById('pos-config-list');
    list.innerHTML = '';
    currentScenario = {};

    activePositions.forEach(pos => {
        // Define padrão
        let dRole = 'fold'; let dBet = 0;
        if(pos.id === 'sb') { dRole = 'post'; dBet = 0.5; }
        if(pos.id === 'bb') { dRole = 'post'; dBet = 1.0; }
        if(pos.id === 'str') { dRole = 'post'; dBet = 2.0; } // Str só existe no 8-max

        currentScenario[pos.id] = { role: dRole, bet: dBet, isHero: false };

        const row = document.createElement('div');
        row.className = 'pos-config-row';
        row.innerHTML = `
            <input type="radio" name="hero-select" onclick="updateHero('${pos.id}')">
            <div class="pos-label">${pos.label}</div>
            <select class="role-select" onchange="updateRole('${pos.id}', this.value)">
                <option value="fold" ${dRole==='fold'?'selected':''}>Fold</option>
                <option value="post" ${dRole==='post'?'selected':''}>Blind</option>
                <option value="open">Raise</option>
                <option value="call">Call</option>
            </select>
            <input type="number" placeholder="Stk" class="stack-input" value="250">
            <input type="number" placeholder="Bet" id="bet-${pos.id}" class="bet-input" value="${dBet>0?dBet:''}" onchange="updateBet('${pos.id}', this.value)">
        `;
        list.appendChild(row);
    });
}

function updateHero(pid) {
    // Marca Hero no cenário
    activePositions.forEach(p => currentScenario[p.id].isHero = (p.id === pid));
}

function updateRole(pid, role) {
    currentScenario[pid].role = role;
    const input = document.getElementById(`bet-${pid}`);
    let val = 0;
    
    // Lógica 6-max: Se foldar blind, mantém aposta
    if(role === 'fold') {
        if(pid === 'sb') val = 0.5;
        else if(pid === 'bb') val = 1.0;
        else if(pid === 'str') val = 2.0;
        else val = 0;
    } else if (role === 'open') {
        val = 2.0;
    }

    if(val > 0) input.value = val;
    else input.value = '';
    currentScenario[pid].bet = val;
}

function updateBet(pid, val) {
    currentScenario[pid].bet = parseFloat(val) || 0;
}