import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '../api';

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, is_admin: false }),
      });

      Alert.alert('Success', 'Account created successfully! Please sign in.');
      router.replace('/(auth)/login');
    } catch (err: any) {
      Alert.alert('Signup Failed', err.message || 'Could not register.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Get Started</Text>
        <Text style={styles.subHeader}>Create your student account</Text>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6B7280"
            secureTextEntry={true}
            autoCapitalize="none"
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity 
          style={styles.btnPrimary} 
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.btnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.signInLink}>Sign In</Text>
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subHeader: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 18,
    width: '100%',
  },
  input: {
    height: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 15,
  },
  btnPrimary: {
    backgroundColor: '#EC4899',
    borderRadius: 12,
    height: 52,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  signInLink: {
    color: '#A78BFA',
    fontSize: 14,
    fontWeight: '600',
  },
});
