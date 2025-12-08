const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
const SUITS = ['c','d','h','s'];
const SUIT_ICONS = { 'h':'♥', 'd':'♦', 's':'♠', 'c':'♣' };

// --- CONFIGURAÇÃO DE POSIÇÕES ---
// Definição 8-MAX
const POS_8MAX = [
    {id:'sb', label:'SB', class:'pos-sb'}, {id:'bb', label:'BB', class:'pos-bb'},
    {id:'str', label:'STR', class:'pos-str'}, {id:'utg', label:'UTG', class:'pos-utg'},
    {id:'utg1', label:'UTG+1', class:'pos-utg1'}, {id:'mp', label:'MP', class:'pos-mp'},
    {id:'co', label:'CO', class:'pos-co'}, {id:'btn', label:'BTN', class:'pos-btn'}
];
// Definição 6-MAX (Sem Straddle, sem UTG+1)
const POS_6MAX = [
    {id:'sb', label:'SB', class:'pos-sb'}, {id:'bb', label:'BB', class:'pos-bb'},
    {id:'utg', label:'UTG', class:'pos-utg'}, {id:'mp', label:'MP', class:'pos-mp'},
    {id:'co', label:'CO', class:'pos-co'}, {id:'btn', label:'BTN', class:'pos-btn'}
];

// --- COORDENADAS FÍSICAS DOS ASSENTOS (Topo, Esquerda) ---
const SLOTS_8MAX = [
    { t: 100, l: 50 }, // 0: HERO (Meio Baixo)
    { t: 95, l: 15 }, // 1
    { t: 50, l: 0 },  // 2
    { t: 5, l: 15 }, // 3
    { t: 0,  l: 50 }, // 4 (Vilão Topo)
    { t: 5, l: 85 }, // 5
    { t: 50, l: 100 }, // 6
    { t: 95, l: 85 }  // 7
];

// Coordenadas para mesa de 6 lugares (aproximado oval)
const SLOTS_6MAX = [
    { t: 100, l: 50 }, // 0: HERO (Meio Baixo)
    { t: 75, l: 5 },  // 1: Esquerda Baixo
    { t: 25, l: 5 },  // 2: Esquerda Topo
    { t: 5, l: 50 },  // 3: Topo Centro
    { t: 25, l: 95 }, // 4: Direita Topo
    { t: 75, l: 95 }  // 5: Direita Baixo
];

// VARIÁVEIS GLOBAIS DE ESTADO
let currentTableSize = 8; // Default 8
let activePositions = POS_8MAX;
let activeSlots = SLOTS_8MAX;

let ranges = JSON.parse(localStorage.getItem('pokerRangesV90')) || []; 
let rangeData = { id: null, name: '', grid: {}, positions: [] };
let currentScenario = {};
let currentAnte = 0; // Default 0 como pedido no 6max
let tempScenarios = [];
let isDrawing = false;
let selectedEditorPositions = new Set();
let currentHomeFilter = 'ALL';

// VIEW STATE (HOME & DRILL)
let selectedHomeFormat = 0; // 0 = nenhum, 6 ou 8
let selectedDrillFormat = 0;

// Drill State
let selectedDrillRangeIds = new Set(); 
let drillExcludedHands = new Set();
let activeDrillRange = null; 
let activeHand = '';
let sessionStats = { hands: 0, correct: 0, errors: 0, consults: 0 };
// Drill Matrix Draw
let isDrillDrawing = false;
let drillDrawAction = 'exclude';


// --- FUNÇÕES DE LÓGICA E UI ---

function setTableFormat(size) {
    currentTableSize = size;
    if(size === 6) {
        activePositions = POS_6MAX;
        activeSlots = SLOTS_6MAX;
        currentAnte = 0; // Padrão 0 para 6max
    } else {
        activePositions = POS_8MAX;
        activeSlots = SLOTS_8MAX;
        currentAnte = 0.5; // Padrão 0.5 para 8max
    }
    initUI(); // Re-renderiza botões de posição
    
    // Se for criação nova, limpa dados
    if(!rangeData.id) {
        rangeData = { id: null, name: '', grid: {}, positions: [] };
        initHandMatrix(); // Limpa grid
    }
    
    // Vai para o editor
    switchTab('editor');
}

