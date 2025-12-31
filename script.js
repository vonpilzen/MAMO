const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRxBNfc5-Gfgq-UwWvjp7bXD681uOfhQLtn9BUj7K2E220dNIGq74ccVKBQXsbUNuys9HG5yDU4Tols/pub?output=csv'; 
let database = [];

const flagCodes = { "Afghanistan": "af", "Argentina": "ar", "USA": "us", "Russia": "ru", "Spain": "es", "UK": "gb" };

async function init() {
    const resp = await fetch(CSV_URL);
    const text = await resp.text();
    database = parseCSV(text);
    render(database);

    document.getElementById('search').oninput = filter;
    document.getElementById('cat-filter').onchange = filter;
}

function parseCSV(text) {
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        // Regex para respetar comas dentro de comillas
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!values) return null;
        let obj = {};
        headers.forEach((h, i) => obj[h.trim()] = values[i]?.replace(/"/g, '').trim());
        return obj;
    }).filter(v => v);
}

function render(data) {
    const grid = document.getElementById('grid');
    grid.innerHTML = data.map(u => `
        <div class="card" onclick="showDetail('${u.ID}')">
            <img src="https://flagcdn.com/w40/${flagCodes[u.Clean_Country] || 'un'}.png" class="flag">
            <strong>${u.Clean_Name}</strong>
            <p><small>${u.Category} | ${u.Year || 'N/A'}</small></p>
        </div>
    `).join('');
}

async function showDetail(id) {
    const u = database.find(x => x.ID === id);
    const modal = document.getElementById('modal');
    const content = document.getElementById('modal-details');
    const savedObs = localStorage.getItem(`obs-${id}`) || "";

    content.innerHTML = `<h2>${u.Clean_Name}</h2><div id="wiki-info">Cargando Wikipedia...</div>
        <h3>Especificaciones</h3>
        <p>Tipo: ${u.Type} | Año: ${u.Year}</p>
        <div class="systems">
            <h4>Sensores y Armas</h4>
            <p>${u.Sensors || 'Ninguno'}</p>
            <p>${u.Weapons || 'Ninguno'}</p>
        </div>
        <h4>Observaciones Personalizadas</h4>
        <textarea id="obs-text" class="obs-box" rows="4">${savedObs}</textarea>
        <button onclick="saveObs('${id}')">Guardar Observación</button>`;
    
    modal.style.display = "block";
    loadWiki(u.Clean_Name);
}

async function loadWiki(name) {
    const container = document.getElementById('wiki-info');
    try {
        const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
        const data = await res.json();
        container.innerHTML = `
            ${data.thumbnail ? `<img src="${data.thumbnail.source}" class="wiki-img">` : ''}
            <p>${data.extract || 'No se encontró resumen en Wikipedia.'}</p>
            <a href="${data.content_urls?.desktop.page}" target="_blank">Ver más en Wikipedia</a>`;
    } catch { container.innerHTML = "Información de Wikipedia no disponible."; }
}

function saveObs(id) {
    localStorage.setItem(`obs-${id}`, document.getElementById('obs-text').value);
    alert("Observación guardada.");
}

function filter() {
    const q = document.getElementById('search').value.toLowerCase();
    const c = document.getElementById('cat-filter').value;
    const f = database.filter(u => 
        (u.Clean_Name.toLowerCase().includes(q) || u.Clean_Country.toLowerCase().includes(q)) &&
        (c === 'all' || u.Category === c)
    );
    render(f);
}

document.querySelector('.close-btn').onclick = () => document.getElementById('modal').style.display = "none";
init();