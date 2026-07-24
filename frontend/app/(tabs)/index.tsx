import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { apiRequest } from '../api';

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

export default function CoursesScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(false);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/courses/');
      setCourses(data);
      setFilteredCourses(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not fetch course catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reload courses on screen focus
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCourses();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    let result = courses;

    if (selectedCategory !== 'All') {
      result = result.filter(c => c.category === selectedCategory);
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(query) ||
        (c.description && c.description.toLowerCase().includes(query)) ||
        (c.instructor && c.instructor.toLowerCase().includes(query))
      );
    }

    setFilteredCourses(result);
  }, [search, selectedCategory, courses]);

  const handleCourseClick = async (course: Course) => {
    try {
      const verify = await apiRequest(`/courses/${course.id}/verify`);
      
      if (verify.locked) {
        const promptText = verify.reason === 'Not enrolled'
          ? `Would you like to buy "${course.title}" for $${course.fee.toFixed(2)}?\n(Access window: ${course.duration_days} days)`
          : `Your enrollment has expired. Would you like to buy access again?`;

        Alert.alert(
          'Course Locked',
          promptText,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Buy Access', onPress: () => handlePurchase(course.id) }
          ]
        );
      } else {
        router.push(`/course/${course.id}`);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not verify access.');
    }
  };

  const handlePurchase = async (courseId: number) => {
    try {
      const res = await apiRequest(`/courses/purchase/${courseId}`, {
        method: 'POST',
      });
      Alert.alert('Success', res.message || 'Access granted!');
      router.push(`/course/${courseId}`);
    } catch (err: any) {
      Alert.alert('Purchase Failed', err.message || 'Could not purchase.');
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.round(rating || 4.8);
    return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Available Courses</Text>
      <Text style={styles.subheader}>Expand your knowledge with secure lectures</Text>

      {/* Category Pills */}
      <View style={styles.pillsContainer}>
        {['All', 'Development', 'Design', 'Business'].map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.pill, selectedCategory === cat && styles.pillActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.pillText, selectedCategory === cat && styles.pillTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Input */}
      <TextInput
        style={styles.searchInput}
        placeholder="🔍 Search courses or instructors..."
        placeholderTextColor="#6B7280"
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#EC4899" size="large" />
      ) : (
        <FlatList
          data={filteredCourses}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No courses match your search criteria.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handleCourseClick(item)}>
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
                <Text style={styles.cardPrice}>${item.fee.toFixed(2)}</Text>
                <Text style={styles.cardDuration}>⏱ {item.duration_days} days validity</Text>
              </View>
            </TouchableOpacity>
          )}
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
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pillActive: {
    backgroundColor: '#EC4899',
    borderColor: 'transparent',
  },
  pillText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  searchInput: {
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: '#FFFFFF',
    paddingHorizontal: 20,
    fontSize: 14,
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
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#C084FC',
  },
  cardDuration: {
    fontSize: 12,
    color: '#6B7280',
  },
});
