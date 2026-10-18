import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import {
  LatLng,
  GOONG_MAPTILES_KEY,
  getGoongDirections,
} from '@/api/goongClient';

export interface GoongMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
}

export interface GoongMapViewRef {
  fitToCoordinates: (
    coordinates: LatLng[],
    options?: {
      edgePadding?: { top?: number; right?: number; bottom?: number; left?: number };
      animated?: boolean;
    }
  ) => void;
  animateCamera: (
    options: { center?: LatLng; zoom?: number },
    animationOptions?: any
  ) => void;
  centerTo: (lat: number, lng: number, zoom?: number) => void;
}

export interface GoongMapViewProps {
  initialCenter?: LatLng;
  zoom?: number;
  markers?: GoongMarker[];
  routeCoordinates?: LatLng[];
  origin?: LatLng | null;
  destination?: LatLng | null;
  vehicle?: 'bike' | 'car' | 'taxi';
  routeColor?: string;
  routeWidth?: number;
  style?: any;
  showsUserLocation?: boolean;
  onMapReady?: () => void;
  onRouteReady?: (result: { distanceMeters: number; durationSeconds: number }) => void;
}

const DEFAULT_CENTER: LatLng = {
  latitude: 10.762622,
  longitude: 106.660172,
};

export const GoongMapView = forwardRef<GoongMapViewRef, GoongMapViewProps>(
  (
    {
      initialCenter = DEFAULT_CENTER,
      zoom = 14,
      markers = [],
      routeCoordinates: customRouteCoords,
      origin,
      destination,
      vehicle = 'bike',
      routeColor = '#3182CE',
      routeWidth = 5,
      style,
      onMapReady,
      onRouteReady,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [internalRoute, setInternalRoute] = useState<LatLng[]>([]);

    useEffect(() => {
      if (origin?.latitude && origin?.longitude && destination?.latitude && destination?.longitude) {
        let isMounted = true;
        getGoongDirections(origin, destination, vehicle)
          .then((res) => {
            if (!isMounted) return;
            if (res && res.coordinates.length > 0) {
              setInternalRoute(res.coordinates);
              onRouteReady?.({
                distanceMeters: res.distanceMeters,
                durationSeconds: res.durationSeconds,
              });
            }
          })
          .catch((err) => {
            console.warn('[GoongMapView] Lỗi tìm đường Goong:', err);
          });
        return () => {
          isMounted = false;
        };
      } else {
        setInternalRoute([]);
      }
    }, [
      origin?.latitude,
      origin?.longitude,
      destination?.latitude,
      destination?.longitude,
      vehicle,
    ]);

    const activeRoute = customRouteCoords && customRouteCoords.length > 0 ? customRouteCoords : internalRoute;

    const runJs = useCallback((code: string) => {
      webViewRef.current?.injectJavaScript(`${code}; true;`);
    }, []);

    useImperativeHandle(ref, () => ({
      fitToCoordinates: (coords: LatLng[], options?: any) => {
        const pad = options?.edgePadding?.top || 60;
        runJs(`fitToCoordinates(${JSON.stringify(coords)}, ${pad});`);
      },
      animateCamera: (options: { center?: LatLng; zoom?: number }) => {
        if (options?.center) {
          runJs(
            `animateCamera(${JSON.stringify(options.center)}, ${options.zoom || 15});`
          );
        }
      },
      centerTo: (lat: number, lng: number, zoom?: number) => {
        runJs(`centerTo(${lng}, ${lat}, ${zoom || 15});`);
      },
    }));

    useEffect(() => {
      if (isMapLoaded) {
        runJs(`renderMarkers(${JSON.stringify(markers)});`);
      }
    }, [markers, isMapLoaded, runJs]);

    useEffect(() => {
      if (isMapLoaded) {
        runJs(`renderRoute(${JSON.stringify(activeRoute)});`);
      }
    }, [activeRoute, isMapLoaded, runJs]);

    const handleMessage = (event: any) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'MAP_LOADED') {
          setIsMapLoaded(true);
          onMapReady?.();
        }
      } catch (e) {
        // ignore
      }
    };

    const mapHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js/dist/goong-js.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/@goongmaps/goong-js/dist/goong-js.css" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #EEF2F6; }
    #map { width: 100%; height: 100%; position: absolute; top: 0; bottom: 0; left: 0; right: 0; }
    
    .custom-marker {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #FFFFFF;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(0,0,0,0.06);
      border: 3.5px solid #10B981;
      font-size: 20px;
      cursor: pointer;
      transition: transform 0.2s ease;
      z-index: 20;
    }
    .custom-marker:active {
      transform: scale(0.92);
    }
    .pickup-marker {
      border-color: #10B981 !important;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.25), 0 4px 14px rgba(0,0,0,0.3) !important;
    }
    .dest-marker {
      border-color: #EF4444 !important;
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.25), 0 4px 14px rgba(0,0,0,0.3) !important;
    }
    .driver-marker {
      border-color: #3182CE !important;
      animation: pulseDriver 2s infinite;
      z-index: 30 !important;
    }
    @keyframes pulseDriver {
      0% { box-shadow: 0 0 0 0 rgba(49, 130, 206, 0.7); }
      70% { box-shadow: 0 0 0 18px rgba(49, 130, 206, 0); }
      100% { box-shadow: 0 0 0 0 rgba(49, 130, 206, 0); }
    }
    .marker-label {
      position: absolute;
      top: -28px;
      background: rgba(15, 23, 42, 0.92);
      color: #FFFFFF;
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    /* 2 Dấu chấm lộ trình (Start / End Route Endpoint Markers) */
    .route-endpoint-marker {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      cursor: pointer;
      z-index: 25;
    }
    .route-endpoint-marker.start {
      z-index: 26;
    }
    .route-endpoint-marker.end {
      z-index: 27;
    }
    .endpoint-pulse {
      position: absolute;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      pointer-events: none;
      top: -11px;
      left: -11px;
    }
    .endpoint-pulse.start {
      background: rgba(16, 185, 129, 0.38);
      animation: pulseStart 2s ease-out infinite;
    }
    .endpoint-pulse.end {
      background: rgba(239, 68, 68, 0.35);
      animation: pulseEnd 2s ease-out infinite;
    }
    @keyframes pulseStart {
      0% { transform: scale(0.5); opacity: 0.95; }
      70% { transform: scale(1.35); opacity: 0; }
      100% { transform: scale(1.35); opacity: 0; }
    }
    @keyframes pulseEnd {
      0% { transform: scale(0.5); opacity: 0.95; }
      70% { transform: scale(1.35); opacity: 0; }
      100% { transform: scale(1.35); opacity: 0; }
    }
    .endpoint-dot {
      position: relative;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3.5px solid #FFFFFF;
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    }
    .endpoint-dot.start {
      background: linear-gradient(135deg, #10B981, #059669);
    }
    .endpoint-dot.end {
      background: linear-gradient(135deg, #EF4444, #DC2626);
    }
    .endpoint-inner-core {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
    }
    .endpoint-dot.end .endpoint-inner-core {
      border-radius: 2px;
    }
    .endpoint-badge {
      position: absolute;
      bottom: 34px;
      background: rgba(15, 23, 42, 0.92);
      color: #FFFFFF;
      padding: 3px 9px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.18);
      letter-spacing: 0.2px;
    }
    .endpoint-badge::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-width: 4px;
      border-style: solid;
      border-color: rgba(15, 23, 42, 0.92) transparent transparent transparent;
    }

    .mapboxgl-ctrl-bottom-right {
      display: none !important;
    }
    .mapboxgl-ctrl-attrib {
      display: none !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map;
    var markersMap = {};
    var routeEndpointMarkers = { start: null, end: null };
    var currentRouteGeoJson = null;

    try {
      goongjs.accessToken = '${GOONG_MAPTILES_KEY}';
      map = new goongjs.Map({
        container: 'map',
        style: 'https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPTILES_KEY}',
        center: [${initialCenter.longitude}, ${initialCenter.latitude}],
        zoom: ${zoom},
        attributionControl: false
      });

      map.on('load', function() {
        // Route Line Source & Layers
        map.addSource('route-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: []
            }
          }
        });

        map.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#0F172A',
            'line-width': 7,
            'line-opacity': 0.28
          }
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-source',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '${routeColor}',
            'line-width': ${routeWidth},
            'line-opacity': 0.95
          }
        });

        // 2 Endpoint circles on map canvas for instant GPU rendering
        map.addSource('route-endpoints-source', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        });

        map.addLayer({
          id: 'route-endpoints-outer',
          type: 'circle',
          source: 'route-endpoints-source',
          paint: {
            'circle-radius': 12,
            'circle-color': '#FFFFFF',
            'circle-opacity': 0.98,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#0F172A',
            'circle-stroke-opacity': 0.28
          }
        });

        map.addLayer({
          id: 'route-endpoints-inner',
          type: 'circle',
          source: 'route-endpoints-source',
          paint: {
            'circle-radius': 8,
            'circle-color': [
              'match',
              ['get', 'pointType'],
              'start', '#10B981',
              'end', '#EF4444',
              '#3B82F6'
            ]
          }
        });

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_LOADED' }));
        }

        renderMarkers(${JSON.stringify(markers)});
        renderRoute(${JSON.stringify(activeRoute)});
      });
    } catch(err) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FATAL_ERROR', error: err.message }));
      }
    }

    function createEndpointElement(type, title) {
      var wrapper = document.createElement('div');
      wrapper.className = 'route-endpoint-marker ' + type;

      var pulse = document.createElement('div');
      pulse.className = 'endpoint-pulse ' + type;
      wrapper.appendChild(pulse);

      var dot = document.createElement('div');
      dot.className = 'endpoint-dot ' + type;

      var inner = document.createElement('div');
      inner.className = 'endpoint-inner-core';
      dot.appendChild(inner);
      wrapper.appendChild(dot);

      var badge = document.createElement('div');
      badge.className = 'endpoint-badge';
      badge.innerText = title;
      wrapper.appendChild(badge);

      return wrapper;
    }

    function updateRouteEndpointMarkers(coords) {
      if (!map) return;
      if (!coords || coords.length < 2) {
        if (routeEndpointMarkers.start) {
          routeEndpointMarkers.start.remove();
          routeEndpointMarkers.start = null;
        }
        if (routeEndpointMarkers.end) {
          routeEndpointMarkers.end.remove();
          routeEndpointMarkers.end = null;
        }
        return;
      }

      var startLngLat = coords[0];
      var endLngLat = coords[coords.length - 1];

      if (!routeEndpointMarkers.start) {
        var startEl = createEndpointElement('start', 'Điểm đón');
        routeEndpointMarkers.start = new goongjs.Marker({ element: startEl, anchor: 'center' })
          .setLngLat(startLngLat)
          .addTo(map);
      } else {
        routeEndpointMarkers.start.setLngLat(startLngLat);
      }

      if (!routeEndpointMarkers.end) {
        var endEl = createEndpointElement('end', 'Điểm đến');
        routeEndpointMarkers.end = new goongjs.Marker({ element: endEl, anchor: 'center' })
          .setLngLat(endLngLat)
          .addTo(map);
      } else {
        routeEndpointMarkers.end.setLngLat(endLngLat);
      }
    }

    function renderMarkers(markersList) {
      if (!map || !markersList) return;
      var existingIds = Object.keys(markersMap);
      var newIds = markersList.map(function(m) { return String(m.id); });

      existingIds.forEach(function(id) {
        if (newIds.indexOf(id) === -1) {
          markersMap[id].remove();
          delete markersMap[id];
        }
      });

      var bounds = new goongjs.LngLatBounds();
      var count = 0;

      markersList.forEach(function(m) {
        if (m.latitude == null || m.longitude == null) return;
        var id = String(m.id);
        var lngLat = [Number(m.longitude), Number(m.latitude)];
        bounds.extend(lngLat);
        count++;

        if (markersMap[id]) {
          markersMap[id].setLngLat(lngLat);
        } else {
          var el = document.createElement('div');
          var isDriver = id === 'driver';
          var isPickup = id === 'pickup' || id === 'pickup_restaurant';
          var isDest = id === 'dest' || id === 'destination' || id === 'customer';
          
          var typeClass = isDriver ? ' driver-marker' : (isPickup ? ' pickup-marker' : (isDest ? ' dest-marker' : ''));
          el.className = 'custom-marker' + typeClass;
          if (m.color) el.style.borderColor = m.color;
          el.innerHTML = m.icon || (isPickup ? '🟢' : isDest ? '📍' : '🛵');

          if (m.title) {
            var label = document.createElement('div');
            label.className = 'marker-label';
            label.innerText = m.title;
            el.appendChild(label);
          }

          var marker = new goongjs.Marker({ element: el, anchor: 'center' })
            .setLngLat(lngLat)
            .addTo(map);

          markersMap[id] = marker;
        }
      });

      if (count > 1 && !currentRouteGeoJson) {
        try {
          map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
        } catch(e) {}
      }
    }

    function renderRoute(coordsList) {
      if (!map) return;
      var source = map.getSource('route-source');
      var endpointsSource = map.getSource('route-endpoints-source');
      if (!source) return;

      if (!coordsList || coordsList.length === 0) {
        currentRouteGeoJson = null;
        source.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] }
        });
        if (endpointsSource) {
          endpointsSource.setData({ type: 'FeatureCollection', features: [] });
        }
        updateRouteEndpointMarkers(null);
        return;
      }

      var coordinates = coordsList.map(function(c) {
        return [Number(c.longitude), Number(c.latitude)];
      });

      currentRouteGeoJson = coordinates;
      source.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates
        }
      });

      // Update GPU-rendered endpoint circle dots on canvas
      if (endpointsSource && coordinates.length >= 2) {
        endpointsSource.setData({
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { pointType: 'start' },
              geometry: { type: 'Point', coordinates: coordinates[0] }
            },
            {
              type: 'Feature',
              properties: { pointType: 'end' },
              geometry: { type: 'Point', coordinates: coordinates[coordinates.length - 1] }
            }
          ]
        });
      }

      // Update interactive HTML endpoint markers with radar pulses & badges
      updateRouteEndpointMarkers(coordinates);

      if (coordinates.length > 1) {
        var bounds = new goongjs.LngLatBounds();
        coordinates.forEach(function(c) { bounds.extend(c); });
        try {
          map.fitBounds(bounds, { padding: 60, maxZoom: 16 });
        } catch(e) {}
      }
    }

    function fitToCoordinates(coords, pad) {
      if (!map || !coords || coords.length === 0) return;
      var bounds = new goongjs.LngLatBounds();
      coords.forEach(function(c) {
        if (c.latitude != null && c.longitude != null) {
          bounds.extend([Number(c.longitude), Number(c.latitude)]);
        }
      });
      try {
        map.fitBounds(bounds, { padding: pad || 60, maxZoom: 16 });
      } catch(e) {}
    }

    function animateCamera(center, zoom) {
      if (!map || !center) return;
      try {
        map.easeTo({
          center: [Number(center.longitude), Number(center.latitude)],
          zoom: zoom || 15,
          duration: 1000
        });
      } catch(e) {}
    }

    function centerTo(lng, lat, zoom) {
      if (map) {
        map.easeTo({
          center: [Number(lng), Number(lat)],
          zoom: zoom || 15,
          duration: 800
        });
      }
    }
  </script>
</body>
</html>
    `;

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          onMessage={handleMessage}
        />

        {!isMapLoaded && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#3182CE" />
            <Text style={styles.loadingText}>Đang tải bản đồ Goong...</Text>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#EEF2F6',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 250, 252, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    zIndex: 99,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
});

export default GoongMapView;
