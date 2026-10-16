/**
 * Goong Maps Theme Style for React Native Maps
 * Authentic Goong Map vector aesthetic:
 * - Soothing minty-slate landscape (#EEF5EE) matching Goong Map web
 * - Vibrant crystal cyan-blue water (#46B5F6) for Saigon river & waterways
 * - Crisp pure-white roads (#FFFFFF) with subtle outline
 * - Golden amber highways (#FBBF24)
 * - Fresh pastel green parks (#BBF7D0)
 * - Complete removal of intrusive commercial POI text clutter
 */
export const GOONG_MAP_STYLE = [
  {
    featureType: "administrative",
    elementType: "labels.text.fill",
    stylers: [{ color: "#334155" }]
  },
  {
    featureType: "administrative.country",
    elementType: "geometry.stroke",
    stylers: [{ color: "#94A3B8" }, { weight: 1.2 }]
  },
  {
    featureType: "administrative.province",
    elementType: "geometry.stroke",
    stylers: [{ color: "#CBD5E1" }, { weight: 1 }]
  },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#EEF5EE" }]
  },
  {
    featureType: "landscape.man_made",
    elementType: "geometry",
    stylers: [{ color: "#E8F0E9" }]
  },
  {
    featureType: "poi",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "poi.park",
    elementType: "geometry.fill",
    stylers: [{ visibility: "on" }, { color: "#C6F6D5" }]
  },
  {
    featureType: "road",
    elementType: "geometry.fill",
    stylers: [{ color: "#FFFFFF" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#E2E8F0" }, { weight: 0.8 }]
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#475569" }]
  },
  {
    featureType: "road",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#FFFFFF" }, { weight: 2 }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.fill",
    stylers: [{ color: "#FDE68A" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#F59E0B" }, { weight: 0.8 }]
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.fill",
    stylers: [{ color: "#FFFFFF" }]
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.stroke",
    stylers: [{ color: "#CBD5E1" }, { weight: 0.5 }]
  },
  {
    featureType: "transit",
    elementType: "all",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [{ color: "#4BB8F5" }, { visibility: "on" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#0284C7" }]
  }
];
