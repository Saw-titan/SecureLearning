import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { apiRequest, getCompletedLessons } from '../api';

interface Course {
  id: number;
  title: string;
  description: string;
  fee: number;
  duration_days: number;
  instructor: string;
  category: string;
  rating: number;
  reviews_count: number;
}

export default function MyCoursesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEnrolledCourses = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/courses/enrolled');
      setEnrolledCourses(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not fetch your enrolled courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEnrolledCourses();
    });
    return unsubscribe;
  }, [navigation]);

  const renderStars = (rating: number) => {
    const fullStars = Math.round(rating || 4.8);
    return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
  };

  const getProgressPercent = (courseId: number) => {
    const completed = getCompletedLessons(courseId);
    return Math.round((completed.length / 3) * 100);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Learning</Text>
      <Text style={styles.subheader}>Your purchased active courses and progress</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#EC4899" size="large" />
      ) : (
        <FlatList
          data={enrolledCourses}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>You haven't purchased any courses yet.</Text>
          }
          renderItem={({ item }) => {
            const percent = getProgressPercent(item.id);
            return (
              <TouchableOpacity style={styles.card} onPress={() => router.push(`/course/${item.id}`)}>
                <Text style={styles.cardTag}>{item.category || 'Development'}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardInstructor}>By {item.instructor || 'Admin Instructor'}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingVal}>{(item.rating || 4.8).toFixed(1)} </Text>
                  <Text style={styles.ratingStars}>{renderStars(item.rating)}</Text>
                  <Text style={styles.ratingCount}> ({item.reviews_count || 15})</Text>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.cardPrice}>Enrolled</Text>
                  <Text style={styles.cardDuration}>⏱ {item.duration_days} days validity</Text>
                </View>

                {/* Progress Bar UI */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${percent}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{percent}% Complete</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060608',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subheader: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 40,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  cardTag: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  cardInstructor: {
    fontSize: 12,
    color: '#818CF8',
    fontWeight: '500',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  ratingVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  ratingStars: {
    fontSize: 12,
    color: '#FBBF24',
  },
  ratingCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
    paddingTop: 12,
    marginBottom: 12,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  cardDuration: {
    fontSize: 12,
    color: '#6B7280',
  },
  progressContainer: {
    width: '100%',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 4,
  },
});
