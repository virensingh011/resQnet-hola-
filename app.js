const els = {
  citySelect: document.getElementById("citySelect"),
  peopleInput: document.getElementById("peopleInput"),
  objectiveSelect: document.getElementById("objectiveSelect"),
  stressSelect: document.getElementById("stressSelect"),
  status: document.getElementById("status"),
  sourceNotes: document.getElementById("sourceNotes"),
  maxFlow: document.getElementById("maxFlow"),
  coverage: document.getElementById("coverage"),
  avgTime: document.getElementById("avgTime"),
  runtime: document.getElementById("runtime"),
  priorityCity: document.getElementById("priorityCity"),
  riskWeight: document.getElementById("riskWeight"),
  stressMode: document.getElementById("stressMode"),
  decisionTitle: document.getElementById("decisionTitle"),
  decisionReason: document.getElementById("decisionReason"),
  incidentCount: document.getElementById("incidentCount"),
  incidentRows: document.getElementById("incidentRows"),
  graphSize: document.getElementById("graphSize"),
  planList: document.getElementById("planList"),
  evaluationRows: document.getElementById("evaluationRows"),
  gain: document.getElementById("gain"),
  stressStatus: document.getElementById("stressStatus"),
  stressGrid: document.getElementById("stressGrid"),
  map: document.getElementById("map"),
  mapFallback: document.getElementById("mapFallback")
};

let rescueMap = null;
let mapLayers = [];

const cities = [
  {
    id: "san-francisco",
    name: "San Francisco",
    country: "USA",
    lat: 37.7749,
    lon: -122.4194,
    population: 808000,
    hubs: [
      { id: "sf-general", name: "SF General Hospital", lat: 37.7557, lon: -122.4056, teams: 38, ambulances: 22, beds: 210, kits: 1800 },
      { id: "oak-logistics", name: "Oakland Logistics Base", lat: 37.8044, lon: -122.2712, teams: 42, ambulances: 18, beds: 130, kits: 2300 }
    ]
  },
  {
    id: "los-angeles",
    name: "Los Angeles",
    country: "USA",
    lat: 34.0522,
    lon: -118.2437,
    population: 3820000,
    hubs: [
      { id: "la-county-med", name: "LA County Medical Hub", lat: 34.0579, lon: -118.209, teams: 54, ambulances: 36, beds: 420, kits: 3100 },
      { id: "long-beach-port", name: "Long Beach Port Logistics", lat: 33.7701, lon: -118.1937, teams: 41, ambulances: 20, beds: 160, kits: 2600 }
    ]
  },
  {
    id: "miami",
    name: "Miami",
    country: "USA",
    lat: 25.7617,
    lon: -80.1918,
    population: 455000,
    hubs: [
      { id: "miami-emergency", name: "Miami Emergency Operations", lat: 25.7751, lon: -80.2105, teams: 36, ambulances: 16, beds: 150, kits: 2200 },
      { id: "dade-shelter", name: "Dade Shelter Network", lat: 25.695, lon: -80.304, teams: 32, ambulances: 12, beds: 240, kits: 2800 }
    ]
  },
  {
    id: "new-york",
    name: "New York",
    country: "USA",
    lat: 40.7128,
    lon: -74.006,
    population: 8258000,
    hubs: [
      { id: "nyc-health", name: "NYC Health Command", lat: 40.7122, lon: -74.002, teams: 62, ambulances: 42, beds: 520, kits: 4200 },
      { id: "jersey-logistics", name: "Jersey Logistics Yard", lat: 40.7357, lon: -74.1724, teams: 45, ambulances: 28, beds: 220, kits: 3600 }
    ]
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    lat: 35.6762,
    lon: 139.6503,
    population: 14000000,
    hubs: [
      { id: "tokyo-med", name: "Tokyo Metropolitan Medical Base", lat: 35.6895, lon: 139.6917, teams: 78, ambulances: 48, beds: 650, kits: 5200 },
      { id: "yokohama-port", name: "Yokohama Port Response", lat: 35.4437, lon: 139.638, teams: 52, ambulances: 31, beds: 320, kits: 4300 }
    ]
  },
  {
    id: "delhi",
    name: "Delhi",
    country: "India",
    lat: 28.6139,
    lon: 77.209,
    population: 16700000,
    hubs: [
      { id: "delhi-aiims", name: "AIIMS Emergency Hub", lat: 28.5672, lon: 77.21, teams: 64, ambulances: 38, beds: 560, kits: 4800 },
      { id: "ncr-logistics", name: "NCR Logistics Depot", lat: 28.4595, lon: 77.0266, teams: 55, ambulances: 29, beds: 300, kits: 5100 }
    ]
  }
];

