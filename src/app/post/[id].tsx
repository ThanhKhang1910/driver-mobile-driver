import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axiosClient from '@/api/axiosClient';
import { useAuth } from '@/context/AuthContext';

interface Post {
  post_id: number;
  author_id: number;
  author_type: string;
  author_name: string;
  content: string;
  image_url: string;
  location_name: string;
  category: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_liked: boolean;
  is_following?: boolean;
}

interface Comment {
  comment_id: number;
  post_id: number;
  author_id: number;
  author_type: string;
  author_name: string;
  content: string;
  created_at: string;
}

export default function PostDetailScreen() {
  const { id, focusComment } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = React.useRef<TextInput>(null);

  useEffect(() => {
    fetchPostData();
  }, [id]);

  useEffect(() => {
    if (!loading && post && focusComment === 'true') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, [loading, post, focusComment]);

  const fetchPostData = async () => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        axiosClient.get(`/social/posts/${id}`),
        axiosClient.get(`/social/posts/${id}/comments`)
      ]);
      setPost(postRes.data);
      setComments(commentsRes.data || []);
    } catch (error) {
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPostData();
    setRefreshing(false);
  };

  const handleLike = async () => {
    if (!post) return;
    setPost({
      ...post,
      is_liked: !post.is_liked,
      likes_count: post.is_liked ? Math.max(post.likes_count - 1, 0) : post.likes_count + 1
    });

    try {
      await axiosClient.post(`/social/posts/${post.post_id}/like`);
    } catch (error) {
      fetchPostData(); // revert
    }
  };

  const handleFollow = async () => {
    if (!post) return;
    
    // Optimistic update
    setPost({
      ...post,
      is_following: !post.is_following
    });

    try {
      await axiosClient.post(`/social/users/${post.author_id}/follow`);
    } catch (error) {
      // Revert on error
      fetchPostData();
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || submitting || !post) return;
    setSubmitting(true);
    try {
      await axiosClient.post(`/social/posts/${post.post_id}/comments`, {
        content: newComment.trim()
      });
      setNewComment('');
      // refetch comments
      const res = await axiosClient.get(`/social/posts/${post.post_id}/comments`);
      setComments(res.data || []);
      setPost({ ...post, comments_count: post.comments_count + 1 });
    } catch (error) {
      console.error('Error sending comment', error);
      Alert.alert('Lỗi', 'Không thể gửi bình luận lúc này');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId: number) => {
    Alert.alert('Xác nhận', 'Bạn có chắc chắn muốn xóa bình luận này không?', [
      { text: 'Hủy', style: 'cancel' },
      { 
        text: 'Xóa', 
        style: 'destructive',
        onPress: async () => {
          try {
            await axiosClient.delete(`/social/comments/${commentId}`);
            setComments(comments.filter(c => c.comment_id !== commentId));
            if (post) {
              setPost({ ...post, comments_count: Math.max(post.comments_count - 1, 0) });
            }
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa bình luận');
          }
        }
      }
    ]);
  };

  const handleReply = (authorName: string) => {
    setNewComment(`@${authorName} `);
    inputRef.current?.focus();
  };

  const navigateToAuthor = () => {
    if (post && post.author_type === 'RESTAURANT') {
      router.push(`/restaurant/${post.author_id}`);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3399FF" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text>Không tìm thấy bài viết.</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết bài viết</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Post Detail */}
        <View style={styles.postCard}>
          <View style={styles.authorRow}>
            <TouchableOpacity style={styles.authorInfo} onPress={navigateToAuthor}>
              <View style={styles.authorAvatar}>
                <Text style={{fontSize: 20}}>{post.author_type === 'RESTAURANT' ? '🏪' : '👤'}</Text>
              </View>
              <View>
                <Text style={styles.authorName}>{post.author_name}</Text>
                <Text style={styles.postTime}>{formatDate(post.created_at)}</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.followBtn, post.is_following && styles.followingBtn]} 
              onPress={handleFollow}
            >
              <Text style={[styles.followBtnText, post.is_following && styles.followingBtnText]}>
                {post.is_following ? 'Đang theo dõi' : 'Theo dõi'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.postContent}>{post.content}</Text>

          {post.image_url ? (
            <Image source={{ uri: post.image_url }} style={styles.postImage} />
          ) : null}

          <View style={styles.statsRow}>
            <Text style={styles.statsText}>{post.likes_count} lượt thích</Text>
            <Text style={styles.statsText}>{post.comments_count} bình luận</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleLike}>
              <Ionicons name={post.is_liked ? "heart" : "heart-outline"} size={22} color={post.is_liked ? "#E53E3E" : "#64748B"} />
              <Text style={styles.actionText}>{post.is_liked ? 'Đã thích' : 'Thích'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Ionicons name="chatbubble-outline" size={20} color="#64748B" />
              <Text style={styles.actionText}>Bình luận</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsContainer}>
          <Text style={styles.commentsHeader}>Bình luận</Text>
          {comments.map((cmt) => (
            <View key={cmt.comment_id} style={styles.commentItem}>
              <View style={styles.commentAvatar}>
                <Text style={{fontSize: 16}}>{cmt.author_type === 'RESTAURANT' ? '🏪' : '👤'}</Text>
              </View>
              <View style={styles.commentContentBox}>
                <Text style={styles.commentAuthorName}>{cmt.author_name}</Text>
                <Text style={styles.commentText}>{cmt.content}</Text>
                <View style={styles.commentActionRow}>
                  <Text style={styles.commentTime}>{formatDate(cmt.created_at)}</Text>
                  <TouchableOpacity onPress={() => handleReply(cmt.author_name)} style={styles.replyBtn}>
                    <Text style={styles.replyText}>Trả lời</Text>
                  </TouchableOpacity>
                  {user?.id === cmt.author_id && (
                    <TouchableOpacity onPress={() => handleDeleteComment(cmt.comment_id)} style={styles.replyBtn}>
                      <Text style={[styles.replyText, {color: '#E53E3E'}]}>Xóa</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
          {comments.length === 0 && (
            <Text style={styles.noCommentText}>Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</Text>
          )}
        </View>
      </ScrollView>

      {/* Comment Input Box */}
      <View style={[styles.commentInputBox, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          ref={inputRef}
          style={styles.commentInput}
          placeholder="Viết bình luận..."
          value={newComment}
          onChangeText={setNewComment}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSendComment} disabled={submitting}>
          {submitting ? (
             <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="send" size={20} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  postCard: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
  },
  authorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6FFFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  postTime: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  followBtn: {
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3399FF',
  },
  followBtnText: {
    color: '#3399FF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  followingBtn: {
    backgroundColor: '#F7F7F7',
    borderColor: '#CCC',
  },
  followingBtnText: {
    color: '#888',
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
    color: '#0F172A',
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  statsText: {
    fontSize: 13,
    color: '#64748B',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  actionText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  commentsContainer: {
    backgroundColor: '#FFF',
    padding: 16,
  },
  commentsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#0F172A',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6FFFA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  commentContentBox: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    padding: 12,
    borderRadius: 12,
  },
  commentAuthorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#0F172A',
  },
  commentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  commentTime: {
    fontSize: 11,
    color: '#64748B',
  },
  replyBtn: {
    marginLeft: 12,
  },
  replyText: {
    fontSize: 12,
    color: '#3399FF',
    fontWeight: 'bold',
  },
  noCommentText: {
    textAlign: 'center',
    color: '#64748B',
    fontStyle: 'italic',
    marginTop: 10,
  },
  commentInputBox: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    alignItems: 'center',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3399FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});
