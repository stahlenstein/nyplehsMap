<script>
  import { onMount, onDestroy } from "svelte";
  import mapboxgl, { Map } from "mapbox-gl";
  import { layerControlGrouped } from "../node_modules/mapbox-layer-control/layerControlGrouped"
  import "../node_modules/mapbox-gl/dist/mapbox-gl.css";
  import "@nypl/design-system-react-components/dist/styles.css";

  let map;
  let mapContainer;
  let lng, lat, zoom;

  const bounds = [
    [-74.51486471433522, 40.49469766822682], // Southwest coordinates
    [-73.39945580979894, 40.92186132573724], // Northeast coordinates
  ];

  lng = -74.0;
  lat = 40.75;
  zoom = 9;

  function updateData() {
    zoom = map.getZoom();
    lng = map.getCenter().lng;
    lat = map.getCenter().lat;
  }

  onMount(() => {
    const initialState = { lng: lng, lat: lat, zoom: zoom };

    map = new Map({
      container: mapContainer,
      accessToken: `pk.eyJ1Ijoic3RhaGxzdHJhZGFtdXMiLCJhIjoiY2xvZWNrMGxjMDFldzJqczZ2b2g1c2FldCJ9.MQaEas9L_03YCaFbaO-SBA`,
      style: `mapbox://styles/stahlstradamus/cloecokpb001v01p80phr35aj`,
      center: [initialState.lng, initialState.lat],
      zoom: initialState.zoom,
      maxBounds: bounds,
    });

    var libData = `https://raw.githubusercontent.com/stahlenstein/nyplehsMap/main/static/data/Libraries.geojson`;

    // extend mapboxGL Marker so we can pass in an onClick handler
    class ClickableMarker extends mapboxgl.Marker {
      // new method onClick, sets _handleClick to a function you pass in
      onClick(handleClick) {
        this._handleClick = handleClick;
        return this;
      }

      // the existing _onMapClick was there to trigger a popup
      // but we are hijacking it to run a function we define
      _onMapClick(e) {
        const targetElement = e.originalEvent.target;
        const element = this._element;

        if (
          this._handleClick &&
          (targetElement === element || element.contains(targetElement))
        ) {
          this._handleClick();
        }
      }
    }

    map.on("move", () => {
      updateData();
    });

    map.on("load", () => {
      // Load and display your JSON file using Leaflet.js
      fetch(libData)
        .then((response) => response.json())
        .then((data) => {
          console.log(data);

          map.addSource("libraries", {
            type: "geojson",
            data: data,
          });

          // display/hide lat long info
          document.addEventListener("keypress", (e) => {
            if (e.code == "Backquote") {
              console.log("wow!");
              var sb = document.querySelector(".sidebar");
              if (sb.style.zIndex >= 0) {
                sb.style.zIndex = 1;
              } else {
                sb.style.zIndex = -1;
              }
            }
          });

          // creating and adding button to close infobox
          var infoCloseBtn = document.getElementById("close");
          infoCloseBtn.addEventListener("click", () => {
            console.log("button clicked!");
            var iB = document.querySelector(".infoBox");
            iB.style.zIndex = -1;
          });

          // Add markers to the map.
          for (const marker of data.features) {
            // Create a DOM element for each marker.
            const m = document.createElement("div");
            m.className = "marker" + marker.properties.code;
            m.id = "marker";
            // m.style.backgroundImage = `url(https://raw.githubusercontent.com/stahlenstein/NycLibMap/master/static/icons/Branch_line.png)`;
            m.style.backgroundSize = "100%";
            m.style.width = "20px";
            m.style.height = "20px";

            if (marker.properties.code === "SASB") {
              m.style.backgroundImage = `url(https://raw.githubusercontent.com/stahlenstein/nyplehsMap/main/static/icons/SASB.svg)`;
            } else if (marker.properties.code === "SCH") {
              m.style.backgroundImage = `url(https://raw.githubusercontent.com/stahlenstein/nyplehsMap/main/static/icons/Burg.svg)`;
            } else if (marker.properties.code === "LPA") {
              m.style.backgroundImage = `url(https://raw.githubusercontent.com/stahlenstein/nyplehsMap/main/static/icons/LPA.svg)`;
            } else if (marker.properties.code === "LSC") {
              m.style.backgroundImage = `url(https://raw.githubusercontent.com/stahlenstein/nyplehsMap/main/static/icons/LSC.svg)`;
            } else {
              m.style.backgroundImage = `url(https://raw.githubusercontent.com/stahlenstein/nyplehsMap/main/static/icons/branch.svg)`;
            }

            var popup = new mapboxgl.Popup().setText("name").addTo(map);

            var infoHeader = document.querySelector(".libName");
            var libAddress = document.querySelector(".libAddress");
            var libCode = document.querySelector(".libCode");
            var libNetwork = document.querySelector(".libNetwork");
            var libStatus = document.querySelector(".libStatus");
            var libCoord = document.querySelector(".libCoord");

            // Creating Clickable Markers
            new ClickableMarker(m)
              .setLngLat(marker.geometry.coordinates)
              .onClick(() => {
                // Adding marker info from GeoJson to InfoBox
                infoHeader.innerHTML = `${marker.properties.name}`;
                libAddress.innerHTML =
                  `${marker.properties.housenum}` +
                  " " +
                  `${marker.properties.streetname}`;
                libCode.innerHTML = `${marker.properties.code}`;
                libNetwork.innerHTML = `${marker.properties.network}`;
                libStatus.innerHTML = `${marker.properties.status}`;
                libCoord.innerHTML = `${marker.properties.coordinator}`;
              })
              .addTo(map);

            // End of Marker Addition and Marker Data
          }

          // Hide/Show Markers dependant on Zoom level
          var allMarks = document.querySelectorAll("#marker");
          map.on("zoom", () => {
            const currentZoom = map.getZoom();
            if (currentZoom >= 18) {
              for (let i = 0; i < allMarks.length; i++) {
                allMarks[i].style.zIndex = -1;
              }
            } else {
              for (let i = 0; i < allMarks.length; i++) {
                allMarks[i].style.zIndex = 1;
              }
            }
          });

          map.addLayer({
            id: "libraries",
            type: "circle",
            source: "libraries",
            minzoom: 0,
            paint: {
              "circle-radius": 8,
              "circle-stroke-width": 3,
              "circle-color": "transparent",
              "circle-stroke-color": "transparent",
            },
          });

          map.on("mouseenter", "libraries", (e) => {
            // Change the cursor style as a UI indicator.
            map.getCanvas().style.cursor = "pointer";

            // Copy coordinates array.
            const coordinates = e.features[0].geometry.coordinates.slice();
            const description = e.features[0].properties.name;

            // Ensure that if the map is zoomed out such that multiple
            // copies of the feature are visible, the popup appears
            // over the copy being pointed to.
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
              coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            // Populate the popup and set its coordinates
            // based on the feature found.
            popup.setLngLat(coordinates).setHTML(description).addTo(map);
          });

          map.on("mouseleave", "libraries", () => {
            map.getCanvas().style.cursor = "";
            popup.remove();
          });

          map.on("click", (e) => {
            const iBDiv = document.querySelector(".infoBox");
            const libName = document.querySelector(".infoHead > h1");
            iBDiv.style.zIndex = 3;
          });
        });

      // fetching geojson data for building footprints
      fetch(
        `https://raw.githubusercontent.com/stahlenstein/nyplehsMap/main/static/data/buildingftprints.geojson`
      )
        .then((response) => response.json())
        .then((footprints) => {
          // creating source for building footprints
          map.addSource("footprints", {
            type: "geojson",
            data: footprints,
          });

          // adding layer for building footprints
          map.addLayer({
            id: "footprints",
            type: "fill",
            source: "footprints",
            paint: {
              "fill-color": "rgba(200, 200, 200, 1)",
              "fill-outline-color": "black",
            },
          });
        });

      // fetching geojson data for building footprints
      fetch(
        `https://raw.githubusercontent.com/stahlenstein/nyplehsMap/main/static/data/LowerManhattan.geojson`
      )
        .then((response) => response.json())
        .then((LM) => {
          map.addSource("LM", {
            type: "geojson",
            data: LM,
          });

          map.addLayer({
            id: "LowMan",
            type: "fill",
            source: "LM",
            paint: {
              "fill-color": "rgba(255, 0, 0, 0.4)",
              "fill-outline-color": "black",
            },
          });
        });

      // fetching geojson data for building footprints
      fetch(
        `https://raw.githubusercontent.com/stahlenstein/nyplehsMap/main/static/data/EastManhattan.geojson`
      )
        .then((response) => response.json())
        .then((EM) => {
          map.addSource("EM", {
            type: "geojson",
            data: EM,
          });

          map.addLayer({
            id: "EastMan",
            type: "fill",
            source: "EM",
            paint: {
              "fill-color": "rgba(255, 0, 0, 0.25)",
              "fill-outline-color": "black",
            },
          });
        });

      // fetching geojson data for building footprints
      fetch(
        `https://raw.githubusercontent.com/stahlenstein/nyplehsMap/main/static/data/WestManhattan.geojson`
      )
        .then((response) => response.json())
        .then((WM) => {
          map.addSource("WM", {
            type: "geojson",
            data: WM,
          });

          map.addLayer({
            id: "WestMan",
            type: "fill",
            source: "WM",
            paint: {
              "fill-color": "rgba(255, 0, 0, 0.1)",
              "fill-outline-color": "black",
            },
          });
        });

      // fetching geojson data for building footprints
      fetch(
        `https://raw.githubusercontent.com/stahlenstein/nyplehsMap/main/static/data/WestBronx.geojson`
      )
        .then((response) => response.json())
        .then((WB) => {
          map.addSource("WB", {
            type: "geojson",
            data: WB,
          });

          map.addLayer({
            id: "WestBro",
            type: "fill",
            source: "WB",
            paint: {
              "fill-color": "rgba(107, 9, 172, 0.35)",
              "fill-outline-color": "black",
            },
          });
        });

      // fetching geojson data for building footprints
      fetch(
        `https://raw.githubusercontent.com/stahlenstein/nyplehsMap/main/static/data/CentralBronx.geojson`
      )
        .then((response) => response.json())
        .then((CB) => {
          map.addSource("CB", {
            type: "geojson",
            data: CB,
          });

          map.addLayer({
            id: "CenBro",
            type: "fill",
            source: "CB",
            paint: {
              "fill-color": "rgba(107, 9, 172, 0.15)",
              "fill-outline-color": "black",
            },
          });
        });

      // fetching geojson data for building footprints
      fetch(
        `https://raw.githubusercontent.com/stahlenstein/nyplehsMap/main/static/data/EastBronx.geojson`
      )
        .then((response) => response.json())
        .then((EB) => {
          map.addSource("EB", {
            type: "geojson",
            data: EB,
          });

          map.addLayer({
            id: "EastBro",
            type: "fill",
            source: "EB",
            paint: {
              "fill-color": "rgba(107, 9, 172, 0.25)",
              "fill-outline-color": "black",
            },
          });
        });

      // fetching geojson data for building footprints
      fetch(
        `https://raw.githubusercontent.com/stahlenstein/nyplehsMap/main/static/data/StatenIsland.geojson`
      )
        .then((response) => response.json())
        .then((SI) => {
          map.addSource("SI", {
            type: "geojson",
            data: SI,
          });

          map.addLayer({
            id: "StatIsl",
            type: "fill",
            source: "SI",
            paint: {
              "fill-color": "rgba(0, 130, 255, 0.25)",
              "fill-outline-color": "black",
            },
          });
        });

        var config = {
        collapsed: false,
        layers: [
          {
            id: "LowMan",
            group: "Works",
            hidden: true,
            children: false,
            directory: "Networks"
          },
          {
            id: "EastMan",
            group: "Works",
            hidden: true,
            children: false,
            directory: "Networks"
          },
          {
            id: "WestMan",
            group: "Works",
            hidden: true,
            children: false,
            directory: "Networks"
          },
          {
            id: "WestBro",
            group: "Works",
            hidden: true,
            children: false,
            directory: "Networks"
          },
          {
            id: "CenBro",
            group: "Works",
            hidden: true,
            children: false,
            directory: "Networks"
          },
          {
            id: "EastBro",
            group: "Works",
            hidden: true,
            children: false,
            directory: "Networks"
          },
          {
            id: "StatIsl",
            group: "Works",
            hidden: true,
            children: false,
            directory: "Networks"
          },
        ]
      }

        map.addControl( new layerControlGrouped(config), "top-right");
    });

    // Fullscreen Control
    map.addControl(new mapboxgl.FullscreenControl());

    // Add geolocate control to the map.
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        // When active the map will receive updates to the device's location as it changes.
        trackUserLocation: true,
        // Draw an arrow next to the location dot to indicate which direction the device is heading.
        showUserHeading: true,
      })
    );
  });

  onDestroy(() => {
    map.remove();
  });