function switchTab(tab) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.header-btn').forEach(b => b.classList.remove('active'));
    const target = document.getElementById('tab-'+tab);
    if(target) target.classList.add('active');
    
    const headerBtns = document.querySelectorAll('header nav .header-btn');
    headerBtns.forEach(btn => btn.classList.remove('active'));
    
    if(tab === 'landing') headerBtns[0].classList.add('active');
    
    if(tab === 'home') { 
        headerBtns[1].classList.add('active'); 
        // Reset view to selection
        backToHomeFormat(); 
    }
    
    // Se clicar em Novo Range no menu, vai para seleção de formato
    if(tab === 'format-select') { headerBtns[2].classList.add('active'); } 
    if(tab === 'editor') { headerBtns[2].classList.add('active'); }
    
    if(tab === 'drill') { 
        headerBtns[3].classList.add('active'); 
        // Reset view to selection
        backToDrillFormat();
    }
    
    if(tab === 'table-editor') {
        if(Object.keys(currentScenario).length === 0) initTableConfigList();
        updateTableVisual();
        renderScenarioBuffer();
    }
}

// --- LOGICA DE SELEÇÃO HOME ---
function viewHomeFormat(size) {
    selectedHomeFormat = size;
    document.getElementById('home-format-selection').style.display = 'none';
    document.getElementById('home-list-container').style.display = 'block';
    document.getElementById('home-list-title').innerText = `Ranges ${size}-max`;
    renderRangeList();
}
function backToHomeFormat() {
    selectedHomeFormat = 0;
    document.getElementById('home-format-selection').style.display = 'block';
    document.getElementById('home-list-container').style.display = 'none';
}

// --- LOGICA DE SELEÇÃO DRILL ---
function viewDrillFormat(size) {
    selectedDrillFormat = size;
    document.getElementById('drill-format-selection').style.display = 'none';
    document.getElementById('drill-content-selection').style.display = 'block';
    document.getElementById('drill-list-title').innerText = `1. Selecione Ranges (${size}-max)`;
    initDrillSelection();
}
function backToDrillFormat() {
    selectedDrillFormat = 0;
    stopDrill(); // Garante que parou
    document.getElementById('drill-format-selection').style.display = 'block';
    document.getElementById('drill-content-selection').style.display = 'none';
    document.getElementById('drill-active').style.display = 'none';
}


// ... [Funções do Editor Range] ...
function initUI() {
    const filterDiv = document.getElementById('home-pos-filter'); 
    if(filterDiv) {
        filterDiv.innerHTML = `<button class="pos-btn active" onclick="filterHome('ALL', this)">Todos</button>`;
        // Filtro da home gerado separadamente para suportar tudo
        const allPosLabels = new Set([...POS_8MAX.map(p=>p.label), ...POS_6MAX.map(p=>p.label)]);
        allPosLabels.forEach(lbl => {
                filterDiv.innerHTML += `<button class="pos-btn" onclick="filterHome('${lbl}', this)">${lbl}</button>`;
        });
    }
    
    const editorSel = document.getElementById('editor-pos-select'); 
    if(editorSel) {
        editorSel.innerHTML = '';
        // Usa activePositions para gerar os botões do Editor
        activePositions.forEach(p => {
            const b = document.createElement('button'); b.className = 'pos-btn'; b.innerText = p.label; b.dataset.pos = p.label;
            b.onclick = () => { if(selectedEditorPositions.has(p.label)) { selectedEditorPositions.delete(p.label); b.classList.remove('selected'); } else { selectedEditorPositions.add(p.label); b.classList.add('selected'); } };
            if(selectedEditorPositions.has(p.label)) b.classList.add('selected');
            editorSel.appendChild(b);
        });
    }
}