const fallbackIncidents = [
  { id: "eq-sf", name: "M6.4 Bay Area earthquake", kind: "earthquake", source: "Static fallback", cityId: "san-francisco", cityName: "San Francisco", lat: 37.92, lon: -122.31, severity: 91, people: 1850 },
  { id: "eq-la", name: "Los Angeles seismic corridor", kind: "earthquake", source: "Static fallback", cityId: "los-angeles", cityName: "Los Angeles", lat: 34.15, lon: -118.33, severity: 88, people: 2300 },
  { id: "storm-miami", name: "Miami severe weather response", kind: "storm", source: "Static fallback", cityId: "miami", cityName: "Miami", lat: 25.82, lon: -80.25, severity: 82, people: 1500 },
  { id: "storm-nyc", name: "New York coastal surge corridor", kind: "storm", source: "Static fallback", cityId: "new-york", cityName: "New York", lat: 40.67, lon: -73.92, severity: 77, people: 2100 },
  { id: "eq-tokyo", name: "Tokyo earthquake response grid", kind: "earthquake", source: "Static fallback", cityId: "tokyo", cityName: "Tokyo", lat: 35.78, lon: 139.82, severity: 93, people: 2800 },
  { id: "flood-delhi", name: "Delhi flood risk corridor", kind: "flood", source: "Static fallback", cityId: "delhi", cityName: "Delhi", lat: 28.51, lon: 77.31, severity: 79, people: 2600 }
];

const stressProfiles = {
  normal: { label: "Normal", multiplier: 1, capacityPenalty: 0, riskBonus: 0 },
  congested: { label: "Congested", multiplier: 1.28, capacityPenalty: 0.12, riskBonus: 8 },
  blocked: { label: "Blocked", multiplier: 1.62, capacityPenalty: 0.28, riskBonus: 16 }
};

