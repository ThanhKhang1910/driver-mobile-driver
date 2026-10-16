import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '@/api/axiosClient';
import { useAuth } from '@/context/AuthContext';

interface Subscription {
  status: string;
  planType: string;
  expiresAt?: string;
  createdAt?: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await axiosClient.get('/membership/active');
        if (
          response.data.status === 'active' ||
          response.data.status === 'pending'
        ) {
          setSubscription(response.data);
        }
      } catch (error) {
        console.log('Error fetching subscription:', error);
      }
    };
    fetchSubscription();
  }, []);

  const handleLogout = async () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Profile Grab Style */}
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.profileHeaderGrab}>
          <View style={styles.profileInfoText}>
            <Text style={styles.profileNameGrab}>{user?.fullName || 'Người dùng'}</Text>
            <TouchableOpacity style={styles.phoneRow}>
              <Text style={styles.profilePhone}>{user?.phone || 'Chưa cung cấp SĐT'}</Text>
              <Ionicons name="chevron-forward" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.avatarContainerGrab}>
            <Text style={styles.avatarTextGrab}>
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionBlock} onPress={() => router.push('/(tabs)/activity' as any)}>
            <Ionicons name="receipt-outline" size={24} color="#0F172A" />
            <Text style={styles.actionBlockText}>Đơn hàng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBlock}>
            <Ionicons name="bookmark-outline" size={24} color="#0F172A" />
            <Text style={styles.actionBlockText}>Đã lưu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBlock}>
            <Ionicons name="star-outline" size={24} color="#0F172A" />
            <Text style={styles.actionBlockText}>Đánh giá</Text>
          </TouchableOpacity>
        </View>

        {/* Premium Banner */}
        {subscription && (
          <TouchableOpacity style={styles.premiumBannerGrab}>
            <View style={styles.premiumLeft}>
              <Text style={styles.premiumTitle}>Premium</Text>
              <Text style={styles.premiumSub}>Thành viên cao cấp NKGO</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#3399FF" />
          </TouchableOpacity>
        )}

        {/* List Menu */}
        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Thanh toán</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Ưu đãi</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Địa chỉ đã lưu</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuGroup}>
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Trung tâm trợ giúp</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem}>
            <Text style={styles.menuItemText}>Cài đặt</Text>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Text style={[styles.menuItemText, { color: '#E53E3E' }]}>Đăng xuất</Text>
            <Ionicons name="log-out-outline" size={20} color="#E53E3E" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.versionText}>NKGO v1.0.0</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerTop: {
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeaderGrab: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  profileInfoText: {
    flex: 1,
  },
  profileNameGrab: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePhone: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '500',
    marginRight: 4,
  },
  avatarContainerGrab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3399FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextGrab: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 30,
    marginBottom: 8,
  },
  actionBlock: {
    alignItems: 'center',
  },
  actionBlockText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    marginTop: 8,
  },
  premiumBannerGrab: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5D780',
  },
  premiumLeft: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3399FF',
    marginBottom: 2,
  },
  premiumSub: {
    fontSize: 13,
    color: '#8B6914',
  },
  menuGroup: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 20,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 20,
  },
});