</script>

<div>
  <div class="sidebar">
    Longitude: {lng.toFixed(4)} | Latitude: {lat.toFixed(4)} | Zoom: {zoom.toFixed(
      2
    )}
  </div>
  <div class="titleDiv">
    <div>NYPL EHS Map</div>
  </div>
  <div class="infoBox">
    <div class="infoClose">
      <input type="button" id="close" />
    </div>
    <div class="infoHead">
      <h1 class="libName" />
    </div>
    <div class="infoSection" />
    <table>
      <tbody>
        <tr>
          <td>Address:</td>
          <td id="data" class="libAddress" />
        </tr>
        <tr>
          <td>Branch Code:</td>
          <td id="data" class="libCode" />
        </tr>
        <tr>
          <td>Network:</td>
          <td id="data" class="libNetwork" />
        </tr>
        <tr>
          <td>Status:</td>
          <td id="data" class="libStatus" />
        </tr>
        <tr>
          <td>Coordinator:</td>
          <td id="data" class="libCoord" />
        </tr>
      </tbody>
    </table>

    <div class="infoFooter" />
  </div>
  <div class="map-wrap">
    <div class="map" bind:this={mapContainer} />
  </div>
</div>

<style>
  .map {
    position: absolute;
    width: 100%;
    height: 100%;
  }

  .titleDiv {
    position: absolute;
    background: rgba(85, 85, 85, 0.1);
    backdrop-filter: blur(10px);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
      Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue",
      sans-serif;
    font-size: larger;
    font-weight: 700;
    padding: 10px 30px;
    left: 1%;
    top: 1%;
    z-index: 3;
    border-radius: 3px;
  }

  .sidebar {
    background-color: rgba(35, 55, 75, 0.9);
    color: #fff;
    padding: 6px 12px;
    font-family: monospace;
    z-index: -1;
    position: absolute;
    bottom: 1%;
    left: 0;
    margin: 12px;
    border-radius: 4px;
  }
  .infoBox {
    background: rgba(100, 100, 100, 0.5);
    backdrop-filter: blur(10px);
    color: #000000;
    padding: 6px 12px;
    font-family: system-ui;
    z-index: -1;
    position: absolute;
    top: 5%;
    left: 0;
    margin: 12px;
    border-radius: 4px;
    height: 90%;
    width: auto;
  }

  .infoBox > div {
    width: 100%;
    color: black;
  }

  tr {
    font-size: small;
  }

  #data {
    padding-left: 15px;
  }

  #close {
    position: absolute;
    right: 0px;
    margin: 10px;
    height: 5px;
    width: 5px;
    background-color: red;
    border-color: transparent;
    border-radius: 10px;
  }

  .mapboxgl-popup {
    z-index: 5;
  }
</style>
