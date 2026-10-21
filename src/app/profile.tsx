import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Linking,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axiosClient from '@/api/axiosClient';
import { useAuth } from '@/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DriverDocsData {
  driver_id?: number;
  vehicle_plate?: string;
  vehicle_type?: string;
  gplx_image_url?: string | null;
  cccd_image_url?: string | null;
  vehicle_doc_image_url?: string | null;
  gplx_status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  cccd_status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  vehicle_doc_status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  reject_reason?: string | null;
}

export default function DriverProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [rating, setRating] = useState<number>(5.0);
  const [totalCompleted, setTotalCompleted] = useState<number>(0);
  const [completionRate, setCompletionRate] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(true);

  // Documents state
  const [driverDocs, setDriverDocs] = useState<DriverDocsData | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{
    type: 'GPLX' | 'CCCD' | 'VEHICLE_DOC';
    title: string;
    sub: string;
    imageUrl?: string | null;
    status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  } | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);

  // Settings
  const [loudNotification, setLoudNotification] = useState<boolean>(true);
  const [autoNavigate, setAutoNavigate] = useState<boolean>(true);

  // Phone Edit Modal
  const [showPhoneModal, setShowPhoneModal] = useState<boolean>(false);
  const [newPhone, setNewPhone] = useState<string>(user?.phone || '');
  const [savingPhone, setSavingPhone] = useState<boolean>(false);

  // Contract Modal
  const [showContractModal, setShowContractModal] = useState<boolean>(false);

  useEffect(() => {
    fetchDriverStats();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedLoud = await AsyncStorage.getItem('driver_loud_notification');
      if (savedLoud !== null) setLoudNotification(savedLoud === 'true');
      const savedNav = await AsyncStorage.getItem('driver_auto_navigate');
      if (savedNav !== null) setAutoNavigate(savedNav === 'true');
    } catch (e) {}
  };

  const fetchDriverStats = async () => {
    setLoading(true);
    try {
      // 1. Lấy thông tin user mới nhất
      try {
        const meRes = await axiosClient.get('/auth/me');
        if (meRes.data) {
          const updatedUser = {
            ...meRes.data,
            phone: meRes.data.phone || meRes.data.phone_number || '0344999655',
            vehicle_plate: meRes.data.vehicle_plate || '59-A1 12345',
            vehicle_type: meRes.data.vehicle_type || 'BIKE',
          };
          await refreshUser(updatedUser);
          if (updatedUser.phone) setNewPhone(updatedUser.phone);
        }
      } catch (e) {}

      // 2. Lấy số dư ví tài xế
      try {
        const earnRes = await axiosClient.get('/driver/earnings');
        if (earnRes.data && earnRes.data.walletBalance !== undefined) {
          setWalletBalance(earnRes.data.walletBalance);
        }
      } catch (e) {}

      // 3. Lấy đánh giá sao
      try {
        const revRes = await axiosClient.get('/driver/reviews');
        if (revRes.data && revRes.data.averageRating) {
          setRating(Number(revRes.data.averageRating));
        }
      } catch (e) {}

      // 4. Lấy tổng số cuốc hoàn thành & tính tỷ lệ hoàn thành thật
      try {
        const histRes = await axiosClient.get('/driver/history');
        if (Array.isArray(histRes.data)) {
          const completedCount = histRes.data.filter((o: any) => o.status === 'COMPLETED').length;
          const cancelledCount = histRes.data.filter((o: any) => o.status === 'CANCELLED').length;
          setTotalCompleted(completedCount);

          const totalTrips = completedCount + cancelledCount;
          if (totalTrips > 0) {
            setCompletionRate(Math.round((completedCount / totalTrips) * 100));
          } else {
            setCompletionRate(100);
          }
        }
      } catch (e) {}

      // 5. Lấy trạng thái hồ sơ & giấy tờ pháp lý tài xế
      try {
        const docRes = await axiosClient.get('/driver/documents');
        if (docRes.data) {
          setDriverDocs(docRes.data);
        }
      } catch (e) {}
    } catch (error) {
      console.log('Error fetching driver profile stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickDocImage = async () => {
    if (!selectedDoc) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cấp quyền', 'Vui lòng cấp quyền truy cập thư viện ảnh để tải lên giấy tờ.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const imgData = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;

        setUploadingDoc(true);
        const payload: any = {};
        if (selectedDoc.type === 'GPLX') payload.gplx_image_url = imgData;
        else if (selectedDoc.type === 'CCCD') payload.cccd_image_url = imgData;
        else if (selectedDoc.type === 'VEHICLE_DOC') payload.vehicle_doc_image_url = imgData;

        await axiosClient.put('/driver/documents', payload);
        Alert.alert('Thành công', 'Giấy tờ mới đã được tải lên và đang chờ Admin duyệt lại.');
        setSelectedDoc(null);
        await fetchDriverStats();
      }
    } catch (err) {
      console.error('Upload document error:', err);
      Alert.alert('Lỗi', 'Không thể tải ảnh lên lúc này, vui lòng thử lại.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const renderDocBadge = (status?: string) => {
    const s = status || 'APPROVED';
    if (s === 'APPROVED') {
      return (
        <View style={styles.badgeSuccess}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 2 }} />
          <Text style={styles.badgeSuccessText}>Đã duyệt</Text>
        </View>
      );
    }
    if (s === 'REJECTED') {
      return (
        <View style={styles.badgeDanger}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" style={{ marginRight: 2 }} />
          <Text style={styles.badgeDangerText}>Chụp lại ✕</Text>
        </View>
      );
    }
    return (
      <View style={styles.badgeWarning}>
        <Ionicons name="time" size={14} color="#D97706" style={{ marginRight: 2 }} />
        <Text style={styles.badgeWarningText}>Chờ duyệt ⏳</Text>
      </View>
    );
  };

  const handleToggleLoud = async (val: boolean) => {
    setLoudNotification(val);
    await AsyncStorage.setItem('driver_loud_notification', val ? 'true' : 'false');
  };

  const handleToggleAutoNav = async (val: boolean) => {
    setAutoNavigate(val);
    await AsyncStorage.setItem('driver_auto_navigate', val ? 'true' : 'false');
  };

  const handleCallHotline = () => {
    Alert.alert(
      'Tổng đài Hỗ trợ Đối tác Tài xế',
      'Bạn muốn gọi ngay đến đường dây nóng hỗ trợ tài xế NKGO (0344999655)?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Gọi 0344999655', onPress: () => Linking.openURL('tel:0344999655') },
      ]
    );
  };

  const handleSavePhone = async () => {
    if (!newPhone || newPhone.trim().length < 9) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại hợp lệ!');
      return;
    }
    setSavingPhone(true);
    try {
      if (user) {
        await refreshUser({ ...user, phone: newPhone.trim() });
      }
      setShowPhoneModal(false);
      Alert.alert('Thành công', 'Đã cập nhật số điện thoại liên hệ của tài xế!');
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể cập nhật số điện thoại lúc này.');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất tài khoản', 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng tài xế NKGO?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const driverId = user?.id ? String(user.id).padStart(4, '0') : '3010';
  const phoneNumber = user?.phone || (user as any)?.phone_number || '0344999655';
  const vehiclePlate = (user as any)?.vehicle_plate || '59-A1 12345';
  const vehicleType = (user as any)?.vehicle_type || 'BIKE';
  const isCar = vehicleType === 'CAR';
  const serviceName = isCar ? 'NKGO Car (4 - 7 chỗ)' : 'NKGO Bike & Food Delivery';
  const vehicleModel = isCar ? 'Toyota Vios 1.5G • Trắng Sứ' : 'Honda AirBlade 150 • Đen Nhám';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ sơ Đối tác Tài xế</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchDriverStats} activeOpacity={0.7}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Ionicons name="reload-outline" size={20} color="#2563EB" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Header */}
        <View style={styles.driverCardHeader}>
          <View style={styles.driverInfoLeft}>
            <View style={styles.verifiedRow}>
              <View style={styles.activeDot} />
              <Text style={styles.verifiedText}>Đối tác chính thức NKGO</Text>
            </View>

            <Text style={styles.driverName}>{user?.fullName || 'Tài xế NKGO'}</Text>
            
            <TouchableOpacity style={styles.phoneRow} onPress={() => setShowPhoneModal(true)} activeOpacity={0.7}>
              <Ionicons name="call-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.phoneText}>{phoneNumber}</Text>
              <Ionicons name="create-outline" size={14} color="#3B82F6" style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>Mã TX: #TX-{driverId}</Text>
            </View>
          </View>

          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarLetter}>
                {user?.fullName?.charAt(0).toUpperCase() || 'T'}
              </Text>
            </View>
            <View style={styles.steeringBadge}>
              <Ionicons name="bicycle" size={14} color="#FFFFFF" />
            </View>
          </View>
        </View>

        {/* 4 Thống kê uy tín tài xế */}
        <View style={styles.statsCard}>
          <TouchableOpacity 
            style={styles.statBox} 
            onPress={() => router.push('/(driver)/reviews' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.statIconRow}>
              <Ionicons name="star" size={18} color="#F59E0B" />
              <Text style={styles.statNumber}>{rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.statLabel}>Đánh giá</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity 
            style={styles.statBox} 
            onPress={() => router.push('/(driver)/history' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.statIconRow}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.statNumber}>{totalCompleted}</Text>
            </View>
            <Text style={styles.statLabel}>Cuốc hoàn thành</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <View style={styles.statIconRow}>
              <Ionicons name="flash" size={18} color="#3B82F6" />
              <Text style={styles.statNumber}>98%</Text>
            </View>
            <Text style={styles.statLabel}>Tỷ lệ nhận</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statBox}>
            <View style={styles.statIconRow}>
              <Ionicons name="shield-checkmark" size={18} color="#8B5CF6" />
              <Text style={styles.statNumber}>{completionRate}%</Text>
            </View>
            <Text style={styles.statLabel}>Tỷ lệ hoàn thành</Text>
          </View>
        </View>

        {/* 3 Quick Action Buttons: Ví thu nhập, Lịch sử, Đánh giá */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={[styles.quickActionItem, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
            onPress={() => router.push('/(driver)/earnings' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#3B82F6' }]}>
              <Ionicons name="wallet" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionTitle}>Ví & Thu nhập</Text>
            <Text style={styles.quickActionSub}>{walletBalance.toLocaleString('vi-VN')} đ</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionItem, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
            onPress={() => router.push('/(driver)/history' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#10B981' }]}>
              <Ionicons name="receipt" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionTitle}>Lịch sử cuốc</Text>
            <Text style={styles.quickActionSub}>Xem chi tiết</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.quickActionItem, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}
            onPress={() => router.push('/(driver)/reviews' as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="star" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.quickActionTitle}>Đánh giá</Text>
            <Text style={styles.quickActionSub}>Khách khen ngợi</Text>
          </TouchableOpacity>
        </View>

        {/* Section: Thông tin phương tiện */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name={isCar ? 'car' : 'bicycle'} size={18} color="#2563EB" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Thông tin Phương tiện hoạt động</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Dịch vụ đăng ký</Text>
            <Text style={styles.infoVal}>{serviceName}</Text>
          </View>
          <View style={styles.innerDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Biển kiểm soát</Text>
            <View style={styles.licensePlate}>
              <Text style={styles.licensePlateText}>{vehiclePlate}</Text>
            </View>
          </View>
          <View style={styles.innerDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Mẫu xe & Màu sắc</Text>
            <Text style={styles.infoVal}>{vehicleModel}</Text>
          </View>
        </View>

        {/* Section: Hồ sơ & Giấy tờ pháp lý */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={18} color="#2563EB" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Hồ sơ & Giấy tờ pháp lý</Text>
          </View>

          {/* Banner cảnh báo nếu có giấy tờ bị từ chối */}
          {(driverDocs?.gplx_status === 'REJECTED' ||
            driverDocs?.cccd_status === 'REJECTED' ||
            driverDocs?.vehicle_doc_status === 'REJECTED') && (
            <View style={styles.docAlertBanner}>
              <Ionicons name="warning" size={16} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.docAlertTitle}>Yêu cầu chụp lại giấy tờ</Text>
                <Text style={styles.docAlertDesc}>
                  {driverDocs?.reject_reason || 'Một số giấy tờ chưa đạt chuẩn hoặc bị mờ. Chạm vào mục có biểu tượng đỏ để chụp lại.'}
                </Text>
              </View>
            </View>
          )}

          {/* 1. Giấy phép lái xe */}
          <TouchableOpacity
            style={styles.docItem}
            activeOpacity={0.7}
            onPress={() =>
              setSelectedDoc({
                type: 'GPLX',
                title: 'Giấy phép lái xe (GPLX)',
                sub: 'Hạng A1/A2 • Còn hiệu lực',
                imageUrl: driverDocs?.gplx_image_url || 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&q=80',
                status: driverDocs?.gplx_status || 'APPROVED',
              })
            }
          >
            <View style={styles.docIconWrap}>
              <Ionicons name="card-outline" size={20} color="#1E293B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>Giấy phép lái xe (GPLX)</Text>
              <Text style={styles.docSub}>Chạm để xem & cập nhật ảnh</Text>
            </View>
            {renderDocBadge(driverDocs?.gplx_status)}
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          <View style={styles.innerDivider} />

          {/* 2. Căn cước công dân */}
          <TouchableOpacity
            style={styles.docItem}
            activeOpacity={0.7}
            onPress={() =>
              setSelectedDoc({
                type: 'CCCD',
                title: 'Căn cước công dân (CCCD)',
                sub: 'Đã đối chiếu thông tin cá nhân',
                imageUrl: driverDocs?.cccd_image_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80',
                status: driverDocs?.cccd_status || 'APPROVED',
              })
            }
          >
            <View style={styles.docIconWrap}>
              <Ionicons name="id-card-outline" size={20} color="#1E293B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>Căn cước công dân (CCCD)</Text>
              <Text style={styles.docSub}>Chạm để xem & cập nhật ảnh</Text>
            </View>
            {renderDocBadge(driverDocs?.cccd_status)}
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          <View style={styles.innerDivider} />

          {/* 3. Cà vẹt & Đăng ký xe */}
          <TouchableOpacity
            style={styles.docItem}
            activeOpacity={0.7}
            onPress={() =>
              setSelectedDoc({
                type: 'VEHICLE_DOC',
                title: 'Bảo hiểm & Đăng ký xe',
                sub: 'Cà vẹt xe chính chủ',
                imageUrl: driverDocs?.vehicle_doc_image_url || 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80',
                status: driverDocs?.vehicle_doc_status || 'APPROVED',
              })
            }
          >
            <View style={styles.docIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#1E293B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>Bảo hiểm xe & Đăng ký xe</Text>
              <Text style={styles.docSub}>Chạm để xem & cập nhật ảnh</Text>
            </View>
            {renderDocBadge(driverDocs?.vehicle_doc_status)}
            <Ionicons name="chevron-forward" size={16} color="#94A3B8" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        {/* Section: Cài đặt ứng dụng tài xế */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-sharp" size={18} color="#2563EB" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Cài đặt cuốc xe & Bản đồ</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.settingTitle}>Âm báo chuông nhận cuốc lớn</Text>
              <Text style={styles.settingDesc}>Đổ chuông lớn liên tục khi có cuốc xe mới</Text>
            </View>
            <Switch
              value={loudNotification}
              onValueChange={handleToggleLoud}
              trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
              thumbColor={loudNotification ? '#2563EB' : '#F1F5F9'}
            />
          </View>
          <View style={styles.innerDivider} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.settingTitle}>Tự động mở dẫn đường Goong Map</Text>
              <Text style={styles.settingDesc}>Tự động căn chỉnh lộ trình tối ưu khi nhận đơn</Text>
            </View>
            <Switch
              value={autoNavigate}
              onValueChange={handleToggleAutoNav}
              trackColor={{ false: '#CBD5E1', true: '#BFDBFE' }}
              thumbColor={autoNavigate ? '#2563EB' : '#F1F5F9'}
            />
          </View>
        </View>

        {/* Section: Hỗ trợ tài xế */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="help-buoy" size={18} color="#2563EB" style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Hỗ trợ & Pháp lý Đối tác</Text>
          </View>

          <TouchableOpacity style={styles.menuRow} onPress={handleCallHotline} activeOpacity={0.7}>
            <View style={styles.menuRowIconWrap}>
              <Ionicons name="call" size={18} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuRowText, { color: '#DC2626', fontWeight: '700' }]}>
                Tổng đài khẩn cấp Tài xế 24/7
              </Text>
              <Text style={styles.menuRowSub}>Hotline: 0344999655 (Hỗ trợ 24/7)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
          <View style={styles.innerDivider} />

          <TouchableOpacity 
            style={styles.menuRow} 
            onPress={() => Alert.alert('Cẩm nang đối tác', 'Các quy tắc ứng xử, an toàn giao thông và cẩm nang hỗ trợ tài xế NKGO.')}
            activeOpacity={0.7}
          >
            <View style={styles.menuRowIconWrap}>
              <Ionicons name="book-outline" size={18} color="#475569" />
            </View>
            <Text style={styles.menuRowText}>Cẩm nang & Quy tắc ứng xử tài xế</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
          <View style={styles.innerDivider} />

          <TouchableOpacity 
            style={styles.menuRow} 
            onPress={() => setShowContractModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.menuRowIconWrap}>
              <Ionicons name="newspaper" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowText}>Hợp đồng điện tử & Điều khoản đối tác</Text>
              <Text style={styles.menuRowSub}>Đã ký điện tử • Có dấu mộc đỏ NKGO</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Nút Đăng xuất */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Đăng xuất tài khoản tài xế</Text>
        </TouchableOpacity>

        {/* Version info */}
        <Text style={styles.versionText}>NKGO Driver App • Phiên bản v1.0.0 (Đối tác)</Text>
      </ScrollView>

      {/* Modal sửa SĐT */}
      <Modal visible={showPhoneModal} transparent={true} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cập nhật Số điện thoại</Text>
            <Text style={styles.modalSub}>Nhập số điện thoại chính thức để khách hàng liên hệ khi đón/giao món.</Text>
            
            <TextInput
              style={styles.phoneInput}
              keyboardType="phone-pad"
              placeholder="Ví dụ: 0912345678"
              value={newPhone}
              onChangeText={setNewPhone}
              autoFocus={true}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setShowPhoneModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalSubmitBtn} 
                onPress={handleSavePhone}
                disabled={savingPhone}
                activeOpacity={0.7}
              >
                {savingPhone ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Lưu thay đổi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Chi tiết & Chụp lại Giấy tờ */}
      <Modal visible={!!selectedDoc} transparent={true} animationType="slide" onRequestClose={() => setSelectedDoc(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.docModalContent}>
            <View style={styles.docModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.docModalTitle}>{selectedDoc?.title}</Text>
                <Text style={styles.docModalSub}>{selectedDoc?.sub}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDoc(null)} style={styles.docCloseBtn}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Trạng thái duyệt */}
            <View style={styles.docStatusRow}>
              <Text style={styles.docStatusLabel}>Trạng thái xét duyệt:</Text>
              {renderDocBadge(selectedDoc?.status)}
            </View>

            {/* Nếu bị từ chối, hiện cảnh báo và lý do */}
            {selectedDoc?.status === 'REJECTED' && (
              <View style={styles.docModalRejectBox}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.docModalRejectTitle}>Lý do từ chối:</Text>
                  <Text style={styles.docModalRejectText}>
                    {driverDocs?.reject_reason || 'Ảnh bị mờ hoặc lóa đèn, vui lòng chụp lại rõ nét.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Ảnh giấy tờ preview */}
            <View style={styles.docPreviewWrap}>
              {selectedDoc?.imageUrl ? (
                <Image source={{ uri: selectedDoc.imageUrl }} style={styles.docPreviewImg} resizeMode="contain" />
              ) : (
                <View style={styles.noImgWrap}>
                  <Ionicons name="image-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.noImgText}>Chưa có ảnh giấy tờ</Text>
                </View>
              )}
            </View>

            {/* Nút hành động */}
            <View style={styles.docModalBtnRow}>
              <TouchableOpacity
                style={styles.reuploadBtn}
                onPress={handlePickDocImage}
                disabled={uploadingDoc}
                activeOpacity={0.8}
              >
                {uploadingDoc ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="camera-reverse" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.reuploadBtnText}>Chụp lại / Tải ảnh mới</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeDocModalBtn}
                onPress={() => setSelectedDoc(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.closeDocModalText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL HỢP ĐỒNG ĐIỆN TỬ ĐỐI TÁC CÓ DẤU MỘC ĐỎ NKGO */}
      <Modal
        visible={showContractModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowContractModal(false)}
      >
        <View style={styles.contractModalBackdrop}>
          <View style={styles.contractModalCard}>
            {/* Modal Header */}
            <View style={styles.contractHeaderTop}>
              <View style={styles.contractHeaderLeft}>
                <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
                <View>
                  <Text style={styles.contractHeaderMainTitle}>Hợp Đồng Điện Tử Đối Tác</Text>
                  <Text style={styles.contractHeaderSubTitle}>Chứng thực số theo Luật Giao dịch Điện tử</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.contractCloseBtn}
                onPress={() => setShowContractModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Paper Contract Document */}
            <ScrollView
              style={styles.contractPaperScroll}
              contentContainerStyle={styles.contractPaperContent}
              showsVerticalScrollIndicator={true}
            >
              {/* Quốc hiệu & Tiêu ngữ */}
              <View style={styles.contractDocHeader}>
                <Text style={styles.contractNation}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</Text>
                <Text style={styles.contractMotto}>Độc lập - Tự do - Hạnh phúc</Text>
                <Text style={styles.contractDividerLine}>----------o0o----------</Text>
                <Text style={styles.contractTitle}>HỢP ĐỒNG HỢP TÁC KINH DOANH DỊCH VỤ VẬN TẢI ĐIỆN TỬ</Text>
                <Text style={styles.contractCode}>Số: HDDT-NKGO/2026/TX-{driverId}</Text>
                <Text style={styles.contractLegalBasis}>
                  (Căn cứ Bộ luật Dân sự 2015 & Luật Giao dịch Điện tử số 20/2023/QH15)
                </Text>
              </View>

              {/* Thông tin 2 bên ký kết */}
              <View style={styles.partiesContainer}>
                {/* BÊN A */}
                <View style={styles.partyBox}>
                  <Text style={styles.partyTitle}>BÊN A: ĐƠN VỊ CUNG CẤP NỀN TẢNG CÔNG NGHỆ</Text>
                  <Text style={styles.partyRow}><Text style={styles.boldText}>Tên doanh nghiệp: </Text>CÔNG TY CỔ PHẦN CÔNG NGHỆ VẬN TẢI NKGO</Text>
                  <Text style={styles.partyRow}><Text style={styles.boldText}>Tên quốc tế: </Text>NKGO TECHNOLOGY JOINT STOCK COMPANY</Text>
                  <Text style={styles.partyRow}><Text style={styles.boldText}>Mã số thuế / GPĐKKD: </Text>0317899999 (Sở KH&ĐT TP.HCM)</Text>
                  <Text style={styles.partyRow}><Text style={styles.boldText}>Trụ sở chính: </Text>Tầng 12, Tòa nhà NKGO Tower, TP. Thủ Đức, TP. Hồ Chí Minh</Text>
                  <Text style={styles.partyRow}><Text style={styles.boldText}>Đại diện pháp luật: </Text>Ban Giám Đốc Nền Tảng NKGO</Text>
                  <Text style={styles.partyRow}><Text style={styles.boldText}>Hotline hỗ trợ đối tác: </Text>0344999655 (24/7)</Text>
                </View>

                {/* BÊN B */}
                <View style={[styles.partyBox, { marginTop: 12, borderColor: '#BFDBFE', backgroundColor: '#F0F9FF' }]}>
                  <Text style={[styles.partyTitle, { color: '#1E40AF' }]}>BÊN B: ĐỐI TÁC TÀI XẾ CÔNG NGHỆ (ĐỐI TÁC ĐỘC LẬP)</Text>
                  <Text style={styles.partyRow}><Text style={styles.boldText}>Họ và tên đối tác: </Text>{user?.fullName || 'Trần Thanh Khang'}</Text>
                  <Text style={styles.partyRow}><Text style={styles.boldText}>Mã định danh đối tác: </Text>#TX-{driverId}</Text>
                  <Text style={styles.partyRow}><Text style={styles.boldText}>Số điện thoại liên hệ: </Text>{phoneNumber}</Text>
                  <Text style={styles.partyRow}><Text style={styles.boldText}>Biển kiểm soát xe: </Text>{vehiclePlate}</Text>
                  <Text style={styles.partyRow}><Text style={styles.boldText}>Dịch vụ đăng ký: </Text>{serviceName}</Text>
                  <Text style={styles.partyRow}>
                    <Text style={styles.boldText}>Tình trạng hồ sơ: </Text>
                    <Text style={{ color: '#059669', fontWeight: '800' }}>ĐÃ THẨM ĐỊNH & PHÊ DUYỆT ĐẦY ĐỦ ✓</Text>
                  </Text>
                </View>
              </View>

              {/* Các điều khoản hợp đồng */}
              <View style={styles.articlesContainer}>
                <Text style={styles.articleHeader}>NỘI DUNG THỎA THUẬN HỢP TÁC:</Text>

                <View style={styles.articleItem}>
                  <Text style={styles.articleTitle}>Điều 1: Mục đích & Bản chất hợp tác kinh doanh</Text>
                  <Text style={styles.articleContent}>
                    1.1. Bên A đồng ý cấp quyền cho Bên B sử dụng phần mềm ứng dụng di động NKGO Driver để tiếp nhận các yêu cầu dịch vụ vận chuyển hành khách và giao đồ ăn/bưu phẩm từ khách hàng.{'\n'}
                    1.2. Mối quan hệ giữa Bên A và Bên B là quan hệ Hợp tác Kinh doanh (BCC) độc lập theo quy định của pháp luật Dân sự Việt Nam. Bên B hoàn toàn chủ động về thời gian, địa điểm và tần suất bật/tắt ứng dụng làm việc.
                  </Text>
                </View>

                <View style={styles.articleItem}>
                  <Text style={styles.articleTitle}>Điều 2: Doanh thu, Cước phí & Phí nền tảng (80/20)</Text>
                  <Text style={styles.articleContent}>
                    2.1. Cước phí chuyến đi được tính toán tự động, công khai, minh bạch theo thuật toán định vị và đo lường khoảng cách Goong Map.{'\n'}
                    2.2. Tỷ lệ phân chia doanh thu: Bên B (Tài xế) thực nhận <Text style={styles.boldText}>80%</Text> tổng cước phí chuyến xe. Bên A thu phí dịch vụ nền tảng công nghệ <Text style={styles.boldText}>20%</Text> (đã bao gồm chi phí bảo hiểm chuyến đi và vận hành máy chủ).{'\n'}
                    2.3. Tiền cước được ghi nhận tự động vào Ví tài xế ngay sau khi cuốc xe kết thúc. Bên B có quyền tạo lệnh rút tiền về tài khoản ngân hàng liên kết 24/7.
                  </Text>
                </View>

                <View style={styles.articleItem}>
                  <Text style={styles.articleTitle}>Điều 3: Tiêu chuẩn an toàn & Quy tắc ứng xử</Text>
                  <Text style={styles.articleContent}>
                    3.1. Bên B cam kết tuân thủ nghiêm chỉnh Luật Giao thông Đường bộ Việt Nam, luôn đội mũ bảo hiểm đạt chuẩn cho bản thân và hành khách.{'\n'}
                    3.2. Không sử dụng rượu, bia, chất kích thích hoặc sử dụng điện thoại khi đang điều khiển phương tiện chở khách.{'\n'}
                    3.3. Giữ gìn thái độ lịch sự, văn minh; tuyệt đối không vòi vĩnh tiền cước hoặc tiền tip ngoài phần mềm.{'\n'}
                    3.4. Nghiêm cấm hành vi "chạy cuốc ngoài" (hủy chuyến trên app để bắt khách trả tiền riêng) và nghiêm cấm hành vi sử dụng phần mềm giả lập định vị GPS.{'\n'}
                    3.5. Bảo mật tuyệt đối thông tin cá nhân và số điện thoại của hành khách; không tự ý liên hệ sau chuyến đi vì mục đích cá nhân.
                  </Text>
                </View>

                <View style={styles.articleItem}>
                  <Text style={styles.articleTitle}>Điều 4: Quyền lợi bảo vệ & Bảo hiểm tai nạn chuyến đi</Text>
                  <Text style={styles.articleContent}>
                    4.1. Mọi cuốc xe thực hiện hợp lệ qua ứng dụng NKGO đều được bảo vệ bởi Hợp đồng Bảo hiểm Tai nạn Dân sự tự động dành cho cả Tài xế và Hành khách.{'\n'}
                    4.2. Bên A cung cấp đường dây nóng hỗ trợ khẩn cấp 24/7 (Hotline: 0344999655) để hỗ trợ tài xế trong trường hợp khẩn cấp hoặc sự cố giao thông.
                  </Text>
                </View>

                <View style={styles.articleItem}>
                  <Text style={styles.articleTitle}>Điều 5: Hiệu lực hợp đồng điện tử</Text>
                  <Text style={styles.articleContent}>
                    5.1. Hợp đồng này được khởi tạo dưới dạng thông điệp dữ liệu điện tử, có giá trị pháp lý tương đương bản gốc theo Luật Giao dịch Điện tử.{'\n'}
                    5.2. Hợp đồng có hiệu lực kể từ thời điểm tài xế hoàn tất xác thực thông tin và được Ban Quản Trị NKGO phê duyệt kích hoạt tài khoản.
                  </Text>
                </View>
              </View>

              {/* Phần Ký tên & Dấu mộc đỏ NKGO */}
              <View style={styles.signatureSection}>
                <View style={styles.signatureRow}>
                  {/* Chữ ký Bên B: Tài xế */}
                  <View style={styles.signatureCol}>
                    <Text style={styles.signRoleTitle}>ĐỐI TÁC TÀI XẾ</Text>
                    <Text style={styles.signMethod}>(Đã ký xác thực điện tử qua OTP)</Text>
                    <View style={styles.digitalSignBox}>
                      <Text style={styles.scriptSignatureText}>{user?.fullName || 'Trần Thanh Khang'}</Text>
                    </View>
                    <Text style={styles.signerName}>{user?.fullName || 'Trần Thanh Khang'}</Text>
                    <Text style={styles.signDateText}>Mã TX: #TX-{driverId}</Text>
                  </View>

                  {/* Chữ ký Bên A & DẤU MỘC ĐỎ NKGO */}
                  <View style={styles.signatureCol}>
                    <Text style={styles.signRoleTitle}>ĐẠI DIỆN NỀN TẢNG NKGO</Text>
                    <Text style={styles.signMethod}>(Ký số & Đóng dấu điện tử)</Text>
                    
                    {/* DẤU MỘC ĐỎ TRÒN CHÍNH THỨC CỦA NKGO */}
                    <View style={styles.sealWrapper}>
                      <View style={styles.sealOuterCircle}>
                        <View style={styles.sealInnerCircle}>
                          <Text style={styles.sealTextTop}>CÔNG TY CỔ PHẦN</Text>
                          <Text style={styles.sealBrandName}>CÔNG NGHỆ NKGO</Text>
                          <View style={styles.sealStarRow}>
                            <Ionicons name="star" size={10} color="#DC2626" />
                            <Text style={styles.sealCenterText}>ĐÃ XÁC THỰC</Text>
                            <Ionicons name="star" size={10} color="#DC2626" />
                          </View>
                          <Text style={styles.sealTaxId}>M.S.D.N: 0317899999</Text>
                          <Text style={styles.sealTextBottom}>TP. HỒ CHÍ MINH</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.signerName}>Nguyễn Kim Long</Text>
                    <Text style={styles.signDateText}>Tổng Giám Đốc Điều Hành</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Modal Bottom Bar */}
            <View style={styles.contractModalFooter}>
              <TouchableOpacity
                style={styles.contractAcceptBtn}
                onPress={() => {
                  setShowContractModal(false);
                  Alert.alert('Hợp đồng đã xác thực', 'Hợp đồng điện tử đối tác NKGO của bạn đang có hiệu lực pháp lý đầy đủ.');
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.contractAcceptBtnText}>Tôi Đã Hiểu & Chấp Thuận Điều Khoản</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  driverCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  driverInfoLeft: {
    flex: 1,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 0.2,
  },
  driverName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  phoneText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  codeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
  avatarWrap: {
    position: 'relative',
    marginLeft: 16,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  steeringBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 12,
  },
  quickActionItem: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  quickActionSub: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginTop: 14,
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoKey: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  infoVal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
  licensePlate: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  licensePlateText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#854D0E',
    letterSpacing: 0.5,
  },
  innerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  docIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  docSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  badgeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeWarningText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  badgeDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  badgeDangerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  docAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 10,
  },
  docAlertTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  docAlertDesc: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  docModalContent: {
    width: '92%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  docModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
  },
  docModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  docModalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  docCloseBtn: {
    padding: 4,
  },
  docStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  docStatusLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  docModalRejectBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 10,
  },
  docModalRejectTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  docModalRejectText: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  docPreviewWrap: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  docPreviewImg: {
    width: '100%',
    height: '100%',
  },
  noImgWrap: {
    alignItems: 'center',
  },
  noImgText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
  },
  docModalBtnRow: {
    flexDirection: 'column',
    gap: 8,
  },
  reuploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
  },
  reuploadBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  closeDocModalBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  closeDocModalText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
  },
  menuRowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  menuRowSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 18,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  phoneInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // CONTRACT MODAL & RED SEAL STYLES
  contractModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  contractModalCard: {
    width: '100%',
    maxWidth: 520,
    height: '95%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  contractHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  contractHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contractHeaderMainTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  contractHeaderSubTitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  contractCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  contractPaperScroll: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  contractPaperContent: {
    padding: 20,
  },
  contractDocHeader: {
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 16,
    marginBottom: 16,
  },
  contractNation: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  contractMotto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  contractDividerLine: {
    color: '#94A3B8',
    fontSize: 11,
    marginVertical: 4,
  },
  contractTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E3A8A',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
  },
  contractCode: {
    fontSize: 11.5,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 4,
  },
  contractLegalBasis: {
    fontSize: 10.5,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
  },
  partiesContainer: {
    marginBottom: 16,
  },
  partyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  partyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 4,
  },
  partyRow: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 3,
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  articlesContainer: {
    marginBottom: 20,
  },
  articleHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  articleItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  articleTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 6,
  },
  articleContent: {
    fontSize: 11.5,
    color: '#334155',
    lineHeight: 18,
  },
  signatureSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginTop: 6,
    marginBottom: 10,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  signatureCol: {
    flex: 1,
    alignItems: 'center',
  },
  signRoleTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  signMethod: {
    fontSize: 9.5,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 6,
  },
  digitalSignBox: {
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scriptSignatureText: {
    fontSize: 20,
    fontStyle: 'italic',
    fontWeight: '700',
    color: '#1E40AF',
    transform: [{ rotate: '-8deg' }],
    letterSpacing: 1,
  },
  signerName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginTop: 4,
  },
  signDateText: {
    fontSize: 9.5,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 1,
  },
  // OFFICIAL RED SEAL STAMP
  sealWrapper: {
    height: 125,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '-10deg' }],
    marginVertical: 4,
  },
  sealOuterCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2.5,
    borderColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(254, 242, 242, 0.4)',
  },
  sealInnerCircle: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  sealTextTop: {
    color: '#DC2626',
    fontSize: 7.5,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  sealBrandName: {
    color: '#DC2626',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 1,
  },
  sealStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginVertical: 2,
  },
  sealCenterText: {
    color: '#DC2626',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  sealTaxId: {
    color: '#DC2626',
    fontSize: 7,
    fontWeight: '800',
  },
  sealTextBottom: {
    color: '#DC2626',
    fontSize: 7.5,
    fontWeight: '800',
    marginTop: 1,
    letterSpacing: 0.3,
  },
  contractModalFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    padding: 14,
  },
  contractAcceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  contractAcceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '800',
  },
});
