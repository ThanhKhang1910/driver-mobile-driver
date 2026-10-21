import axios from 'axios';

export const GOONG_API_KEY = process.env.EXPO_PUBLIC_GOONG_API_KEY || 'IyLLAS1DQaVd5D5hL9PZHIbxPcYi4TgCqASv309O';
export const GOONG_MAPTILES_KEY = process.env.EXPO_PUBLIC_GOONG_MAPTILES_KEY || 'ys4VUCW03yPizUJxXSeRLs3nrp7eeKK1V3UNoy5t';
export const GOONG_MAP_STYLE_URL = `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAPTILES_KEY}`;

// Axios instance riêng có timeout 10s ngăn chặn việc treo request khi mạng chập chờn
const goongAxios = axios.create({
  timeout: 10000,
});

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface GoongRouteResult {
  coordinates: LatLng[];
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
}

export interface GoongPlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text?: string;
}

export interface GoongPlaceDetail {
  place_id: string;
  name: string;
  formatted_address: string;
  location: LatLng;
  compound?: {
    district?: string;
    commune?: string;
    province?: string;
  };
}

// Hàm giải mã overview_polyline thành danh sách tọa độ [{ latitude, longitude }]
export const decodePolyline = (encoded: string): LatLng[] => {
  if (!encoded || typeof encoded !== 'string') return [];
  const points: LatLng[] = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

// Tìm đường bằng Goong Direction API (thay thế hoàn toàn MapViewDirections của Google)
export const getGoongDirections = async (
  origin: LatLng,
  destination: LatLng,
  vehicle: 'bike' | 'car' | 'taxi' | 'truck' = 'bike'
): Promise<GoongRouteResult | null> => {
  if (
    !origin ||
    !destination ||
    typeof origin.latitude !== 'number' ||
    typeof origin.longitude !== 'number' ||
    typeof destination.latitude !== 'number' ||
    typeof destination.longitude !== 'number' ||
    isNaN(origin.latitude) ||
    isNaN(origin.longitude) ||
    isNaN(destination.latitude) ||
    isNaN(destination.longitude)
  ) {
    return null;
  }

  try {
    const url = `https://rsapi.goong.io/Direction?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&vehicle=${vehicle}&api_key=${GOONG_API_KEY}`;
    const res = await goongAxios.get(url);
    if (res.data?.routes?.[0]) {
      const route = res.data.routes[0];
      const leg = route.legs?.[0];
      const coordinates = route.overview_polyline?.points
        ? decodePolyline(route.overview_polyline.points)
        : [];
      return {
        coordinates,
        distanceMeters: leg?.distance?.value || 0,
        distanceText: leg?.distance?.text || '',
        durationSeconds: leg?.duration?.value || 0,
        durationText: leg?.duration?.text || '',
      };
    }
    return null;
  } catch (error) {
    console.error('Lỗi Goong Directions API:', error);
    return null;
  }
};

// Gợi ý địa chỉ bằng Goong Place AutoComplete (hỗ trợ vị trí ưu tiên và giới hạn số lượng kết quả)
export const searchGoongPlaces = async (
  input: string,
  location?: LatLng,
  limit: number = 10
): Promise<GoongPlacePrediction[]> => {
  if (!input || typeof input !== 'string' || input.trim().length === 0) return [];
  try {
    let url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(input.trim())}&limit=${limit}`;
    if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      url += `&location=${location.latitude},${location.longitude}`;
    }
    const res = await goongAxios.get(url);
    if (res.data?.status === 'OK' && Array.isArray(res.data.predictions)) {
      return res.data.predictions.map((p: any) => ({
        place_id: p.place_id,
        description: p.description,
        main_text: p.structured_formatting?.main_text || p.description,
        secondary_text: p.structured_formatting?.secondary_text || '',
      }));
    }
    return [];
  } catch (error) {
    console.error('Lỗi Goong AutoComplete:', error);
    return [];
  }
};

// Lấy tọa độ chi tiết của địa chỉ bằng Goong Place Detail
export const getGoongPlaceDetail = async (placeId: string): Promise<GoongPlaceDetail | null> => {
  if (!placeId || typeof placeId !== 'string' || placeId.trim().length === 0) return null;
  try {
    const url = `https://rsapi.goong.io/Place/Detail?place_id=${encodeURIComponent(placeId.trim())}&api_key=${GOONG_API_KEY}`;
    const res = await goongAxios.get(url);
    if (res.data?.status === 'OK' && res.data.result) {
      const r = res.data.result;
      const lat = r.geometry?.location?.lat;
      const lng = r.geometry?.location?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;

      return {
        place_id: r.place_id || placeId,
        name: r.name || r.formatted_address || '',
        formatted_address: r.formatted_address || r.name || '',
        location: {
          latitude: lat,
          longitude: lng,
        },
        compound: r.compound,
      };
    }
    return null;
  } catch (error) {
    console.error('Lỗi Goong Place Detail:', error);
    return null;
  }
};

// Chuyển đổi tọa độ GPS thành địa chỉ tên đường cụ thể (Reverse Geocoding)
export const getGoongGeocode = async (coords: LatLng): Promise<GoongPlaceDetail | null> => {
  if (
    !coords ||
    typeof coords.latitude !== 'number' ||
    typeof coords.longitude !== 'number' ||
    isNaN(coords.latitude) ||
    isNaN(coords.longitude)
  ) {
    return null;
  }

  try {
    const url = `https://rsapi.goong.io/Geocode?latlng=${coords.latitude},${coords.longitude}&api_key=${GOONG_API_KEY}`;
    const res = await goongAxios.get(url);
    if (res.data?.status === 'OK' && Array.isArray(res.data.results) && res.data.results.length > 0) {
      const r = res.data.results[0];
      const lat = r.geometry?.location?.lat ?? coords.latitude;
      const lng = r.geometry?.location?.lng ?? coords.longitude;

      return {
        place_id: r.place_id || '',
        name: r.name || r.formatted_address || '',
        formatted_address: r.formatted_address || r.name || '',
        location: {
          latitude: lat,
          longitude: lng,
        },
        compound: r.compound,
      };
    }
    return null;
  } catch (error) {
    console.error('Lỗi Goong Geocode API:', error);
    return null;
  }
};
