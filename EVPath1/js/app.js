let map, dirSvc, dirRdr, originAC, destAC, liveDot, watchId;
let steps = [], idx = 0;

window.initMap = function () {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 28.6139, lng: 77.2090 },
    zoom: 13,
    mapTypeId: "roadmap",
    styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
  });

  dirSvc = new google.maps.DirectionsService();
  dirRdr = new google.maps.DirectionsRenderer({ map });

  originAC = new google.maps.places.Autocomplete(document.getElementById("origin"));
  destAC = new google.maps.places.Autocomplete(document.getElementById("destination"));
  originAC.bindTo("bounds", map);
  destAC.bindTo("bounds", map);

  document.getElementById("go").onclick = buildRoute;
  document.getElementById("swap-btn").onclick = swapInputs;
  document.getElementById("map-toggle").onclick = toggleMapType;

  setupYourLocationOption("origin");
  setupYourLocationOption("destination");

  // Auto-fill origin with user's location on load
  navigator.geolocation.getCurrentPosition((pos) => {
    const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
    const originInput = document.getElementById("origin");
    originInput.value = "Your location";
    originInput.dataset.coords = coords;
  }, (err) => {
    console.warn("Location access denied or unavailable.");
  });
};

function toggleMapType() {
  const isSat = map.getMapTypeId() === "satellite";
  map.setMapTypeId(isSat ? "roadmap" : "satellite");
}

function swapInputs() {
  const o = document.getElementById("origin");
  const d = document.getElementById("destination");

  [o.value, d.value] = [d.value, o.value];
  [o.dataset.coords, d.dataset.coords] = [d.dataset.coords, o.dataset.coords];

  clearRoute();
  buildRoute();
}

function buildRoute() {
  const oInput = document.getElementById("origin");
  const dInput = document.getElementById("destination");

  let originVal = oInput.value.trim();
  let destVal = dInput.value.trim();

  if (!originVal || !destVal) return alert("Enter both locations");

  if (originVal.toLowerCase() === "your location" && oInput.dataset.coords) {
    originVal = oInput.dataset.coords;
  }
  if (destVal.toLowerCase() === "your location" && dInput.dataset.coords) {
    destVal = dInput.dataset.coords;
  }

  dirSvc.route({ origin: originVal, destination: destVal, travelMode: "DRIVING" }, (res, stat) => {
    if (stat !== "OK") return alert("Route error: " + stat);

    dirRdr.setDirections(res);
    steps = res.routes[0].legs[0].steps;
    idx = 0;
    showTurn(steps[0].instructions);
    startTracking();
  });
}

function startTracking() {
  if (liveDot) liveDot.setMap(null);
  liveDot = new google.maps.Marker({
    map,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: "#1a73e8",
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: "#fff"
    }
  });

  if (watchId) navigator.geolocation.clearWatch(watchId);
  watchId = navigator.geolocation.watchPosition(
    ({ coords }) => update(coords),
    err => console.error(err),
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );
}

function update(c) {
  const pos = new google.maps.LatLng(c.latitude, c.longitude);
  liveDot.setPosition(pos);
  map.panTo(pos);

  if (idx < steps.length) {
    const tgt = steps[idx].end_location;
    const dist = google.maps.geometry.spherical.computeDistanceBetween(pos, tgt);
    if (dist < 35) {
      idx++;
      idx < steps.length ? showTurn(steps[idx].instructions) : showTurn("🎉 Arrived!");
    }
  }
}

function showTurn(html) {
  document.getElementById("turn-text").innerHTML = html;
  document.getElementById("nav-card").hidden = false;
}

function clearRoute() {
  dirRdr.set('directions', null);
  steps = [];
  idx = 0;
  document.getElementById("nav-card").hidden = true;
  if (liveDot) liveDot.setMap(null);
  if (watchId) navigator.geolocation.clearWatch(watchId);
}

function setupYourLocationOption(inputId) {
  const inputEl = document.getElementById(inputId);

  inputEl.addEventListener("input", () => {
    setTimeout(() => {
      const pacContainers = document.querySelectorAll(".pac-container");
      pacContainers.forEach(container => {
        if (!container.querySelector(`.your-location-option-${inputId}`)) {
          const opt = document.createElement("div");
          opt.className = `pac-item your-location-option your-location-option-${inputId}`;
          opt.style.cursor = "pointer";
          opt.innerHTML = '<span class="pac-icon pac-icon-marker"></span>Your location';
          opt.onclick = () => {
            navigator.geolocation.getCurrentPosition((pos) => {
              const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
              inputEl.value = "Your location";
              inputEl.dataset.coords = coords;
              container.style.display = "none";
            }, () => {
              alert("Location access denied.");
            });
          };
          container.prepend(opt);
        }
      });
    }, 200);
  });
}
