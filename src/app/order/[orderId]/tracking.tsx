import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { io, Socket } from 'socket.io-client';
import { getBaseURL } from '@/api/axiosClient';

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading?: number;
}

export default function OrderTracking() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  
  // Tọa độ giả định ban đầu của tài xế (nếu không có)
  const [driverLocation, setDriverLocation] = useState<DriverLocation>({
    latitude: 10.7800,
    longitude: 106.7000,
    heading: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    setupSocket();

    // Giả lập loading dữ liệu ban đầu
    setTimeout(() => setLoading(false), 1000);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [orderId]);

  const setupSocket = () => {
    const socket = io(getBaseURL().replace('/api/v1', ''));
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Customer tracking connected:', socket.id);
      socket.emit('join_order', orderId); // Tham gia vào phòng của đơn hàng này
    });

    // Lắng nghe sự kiện tài xế cập nhật vị trí
    socket.on('driver_location', (data: any) => {
      setDriverLocation({
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading,
      });
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#0F172A" />
      </TouchableOpacity>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3399FF" />
        </View>
      ) : (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 10.7850, // Trung tâm giữa 2 điểm giả định
            longitude: 106.7100,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {/* Điểm đón khách */}
          <Marker
            coordinate={{ latitude: 10.7937, longitude: 106.7214 }}
            title="Điểm đón"
            description="Landmark 81"
          >
            <Ionicons name="person-circle" size={32} color="#3182CE" />
          </Marker>

          {/* Điểm trả khách */}
          <Marker
            coordinate={{ latitude: 10.7725, longitude: 106.6980 }}
            title="Điểm đến"
            description="Chợ Bến Thành"
          >
            <Ionicons name="location-sharp" size={32} color="#E53E3E" />
          </Marker>

          {/* Biểu tượng Tài xế di chuyển */}
          <Marker
            coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}
            rotation={driverLocation.heading} // Xoay mũi xe theo hướng chạy
            title="Tài xế đang tới"
          >
            <View style={styles.driverMarker}>
              <Ionicons name="bicycle" size={24} color="#FFFFFF" />
            </View>
          </Marker>
        </MapView>
      )}

      {/* Thông tin tài xế */}
      <View style={styles.driverInfoCard}>
        <View style={styles.driverHeader}>
          <View style={styles.driverAvatar}>
            <Ionicons name="person" size={24} color="#3399FF" />
          </View>
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>Nguyễn Văn Tài Xế</Text>
            <Text style={styles.vehicleInfo}>Honda Wave - 59A1-12345</Text>
          </View>
          <View style={styles.ratingBox}>
            <Ionicons name="star" size={16} color="#3399FF" />
            <Text style={styles.ratingText}>4.9</Text>
          </View>
        </View>
        
        <View style={styles.actionRow}>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => router.push(`/chat/${orderId}`)}
          >
            <Ionicons name="chatbubble" size={20} color="#3399FF" />
            <Text style={styles.actionText}>Nhắn tin</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="call" size={20} color="#3399FF" />
            <Text style={styles.actionText}>Gọi điện</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  driverMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3399FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  driverInfoCard: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#64748B',
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3399FF',
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  actionText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#3399FF',
  },
});
