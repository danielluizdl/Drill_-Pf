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