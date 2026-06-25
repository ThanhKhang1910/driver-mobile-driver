import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import axiosClient, { getBaseURL } from '@/api/axiosClient';
import { useAuth } from '@/context/AuthContext';

export default function ActiveRide() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState('DRIVER_ASSIGNED');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    if (id) fetchOrderDetails();
    setupSocket();
    startTracking();

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      const res = await axiosClient.get(`/orders/${id}`);
      setOrder(res.data);
      setStatus(res.data.status || 'DRIVER_ASSIGNED');
    } catch (error) {
      console.log('Error fetching order details:', error);
    }
  };

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
        if (socketRef.current && id) {
          socketRef.current.emit('update_location', {
            order_id: id,
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            heading: newLocation.coords.heading,
          });
        }
      }
    );
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      await axiosClient.put('/driver/orders/status', { orderId: id, status: newStatus });
      setStatus(newStatus);
      if (newStatus === 'COMPLETED') {
        Alert.alert('Thành công', 'Đã hoàn thành cuốc xe!', [
          { 
            text: 'OK', 
            onPress: () => {
              if (locationSubscription.current) locationSubscription.current.remove();
              router.replace('/(driver)/home');
            } 
          }
        ]);
      }
    } catch (error) {
      console.log('Error updating status:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };
  const handleCancel = () => {
    Alert.alert('Hủy Chuyến', 'Bạn có chắc chắn muốn hủy chuyến xe này?', [
      { text: 'Không', style: 'cancel' },
      { text: 'Có', onPress: async () => {
          try {
            await axiosClient.put('/driver/orders/status', { orderId: id, status: 'CANCELLED' });
            if (locationSubscription.current) locationSubscription.current.remove();
            router.replace('/(driver)/home');
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể hủy cuốc xe lúc này');
          }
      }, style: 'destructive' }
    ]);
  };

  const openNavigation = () => {
    if (order?.customer_latitude && order?.customer_longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${order.customer_latitude},${order.customer_longitude}`;
      Linking.openURL(url);
    } else {
      Alert.alert('Lỗi', 'Không tìm thấy tọa độ khách hàng');
    }
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
            {/* Vị trí của khách hàng */}
            {order?.customer_latitude && order?.customer_longitude && (
              <Marker
                coordinate={{ 
                  latitude: Number(order.customer_latitude), 
                  longitude: Number(order.customer_longitude) 
                }}
                title="Khách hàng"
              >
                <Ionicons name="person-circle" size={36} color="#E53E3E" />
              </Marker>
            )}

            {/* Vẽ đường đi (nếu cần thiết) */}
            {order?.customer_latitude && location && (
              <MapViewDirections
                origin={location.coords}
                destination={{
                  latitude: Number(order.customer_latitude),
                  longitude: Number(order.customer_longitude),
                }}
                apikey="YOUR_GOOGLE_MAPS_API_KEY_HERE"
                strokeWidth={5}
                strokeColor="#3399FF"
                mode="DRIVING"
              />
            )}
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
          <Text style={styles.label}>Khách hàng: {order?.customer_name || 'Khách'}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="location" size={20} color="#3182CE" />
          <Text style={styles.label}>Đón: {order?.pickup_address || order?.restaurant_address || 'Đang cập nhật'}</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="flag" size={20} color="#E53E3E" />
          <Text style={styles.label}>Trả: {order?.address || 'Đang cập nhật'}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.actionRow}>
          <View style={styles.priceContainer}>
             <Text style={styles.priceLabel}>Thu tiền mặt:</Text>
             <Text style={styles.priceValue}>{order ? parseFloat(order.total_amount).toLocaleString() : 0}đ</Text>
          </View>
          <TouchableOpacity 
            style={[styles.chatBtn, { backgroundColor: '#3182CE', marginRight: 10 }]}
            onPress={openNavigation}
          >
            <Ionicons name="map-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.chatBtn}
            onPress={() => router.push(`/chat/${id}`)}
          >
            <Ionicons name="chatbubble-ellipses" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {status === 'DRIVER_ASSIGNED' && (
          <TouchableOpacity style={[styles.completeBtn, { backgroundColor: '#FC8181', marginBottom: 10 }]} onPress={handleCancel}>
            <Text style={styles.btnText}>Hủy Chuyến</Text>
          </TouchableOpacity>
        )}

        {status === 'DRIVER_ASSIGNED' ? (
          <TouchableOpacity style={styles.completeBtn} onPress={() => handleUpdateStatus('DELIVERING')}>
            <Text style={styles.btnText}>Đã đón khách</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.completeBtn, { backgroundColor: '#38A169' }]} onPress={() => handleUpdateStatus('COMPLETED')}>
            <Text style={styles.btnText}>Hoàn Thành Cuốc</Text>
          </TouchableOpacity>
        )}
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
