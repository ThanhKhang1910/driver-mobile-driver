import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [reviews, setReviews] = useState<DriverReview[]>([]);
  const [averageRating, setAverageRating] = useState(5.0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh Giá Của Khách</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => String(item.review_id)}
          renderItem={renderReviewItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F59E0B']} />
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
      )}
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
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
    borderColor: '#E2E8F0',
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
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
    textAlign: 'center',
  },
  badgeSub: {
    fontSize: 10,
    color: '#D97706',
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
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#3399FF',
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
