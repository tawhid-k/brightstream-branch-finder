const API_URL = 'https://cg.optimizely.com/content/v2?auth=iQEyR1jR1cBG5mnLQoRotCyNmKUgaO0DT5cRbJPKA3oZGGQo';


// GRAPHQL_QUERY is now generated dynamically inside fetchBranches

let currentPage = 1;
const PAGE_SIZE = 30;
let totalBranches = 0;

let allBranches = [];
let map = null;
let markersGroup = null;
let userLocation = null;

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const locateBtn = document.getElementById('locateBtn');
const listViewBtn = document.getElementById('listViewBtn');
const mapViewBtn = document.getElementById('mapViewBtn');
const branchList = document.getElementById('branchList');
const mapContainer = document.getElementById('mapContainer');
const resultsCount = document.getElementById('resultsCount');
const branchModal = document.getElementById('branchModal');
const modalClose = document.getElementById('modalClose');
const modalBody = document.getElementById('modalBody');


async function initApp() {
    try {
        initMap();
        await fetchBranches();
        renderBranches(allBranches);
        setupEventListeners();
    } catch (error) {
        console.error("Error initializing app:", error);
        showErrorState();
    }
}

function initMap() {
    map = L.map('map').setView([40.7128, -74.0060], 4);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    markersGroup = L.layerGroup().addTo(map);
}


async function fetchBranches() {
    resultsCount.textContent = "Loading branches...";

    const skip = (currentPage - 1) * PAGE_SIZE;
    const query = `
    query {
      Branch(limit: ${PAGE_SIZE}, skip: ${skip}) {
        total
        items {
          Name
          City
          Street
          Coordinates
          Phone
          Email
        }
      }
    }
    `;

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { data, errors } = await response.json();

    if (errors) {
        throw new Error(errors[0].message);
    }

    if (data && data.Branch && data.Branch.items) {
        allBranches = data.Branch.items;
        totalBranches = data.Branch.total || 0;
    } else {
        allBranches = [];
        totalBranches = 0;
    }

    updatePaginationUI();
}

function updatePaginationUI() {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (prevBtn && nextBtn) {
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = (currentPage * PAGE_SIZE) >= totalBranches;
    }
}


function renderBranches(branches) {
    branchList.innerHTML = '';

    if (branches.length === 0) {
        resultsCount.textContent = `No branches found.`;
        branchList.innerHTML = `
            <div class="empty-state">
                <h3>No branches match your search</h3>
                <p>Try adjusting your search terms.</p>
            </div>
        `;
        updateMapMarkers([]);
        return;
    }

    const query = searchInput.value.toLowerCase().trim();
    if (query || userLocation) {
        resultsCount.textContent = `Showing ${branches.length} branch${branches.length !== 1 ? 'es' : ''}`;
    } else {
        const start = (currentPage - 1) * PAGE_SIZE + 1;
        const end = Math.min(currentPage * PAGE_SIZE, totalBranches);
        resultsCount.textContent = `Showing ${start}–${end} of ${totalBranches} branches`;
    }

    branches.forEach(branch => {
        const card = document.createElement('div');
        card.className = 'branch-card';

        let distanceHtml = '';
        if (branch.distance !== undefined) {
            distanceHtml = `<span class="branch-distance">${branch.distance.toFixed(1)} mi</span>`;
        }

        card.innerHTML = `
            <div class="branch-city">
                <span>${branch.City || 'Branch'}</span>
                ${distanceHtml}
            </div>
            <h3 class="branch-name">${branch.Name}</h3>
            
            <div class="branch-detail">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span>${branch.Street || ''}<br/>${branch.City || ''}</span>
            </div>
            
            ${branch.Phone ? `
            <div class="branch-detail">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span>${branch.Phone}</span>
            </div>
            ` : ''}
            
            ${branch.Email ? `
            <div class="branch-detail">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                <span>${branch.Email}</span>
            </div>
            ` : ''}
        `;

        card.addEventListener('click', () => {
            openBranchModal(branch);
            if (branch.Coordinates && map) {
                const [lat, lng] = branch.Coordinates.split(',');
                map.setView([parseFloat(lat), parseFloat(lng)], 15);
            }
        });

        branchList.appendChild(card);
    });

    updateMapMarkers(branches);
}

function updateMapMarkers(branches) {
    if (!markersGroup || !map) return;

    markersGroup.clearLayers();
    const bounds = [];

    branches.forEach(branch => {
        if (branch.Coordinates) {
            const [lat, lng] = branch.Coordinates.split(',');
            const marker = L.marker([parseFloat(lat), parseFloat(lng)]);

            marker.bindTooltip(branch.Name);
            marker.on('click', () => {
                openBranchModal(branch);
            });

            markersGroup.addLayer(marker);
            bounds.push([parseFloat(lat), parseFloat(lng)]);
        }
    });

    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
}

