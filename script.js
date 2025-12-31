document.addEventListener('DOMContentLoaded', () => {
    const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRxBNfc5-Gfgq-UwWvjp7bXD681uOfhQLtn9BUj7K2E220dNIGq74ccVKBQXsbUNuys9HG5yDU4Tols/pub?output=csv';
    
    let allData = [];
    let filteredData = [];
    let itemsToShow = 20;

    const grid = document.getElementById('results-grid');
    const loadMoreBtn = document.getElementById('load-more');
    const searchInput = document.getElementById('main-search');
    const filterSelect = document.getElementById('category-filter');
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modal-body');

    // 1. Cargar Datos
    async function fetchData() {
        try {
            const response = await fetch(SPREADSHEET_URL);
            const csvText = await response.text();
            allData = parseCSV(csvText);
            filteredData = [...allData];
            renderGrid();
        } catch (error) {
            console.error("Error cargando DB:", error);
        }
    }

    function parseCSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            let obj = {};
            headers.forEach((h, i) => obj[h] = values ? values[i]?.replace(/"/g, '').trim() : '');
            return obj;
        });
    }

    // 2. Renderizado con Límite (Carga Progresiva)
    function renderGrid(append = false) {
        const chunk = filteredData.slice(0, itemsToShow);
        
        grid.innerHTML = chunk.map(unit => `
            <div class="card" onclick="openDetails('${unit.ID}')">
                <div class="card-header">
                    <img src="https://flagcdn.com/w40/${getFlagCode(unit.Country)}.png" class="flag" alt="${unit.Country}">
                    <span class="type-tag">${unit.Type || 'Unit'}</span>
                </div>
                <h3>${unit.Clean_Name || unit.Name}</h3>
                <p class="year-tag">${unit.Year || ''}</p>
            </div>
        `).join('');

        loadMoreBtn.style.display = itemsToShow < filteredData.length ? 'block' : 'none';
    }

    // 3. Detalles y Wikipedia
    window.openDetails = async (id) => {
        const unit = allData.find(u => u.ID === id);
        const savedObs = localStorage.getItem(`obs-${id}`) || "";
        
        modalBody.innerHTML = `
            <div class="modal-header">
                <h2>${unit.Clean_Name || unit.Name}</h2>
                <img src="https://flagcdn.com/w80/${getFlagCode(unit.Country)}.png" class="modal-flag">
            </div>
            <div id="wiki-info" class="wiki-container">Buscando en Wikipedia...</div>
            
            <div class="systems-grid">
                <div>
                    <h4><i class="fas fa-microchip"></i> Sensores</h4>
                    <ul class="sys-list">${renderSystems(unit.Sensors)}</ul>
                </div>
                <div>
                    <h4><i class="fas fa-bomb"></i> Armamento</h4>
                    <ul class="sys-list">${renderSystems(unit.Weapons)}</ul>
                </div>
            </div>

            <div class="obs-section">
                <h4><i class="fas fa-pen"></i> Observaciones</h4>
                <textarea id="obs-input" placeholder="Añadir notas tácticas...">${savedObs}</textarea>
                <button class="btn-save" onclick="saveObservation('${id}')">Guardar</button>
            </div>
        `;
        modal.style.display = 'block';
        fetchWiki(unit.Clean_Name || unit.Name);
    };

    function renderSystems(text) {
        if (!text || text === "N/A") return "<li>No disponible</li>";
        return text.split('|').map(sys => {
            const name = sys.trim();
            return `<li>${name} <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(name)}" target="_blank" class="wiki-link"><i class="fab fa-wikipedia-w"></i></a></li>`;
        }).join('');
    }

    async function fetchWiki(query) {
        const container = document.getElementById('wiki-info');
        try {
            const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.extract) {
                container.innerHTML = `
                    <div class="wiki-content">
                        ${data.thumbnail ? `<img src="${data.thumbnail.source}" class="wiki-img">` : ''}
                        <p>${data.extract}</p>
                    </div>
                `;
            } else { container.innerHTML = "Sin datos en Wikipedia."; }
        } catch { container.innerHTML = "Error cargando Wikipedia."; }
    }

    // 4. Utilidades
    window.saveObservation = (id) => {
        const val = document.getElementById('obs-input').value;
        localStorage.setItem(`obs-${id}`, val);
        alert("Observación guardada localmente.");
    };

    function getFlagCode(country) {
        const codes = { "Afghanistan": "af", "Argentina": "ar", "USA": "us", "Russia": "ru", "Spain": "es", "UK": "gb" };
        return codes[country] || "un";
    }

    // 5. Eventos
    loadMoreBtn.onclick = () => { itemsToShow += 20; renderGrid(); };
    
    searchInput.oninput = () => {
        const val = searchInput.value.toLowerCase();
        filteredData = allData.filter(u => 
            (u.Name + u.Country + u.Type).toLowerCase().includes(val)
        );
        itemsToShow = 20;
        renderGrid();
    };

    document.querySelector('.close-btn').onclick = () => modal.style.display = 'none';
    
    fetchData();
});
