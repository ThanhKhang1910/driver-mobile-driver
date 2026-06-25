import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import axiosClient from '@/api/axiosClient';

const { width, height } = Dimensions.get('window');

const defaultCenter = {
  latitude: 10.762622,
  longitude: 106.660172,
};

export default function BikeBookingScreen() {
  const router = useRouter();

  const [pickup, setPickup] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [distance, setDistance] = useState(0);
  const [price, setPrice] = useState(0);
  const [formattedPrice, setFormattedPrice] = useState('0đ');
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleSetMockPickup = () => {
    setPickup('Đại học Khoa học Tự nhiên - 227 Nguyễn Văn Cừ');
    setPickupCoords({ latitude: 10.762622, longitude: 106.660172 });
  };

  const handleSetMockDest = () => {
    setDestination('Bitexco Financial Tower - Quận 1');
    setDestCoords({ latitude: 10.771616, longitude: 106.704407 });
  };

  const handleGetCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Từ chối', 'Vui lòng cấp quyền vị trí để lấy tọa độ hiện tại.');
        setGettingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setPickup('Vị trí hiện tại của bạn');
      setPickupCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error(error);
      Alert.alert('Lỗi', 'Không thể lấy vị trí hiện tại.');
    } finally {
      setGettingLocation(false);
    }
  };

  // Simulate Geocoding
  const generateMockCoords = (text: string) => {
    if (!text || text.trim() === '') return null;
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const latOffset = (hash % 100) / 1000;
    const lngOffset = ((hash >> 4) % 100) / 1000;
    return {
      latitude: 10.762622 + latOffset,
      longitude: 106.660172 + lngOffset,
    };
  };

  const handlePickupBlur = () => {
    if (pickup) setPickupCoords(generateMockCoords(pickup));
  };

  const handleDestBlur = () => {
    if (destination) setDestCoords(generateMockCoords(destination));
  };

  useEffect(() => {
    if (pickupCoords && destCoords) {
      setLoading(true);
      axiosClient
        .post('/orders/fee', {
          service_type: 'BIKE',
          pickup_latitude: pickupCoords.latitude,
          pickup_longitude: pickupCoords.longitude,
          latitude: destCoords.latitude,
          longitude: destCoords.longitude,
          restaurant_id: null,
        })
        .then((res) => {
          setDistance(res.data.distance_km || 3.2);
          setPrice(res.data.shipping_fee || 25000);
          setFormattedPrice(res.data.formatted_fee || '25.000đ');
        })
        .catch((err) => {
          console.error('Fee error:', err);
          setDistance(3.2);
          setPrice(25000);
          setFormattedPrice('25.000 đ');
        })
        .finally(() => setLoading(false));
    }
  }, [pickupCoords, destCoords]);

  const handleBookRide = async () => {
    if (!pickupCoords || !destCoords) {
      Alert.alert('Lỗi', 'Vui lòng chọn đầy đủ điểm đón và điểm đến!');
      return;
    }

    setBooking(true);
    try {
      const orderData = {
        service_type: 'BIKE',
        pickup_address: pickup,
        pickup_latitude: pickupCoords.latitude,
        pickup_longitude: pickupCoords.longitude,
        address: destination,
        customer_latitude: destCoords.latitude,
        customer_longitude: destCoords.longitude,
        restaurant_id: null,
        payment_method: 'CASH',
        note: 'Đặt xe ôm điện tử BronAuto',
        items: [],
      };

      const res = await axiosClient.post('/orders/create', orderData);
      
      Alert.alert('Đặt xe thành công', `Tài xế đang đến đón bạn! (Mã chuyến: #${res.data.order_id})`, [
        {
          text: 'Theo dõi tài xế',
          onPress: () => {
            router.replace(`/order/${res.data.order_id}/tracking`);
          },
        },
      ]);
    } catch (error: any) {
      console.error('Booking failed:', error);
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi kết nối máy chủ.';
      Alert.alert('Đặt xe thất bại', msg);
    } finally {
      setBooking(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Map View */}
        <View style={styles.mapBox}>
          <MapView
            style={styles.map}
            showsUserLocation={true}
            showsMyLocationButton={false}
            initialRegion={{
              latitude: defaultCenter.latitude,
              longitude: defaultCenter.longitude,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04,
            }}
          >
            {pickupCoords && (
              <Marker coordinate={pickupCoords} title="Điểm đón của bạn">
                <View style={[styles.pin, styles.pickupPin]}>
                  <Text style={styles.pinText}>🛵</Text>
                </View>
              </Marker>
            )}
            
            {destCoords && (
              <Marker coordinate={destCoords} title="Điểm đến của bạn">
                <View style={[styles.pin, styles.destPin]}>
                  <Text style={styles.pinText}>📍</Text>
                </View>
              </Marker>
            )}

            {pickupCoords && destCoords && (
              <Polyline
                coordinates={[pickupCoords, destCoords]}
                strokeColor="#3399FF"
                strokeWidth={4}
                lineDashPattern={[1]}
              />
            )}
          </MapView>

          {/* Back Button Overlay */}
          <TouchableOpacity style={styles.backNav} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {/* Booking Panel */}
        <View style={styles.bookingPanel}>
          {/* Pickup Input */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <View style={styles.labelLeft}>
                <View style={[styles.dotIndicator, { backgroundColor: '#3399FF' }]} />
                <Text style={styles.inputLabel}>Điểm đón</Text>
              </View>
              <TouchableOpacity onPress={handleSetMockPickup} style={{marginRight: 10}}>
                <Text style={styles.mockLink}>Nhập nhanh</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleGetCurrentLocation}>
                {gettingLocation ? (
                  <ActivityIndicator size="small" color="#3182CE" />
                ) : (
                  <Ionicons name="locate" size={20} color="#3182CE" />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="location-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="Nhập địa chỉ đón..."
                placeholderTextColor="#94A3B8"
                value={pickup}
                onChangeText={setPickup}
                onBlur={handlePickupBlur}
                onSubmitEditing={handlePickupBlur}
              />
            </View>
          </View>

          {/* Destination Input */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <View style={styles.labelLeft}>
                <View style={[styles.dotIndicator, { backgroundColor: '#E53E3E' }]} />
                <Text style={styles.inputLabel}>Điểm đến</Text>
              </View>
              <TouchableOpacity onPress={handleSetMockDest}>
                <Text style={styles.mockLink}>Nhập nhanh</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <Ionicons name="flag-outline" size={18} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="Nhập địa chỉ muốn đến..."
                placeholderTextColor="#94A3B8"
                value={destination}
                onChangeText={setDestination}
                onBlur={handleDestBlur}
                onSubmitEditing={handleDestBlur}
              />
            </View>
          </View>

          {/* Pricing Info Card */}
          {distance > 0 && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="navigate-outline" size={16} color="#64748B" />
                  <Text style={styles.infoLabel}>Quãng đường</Text>
                </View>
                <Text style={styles.infoValue}>{distance.toFixed(1)} km</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Ionicons name="cash-outline" size={16} color="#3399FF" />
                  <Text style={styles.priceLabel}>Giá cước</Text>
                </View>
                <Text style={styles.priceValue}>{formattedPrice}</Text>
              </View>
            </View>
          )}

          {loading && (
            <View style={styles.calcRow}>
              <ActivityIndicator size="small" color="#3399FF" />
              <Text style={styles.calcText}>Đang tính giá...</Text>
            </View>
          )}

          {/* Action button */}
          <TouchableOpacity
            style={[styles.bookButton, (booking || !price) && styles.disabledButton]}
            onPress={handleBookRide}
            disabled={booking || !price}
          >
            {booking ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <View style={styles.bookButtonContent}>
                <Ionicons name="bicycle" size={20} color="#FFFFFF" />
                <Text style={styles.bookButtonText}>Đặt chuyến xe máy</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  mapBox: {
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
  backNav: {
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
  pin: {
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pickupPin: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3399FF',
  },
  destPin: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E53E3E',
  },
  pinText: {
    fontSize: 18,
  },
  bookingPanel: {
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
  inputGroup: {
    marginBottom: 16,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  mockLink: {
    fontSize: 12,
    color: '#3399FF',
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '800',
  },
  priceLabel: {
    fontSize: 15,
    color: '#3399FF',
    fontWeight: '800',
  },
  priceValue: {
    fontSize: 18,
    color: '#3399FF',
    fontWeight: '900',
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  calcText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  bookButton: {
    height: 54,
    backgroundColor: '#3399FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3399FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#A7D7B0',
  },
  bookButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
