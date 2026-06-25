import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3399FF" />
        <Text style={styles.text}>Đang tải hệ thống...</Text>
      </View>
    );
  }

  if (user) {
    if (user.role === 'DRIVER') {
      return <Redirect href="/(driver)/home" />;
    } else {
      return <Redirect href="/(auth)/login" />;
    }
  } else {
    return <Redirect href="/(auth)/login" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  text: {
    marginTop: 12,
    fontSize: 14,
    color: '#888888',
    fontWeight: '500',
  },
});