function initHandMatrix() {
    const m = document.getElementById('hand-matrix'); 
    if(!m) return;
    
    m.innerHTML = '';
    rangeData.grid = {};
    for(let i=0; i<13; i++){ for(let j=0; j<13; j++){
            let h = i===j ? RANKS[i]+RANKS[j] : (i<j ? RANKS[i]+RANKS[j]+'s' : RANKS[j]+RANKS[i]+'o');
            let div = document.createElement('div'); div.className = 'cell'; div.dataset.hand = h;
            div.innerHTML = `<div class="cell-bg"></div><span>${h}</span>`;
            rangeData.grid[h] = {fold:100, call:0, raise:0, allin:0}; 
            div.onmousedown = () => { isDrawing=true; applyBrush(h); };
            div.onmouseenter = () => { if(isDrawing) applyBrush(h); };
            m.appendChild(div);
    }}
    window.onmouseup = () => isDrawing = false;
}
function updateBrush(type, val) {
    val = parseInt(val); if(val < 0) val=0; if(val>100) val=100;
    let c = parseInt(document.getElementById('pct-call').value)||0; let r = parseInt(document.getElementById('pct-raise').value)||0; let a = parseInt(document.getElementById('pct-allin').value)||0;
    if(type === 'call') c = val; if(type === 'raise') r = val; if(type === 'allin') a = val;
    let total = c + r + a;
    if(total > 100) {
        let excess = total - 100;
        let others = [{t:'call', v:c}, {t:'raise', v:r}, {t:'allin', v:a}].filter(o => o.t !== type).sort((x,y) => y.v - x.v);
        if(others.length > 0) {
            if(others[0].t === 'call') c -= excess; else if(others[0].t === 'raise') r -= excess; else if(others[0].t === 'allin') a -= excess;
            if(c<0) { excess = -c; c=0; } else if(r<0) { excess=-r; r=0; } else if(a<0) { excess=-a; a=0; } else { excess=0; }
            if(excess > 0 && others.length > 1) { if(others[1].t === 'call') c -= excess; else if(others[1].t === 'raise') r -= excess; else if(others[1].t === 'allin') a -= excess; }
        }
    }
    document.getElementById('pct-call').value = c; document.getElementById('pct-raise').value = r; document.getElementById('pct-allin').value = a;
    document.querySelectorAll('.slider')[0].value = c; document.querySelectorAll('.slider')[1].value = r; document.querySelectorAll('.slider')[2].value = a;
    let f = 100 - (c+r+a); if(f<0) f=0; document.getElementById('pct-fold').value = f;
}
function applyBrush(hand) {
    let c = parseInt(document.getElementById('pct-call').value)||0; let r = parseInt(document.getElementById('pct-raise').value)||0; let a = parseInt(document.getElementById('pct-allin').value)||0; let size = document.getElementById('val-raise').value || 0;
    let total = c+r+a; if(total > 100) return; let f = 100 - total;
    rangeData.grid[hand] = {call:c, raise:r, allin:a, fold:f, size:size};
    updateCellVisual(hand, rangeData.grid[hand]);
}
function updateCellVisual(hand, data) {
    const bg = document.querySelector(`.cell[data-hand="${hand}"] .cell-bg`);
    if(!bg) return;
    let p1=data.allin, p2=p1+data.raise, p3=p2+data.call;
    bg.style.background = `linear-gradient(to right, var(--color-allin) 0% ${p1}%, var(--color-raise) ${p1}% ${p2}%, var(--color-call) ${p2}% ${p3}%, transparent ${p3}% 100%)`;
}

function resetRangeGrid() {
    if(!confirm("Tem certeza que deseja limpar todo o grid?")) return;
    Object.keys(rangeData.grid).forEach(h => {
        rangeData.grid[h] = {fold:100, call:0, raise:0, allin:0, size:0};
        updateCellVisual(h, rangeData.grid[h]);
    });
}

function goToTableEditor() {
    const name = document.getElementById('range-name').value;
    if(!name) { alert("Dê um nome."); return; }
    if(selectedEditorPositions.size===0) { alert("Selecione Posição."); return; }
    rangeData.name = name; rangeData.positions = Array.from(selectedEditorPositions);
    rangeData.tableSize = currentTableSize; // Salva o tamanho da mesa no range
    if(!rangeData.id) tempScenarios = []; 
    initTableConfigList(); switchTab('table-editor');
}

function editRange(id) {
    const r = ranges.find(x => x.id === id); if(!r) return;
    
    // Detecta o tamanho da mesa baseado no range salvo ou default 8
    let tSize = r.tableSize || 8; 
    
    rangeData = { id: r.id, name: r.name, positions: r.positions, grid: JSON.parse(JSON.stringify(r.grid)), tableSize: tSize };
    tempScenarios = r.scenarios ? JSON.parse(JSON.stringify(r.scenarios)) : [];
    if(tempScenarios.length > 0 && tempScenarios[0].ante !== undefined) { currentAnte = tempScenarios[0].ante; }
    
    document.getElementById('range-name').value = r.name; selectedEditorPositions = new Set(r.positions);
    
    // Carrega o ambiente correto (6max ou 8max)
    setTableFormat(tSize);
    
    // Atualiza visual do grid
    Object.keys(rangeData.grid).forEach(h => { updateCellVisual(h, rangeData.grid[h]); });
}