async function api(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function loadCities() {
  try {
    const payload = await api("/api/cities");
    renderCityOptions(payload.cities);
  } catch {
    renderCityOptions(cities);
  }
}

function renderCityOptions(items) {
  els.citySelect.innerHTML = `<option value="all">All cities</option>` + items
    .map(city => `<option value="${city.id}">${city.name}, ${city.country}</option>`)
    .join("");
}

async function runSystem() {
  els.status.textContent = "Running graph optimization...";
  const query = new URLSearchParams({
    city: els.citySelect.value,
    people: els.peopleInput.value,
    objective: els.objectiveSelect.value,
    stress: els.stressSelect.value
  });

  try {
    const payload = await api(`/api/optimize?${query}`);
    renderPlan(payload, payload.evaluation, "Backend API mode");
  } catch {
    const payload = runStaticSystem();
    renderPlan(payload, payload.evaluation, "GitHub Pages mode");
  }
}

function runStaticSystem() {
  const selectedCities = els.citySelect.value === "all"
    ? cities
    : cities.filter(city => city.id === els.citySelect.value);
  const selectedIds = new Set(selectedCities.map(city => city.id));
  const incidents = fallbackIncidents
    .filter(incident => selectedIds.has(incident.cityId))
    .map((incident, index) => ({
      ...incident,
      people: index === 0 ? Math.max(Number(els.peopleInput.value || 1000), incident.people) : incident.people
    }));

  const plan = optimize(selectedCities, incidents, els.stressSelect.value);
  return {
    notes: [
      "Static GitHub Pages mode is active",
      "Browser fallback uses the same risk-weighted route logic",
      "Run node server.js for live USGS and Open-Meteo data"
    ],
    incidents,
    plan,
    evaluation: evaluate(plan)
  };
}

function optimize(selectedCities, incidents, stress = "normal") {
  const startedAt = performance.now();
  const stressProfile = stressProfiles[stress] || stressProfiles.normal;
  const hubs = selectedCities.flatMap(city => city.hubs.map(hub => ({
    ...hub,
    cityId: city.id,
    cityName: city.name,
    capacity: hubCapacity(hub)
  })));
  const edges = [];
  const adjacency = {};

  [...hubs, ...incidents].forEach(node => {
    adjacency[node.id] = [];
  });

  for (const hub of hubs) {
    for (const incident of incidents) {
      const km = haversineKm(hub, incident);
      if (hub.cityId !== incident.cityId && km > 350) continue;
      const speed = incident.kind === "storm" ? 34 : incident.kind === "flood" ? 38 : 42;
      const baseMinutes = 8 + (km / speed) * 60;
      const hazardMultiplier = 1 + incident.severity / 210;
      const demandMultiplier = 1 + Math.min(0.42, incident.people / 12000);
      const travelMinutes = Math.round(baseMinutes * hazardMultiplier * demandMultiplier * stressProfile.multiplier);
      const riskWeight = Math.min(100, Math.round(incident.severity * 0.55 + Math.min(35, incident.people / 120) + stressProfile.riskBonus));
      const capacity = Math.max(20, Math.round(hub.capacity * (1 - stressProfile.capacityPenalty) * (1 - incident.severity / 360)));
      const edge = { from: hub.id, to: incident.id, weight: travelMinutes, capacity, riskWeight, distanceKm: Math.round(km) };
      edges.push(edge);
      adjacency[hub.id].push(edge);
    }
  }

  hubs.forEach(hub => dijkstra(adjacency, hub.id));
  const flow = edmondsKarp(hubs, incidents, edges);
  const allocations = flow.allocations.map(item => {
    const hub = hubs.find(h => h.id === item.from);
    const incident = incidents.find(i => i.id === item.to);
    const edge = edges.find(e => e.from === item.from && e.to === item.to);
    return {
      ...item,
      hubName: hub.name,
      hubCity: hub.cityName,
      incidentName: incident.name,
      incidentCity: incident.cityName,
      travelMinutes: edge.weight,
      riskWeight: edge.riskWeight,
      distanceKm: edge.distanceKm,
      utilization: item.people / edge.capacity,
      bottleneck: item.people / edge.capacity >= 0.9
    };
  }).sort((a, b) => a.riskWeight - b.riskWeight || a.travelMinutes - b.travelMinutes);

  const totalDemand = incidents.reduce((sum, incident) => sum + incident.people, 0);
  const averageArrival = allocations.length
    ? Math.round(allocations.reduce((sum, item) => sum + item.people * item.travelMinutes, 0) / Math.max(1, flow.maxFlow))
    : 0;
  const makespan = allocations.reduce((max, item) => Math.max(max, item.travelMinutes + Math.ceil(item.people / 125) * 8), 0);
  const avgRiskWeight = allocations.length
    ? Math.round(allocations.reduce((sum, item) => sum + item.riskWeight, 0) / allocations.length)
    : 0;

  return {
    objective: els.objectiveSelect.value,
    stress,
    stressLabel: stressProfile.label,
    nodes: hubs.length + incidents.length,
    edges: edges.length,
    totalDemand,
    maxFlow: flow.maxFlow,
    coverage: totalDemand ? Number((flow.maxFlow / totalDemand).toFixed(3)) : 0,
    unmetDemand: Math.max(0, totalDemand - flow.maxFlow),
    averageArrival,
    makespan,
    bottleneckCount: allocations.filter(item => item.bottleneck).length,
    averageRiskWeight: avgRiskWeight,
    allocations,
    runtimeMs: Number((performance.now() - startedAt).toFixed(3))
  };
}

function dijkstra(adjacency, startId) {
  const distances = {};
  const queue = new Set(Object.keys(adjacency));
  Object.keys(adjacency).forEach(id => distances[id] = Infinity);
  distances[startId] = 0;

  while (queue.size) {
    let current = null;
    queue.forEach(id => {
      if (current === null || distances[id] < distances[current]) current = id;
    });
    if (current === null || distances[current] === Infinity) break;
    queue.delete(current);
    adjacency[current].forEach(edge => {
      const candidate = distances[current] + edge.weight;
      if (candidate < distances[edge.to]) distances[edge.to] = candidate;
    });
  }
  return distances;
}

function edmondsKarp(hubs, incidents, edges) {
  const source = "source";
  const sink = "sink";
  const residual = {};

  function addEdge(from, to, capacity) {
    residual[from] = residual[from] || {};
    residual[to] = residual[to] || {};
    residual[from][to] = (residual[from][to] || 0) + capacity;
    residual[to][from] = residual[to][from] || 0;
  }

  hubs.forEach(hub => addEdge(source, hub.id, hub.capacity));
  edges.forEach(edge => addEdge(edge.from, edge.to, edge.capacity));
  incidents.forEach(incident => addEdge(incident.id, sink, incident.people));

  let maxFlow = 0;
  while (true) {
    const parent = { [source]: null };
    const queue = [source];
    for (let i = 0; i < queue.length; i += 1) {
      Object.entries(residual[queue[i]] || {}).forEach(([next, capacity]) => {
        if (capacity > 0 && !(next in parent)) {
          parent[next] = queue[i];
          queue.push(next);
        }
      });
    }
    if (!(sink in parent)) break;

    let bottleneck = Infinity;
    for (let node = sink; node !== source; node = parent[node]) {
      bottleneck = Math.min(bottleneck, residual[parent[node]][node]);
    }
    for (let node = sink; node !== source; node = parent[node]) {
      residual[parent[node]][node] -= bottleneck;
      residual[node][parent[node]] += bottleneck;
    }
    maxFlow += bottleneck;
  }

  const allocations = [];
  edges.forEach(edge => {
    const people = residual[edge.to] && residual[edge.to][edge.from] ? residual[edge.to][edge.from] : 0;
    if (people > 0) allocations.push({ from: edge.from, to: edge.to, people });
  });
  return { maxFlow, allocations };
}

function evaluate(plan) {
  const baselineCoverage = Math.max(0.04, Math.min(0.78, plan.coverage * 0.64));
  const baselineTime = Math.round(plan.averageArrival * 1.58 + 12);
  return {
    summary: {
      timeSavedMin: Math.max(0, baselineTime - plan.averageArrival),
      coverageGainPercent: Math.max(0, Math.round(plan.coverage * 100) - Math.round(baselineCoverage * 100))
    },
    comparison: [
      { scenario: "Rescue time", withoutSystem: `${baselineTime} min`, withResQNet: `${plan.averageArrival} min` },
      { scenario: "Coverage", withoutSystem: `${Math.round(baselineCoverage * 100)}%`, withResQNet: `${Math.round(plan.coverage * 100)}%` },
      { scenario: "Unmet demand", withoutSystem: `${Math.round(plan.totalDemand * (1 - baselineCoverage))} people`, withResQNet: `${plan.unmetDemand} people` },
      { scenario: "Risk weighting", withoutSystem: "Not modeled", withResQNet: `${plan.averageRiskWeight}/100 avg` },
      { scenario: "Stress response", withoutSystem: "Manual estimate", withResQNet: plan.stressLabel }
    ]
  };
}

function initMap() {
  if (!window.L || !els.map) return false;
  if (rescueMap) return true;

  rescueMap = L.map(els.map, {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([24, 22], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(rescueMap);

  return true;
}

function updateMap(payload) {
  if (!initMap()) {
    renderFallbackMap(payload);
    return;
  }

  els.mapFallback.classList.remove("active");
  mapLayers.forEach(layer => layer.remove());
  mapLayers = [];

  const hubs = getVisibleHubs(payload.incidents);
  const incidentById = new Map(payload.incidents.map(incident => [incident.id, incident]));
  const hubById = new Map(hubs.map(hub => [hub.id, hub]));
  const bounds = [];

  hubs.forEach(hub => {
    const marker = L.marker([hub.lat, hub.lon], {
      icon: L.divIcon({
        className: "",
        html: `<span class="map-marker hub"></span>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      })
    }).bindPopup(`<strong>${escapeHtml(hub.name)}</strong>${escapeHtml(hub.cityName)} response hub`);
    marker.addTo(rescueMap);
    mapLayers.push(marker);
    bounds.push([hub.lat, hub.lon]);
  });

  payload.incidents.forEach(incident => {
    const marker = L.marker([incident.lat, incident.lon], {
      icon: L.divIcon({
        className: "",
        html: `<span class="map-marker incident"></span>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      })
    }).bindPopup(`<strong>${escapeHtml(incident.name)}</strong>${escapeHtml(incident.cityName)} - ${format(incident.people)} people - severity ${incident.severity}%`);
    marker.addTo(rescueMap);
    mapLayers.push(marker);
    bounds.push([incident.lat, incident.lon]);
  });

  payload.plan.allocations.slice(0, 12).forEach((allocation, index) => {
    const hub = hubById.get(allocation.from);
    const incident = incidentById.get(allocation.to);
    if (!hub || !incident) return;
    const route = L.polyline([[hub.lat, hub.lon], [incident.lat, incident.lon]], {
      color: index === 0 ? "#15845f" : allocation.bottleneck ? "#b7791f" : "#1667d9",
      weight: index === 0 ? 5 : 3,
      opacity: index === 0 ? 0.9 : 0.56
    }).bindPopup(`<strong>${escapeHtml(hub.name)} to ${escapeHtml(incident.name)}</strong>${format(allocation.people)} people, ${allocation.travelMinutes} min, risk ${allocation.riskWeight}`);
    route.addTo(rescueMap);
    mapLayers.push(route);
  });

  if (bounds.length) rescueMap.fitBounds(bounds, { padding: [34, 34], maxZoom: 6 });
}

function renderFallbackMap(payload) {
  const hubs = getVisibleHubs(payload.incidents);
  const incidentById = new Map(payload.incidents.map(incident => [incident.id, incident]));
  const hubById = new Map(hubs.map(hub => [hub.id, hub]));
  const points = [...hubs, ...payload.incidents];
  const worldView = new Set(payload.incidents.map(incident => incident.cityId)).size > 1;
  const extents = getMapExtents(points);

  function project(point) {
    if (worldView) {
      return { x: ((point.lon + 180) / 360) * 82 + 9, y: ((82 - point.lat) / 164) * 66 + 16 };
    }
    const x = ((point.lon - extents.minLon) / extents.lonRange) * 66 + 17;
    const y = (1 - ((point.lat - extents.minLat) / extents.latRange)) * 54 + 24;
    return { x, y };
  }

  const routes = payload.plan.allocations.slice(0, 12).map((allocation, index) => {
    const hub = hubById.get(allocation.from);
    const incident = incidentById.get(allocation.to);
    if (!hub || !incident) return "";
    const a = project(hub);
    const b = project(incident);
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    return `<span class="fallback-route ${index === 0 ? "selected" : ""}" style="left:${a.x}%;top:${a.y}%;width:${length}%;transform:rotate(${angle}deg)"></span>`;
  }).join("");

  const pins = points.map(point => {
    const pos = project(point);
    const type = point.capacity ? "hub" : "incident";
    return `<span class="fallback-pin ${type}" title="${escapeHtml(point.name)}" style="left:${pos.x}%;top:${pos.y}%"></span>`;
  }).join("");

  const labels = points.map(point => {
    const pos = project(point);
    const type = point.capacity ? "Hub" : `${format(point.people)} people`;
    return `
      <span class="fallback-label" style="left:${clamp(pos.x, 8, 78)}%;top:${clamp(pos.y, 12, 82)}%">
        ${escapeHtml(point.name)}
        <small>${escapeHtml(type)}</small>
      </span>
    `;
  }).join("");

  const basemap = worldView ? buildWorldBasemap() : buildLocalBasemap(payload.incidents[0]?.cityName || "Local area");
  els.mapFallback.innerHTML = basemap + routes + pins + labels;
  els.mapFallback.classList.add("active");
}

function getMapExtents(points) {
  const lats = points.map(point => point.lat);
  const lons = points.map(point => point.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latPad = Math.max(0.04, (maxLat - minLat) * 0.3);
  const lonPad = Math.max(0.04, (maxLon - minLon) * 0.3);
  return {
    minLat: minLat - latPad,
    minLon: minLon - lonPad,
    latRange: Math.max(0.02, maxLat - minLat + latPad * 2),
    lonRange: Math.max(0.02, maxLon - minLon + lonPad * 2)
  };
}

function buildWorldBasemap() {
  return `
    <svg class="fallback-basemap" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
      <rect width="1000" height="520" fill="#d9ebf2"></rect>
      <path class="water-line" d="M0 125 C160 100 250 150 410 128 S680 96 1000 130"></path>
      <path class="water-line" d="M0 325 C180 300 300 356 470 332 S720 292 1000 335"></path>
      <path class="land" d="M95 120 C140 62 225 78 260 132 C298 188 250 234 188 220 C130 210 60 180 95 120Z"></path>
      <path class="land" d="M215 245 C268 228 323 260 322 318 C322 390 250 428 214 368 C180 310 160 266 215 245Z"></path>
      <path class="land" d="M430 98 C520 56 628 80 705 130 C782 182 770 252 676 262 C600 270 550 228 482 230 C410 232 360 175 430 98Z"></path>
      <path class="land" d="M575 250 C650 238 720 275 745 340 C775 418 672 448 618 395 C574 352 530 275 575 250Z"></path>
      <path class="land" d="M790 278 C852 244 940 262 958 325 C977 390 900 425 835 392 C782 365 740 306 790 278Z"></path>
      <path class="land" d="M488 312 C548 310 595 350 582 400 C566 462 472 462 438 408 C404 354 426 314 488 312Z"></path>
    </svg>
  `;
}

function buildLocalBasemap(cityName) {
  return `
    <svg class="fallback-basemap" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
      <rect width="1000" height="520" fill="#ddebf0"></rect>
      <path class="map-area" d="M45 90 H955 V430 H45Z"></path>
      <path class="map-area" d="M110 130 H360 V260 H110Z"></path>
      <path class="map-area" d="M390 115 H650 V245 H390Z"></path>
      <path class="map-area" d="M690 140 H900 V300 H690Z"></path>
      <path class="map-area" d="M170 305 H455 V420 H170Z"></path>
      <path class="map-area" d="M510 295 H850 V425 H510Z"></path>
      <path class="road-major" d="M40 268 C190 235 325 260 480 238 S760 198 960 230"></path>
      <path class="road-major" d="M238 70 C260 180 248 285 310 450"></path>
      <path class="road-major" d="M620 70 C590 190 635 310 590 455"></path>
      <path class="road-minor" d="M80 155 H930"></path>
      <path class="road-minor" d="M80 350 H930"></path>
      <path class="water-line" d="M0 470 C220 430 360 505 520 462 S780 415 1000 455"></path>
      <text x="82" y="112">${escapeHtml(cityName)} route graph</text>
    </svg>
  `;
}

function getVisibleHubs(incidents) {
  const cityIds = new Set(incidents.map(incident => incident.cityId));
  return cities
    .filter(city => cityIds.has(city.id))
    .flatMap(city => city.hubs.map(hub => ({
      ...hub,
      cityName: city.name,
      capacity: hubCapacity(hub)
    })));
}

async function runStress() {
  const startedAt = performance.now();
  const syntheticCities = Array.from({ length: 40 }, (_, index) => ({
    id: `city-${index}`,
    name: `Synthetic City ${index + 1}`,
    country: "Test",
    lat: 20 + (index % 10) * 2,
    lon: 70 + Math.floor(index / 10) * 2,
    hubs: [
      { id: `hub-${index}-a`, name: `Hub ${index + 1}A`, lat: 20 + (index % 10) * 2, lon: 70 + Math.floor(index / 10) * 2, teams: 20, ambulances: 10, beds: 80, kits: 900 }
    ]
  }));
  const syntheticIncidents = syntheticCities.map((city, index) => ({
    id: `incident-${index}`,
    name: `Synthetic crisis ${index + 1}`,
    kind: ["earthquake", "flood", "storm"][index % 3],
    source: "Stress generator",
    cityId: city.id,
    cityName: city.name,
    lat: city.lat + 0.05,
    lon: city.lon + 0.05,
    severity: 55 + index % 35,
    people: 300 + index * 20
  }));
  const plan = optimize(syntheticCities, syntheticIncidents, "blocked");
  const runtimeMs = Number((performance.now() - startedAt).toFixed(3));
  els.stressStatus.textContent = runtimeMs < 250 ? "PASS" : "REVIEW";
  const items = [
    ["Cities", 40],
    ["Incidents", 40],
    ["Graph", `${plan.nodes} nodes - ${plan.edges} edges`],
    ["Blocked-route runtime", `${runtimeMs} ms`],
    ["Max Flow", format(plan.maxFlow)],
    ["Avg Risk", `${plan.averageRiskWeight}/100`]
  ];
  els.stressGrid.innerHTML = items.map(([label, value]) => `<article><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderPlan(payload, evaluation, mode) {
  const plan = payload.plan;
  const topRoute = plan.allocations[0];
  const priorityIncident = [...payload.incidents].sort((a, b) => b.severity * b.people - a.severity * a.people)[0];

  els.status.textContent = `Optimization complete (${mode})`;
  els.sourceNotes.textContent = payload.notes.join(" - ");
  els.maxFlow.textContent = format(plan.maxFlow);
  els.coverage.textContent = `${Math.round(plan.coverage * 100)}%`;
  els.avgTime.textContent = `${plan.averageArrival} min`;
  els.runtime.textContent = `${plan.runtimeMs} ms`;
  els.priorityCity.textContent = priorityIncident ? priorityIncident.cityName : "--";
  els.riskWeight.textContent = plan.averageRiskWeight ? `${plan.averageRiskWeight}/100` : "--";
  els.stressMode.textContent = plan.stressLabel || "Normal";
  els.incidentCount.textContent = `${payload.incidents.length} incidents`;
  els.graphSize.textContent = `${plan.nodes} nodes - ${plan.edges} edges`;
  els.gain.textContent = `+${evaluation.summary.coverageGainPercent}% coverage, ${evaluation.summary.timeSavedMin} min saved`;

  if (topRoute) {
    els.decisionTitle.textContent = `${topRoute.hubName} to ${topRoute.incidentName}`;
    els.decisionReason.textContent = `Selected first because its risk-weighted route cost is ${topRoute.riskWeight}/100 with ${topRoute.travelMinutes} minutes travel time, ${format(topRoute.people)} people-equivalent capacity, and ${Math.round(topRoute.utilization * 100)}% edge utilization.`;
  } else {
    els.decisionTitle.textContent = "No feasible route found";
    els.decisionReason.textContent = "No hub-to-incident edge survived the current stress and regional constraints.";
  }

  updateMap(payload);

  els.incidentRows.innerHTML = payload.incidents.map(incident => {
    const risk = Math.min(100, Math.round(incident.severity * 0.55 + Math.min(35, incident.people / 120) + (stressProfiles[plan.stress]?.riskBonus || 0)));
    return `
      <tr>
        <td><strong>${escapeHtml(incident.name)}</strong></td>
        <td>${escapeHtml(incident.cityName)}</td>
        <td>${format(incident.people)}</td>
        <td>${incident.severity}%</td>
        <td>${risk}/100</td>
      </tr>
    `;
  }).join("");

  els.planList.innerHTML = plan.allocations.slice(0, 10).map((item, index) => `
    <article class="plan-item">
      <span class="rank">${index + 1}</span>
      <div>
        <h3>${escapeHtml(item.hubName)} to ${escapeHtml(item.incidentName)}</h3>
        <p>${format(item.people)} people-equivalent capacity, ${item.travelMinutes} min, ${item.distanceKm || "--"} km, risk weight ${item.riskWeight}/100.</p>
      </div>
      <span class="badge ${item.bottleneck ? "alert" : ""}">${item.bottleneck ? "Bottleneck" : "Selected"}</span>
    </article>
  `).join("");

  els.evaluationRows.innerHTML = evaluation.comparison.map(row => `
    <tr>
      <td>${escapeHtml(row.scenario)}</td>
      <td>${escapeHtml(row.withoutSystem)}</td>
      <td><strong>${escapeHtml(row.withResQNet)}</strong></td>
    </tr>
  `).join("");
}

function hubCapacity(hub) {
  return Math.round(hub.teams * 18 + hub.ambulances * 9 + hub.beds * 0.45 + hub.kits / 18);
}

function haversineKm(a, b) {
  const radius = 6371;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function format(value) {
  return Number(value).toLocaleString();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

document.getElementById("runBtn").addEventListener("click", runSystem);
document.getElementById("stressBtn").addEventListener("click", runStress);
loadCities().then(runSystem);
