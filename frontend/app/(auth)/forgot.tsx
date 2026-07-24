import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '../api';

export default function ForgotScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1); // 1 = Request, 2 = Reset
  const [loading, setLoading] = useState(false);

  const handleRequestToken = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email.');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      Alert.alert('Success', 'Reset token generated! Copy the 32-character token printed in the Python backend logs.');
      setStep(2);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not request token.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async () => {
    if (!token || !newPassword) {
      Alert.alert('Error', 'Please enter both the token and your new password.');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, token, new_password: newPassword }),
      });

      Alert.alert('Success', 'Password reset successfully! Please sign in.');
      router.replace('/(auth)/login');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        
        {step === 1 ? (
          <View style={{ width: '100%' }}>
            <Text style={styles.subHeader}>
              Enter your email. The reset token will be printed in the Python server logs.
            </Text>
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
            <TouchableOpacity 
              style={styles.btnPrimary} 
              onPress={handleRequestToken}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Request Reset Token</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ width: '100%' }}>
            <Text style={styles.subHeader}>
              Enter the 32-character token printed in the server logs and specify your new password.
            </Text>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="Reset Token"
                placeholderTextColor="#6B7280"
                autoCapitalize="none"
                value={token}
                onChangeText={setToken}
              />
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#6B7280"
                secureTextEntry={true}
                autoCapitalize="none"
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>
            <TouchableOpacity 
              style={styles.btnPrimary} 
              onPress={handleResetSubmit}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.btnText}>Confirm New Password</Text>}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.btnTextLink} 
              onPress={() => setStep(1)}
            >
              <Text style={styles.btnTextLinkText}>← Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity 
          style={styles.btnSecondary} 
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.btnSecondaryText}>Cancel</Text>
        </TouchableOpacity>
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
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  subHeader: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 14,
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
    marginTop: 10,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    height: 52,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  btnSecondaryText: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
  },
  btnTextLink: {
    alignSelf: 'center',
    paddingVertical: 8,
    marginBottom: 10,
  },
  btnTextLinkText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
});
