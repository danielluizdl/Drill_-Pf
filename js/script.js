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

function initHandMatrix() {
    const m = document.getElementById('hand-matrix');
    if(!m) return; // Segurança
    m.innerHTML = ''; 

    // Loop Duplo para criar 13x13 = 169 células
    for(let i=0; i<13; i++){
        for(let j=0; j<13; j++){
            // Lógica do Poker:
            // Se i == j: Par (AA, KK)
            // Se i < j:  Suited (AKs) - "s" de suited
            // Se i > j:  Offsuit (KAo) - "o" de offsuit
            let hand = '';
            if(i === j) {
                hand = RANKS[i] + RANKS[j]; 
            } else if (i < j) {
                hand = RANKS[i] + RANKS[j] + 's';
            } else {
                hand = RANKS[j] + RANKS[i] + 'o';
            }
            
            // Criar o elemento HTML
            let div = document.createElement('div');
            div.className = 'cell';
            div.innerText = hand;
            
            // Adicionar na tela
            m.appendChild(div);
        }
    }
    console.log("Matriz 13x13 gerada com sucesso.");
}