import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>🛡️</Text>
        </View>
        <Text style={styles.title}>LearnSecure</Text>
        <Text style={styles.subtitle}>
          Secure, premium e-learning content. Protect your intellectual property, empower your future.
        </Text>
        
        <TouchableOpacity 
          style={styles.btnPrimary} 
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.btnText}>Sign In</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.btnSecondary} 
          onPress={() => router.push('/(auth)/signup')}
        >
          <Text style={styles.btnSecondaryText}>Create Account</Text>
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
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  logoBadge: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#EC4899',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  logoText: {
    fontSize: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 44,
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
});
