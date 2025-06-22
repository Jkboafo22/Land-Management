mapboxgl.accessToken = 'pk.eyJ1IjoiZ2VvLWluZm9sYWIiLCJhIjoiY2x0eTRqZGxxMGJkazJxa25sN3dzcnp3ayJ9.mFKgxVbNJ8NyuRu9TWM1_g';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-1.326, 5.186],
  zoom: 15
});

map.addControl(new mapboxgl.NavigationControl());
map.addControl(new mapboxgl.ScaleControl({ position: 'bottom-left' }));

map.on('mousemove', (e) => {
  document.getElementById('coordinate').textContent =
    `Lat: ${e.lngLat.lat.toFixed(5)}, Lng: ${e.lngLat.lng.toFixed(5)}`;
});

map.on('load', () => {
  map.addSource('Parcels', {
    type: 'geojson',
    data: lands
  });

  map.addLayer({
    id: 'lands-layer',
    type: 'fill',
    source: 'Parcels',
    paint: {
      'fill-color': [
        'match',
        ['get', 'Usage'],
        'Residence', '#EB9360',
        'Commercial', '#FF0000',
        '#FF0000'
      ],
      'fill-opacity': 0.6
    }
  });

  map.addLayer({
    id: 'hover-highlight',
    type: 'line',
    source: 'Parcels',
    paint: {
      'line-color': '#ffffff',
      'line-width': 2
    },
    filter: ['==', 'Full_Name', '']
  });

  map.addLayer({
    id: 'parcel-labels',
    type: 'symbol',
    source: 'Parcels',
    layout: {
      'text-field': ['get', 'Plot_Num'],
      'text-size': 10
    },
    paint: {
      'text-color': '#000',
      'text-halo-color': '#fff',
      'text-halo-width': 1
    }
  });

  map.on('mousemove', 'lands-layer', (e) => {
    const name = e.features[0].properties.Full_Name;
    map.setFilter('hover-highlight', ['==', 'Full_Name', name]);
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'lands-layer', () => {
    map.setFilter('hover-highlight', ['==', 'Full_Name', '']);
    map.getCanvas().style.cursor = '';
  });

  map.on('click', 'lands-layer', (e) => {
    const props = e.features[0].properties;
    const html = `
      <strong>${props.Full_Name}</strong><br/>
      Plot #: ${props.Plot_Num}<br/>
      Usage: ${props.Usage}<br/>
      Payment: ${props.Payment_St}
    `;
    new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map);
  });

  // Fit to bounds
  const bounds = new mapboxgl.LngLatBounds();
  lands.features.forEach(f => f.geometry.coordinates[0].forEach(c => bounds.extend(c)));
  map.fitBounds(bounds, { padding: 40 });

  // Toggle parcels
  document.getElementById('toggleParcels').addEventListener('change', function () {
    const vis = this.checked ? 'visible' : 'none';
    ['lands-layer', 'hover-highlight', 'parcel-labels'].forEach(id =>
      map.setLayoutProperty(id, 'visibility', vis)
    );
  });

  // Filter logic
  const filters = {
    Gender: 'All',
    Payment_St: 'All',
    Paymnt_Typ: 'All',
    Purpose: 'All'
  };

  function applyFilters() {
    const active = Object.entries(filters)
      .filter(([_, v]) => v !== 'All')
      .map(([k, v]) => ['==', ['get', k], v]);

    const filterExpr = active.length > 1 ? ['all', ...active] : (active[0] || null);
    map.setFilter('lands-layer', filterExpr);
    map.setFilter('parcel-labels', filterExpr);
  }

  ['genderFilter', 'paymentStatusFilter', 'paymentTypeFilter', 'purposeFilter'].forEach(id => {
    document.getElementById(id).addEventListener('change', e => {
      const mapKey = {
        genderFilter: 'Gender',
        paymentStatusFilter: 'Payment_St',
        paymentTypeFilter: 'Paymnt_Typ',
        purposeFilter: 'Purpose'
      };
      filters[mapKey[id]] = e.target.value;
      applyFilters();
    });
  });

  // Search: Click + Enter support
  document.getElementById('searchBtn').addEventListener('click', runSearch);
  document.getElementById('searchBox').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch();
    }
  });

  function runSearch() {
    const query = document.getElementById('searchBox').value.toLowerCase();
    const match = lands.features.find(f =>
      f.properties.Full_Name.toLowerCase().includes(query)
    );

    if (match) {
      const center = match.geometry.coordinates[0][0];
      map.flyTo({ center, zoom: 17 });
      map.setFilter('hover-highlight', ['==', 'Full_Name', match.properties.Full_Name]);
      new mapboxgl.Popup()
        .setLngLat(center)
        .setHTML(`<strong>${match.properties.Full_Name}</strong><br/>Plot #: ${match.properties.Plot_Num}`)
        .addTo(map);
    } else {
      alert('Parcel not found');
    }
  }

  // Summary stats
  const total = lands.features.length;
  const area = lands.features.reduce((sum, f) => sum + (parseFloat(f.properties.Pacel_Size) || 0), 0).toFixed(2);
  document.getElementById('summaryStats').innerHTML = `
    <strong>Total Parcels:</strong> ${total}<br/>
    <strong>Total Area:</strong> ${area} Acres
  `;

  // Reset filters
  document.getElementById('resetFiltersBtn').addEventListener('click', () => {
    document.getElementById('genderFilter').value = 'All';
    document.getElementById('paymentStatusFilter').value = 'All';
    document.getElementById('paymentTypeFilter').value = 'All';
    document.getElementById('purposeFilter').value = 'All';

    filters.Gender = 'All';
    filters.Payment_St = 'All';
    filters.Paymnt_Typ = 'All';
    filters.Purpose = 'All';

    map.setFilter('lands-layer', null);
    map.setFilter('parcel-labels', null);
  });
});
