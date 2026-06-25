import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PlaceholderScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Ionicons name="construct-outline" size={80} color="#3399FF" />
      <Text style={styles.title}>Đang phát triển</Text>
      <Text style={styles.subtitle}>Tính năng này đang được xây dựng. Vui lòng quay lại sau!</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Quay lại</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0F172A', marginTop: 20, marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 30, lineHeight: 24 },
  button: { backgroundColor: '#3399FF', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});

