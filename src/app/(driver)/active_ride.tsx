import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import { getBaseURL } from '@/api/axiosClient';
import { useAuth } from '@/context/AuthContext';

export default function ActiveRide() {
  const router = useRouter();
  const { user } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Giả lập thông tin cuốc xe hiện tại. Trong thực tế lấy từ Params hoặc API
  const orderId = 123; 

  useEffect(() => {
    setupSocket();
    startTracking();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, []);

  const setupSocket = () => {
    const socket = io(getBaseURL().replace('/api/v1', ''));
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('Driver connected to Socket:', socket.id);
      // Có thể emit 'driver_online' ở đây
    });
  };

  const startTracking = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Quyền truy cập vị trí bị từ chối');
      return;
    }

    // Lấy vị trí ban đầu
    let initialLocation = await Location.getCurrentPositionAsync({});
    setLocation(initialLocation);

    // Bắt đầu theo dõi liên tục
    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000, // Cập nhật mỗi 3 giây
        distanceInterval: 5, // Hoặc mỗi 5 mét
      },
      (newLocation) => {
        setLocation(newLocation);
        
        // Phát tọa độ lên Server
        if (socketRef.current) {
          socketRef.current.emit('update_location', {
            order_id: orderId,
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            heading: newLocation.coords.heading,
          });
        }
      }
    );
  };

  const handleComplete = () => {
    Alert.alert('Thành công', 'Đã hoàn thành cuốc xe!', [
      { 
        text: 'OK', 
        onPress: () => {
          if (locationSubscription.current) locationSubscription.current.remove();
          router.replace('/(driver)/home');
        } 
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        {location ? (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={true}
            followsUserLocation={true}
          >
            {/* Vị trí của khách hàng (giả lập) */}
            <Marker
              coordinate={{ latitude: 10.7937, longitude: 106.7214 }}
              title="Điểm đón"
              description="Landmark 81"
            >
              <Ionicons name="person-circle" size={36} color="#3182CE" />
            </Marker>
            
            <Marker
              coordinate={{ latitude: 10.7725, longitude: 106.6980 }}
              title="Điểm trả"
              description="Chợ Bến Thành"
            >
              <Ionicons name="location-sharp" size={36} color="#E53E3E" />
            </Marker>
          </MapView>
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3399FF" />
            <Text style={styles.loadingText}>Đang lấy vị trí GPS...</Text>
            {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
          </View>
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.title}>Chuyến xe hiện tại</Text>
        
        <View style={styles.row}>
          <Ionicons name="person" size={20} color="#4A5568" />
          <Text style={styles.label}>Khách hàng: Trần Thanh Khang</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="location" size={20} color="#3182CE" />
          <Text style={styles.label}>Đón: Landmark 81</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="flag" size={20} color="#E53E3E" />
          <Text style={styles.label}>Trả: Chợ Bến Thành</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.actionRow}>
          <View style={styles.priceContainer}>
             <Text style={styles.priceLabel}>Thu tiền mặt:</Text>
             <Text style={styles.priceValue}>35,000đ</Text>
          </View>
          <TouchableOpacity 
            style={styles.chatBtn}
            onPress={() => router.push(`/chat/${orderId}`)}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.completeBtn} onPress={handleComplete}>
          <Text style={styles.btnText}>Hoàn Thành Cuốc</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  mapArea: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#4A5568',
    fontWeight: '600',
  },
  errorText: {
    marginTop: 8,
    color: '#E53E3E',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#4A5568',
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF2F7',
    marginVertical: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  priceContainer: {},
  priceLabel: {
    fontSize: 16,
    color: '#4A5568',
    fontWeight: 'bold',
  },
  priceValue: {
    fontSize: 24,
    color: '#3399FF',
    fontWeight: 'bold',
  },
  chatBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3399FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  completeBtn: {
    backgroundColor: '#3399FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
