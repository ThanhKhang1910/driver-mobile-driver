import React, { useEffect, useState } from 'react';
import { Polyline } from 'react-native-maps';
import { getGoongDirections, LatLng } from '@/api/goongClient';

interface GoongDirectionsProps {
  origin?: LatLng | null;
  destination?: LatLng | null;
  strokeWidth?: number;
  strokeColor?: string;
  lineDashPattern?: number[];
  vehicle?: 'bike' | 'car' | 'taxi';
  onReady?: (result: { distanceMeters: number; durationSeconds: number }) => void;
  onError?: (error: any) => void;
}

export const GoongDirections: React.FC<GoongDirectionsProps> = ({
  origin,
  destination,
  strokeWidth = 5,
  strokeColor = '#38A169',
  lineDashPattern,
  vehicle = 'bike',
  onReady,
  onError,
}) => {
  const [coordinates, setCoordinates] = useState<LatLng[]>([]);

  useEffect(() => {
    if (!origin || !destination) {
      setCoordinates([]);
      return;
    }

    let isMounted = true;
    getGoongDirections(origin, destination, vehicle)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.coordinates.length > 0) {
          setCoordinates(res.coordinates);
          onReady?.({
            distanceMeters: res.distanceMeters,
            durationSeconds: res.durationSeconds,
          });
        } else {
          setCoordinates([]);
          onError?.(new Error('Không tìm thấy lộ trình'));
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setCoordinates([]);
        console.warn('GoongDirections fetch error:', err);
        onError?.(err);
      });

    return () => {
      isMounted = false;
    };
  }, [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude, vehicle]);

  if (coordinates.length === 0) return null;

  return (
    <Polyline
      coordinates={coordinates}
      strokeWidth={strokeWidth}
      strokeColor={strokeColor}
      lineDashPattern={lineDashPattern}
    />
  );
};

export default GoongDirections;
