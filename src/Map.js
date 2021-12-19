import React, { useEffect, useState, useRef } from "react";
import * as tt from "@tomtom-international/web-sdk-maps";
import "./App.css";
import "@tomtom-international/web-sdk-maps/dist/maps.css";
import * as ttapi from "@tomtom-international/web-sdk-services";
const Map = () => {
  const mapElement = useRef();
  const [map, setMap] = useState({});
  const [longitude, setLongitude] = useState(79.07869412917904);
  const [latitude, setLatitude] = useState(21.16735501003113);

  const convertToPoints = (lngLat) => {
    return {
      point: {
        latitude: lngLat.lat,
        longitude: lngLat.lng,
      },
    };
  };

  const addDeliveryMarker = (lngLat, map) => {
    const element = document.createElement("div");
    element.className = "marker-delivery";

    new tt.Marker({
      element: element,
    })
      .setLngLat(lngLat)
      .addTo(map);
  };

  const drawRoute = (geoJson, map) => {
    if (map.getLayer('route')) {
      map.removeLayer('route')
      map.removeSource('route')
    }
    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geoJson
      },
      paint: {
        'line-color': '#3944F7',
        'line-width': 6
  
      }
    })
  }

  useEffect(() => {
    const origin = {
      lng: longitude,
      lat: latitude,
    };
    const destinations = [];

    //Displaying the Map
    let map = tt.map({
      key: process.env.REACT_APP_TOM_TOM_API_KEY,
      container: mapElement.current,
      stylesVisibility: {
        trafficIncidents: true,
        trafficFlow: true,
      },
      center: { lon: longitude, lat: latitude },
      zoom: 16,
    });
    setMap(map);

    //Adding location marker
    const addMarker = () => {
      const popupOffset = {
        bottom: [0, -25],
      };
      const popup = new tt.Popup({ offset: popupOffset }).setHTML(
        "This is our Location"
      );
      const element = document.createElement("div");
      element.className = "marker";

      const marker = new tt.Marker({
        draggable: true,
        element: element,
      })
        .setLngLat([longitude, latitude])
        .addTo(map);

      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        setLatitude(lngLat.lat);
        setLongitude(lngLat.lng);
      });

      marker.setPopup(popup);
    };

    addMarker();

    //Matrix Routing
    const sortDestinations = (locations) => {
      const pointsForDestinations = locations.map((destination) => {
        return convertToPoints(destination);
      });

      const callParameters = {
        key: process.env.REACT_APP_TOM_TOM_API_KEY,
        destinations: pointsForDestinations,
        origins: [convertToPoints(origin)],
      };

      return new Promise((resolve, reject) => {
        ttapi.services
          .matrixRouting(callParameters)
          .then((matrixAPIResults) => {
            const results = matrixAPIResults.matrix[0];

            const resultsArray = results.map((result, index) => {
              return {
                location: locations[index],
                drivingtime: result.response.routeSummary.travelTimeInSeconds,
              };
            });

            resultsArray.sort((a, b) => {
              return a.drivingtime - b.drivingtime;
            });

            const sortedLocations = resultsArray.map((result) => {
              return result.location;
            });

            resolve(sortedLocations);
          });
      });
    };
    
    const recalculateRoute = ()=>{
      sortDestinations(destinations).then((sorted)=>{
        sorted.unshift(origin)

        ttapi.services.calculateRoute({
          key:process.env.REACT_APP_TOM_TOM_API_KEY,
          locations : sorted
        }).then((routeData)=>{
          const geoJson = routeData.toGeoJson()
          drawRoute(geoJson,map)
        })
      })
    }

    map.on("click", (e) => {
      destinations.push(e.lngLat);
      addDeliveryMarker(e.lngLat, map);
      recalculateRoute();
    });

    return () => map.remove();
  }, [longitude, latitude]);

  return (
    <>
      {map && (
        <div className="app">
          <div ref={mapElement} className="map"></div>
          <div className="user-input">
            <h3>Enter coordinates to change the center : </h3>
            <span>
              <input
                type="text"
                id="longitude"
                placeholder="Enter Latitude"
                onChange={(e) => {
                  setLatitude(e.target.value);
                }}
              />
              <input
                type="text"
                id="latitude"
                placeholder="Enter Longitude"
                onChange={(e) => {
                  setLongitude(e.target.value);
                }}
              />
            </span>
          </div>
        </div>
      )}
    </>
  );
};

export default Map;
