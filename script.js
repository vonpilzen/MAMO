document.addEventListener('DOMContentLoaded', () => {
    // URL de tu Google Sheet (Publicada como CSV)
    const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRxBNfc5-Gfgq-UwWvjp7bXD681uOfhQLtn9BUj7K2E220dNIGq74ccVKBQXsbUNuys9HG5yDU4Tols/pub?output=csv';

    let allData = [];
    let itemsToShow = 24;

    // Mapa de banderas (puedes ampliarlo)
    const flagCodes = { "afghanistan": "af", "argentina": "ar", "usa": "us", "russia": "ru", "spain": "es", "uk": "gb", "yugoslavia": "rs" };

    async function init() {
        const response = await fetch(SPREADSHEET_URL);
        const csvText = await response.text();
        allData = parseCSV(csvText);
        
        populateSelectors();
        renderGrid();
    }

    // Parser robusto que ignora comas dentro de comillas
    function parseCSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        return lines.slice(1).map(line => {
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            let obj = {};
            headers.forEach((h, i) => {
                let val = values ? values[i]?.replace(/"/g, '').trim() : '';
                obj[h] = val;
            });
            // Limpieza extra
            obj.CleanName = obj.Name?.split(' - ')[0].replace(/_.*_/g, '').trim();
            obj.Country = obj.Country?.replace(/_.*_/g, '').trim();
            return obj;
        });
    }

    function populateSelectors() {
        const countries = [...new Set(allData.map(u => u.Country))].sort();
        const types = [...new Set(allData.map(u => u.Type))].sort();

        const countrySelect = document.getElementById('country-filter');
        const typeSelect = document.getElementById('type-filter');

        countries.forEach(c => countrySelect.innerHTML += `<option value="${c}">${c}</option>`);
        types.forEach(t => typeSelect.innerHTML += `<option value="${t}">${t}</option>`);
    }

    function renderGrid() {
        const grid = document.getElementById('grid');
        const searchTerm = document.getElementById('search').value.toLowerCase();
        const countryTerm = document.getElementById('country-filter').value;
        const typeTerm = document.getElementById('type-filter').value;

        const filtered = allData.filter(u => {
            const matchText = u.CleanName.toLowerCase().includes(searchTerm);
            const matchCountry = countryTerm === 'all' || u.Country === countryTerm;
            const matchType = typeTerm === 'all' || u.Type === typeTerm;
            return matchText && matchCountry && matchType;
        });

        grid.innerHTML = filtered.slice(0, itemsToShow).map(u => `
            <div class="card" onclick="openDetails('${u.ID}')">
                <div class="card-head">
                    <img src="https://flagcdn.com/w40/${flagCodes[u.Country.toLowerCase()] || 'un'}.png" class="flag">
                    <span class="type-tag">${u.Type}</span>
                </div>
                <h3>${u.CleanName}</h3>
                <p>${u.Country}</p>
            </div>
        `).join('');
    }

    // Función para Wikipedia y Detalles
    window.openDetails = async (id) => {
        const unit = allData.find(u => u.ID == id);
        const modal = document.getElementById('modal');
        const content = document.getElementById('modal-body');
        
        modal.style.display = 'block';
        content.innerHTML = `<h2>Cargando Inteligencia...</h2>`;

        const wikiRes = await fetch(`https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(unit.CleanName)}`);
        const wiki = await wikiRes.json();

        content.innerHTML = `
            <div class="modal-grid">
                <div class="wiki-info">
                    ${wiki.thumbnail ? `<img src="${wiki.thumbnail.source}" class="wiki-img">` : ''}
                    <p>${wiki.extract || 'No se encontró descripción detallada.'}</p>
                </div>
                <div class="tech-data">
                    <h2>${unit.CleanName}</h2>
                    <p><strong>País:</strong> ${unit.Country}</p>
                    <div class="systems">
                        <h4>Sistemas (Links a Wikipedia)</h4>
                        <ul>${renderSystems(unit.Sensors)}</ul>
                    </div>
                    <h4>Notas Personales</h4>
                    <textarea id="note-${id}" onchange="localStorage.setItem('note-${id}', this.value)">${localStorage.getItem('note-'+id) || ''}</textarea>
                </div>
            </div>
        `;
    };

    function renderSystems(text) {
        if(!text || text === "N/A") return "<li>No disponible</li>";
        return text.split('|').map(s => {
            const name = s.trim().split('-')[0];
            return `<li>${s.trim()} <a href="https://es.wikipedia.org/wiki/${encodeURIComponent(name)}" target="_blank"><i class="fab fa-wikipedia-w"></i></a></li>`;
        }).join('');
    }

    // Eventos
    document.getElementById('search').oninput = renderGrid;
    document.getElementById('country-filter').onchange = renderGrid;
    document.getElementById('type-filter').onchange = renderGrid;
    document.querySelector('.close').onclick = () => document.getElementById('modal').style.display = 'none';

    init();
});