function openBranchModal(branch) {
    let mapLink = `https://maps.google.com/?q=${encodeURIComponent(`${branch.Street}, ${branch.City}`)}`;
    if (userLocation && branch.Coordinates) {
        const [lat, lng] = branch.Coordinates.split(',');
        mapLink = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${lat},${lng}`;
    } else if (branch.Coordinates) {
        mapLink = `https://maps.google.com/?q=${branch.Coordinates.split(',').join(',')}`;
    }

    modalBody.innerHTML = `
        <div class="branch-city">${branch.City || 'Branch'}</div>
        <h3 class="branch-name">${branch.Name}</h3>
        
        <div class="branch-detail">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>${branch.Street || ''}<br/>${branch.City || ''}</span>
        </div>
        
        ${branch.Phone ? `
        <div class="branch-detail">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            <a href="tel:${branch.Phone}">${branch.Phone}</a>
        </div>
        ` : ''}
        
        ${branch.Email ? `
        <div class="branch-detail">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <a href="mailto:${branch.Email}">${branch.Email}</a>
        </div>
        ` : ''}
        
        <div class="modal-actions">
            <a href="${mapLink}" target="_blank" rel="noopener noreferrer" class="btn-primary">
                Get Directions
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </a>
        </div>
    `;

    branchModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}


function setupEventListeners() {
    searchInput.addEventListener('keyup', (e) => {
        filterBranches();
    });

    searchBtn.addEventListener('click', () => {
        filterBranches();
    });

    locateBtn.addEventListener('click', handleGeolocation);

    listViewBtn.addEventListener('click', () => switchView('list'));
    mapViewBtn.addEventListener('click', () => switchView('map'));

    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', async () => {
            if (currentPage > 1) {
                currentPage--;
                await fetchBranches();
                filterBranches();
                document.querySelector('.search-section').scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', async () => {
            if ((currentPage * PAGE_SIZE) < totalBranches) {
                currentPage++;
                await fetchBranches();
                filterBranches();
                document.querySelector('.search-section').scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    modalClose.addEventListener('click', closeModal);
    branchModal.addEventListener('click', (e) => {
        if (e.target === branchModal) {
            closeModal();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !branchModal.classList.contains('hidden')) {
            closeModal();
        }
    });
}

function closeModal() {
    branchModal.classList.add('hidden');
    document.body.style.overflow = '';
}

function switchView(view) {
    if (view === 'list') {
        listViewBtn.classList.add('active');
        mapViewBtn.classList.remove('active');
        branchList.classList.remove('hidden');
        mapContainer.classList.add('hidden');
    } else if (view === 'map') {
        mapViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        mapContainer.classList.remove('hidden');
        branchList.classList.add('hidden');

        // Critical: leaflet needs to know container size changed from display:none to block
        if (map) {
            setTimeout(() => {
                map.invalidateSize();
                if (allBranches.length > 0) {
                    updateMapMarkers(allBranches.filter(b => b.hidden !== true)); // filter applied
                }
            }, 10);
        }
    }
}

function handleGeolocation() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    locateBtn.innerHTML = '<span class="spinner" style="display:inline-block;width:20px;height:20px;border:2px solid;border-radius:50%;border-top-color:transparent;animation:spin 1s linear infinite;"></span>';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            // Calculate distances
            allBranches.forEach(branch => {
                if (branch.Coordinates) {
                    const [lat, lng] = branch.Coordinates.split(',');
                    branch.distance = calculateHaversineDistance(
                        userLocation.lat, userLocation.lng,
                        parseFloat(lat), parseFloat(lng)
                    );
                }
            });

            // Sort by distance
            allBranches.sort((a, b) => {
                if (a.distance === undefined) return 1;
                if (b.distance === undefined) return -1;
                return a.distance - b.distance;
            });

            locateBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>';

            // Pan map to user
            if (map) {
                const redIcon = new L.Icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                L.marker([userLocation.lat, userLocation.lng], { icon: redIcon }).addTo(map)
                    .bindPopup("You are here").openPopup();
            }

            filterBranches();
        },
        (error) => {
            console.error("Error getting location:", error);
            alert("Unable to retrieve your location.");
            locateBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>';
        }
    );
}

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function filterBranches() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
        renderBranches(allBranches);
        return;
    }

    const filtered = allBranches.filter(branch => {
        const nameMatch = branch.Name && branch.Name.toLowerCase().includes(query);
        const cityMatch = branch.City && branch.City.toLowerCase().includes(query);
        const streetMatch = branch.Street && branch.Street.toLowerCase().includes(query);

        const isMatch = nameMatch || cityMatch || streetMatch;
        branch.hidden = !isMatch;
        return isMatch;
    });

    renderBranches(filtered);
}

function showErrorState() {
    resultsCount.textContent = "Error loading branches.";
    branchList.innerHTML = `
        <div class="error-state">
            <h3>Unable to load branches</h3>
            <p>Please check your connection or try again later.</p>
        </div>
    `;
}

// Boot the app
document.addEventListener('DOMContentLoaded', initApp);
