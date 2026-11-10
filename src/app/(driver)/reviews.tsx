import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '@/api/axiosClient';

interface DriverReview {
  review_id: number;
  rating: number;
  comment: string;
  created_at: string;
  customer_name?: string;
  service_type?: string;
}

export default function DriverReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reviews, setReviews] = useState<DriverReview[]>([]);
  const [averageRating, setAverageRating] = useState(5.0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 60FPS Entry Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(headerAnim, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.spring(contentAnim, {
        toValue: 1,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnim, contentAnim]);

  const fetchReviews = async () => {
    try {
      const res = await axiosClient.get('/driver/reviews');
      setReviews(res.data.reviews || []);
      setAverageRating(res.data.averageRating || 5.0);
      setTotalReviews(res.data.totalReviews || 0);
    } catch (err) {
      console.error('Fetch driver reviews error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const renderReviewItem = ({ item }: { item: DriverReview }) => {
    const dateFormatted = new Date(item.created_at).toLocaleDateString('vi-VN');

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.customerRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {item.customer_name ? item.customer_name.charAt(0).toUpperCase() : 'K'}
              </Text>
            </View>
            <View>
              <Text style={styles.customerName}>{item.customer_name || 'Khách hàng'}</Text>
              <Text style={styles.reviewDate}>{dateFormatted}</Text>
            </View>
          </View>

          <View style={styles.starsRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name="star"
                size={14}
                color={i < item.rating ? '#F59E0B' : '#E2E8F0'}
              />
            ))}
          </View>
        </View>

        <Text style={styles.commentText}>
          "{item.comment || 'Dịch vụ tốt, tài xế đúng giờ và thân thiện!'}"
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header NK Go Green Gradient */}
      <Animated.View
        style={{
          opacity: headerAnim,
          transform: [
            {
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        }}
      >
        <LinearGradient
          colors={['#174A1B', '#236E27', '#388E3C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 8 }]}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đánh Giá Của Khách</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>
      </Animated.View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
        </View>
      ) : (
        <Animated.View
          style={{
            flex: 1,
            opacity: contentAnim,
            transform: [
              {
                translateY: contentAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          }}
        >
          <FlatList
            data={reviews}
            keyExtractor={(item) => String(item.review_id)}
            renderItem={renderReviewItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} />
            }
            ListHeaderComponent={
              <>
                {/* Overall Rating Hero Card */}
                <View style={styles.heroCard}>
                  <View style={styles.heroLeft}>
                    <Text style={styles.bigScore}>{averageRating}</Text>
                    <View style={styles.starsRowLarge}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Ionicons key={i} name="star" size={16} color="#F59E0B" />
                      ))}
                    </View>
                    <Text style={styles.totalCount}>Dựa trên {totalReviews} lượt đánh giá</Text>
                  </View>

                  <View style={styles.heroRight}>
                    <View style={styles.badgeBox}>
                      <Text style={styles.badgeEmoji}>🏆</Text>
                      <Text style={styles.badgeTitle}>Tài xế tiêu chuẩn 5 sao</Text>
                      <Text style={styles.badgeSub}>Luôn đúng giờ & thân thiện</Text>
                    </View>
                  </View>
                </View>

                {/* Section Header */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Nhận xét gần đây ({reviews.length})</Text>
                </View>
              </>
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Ionicons name="chatbubbles-outline" size={60} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Chưa có nhận xét nào</Text>
                <Text style={styles.emptySub}>
                  Sau mỗi chuyến đi hoàn thành, phản hồi từ khách hàng sẽ xuất hiện tại đây
                </Text>
              </View>
            }
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#174A1B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  heroLeft: {
    alignItems: 'center',
    flex: 1,
  },
  bigScore: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0F172A',
  },
  starsRowLarge: {
    flexDirection: 'row',
    gap: 2,
    marginVertical: 4,
  },
  totalCount: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  heroRight: {
    flex: 1.2,
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
    paddingLeft: 14,
  },
  badgeBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  badgeEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1B5E20',
    textAlign: 'center',
  },
  badgeSub: {
    fontSize: 10,
    color: '#2E7D32',
    textAlign: 'center',
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E7D32',
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  reviewDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  commentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 13,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