// --- EDITOR MESA & ROTAÇÃO ---
function initTableConfigList() {
    const list = document.getElementById('pos-config-list'); 
    if(!list) return;

    list.innerHTML = ''; currentScenario = {};
    document.getElementById('ante-input').value = currentAnte;
    
    activePositions.forEach(pos => {
        let dRole = 'fold'; let dBet = 0;
        if(pos.id === 'sb') { dRole = 'post'; dBet = 0.5; } 
        if(pos.id === 'bb') { dRole = 'post'; dBet = 1.0; } 
        if(pos.id === 'str') { dRole = 'post'; dBet = 2.0; }
        
        currentScenario[pos.id] = { role: dRole, bet: dBet, isHero: false, stack: 250 }; 
        const row = document.createElement('div'); row.className = 'pos-config-row';
        row.innerHTML = `
            <input type="radio" name="hero-select" class="hero-radio" onclick="updateHero('${pos.id}')" title="HERO">
            <div class="pos-label">${pos.label}</div>
            <select class="role-select" onchange="updateRole('${pos.id}', this.value)" style="${dBet>0?'font-weight:bold;':''}">
                <option value="fold" ${dRole==='fold'?'selected':''}>Fold</option>
                <option value="post" ${dRole==='post'?'selected':''}>Blind/Post</option>
                <option value="limp">Limp</option>
                <option value="open">Open Raise</option>
                <option value="iso">Iso / 3-Bet</option>
                <option value="call">Call</option>
                <option value="allin">All-in</option>
            </select>
            <input type="number" id="stack-${pos.id}" class="stack-input" value="250" onchange="updateStack('${pos.id}', this.value)" title="Stack">
            <input type="number" id="bet-${pos.id}" class="bet-input" placeholder="bb" step="0.1" value="${dBet > 0 ? dBet : ''}" style="display:${dBet>0?'block':'none'}" onchange="updateBet('${pos.id}', this.value)">
        `;
        list.appendChild(row);
    }); updateTableVisual();
}
function updateHero(pid) { activePositions.forEach(p => currentScenario[p.id].isHero = (p.id === pid)); updateTableVisual(); }
function updateStack(pid, val) { currentScenario[pid].stack = val; updateTableVisual(); }

function updateRole(pid, role) {
    currentScenario[pid].role = role; const input = document.getElementById(`bet-${pid}`); let val = 0;
    
    if(role === 'open') val = 2.0; else if(role === 'iso') val = 6.0; else if(role === 'limp') val = 1.0; 
    else if(role === 'post' && pid==='sb') val=0.5; else if(role === 'post' && pid==='bb') val=1.0; else if(role === 'post' && pid==='str') val=2.0;
    
    // Se Fold, as fichas não devem sumir se for blind (regrinha do 6max pedida)
    if(role === 'fold') {
        if(pid === 'sb') val = 0.5;
        else if(pid === 'bb') val = 1.0;
        else if(pid === 'str') val = 2.0;
        else val = 0;
    }

    if(val > 0 || ['call','allin'].includes(role)) {
        input.style.display = 'block'; 
        if(val > 0) { 
            input.value = val; 
            currentScenario[pid].bet = val; 
        }
    } else {
        input.style.display = 'none';
        currentScenario[pid].bet = val; // será 0 a menos que seja blind foldado
    }
    updateTableVisual();
}
function updateBet(pid, val) { currentScenario[pid].bet = parseFloat(val) || 0; updateTableVisual(); }

function updateTableVisual(targetId = 'visual-table') {
    const container = document.getElementById(targetId);
    if(!container) return;

    container.querySelectorAll('.seat-visual, .chip-container, .dealer-btn, .table-center-pot, .stack-display, .player-cards-container').forEach(e => e.remove());
    
    let anteVal = parseFloat(document.getElementById('ante-input') ? document.getElementById('ante-input').value : currentAnte) || 0;
    currentAnte = anteVal;
    let numPlayers = activePositions.length;
    let calcPot = (anteVal * numPlayers); 
    
    let heroPosIndex = activePositions.findIndex(p => currentScenario[p.id].isHero);
    if (heroPosIndex === -1) heroPosIndex = 0; // Se ninguém selecionado, assume primeiro

    for (let i = 0; i < numPlayers; i++) {
        // Lógica de rotação: O Hero sempre deve estar no slot 0
        let logicalIndex = (heroPosIndex + i) % numPlayers;
        let pos = activePositions[logicalIndex];
        let data = currentScenario[pos.id];
        
        calcPot += parseFloat(data.bet || 0);
        
        let coords = activeSlots[i]; 
        
        // SEAT
        const seat = document.createElement('div');
        let classes = `seat-visual ${pos.class}`;
        if(data.isHero) classes += ' hero'; else if(data.role === 'fold') classes += ' folded'; else classes += ' active-player';
        seat.className = classes; seat.style.top = coords.t + '%'; seat.style.left = coords.l + '%';
        let html = `<div>${pos.label}</div>`; if(data.isHero) html += `<small style="font-size:0.6rem; color:#ffd700;">HERO</small>`;
        seat.innerHTML = html;
        
        seat.innerHTML += `<div class="stack-display">${data.stack || 250} bb</div>`;

        // CARTAS PEQUENAS (NÃO MOSTRAR SE FOR HERO)
        if(data.role !== 'fold' && !data.isHero) {
            seat.innerHTML += `<div class="player-cards-container"><div class="tiny-card"></div><div class="tiny-card"></div></div>`;
        }

        container.appendChild(seat);

        if(data.bet > 0) {
            const chips = getChipStackHTML(data.bet);
            let chipT = coords.t + (50 - coords.t) * 0.30; let chipL = coords.l + (50 - coords.l) * 0.30;
            chips.style.top = chipT + '%'; chips.style.left = chipL + '%'; chips.style.transform = 'translate(-50%, -50%)';
            container.appendChild(chips);
        }
        if(pos.id === 'btn') {
            const btn = document.createElement('div'); btn.className = 'dealer-btn'; btn.innerText = 'D';
            // Ajuste posição dealer btn dependendo da posição na mesa
            let dTop = coords.t < 50 ? coords.t + 12 : coords.t - 12;
            let dLeft = coords.l < 50 ? coords.l + 12 : coords.l - 12;
            btn.style.top = dTop + '%'; btn.style.left = dLeft + '%';
            container.appendChild(btn);
        }
    }

    // ANTE VISUAL
    if(anteVal > 0) {
        const anteStack = getChipStackHTML((anteVal*numPlayers).toFixed(1)); 
        anteStack.style.top = '55%'; anteStack.style.left = '50%'; anteStack.style.transform = 'translate(-50%, -50%) scale(0.8)'; anteStack.style.opacity = '0.7';
        container.appendChild(anteStack);
    }

    const potDiv = document.createElement('div'); potDiv.className = 'table-center-pot';
    potDiv.innerHTML = `<div class="pot-label">POTE TOTAL</div><div class="pot-value">${calcPot.toFixed(1)} bb</div>`;
    container.appendChild(potDiv);

    if(targetId === 'visual-table') {
        document.getElementById('final-pot-input').value = calcPot.toFixed(1);
        document.getElementById('scenario-summary').innerHTML = getScenarioSummary(currentScenario);
    }
}

