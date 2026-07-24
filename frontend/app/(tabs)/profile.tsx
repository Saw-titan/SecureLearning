import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { getAuthSession, setAuthSession } from '../api';

export default function ProfileScreen() {
  const router = useRouter();
  const session = getAuthSession();

  const handleLogout = () => {
    setAuthSession(null, 'student@elearning.com', false);
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>U</Text>
        </View>
        <Text style={styles.email}>{session.email}</Text>
        <Text style={styles.role}>{session.isAdmin ? 'Administrator' : 'Student'}</Text>

        <View style={styles.menu}>
          {session.isAdmin && (
            <TouchableOpacity 
              style={styles.btnSecondary} 
              onPress={() => router.push('/(admin)/upload')}
            >
              <Text style={styles.btnSecondaryText}>⚙️ Admin Dashboard</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.btnDanger} onPress={handleLogout}>
            <Text style={styles.btnDangerText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060608',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 28,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  email: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  role: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 32,
  },
  menu: {
    width: '100%',
    gap: 12,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    height: 52,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
  },
  btnDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    height: 52,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDangerText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
