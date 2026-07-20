import React, { useEffect, useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  SafeAreaView,
  Alert,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '@/api/axiosClient';
import { connectSocket } from '@/api/socket';

const { width, height } = Dimensions.get('window');

const centerCoords = {
  latitude: 10.762622,
  longitude: 106.660172,
};

const STATUS_STEPS = [
  { status: 'PENDING', label: 'Chờ nhận', icon: '🕒' },
  { status: 'CONFIRMED', label: 'Đã nhận', icon: '✅' },
  { status: 'PREPARING', label: 'Chuẩn bị', icon: '👨‍🍳' },
  { status: 'DELIVERING', label: 'Đang giao', icon: '🛵' },
  { status: 'COMPLETED', label: 'Đã giao', icon: '🎉' },
];

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState('PENDING');
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Review states
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Map Ref for animating cameras
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await axiosClient.get(`/orders/${id}`);
        setOrder(res.data);
        setStatus(res.data.status || 'PENDING');
        
        if (res.data.customer_latitude && res.data.customer_longitude) {
          setDriverLocation({
            latitude: Number(res.data.customer_latitude) - 0.003,
            longitude: Number(res.data.customer_longitude) - 0.003,
          });
        }
      } catch (error) {
        console.error('Failed to fetch order details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchOrder();
    }

    const socket = connectSocket();

    socket.emit('join_order', id);

    socket.on('order_status_update', (data: { order_id: number; status: string }) => {
      console.log('[Socket] Order status updated:', data);
      if (Number(data.order_id) === Number(id)) {
        setStatus(data.status);
      }
    });

    socket.on('driver_location', (data: { order_id: number; lat: number; lng: number }) => {
      if (Number(data.order_id) === Number(id)) {
        setDriverLocation({
          latitude: Number(data.lat),
          longitude: Number(data.lng),
        });
      }
    });

    socket.on('driver_assigned', (data: { driver: any }) => {
      console.log('[Socket] Driver assigned:', data.driver);
      setDriverInfo(data.driver);
    });

    const timeout = setTimeout(() => {
      setDriverInfo({
        name: 'Nguyễn Văn Tài Xế',
        rating: 4.8,
        plate: '59-S1 888.88',
        phone: '0908765432',
      });
      setStatus('CONFIRMED');
    }, 4000);

    return () => {
      socket.off('order_status_update');
      socket.off('driver_location');
      socket.off('driver_assigned');
      clearTimeout(timeout);
    };
  }, [id]);

  useEffect(() => {
    let interval: any;
    if (status === 'DELIVERING' && order && driverLocation) {
      const destLat = Number(order.customer_latitude);
      const destLng = Number(order.customer_longitude);
      
      let step = 0;
      const totalSteps = 10;
      const latDiff = (destLat - driverLocation.latitude) / totalSteps;
      const lngDiff = (destLng - driverLocation.longitude) / totalSteps;

      interval = setInterval(() => {
        step++;
        if (step >= totalSteps) {
          clearInterval(interval);
          setStatus('COMPLETED');
          axiosClient
            .post(`/orders/${id}/complete`)
            .catch((err) => console.log('Failed to mark order completed:', err));
        } else {
          setDriverLocation((prev: any) => ({
            latitude: prev.latitude + latDiff,
            longitude: prev.longitude + lngDiff,
          }));
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleSendReview = () => {
    Alert.alert('Cảm ơn', 'Đánh giá của bạn đã được ghi nhận. Chúc bạn có trải nghiệm tuyệt vời!', [
      {
        text: 'Về trang chủ',
        onPress: () => {
          router.replace('/(tabs)' as any);
        },
      },
    ]);
    setReviewSubmitted(true);
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'PENDING':
        return 'Đang chờ nhà hàng xác nhận đơn hàng...';
      case 'CONFIRMED':
        return 'Nhà hàng đã xác nhận đơn hàng của bạn!';
      case 'PREPARING':
        return 'Bếp đang làm món ăn của bạn, tài xế đang tới...';
      case 'DELIVERING':
        return 'Tài xế đang giao đồ ăn nóng hổi tới bạn!';
      case 'COMPLETED':
        return 'Giao hàng thành công! Hãy thưởng thức món ngon 🎉';
      case 'CANCELLED':
        return 'Đơn hàng của bạn đã bị hủy.';
      default:
        return 'Đang cập nhật trạng thái...';
    }
  };

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === status);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3399FF" />
        <Text style={styles.loadingText}>Đang khởi tạo bản đồ theo dõi...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Map View */}
      {status !== 'COMPLETED' ? (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: order?.customer_latitude ? Number(order.customer_latitude) : centerCoords.latitude,
              longitude: order?.customer_longitude ? Number(order.customer_longitude) : centerCoords.longitude,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            }}
          >
            {/* Customer Destination Marker */}
            {order?.customer_latitude && order?.customer_longitude && (
              <Marker
                coordinate={{
                  latitude: Number(order.customer_latitude),
                  longitude: Number(order.customer_longitude),
                }}
                title="Vị trí của bạn"
                description={order.address}
              >
                <View style={styles.destinationPin}>
                  <Text style={styles.pinText}>🏠</Text>
                </View>
              </Marker>
            )}

            {/* Driver Marker */}
            {driverLocation && (
              <Marker
                coordinate={{
                  latitude: driverLocation.latitude,
                  longitude: driverLocation.longitude,
                }}
                title="Tài xế đang di chuyển"
              >
                <View style={styles.driverPin}>
                  <Text style={styles.pinText}>🛵</Text>
                </View>
              </Marker>
            )}

            {/* Draw Path Polyline */}
            {order?.customer_latitude && driverLocation && (
              <Polyline
                coordinates={[
                  {
                    latitude: driverLocation.latitude,
                    longitude: driverLocation.longitude,
                  },
                  {
                    latitude: Number(order.customer_latitude),
                    longitude: Number(order.customer_longitude),
                  },
                ]}
                strokeColor="#3399FF"
                strokeWidth={4}
              />
            )}
          </MapView>

          {/* Back button overlay */}
          <TouchableOpacity style={styles.mapBackButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Completion Review Form */}
      {status === 'COMPLETED' ? (
        <ScrollView contentContainerStyle={styles.reviewContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.successIconBox}>
            <Text style={styles.successIcon}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>Giao hàng thành công!</Text>
          <Text style={styles.successDesc}>
            Đơn hàng đã được giao đến địa chỉ của bạn. Vui lòng cho biết chất lượng phục vụ:
          </Text>

          {/* Stars */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Ionicons
                  name={rating >= star ? 'star' : 'star-outline'}
                  size={44}
                  color="#3399FF"
                  style={styles.starIcon}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Review input */}
          <TextInput
            style={styles.reviewInput}
            placeholder="Nhận xét của bạn..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            value={reviewText}
            onChangeText={setReviewText}
          />

          <TouchableOpacity style={styles.submitReviewBtn} onPress={handleSendReview}>
            <Ionicons name="send" size={18} color="#FFFFFF" />
            <Text style={styles.submitReviewBtnText}>Gửi đánh giá</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backHomeLink} onPress={() => router.replace('/(tabs)' as any)}>
            <Text style={styles.backHomeLinkText}>Để sau, về trang chủ</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* Status Card Overlay at the Bottom */
        <View style={styles.statusOverlayCard}>
          {/* Order number */}
          <Text style={styles.orderIdText}>Đơn hàng #{id}</Text>

          {/* Status timeline progress */}
          <View style={styles.timelineRow}>
            {STATUS_STEPS.map((step, index) => {
              const isPast = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              return (
                <View key={step.status} style={styles.timelineStepContainer}>
                  <View
                    style={[
                      styles.stepDot,
                      isPast && styles.pastStepDot,
                      isCurrent && styles.currentStepDot,
                    ]}
                  >
                    <Text style={styles.stepIcon}>{step.icon}</Text>
                  </View>
                  <Text style={[styles.stepLabel, isPast && styles.activeStepLabel]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Status Message */}
          <View style={styles.statusMsgBox}>
            <Ionicons name="information-circle" size={16} color="#3399FF" />
            <Text style={styles.statusMsgText}>{getStatusMessage()}</Text>
          </View>

          <View style={styles.divider} />

          {/* Driver Card Info */}
          {driverInfo ? (
            <View style={styles.driverSection}>
              <View style={styles.driverLeft}>
                <View style={styles.driverAvatar}>
                  <Ionicons name="person" size={22} color="#3399FF" />
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{driverInfo.name}</Text>
                  <View style={styles.plateRow}>
                    <Ionicons name="bicycle" size={14} color="#94A3B8" />
                    <Text style={styles.driverPlate}>{driverInfo.plate}</Text>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => Alert.alert('Gọi tài xế', `Đang gọi đến số: ${driverInfo.phone}`)}
              >
                <Ionicons name="call" size={18} color="#ffffff" />
                <Text style={styles.callText}>Gọi</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.searchingDriverRow}>
              <ActivityIndicator color="#3399FF" size="small" />
              <Text style={styles.searchingDriverText}>Đang sắp xếp tài xế nhận đơn...</Text>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1.1,
    width: '100%',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapBackButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#CBD5E1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  destinationPin: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3399FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  driverPin: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3399FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pinText: {
    fontSize: 20,
  },
  statusOverlayCard: {
    flex: 0.9,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    shadowColor: '#CBD5E1',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 16,
    textAlign: 'center',
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timelineStepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  pastStepDot: {
    backgroundColor: '#F1F5F9',
    borderColor: '#F5D780',
  },
  currentStepDot: {
    backgroundColor: '#3399FF',
    borderColor: '#3399FF',
    transform: [{ scale: 1.15 }],
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  stepIcon: {
    fontSize: 15,
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  activeStepLabel: {
    color: '#3399FF',
    fontWeight: '800',
  },
  statusMsgBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusMsgText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#8B6914',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  driverSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  driverInfo: {
    marginLeft: 12,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  driverPlate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    height: 42,
    backgroundColor: '#3399FF',
    borderRadius: 14,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  callText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  searchingDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  searchingDriverText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  reviewContainer: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
  },
  successIconBox: {
    width: 90,
    height: 90,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  successIcon: {
    fontSize: 48,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 10,
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    fontWeight: '500',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 28,
  },
  starIcon: {
    padding: 2,
  },
  reviewInput: {
    width: '100%',
    height: 110,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    marginBottom: 20,
    fontWeight: '500',
  },
  submitReviewBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#3399FF',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitReviewBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  backHomeLink: {
    padding: 10,
  },
  backHomeLinkText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
});