function getChipStackHTML(amount) {
    const container = document.createElement('div'); container.className = 'chip-container';
    let colorClass = 'chips-red'; let stackCount = 2;
    if(amount >= 5 && amount < 25) { colorClass = 'chips-blue'; stackCount = 3; } if(amount >= 25) { colorClass = 'chips-black'; stackCount = 5; }
    if(amount > 1 && amount < 5) stackCount = 3; if(amount > 10 && amount < 25) stackCount = 4; if(amount > 50) stackCount = 6;
    let stackHTML = ''; for(let i=0; i<stackCount; i++) { stackHTML += `<div class="chip-disc" style="bottom:${i*3}px;"></div>`; }
    container.innerHTML = `<div class="${colorClass} chip-stack-visual">${stackHTML}</div><div class="chip-text">${amount} bb</div>`; return container;
}

function getScenarioSummary(scenarioData) {
    let acts = [];
    activePositions.forEach(p => {
        let d = scenarioData[p.id];
        if(d.role !== 'fold' && d.role !== 'post') {
            let roleNice = d.role === 'open' ? 'Open' : (d.role === 'iso' ? 'Iso' : (d.role === 'hero' ? 'HERO' : d.role));
            roleNice = roleNice.charAt(0).toUpperCase() + roleNice.slice(1); acts.push(`${p.label} ${roleNice} (${d.bet}bb)`);
        }
    }); return acts.length===0 ? "Nenhuma ação agressiva" : acts.join(' ➔ ');
}

