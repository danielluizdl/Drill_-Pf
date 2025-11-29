console.log("Sistema de Navegação Iniciado.");

function switchTab(tabId) {
    // 1. Remove a classe 'active' de todas as telas (esconde tudo)
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    
    // 2. Remove a classe 'active' de todos os botões do menu
    document.querySelectorAll('.header-btn').forEach(b => b.classList.remove('active'));
    
    // 3. Mostra a tela que foi clicada
    const selectedScreen = document.getElementById('tab-' + tabId);
    if (selectedScreen) {
        selectedScreen.classList.add('active');
    }

    // 4. Tenta destacar o botão correspondente no menu (se existir)
    // Mapeamento: home=0, editor=1, drill=2
    const btnMap = {'home': 0, 'editor': 1, 'table-editor': 1, 'drill': 2};
    if (btnMap[tabId] !== undefined) {
        const buttons = document.querySelectorAll('header nav .header-btn');
        if(buttons[btnMap[tabId]]) {
            buttons[btnMap[tabId]].classList.add('active');
        }
    }
}

// Dados das cartas
const RANKS = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];

// Inicia a matriz assim que o script carregar
initHandMatrix();

// Variável Global para guardar os dados do range
let rangeData = {}; 

// ... (código anterior do switchTab e const RANKS mantém igual) ...

function initHandMatrix() {
    const m = document.getElementById('hand-matrix');
    if(!m) return;
    m.innerHTML = ''; 
    rangeData = {}; // Reseta dados

    for(let i=0; i<13; i++){
        for(let j=0; j<13; j++){
            let h = i===j ? RANKS[i]+RANKS[j] : (i<j ? RANKS[i]+RANKS[j]+'s' : RANKS[j]+RANKS[i]+'o');
            
            // Inicializa dados da mão (100% Fold)
            rangeData[h] = {fold: 100, call: 0, raise: 0, allin: 0};

            let div = document.createElement('div');
            div.className = 'cell';
            div.dataset.hand = h; // Para saber qual mão é
            
            // HTML interno: Fundo colorido + Texto
            div.innerHTML = `<div class="cell-bg"></div><span>${h}</span>`;
            
            // Eventos de Mouse (Para pintar arrastando)
            div.onmousedown = () => { isDrawing = true; applyBrush(h); };
            div.onmouseenter = () => { if(isDrawing) applyBrush(h); };
            
            m.appendChild(div);
        }
    }
    
    // Para parar de pintar quando soltar o mouse
    window.onmouseup = () => isDrawing = false;
}

let isDrawing = false;

// Função que atualiza os inputs e garante que a soma dê 100%
function updateBrush(type, val) {
    val = parseInt(val); 
    if(val < 0) val=0; if(val>100) val=100;
    
    // Pega os valores atuais
    let c = parseInt(document.getElementById('pct-call').value)||0;
    let r = parseInt(document.getElementById('pct-raise').value)||0;
    let a = parseInt(document.getElementById('pct-allin').value)||0;

    // Atualiza quem mudou
    if(type === 'call') c = val;
    if(type === 'raise') r = val;
    if(type === 'allin') a = val;

    // Calcula o Fold (o que sobra)
    let total = c + r + a;
    if(total > 100) {
        // Se passar de 100, a lógica simples é impedir ou diminuir os outros (por enquanto vamos só travar visualmente no console, depois melhoramos a UX)
        // Para o Dia 3, vamos deixar o usuário se virar, mas garantir que o Fold não fique negativo
    }
    let f = 100 - total;
    if(f < 0) f = 0;

    // Atualiza na tela
    document.getElementById('pct-call').value = c;
    document.getElementById('pct-raise').value = r;
    document.getElementById('pct-allin').value = a;
    document.getElementById('pct-fold').value = f;
    
    // Atualiza sliders (posição visual)
    // Nota: Precisaria pegar os elementos slider pelo ID ou classe especifica, mas como são genéricos:
    // Vamos deixar o input number controlar por enquanto.
}

// Função que aplica a cor na célula
function applyBrush(hand) {
    let c = parseInt(document.getElementById('pct-call').value)||0;
    let r = parseInt(document.getElementById('pct-raise').value)||0;
    let a = parseInt(document.getElementById('pct-allin').value)||0;
    let f = 100 - (c+r+a);

    // Salva na memória
    rangeData[hand] = {fold:f, call:c, raise:r, allin:a};

    // Pinta o fundo (CSS Gradient)
    const bg = document.querySelector(`.cell[data-hand="${hand}"] .cell-bg`);
    
    // Lógica do Gradiente: Allin -> Raise -> Call -> Transparente (Fold)
    let p1 = a;          // Fim do Allin
    let p2 = p1 + r;     // Fim do Raise
    let p3 = p2 + c;     // Fim do Call
    
    bg.style.background = `linear-gradient(to right, 
        #8b5cf6 0% ${p1}%, 
        #ef4444 ${p1}% ${p2}%, 
        #10b981 ${p2}% ${p3}%, 
        transparent ${p3}% 100%)`;
}