function addScenarioToBuffer() {
    let heroP = activePositions.find(p => currentScenario[p.id].isHero);
    if (heroP) {
        // Validação BB 6-max e 8-max
        if (heroP.id === 'bb') { 
            if (currentScenario['sb'].role === 'post') { alert("ATENÇÃO: Defina a ação do SB."); return; } 
        }
        // Validação Straddle (apenas se existir straddle no jogo)
        if (heroP.id === 'str' && currentScenario['str']) { 
            if (currentScenario['sb'].role === 'post') { alert("ATENÇÃO: Defina a ação do SB."); return; } 
            if (currentScenario['bb'].role === 'post') { alert("ATENÇÃO: Defina a ação do BB."); return; } 
        }
    }
    const pot = document.getElementById('final-pot-input').value;
    const scenarioObj = { id: Date.now(), data: JSON.parse(JSON.stringify(currentScenario)), pot: pot, ante: currentAnte, summary: getScenarioSummary(currentScenario) };
    tempScenarios.push(scenarioObj); renderScenarioBuffer(); alert("Cenário adicionado!");
}
function renderScenarioBuffer() {
    const container = document.getElementById('scenario-buffer-list'); container.innerHTML = '';
    if(tempScenarios.length === 0) { container.innerHTML = '<em style="font-size:0.8rem; color:#999;">Nenhum cenário adicionado ainda.</em>'; return; }
    tempScenarios.forEach((scen, idx) => {
        const div = document.createElement('div');
        div.style.cssText = "background:white; border:1px solid #ddd; padding:8px; margin-top:5px; border-radius:6px; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;";
        div.innerHTML = `<span><b>#${idx+1}</b> ${scen.summary} <span style="color:#666;">(Pote: ${scen.pot}bb)</span></span><button onclick="removeTempScenario(${idx})" style="color:red; background:none; border:none; cursor:pointer; font-weight:bold;">✕</button>`;
        container.appendChild(div);
    });
}
function removeTempScenario(idx) { tempScenarios.splice(idx, 1); renderScenarioBuffer(); }
function finalizeRange() {
    if(tempScenarios.length === 0) { if(!confirm("Nenhum cenário salvo. Salvar atual?")) return; addScenarioToBuffer(); }
    const isEditing = rangeData.id !== null; const newId = isEditing ? rangeData.id : Date.now();
    const finalObj = { id: newId, name: rangeData.name, positions: rangeData.positions, grid: JSON.parse(JSON.stringify(rangeData.grid)), scenarios: JSON.parse(JSON.stringify(tempScenarios)), tableSize: currentTableSize };
    if (isEditing) { const index = ranges.findIndex(r => r.id === newId); if(index !== -1) ranges[index] = finalObj; else ranges.push(finalObj); } else { ranges.push(finalObj); }
    localStorage.setItem('pokerRangesV90', JSON.stringify(ranges)); 
    rangeData = { id: null, name: '', grid: {}, positions: [] }; tempScenarios = [];
    alert(isEditing ? "Range Atualizado!" : "Novo Range Salvo!"); switchTab('home');
}
function filterHome(pos, btn) { currentHomeFilter = pos; document.querySelectorAll('#home-pos-filter .pos-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderRangeList(); }

// --- RENDERIZAR LISTA (FILTRADA PELO FORMATO) ---
function renderRangeList() {
    const list = document.getElementById('saved-ranges-list');
    list.innerHTML = '';
    
    let filtered = currentHomeFilter === 'ALL' ? ranges : ranges.filter(r => r.positions.includes(currentHomeFilter));
    
    // Filtra pelo tamanho selecionado
    filtered = filtered.filter(r => (r.tableSize || 8) === selectedHomeFormat);

    const createCard = (r) => {
        const d = document.createElement('div'); d.className = 'range-card'; let scenCount = r.scenarios ? r.scenarios.length : 1;
        d.innerHTML = `<div style="font-size:0.8rem; color:#888; font-weight:bold; margin-bottom:5px;">${r.positions.join(', ')}</div><h3 style="margin:0 0 5px 0;">${r.name}</h3><div style="font-size:0.85rem; color:#555;">${scenCount} Cenário(s)</div><div class="card-actions"><button class="btn-card-action" onclick="editRange(${r.id}, event)">✎</button><button class="btn-card-action btn-delete" onclick="delRange(${r.id}, event)">✕</button></div>`;
        d.onclick = (e) => { if(e.target.tagName!=='BUTTON') startDrill(r.id); };
        return d;
    };

    if(filtered.length === 0) { list.innerHTML = '<div class="empty-state" style="grid-column:1/-1; text-align:center; padding:20px; color:#ccc;">Vazio.</div>'; }
    else { filtered.forEach(r => list.appendChild(createCard(r))); }
}

function delRange(id, e) { e.stopPropagation(); if(confirm("Apagar?")) { ranges = ranges.filter(r=>r.id!==id); localStorage.setItem('pokerRangesV90', JSON.stringify(ranges)); renderRangeList(); } }

// --- DRILL & FILTER MATRIX ---
function initDrillSelection() { selectedDrillRangeIds.clear(); renderDrillSelectionGrid(); }

function renderDrillSelectionGrid() { 
    const grid = document.getElementById('drill-range-grid'); grid.innerHTML = ''; 
    
    // Filter by current format selection
    let filteredRanges = ranges.filter(r => (r.tableSize || 8) === selectedDrillFormat);
    
    if(filteredRanges.length === 0) { grid.innerHTML = '<div style="width:100%; color:#999;">Nenhum range criado para este formato.</div>'; return; } 
    filteredRanges.forEach(r => { const d = document.createElement('div'); d.className = 'range-card'; d.innerHTML = `<div style="font-size:0.8rem; color:#888; font-weight:bold;">${r.positions.join(', ')}</div><h3>${r.name}</h3>`; d.onclick = () => { if(selectedDrillRangeIds.has(r.id)) { selectedDrillRangeIds.delete(r.id); d.classList.remove('selected'); } else { selectedDrillRangeIds.add(r.id); d.classList.add('selected'); } }; grid.appendChild(d); }); 
}
function goToDrillFilter() { if(selectedDrillRangeIds.size === 0) { alert("Selecione pelo menos um range."); return; } document.getElementById('drill-select-ranges').style.display = 'none'; document.getElementById('drill-setup-filter').style.display = 'block'; renderAggregatedDrillMatrix(); }
function backToDrillSelect() { document.getElementById('drill-select-ranges').style.display = 'block'; document.getElementById('drill-setup-filter').style.display = 'none'; }
function renderAggregatedDrillMatrix() { const matrix = document.getElementById('drill-matrix'); matrix.innerHTML = ''; drillExcludedHands.clear(); matrix.onmousedown = () => { isDrillDrawing = true; }; document.onmouseup = () => { isDrillDrawing = false; }; for(let i=0; i<13; i++){ for(let j=0; j<13; j++){ let h = i===j ? RANKS[i]+RANKS[j] : (i<j ? RANKS[i]+RANKS[j]+'s' : RANKS[j]+RANKS[i]+'o'); let div = document.createElement('div'); div.className = 'drill-cell'; div.innerText = h; if(i===j) div.classList.add('pair'); else if(i<j) div.classList.add('suited'); else div.classList.add('off'); div.onmousedown = (e) => { e.preventDefault(); isDrillDrawing = true; drillDrawAction = drillExcludedHands.has(h) ? 'include' : 'exclude'; toggleDrillHand(h, div, drillDrawAction); }; div.onmouseover = () => { if(isDrillDrawing) toggleDrillHand(h, div, drillDrawAction); }; matrix.appendChild(div); }} }
function toggleDrillHand(h, div, action) { if(action === 'exclude') { drillExcludedHands.add(h); div.classList.add('excluded'); } else { drillExcludedHands.delete(h); div.classList.remove('excluded'); } }
function drillSelectAll(isSelect) { const cells = document.querySelectorAll('.drill-cell'); if(isSelect) { drillExcludedHands.clear(); cells.forEach(c => c.classList.remove('excluded')); } else { cells.forEach(c => { drillExcludedHands.add(c.innerText); c.classList.add('excluded'); }); } }
function startDrillSession() { sessionStats = { hands: 0, correct: 0, errors: 0, consults: 0 }; updateStatsDisplay(); document.getElementById('drill-setup-filter').style.display = 'none'; document.getElementById('drill-content-selection').style.display = 'none'; document.getElementById('drill-active').style.display = 'block'; nextDrillHand(); }
function updateStatsDisplay() { document.getElementById('stat-total').innerText = sessionStats.hands; document.getElementById('stat-correct').innerText = sessionStats.correct; document.getElementById('stat-errors').innerText = sessionStats.errors; document.getElementById('stat-consults').innerText = sessionStats.consults; }
function showRangeModal() { if(!activeDrillRange) return; const matrixDiv = document.getElementById('modal-range-matrix'); document.getElementById('modal-range-title').innerText = activeDrillRange.name; matrixDiv.innerHTML = ''; for(let i=0; i<13; i++){ for(let j=0; j<13; j++){ let h = i===j ? RANKS[i]+RANKS[j] : (i<j ? RANKS[i]+RANKS[j]+'s' : RANKS[j]+RANKS[i]+'o'); let div = document.createElement('div'); div.className = 'cell'; div.style.cursor='default'; div.innerHTML = `<div class="cell-bg"></div><span>${h}</span>`; let data = activeDrillRange.grid[h]; if(data) { let p1=data.allin, p2=p1+data.raise, p3=p2+data.call; div.querySelector('.cell-bg').style.background = `linear-gradient(to right, var(--color-allin) 0% ${p1}%, var(--color-raise) ${p1}% ${p2}%, var(--color-call) ${p2}% ${p3}%, transparent ${p3}% 100%)`; } matrixDiv.appendChild(div); }} document.getElementById('range-modal').style.display = 'flex'; sessionStats.consults++; updateStatsDisplay(); }
function closeRangeModal() { document.getElementById('range-modal').style.display = 'none'; }
function nextDrillHand() { document.getElementById('drill-feedback').innerHTML = ''; document.getElementById('drill-range-info').innerText = ''; let candidates = []; selectedDrillRangeIds.forEach(id => { const r = ranges.find(x => x.id === id); if(r) { let validHands = Object.keys(r.grid).filter(h => !drillExcludedHands.has(h)); if(validHands.length > 0) candidates.push({range: r, hands: validHands}); } }); if(candidates.length === 0) { alert("Nenhuma mão selecionada!"); stopDrill(); return; } const selection = candidates[Math.floor(Math.random() * candidates.length)]; activeDrillRange = selection.range; activeHand = selection.hands[Math.floor(Math.random() * selection.hands.length)]; const r1=activeHand[0], r2=activeHand[1], t=activeHand.length===3?activeHand[2]:''; let s1 = t==='o'||t==='' ? SUITS[Math.floor(Math.random()*4)] : 'h'; if(t === 's') s1 = SUITS[Math.floor(Math.random()*4)]; let s2 = s1; if(t === 'o' || t === '') { while(s2 === s1) s2 = SUITS[Math.floor(Math.random()*4)]; } if(t === 's') s2 = s1; document.getElementById('drill-hero-cards').innerHTML = `<div class="card card-${s1}"><div class="card-corner top-left">${r1}</div><div class="card-suit">${SUIT_ICONS[s1]}</div><div class="card-corner bottom-right">${r1}</div></div><div class="card card-${s2}"><div class="card-corner top-left">${r2}</div><div class="card-suit">${SUIT_ICONS[s2]}</div><div class="card-corner bottom-right">${r2}</div></div>`; let scenArray = activeDrillRange.scenarios || []; if(scenArray.length > 0) { let rndScen = scenArray[Math.floor(Math.random() * scenArray.length)]; currentScenario = rndScen.data; currentAnte = rndScen.ante || 0; 
    
    // CONFIGURA AMBIENTE DE DRILL COM BASE NO RANGE CARREGADO
    let rSize = activeDrillRange.tableSize || 8;
    if(rSize === 6) { activePositions = POS_6MAX; activeSlots = SLOTS_6MAX; }
    else { activePositions = POS_8MAX; activeSlots = SLOTS_8MAX; }

    updateTableVisual('drill-table-area'); 
} document.getElementById('drill-range-info').innerText = `Situação: ${activeDrillRange.name}`; const d = activeDrillRange.grid[activeHand]; const btnR = document.getElementById('btn-drill-raise'); if(d.size > 0) btnR.innerText = `RAISE (${d.size})`; else btnR.innerText = 'RAISE'; }
function checkDrill(act) { sessionStats.hands++; const d = activeDrillRange.grid[activeHand]; let pct = 0; if(act==='Fold') pct = d.fold; if(act==='Call') pct = d.call; if(act==='Raise') pct = d.raise; if(act==='Allin') pct = d.allin; const fb = document.getElementById('drill-feedback'); let maxVal = Math.max(d.fold, d.call, d.raise, d.allin); if(pct > 0 && pct >= maxVal - 20) { fb.innerHTML = `<span style="color:green">CORRETO!</span> ${act} (${pct}%)`; sessionStats.correct++; updateStatsDisplay(); setTimeout(nextDrillHand, 1000); } else { fb.innerHTML = `<span style="color:red">ERRO!</span> Melhor: ${getBestAction(d)}`; sessionStats.errors++; updateStatsDisplay(); } }
function getBestAction(d) { let max = d.fold, act = 'Fold'; if(d.call > max) { max=d.call; act='Call'; } if(d.raise > max) { max=d.raise; act='Raise'; } if(d.allin > max) { max=d.allin; act='Allin'; } return `${act} (${max}%)`; }
function stopDrill() { document.getElementById('drill-active').style.display='none'; switchTab('drill'); }

// --- BACKUP SYSTEM ---
function exportRanges() {
    if (ranges.length === 0) { alert("Vazio!"); return; }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ranges));
    const a = document.createElement('a'); a.setAttribute("href", dataStr); a.setAttribute("download", "poker_ranges_backup.json");
    document.body.appendChild(a); a.click(); a.remove();
}
function importRanges(input) {
    const file = input.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if(Array.isArray(data)) {
                if(confirm("Substituir tudo? (Cancelar = Mesclar)")) ranges = data; 
                else { data.forEach(r => { r.id = Date.now()+Math.random(); ranges.push(r); }); }
                localStorage.setItem('pokerRangesV90', JSON.stringify(ranges));
                renderRangeList(); alert("Importado!");
            }
        } catch(e) { alert("Erro JSON"); }
    }; reader.readAsText(file);
}

// --- INICIALIZAÇÃO SEGURA (DOM READY) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Sistema Iniciado - Poker Range Builder v93");
    
    // Inicializa a matriz e a interface somente quando o DOM estiver pronto
    initHandMatrix();
    initUI();

    // Verificação extra para renderizar a aba correta se necessário
    const currentTab = document.querySelector('.screen.active');
    if(currentTab && currentTab.id === 'tab-editor') {
        // Lógica de re-render se necessário
    }
});