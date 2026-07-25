import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { apiRequest } from '../api';
import * as DocumentPicker from 'expo-document-picker';

interface Course {
  id: number;
  title: string;
  description: string;
  fee: number;
  duration_days: number;
  instructor: string;
  category: string;
}

export default function AdminScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  // Forms states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Add course inputs
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructor, setInstructor] = useState('');
  const [category, setCategory] = useState('Development');
  const [fee, setFee] = useState('');
  const [duration, setDuration] = useState('30');

  // Selected files states
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [selectedNotes, setSelectedNotes] = useState<any>(null);

  // Edit course inputs
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editInstructor, setEditInstructor] = useState('');
  const [editCategory, setEditCategory] = useState('Development');
  const [editFee, setEditFee] = useState('');
  const [editDuration, setEditDuration] = useState('30');

  // File picker handlers
  const handlePickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        setSelectedVideo(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open video file picker.');
    }
  };

  const handlePickNotes = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        setSelectedNotes(result.assets[0]);
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open PDF file picker.');
    }
  };

  const fetchAdminCatalog = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/courses/');
      setCourses(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not load courses catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAdminCatalog();
    });
    return unsubscribe;
  }, [navigation]);

  const handleCreateCourse = async () => {
    if (!title || !instructor || !fee || !duration) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (!selectedVideo || !selectedNotes) {
      Alert.alert('Error', 'Please select both a lecture video and a notes PDF file.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('instructor', instructor);
    formData.append('category', category);
    formData.append('fee', parseFloat(fee).toString());
    formData.append('duration_days', parseInt(duration).toString());
    
    // Attach real files picked from the device
    formData.append('video', {
      uri: selectedVideo.uri,
      name: selectedVideo.name,
      type: selectedVideo.mimeType || 'video/mp4'
    } as any);

    formData.append('notes', {
      uri: selectedNotes.uri,
      name: selectedNotes.name,
      type: selectedNotes.mimeType || 'application/pdf'
    } as any);

    setLoading(true);
    try {
      await apiRequest('/admin/courses', {
        method: 'POST',
        body: formData,
      });

      Alert.alert('Success', 'Course published successfully!');
      setShowUploadModal(false);
      resetAddForm();
      fetchAdminCatalog();
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Could not upload course.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpen = (course: Course) => {
    setEditId(course.id);
    setEditTitle(course.title);
    setEditDescription(course.description || '');
    setEditInstructor(course.instructor || '');
    setEditCategory(course.category || 'Development');
    setEditFee(course.fee.toString());
    setEditDuration(course.duration_days.toString());
    setEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editId || !editTitle || !editInstructor || !editFee || !editDuration) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      await apiRequest(`/admin/courses/${editId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          instructor: editInstructor,
          category: editCategory,
          fee: parseFloat(editFee),
          duration_days: parseInt(editDuration),
        }),
      });

      Alert.alert('Success', 'Course details updated!');
      setShowEditModal(false);
      fetchAdminCatalog();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update course.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to permanently delete this course?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/admin/courses/${courseId}`, {
                method: 'DELETE',
              });
              Alert.alert('Deleted', 'Course removed successfully.');
              fetchAdminCatalog();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not delete course.');
            }
          }
        }
      ]
    );
  };

  const resetAddForm = () => {
    setTitle('');
    setDescription('');
    setInstructor('');
    setCategory('Development');
    setFee('');
    setDuration('30');
    setSelectedVideo(null);
    setSelectedNotes(null);
  };

  const totalCourses = courses.length;
  const mockRevenue = courses.reduce((sum, c) => sum + (c.fee * 4), 0);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Management Panel</Text>
      <Text style={styles.subheader}>Review metrics and control e-learning catalog</Text>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, styles.metricBlue]}>
          <Text style={styles.metricIcon}>📚</Text>
          <Text style={styles.metricVal}>{totalCourses}</Text>
          <Text style={styles.metricLabel}>Courses</Text>
        </View>

        <View style={[styles.metricCard, styles.metricPink]}>
          <Text style={styles.metricIcon}>💰</Text>
          <Text style={styles.metricVal}>${mockRevenue.toFixed(2)}</Text>
          <Text style={styles.metricLabel}>Sales</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.btnPrimary} 
        onPress={() => setShowUploadModal(true)}
      >
        <Text style={styles.btnText}>➕ Publish New Course</Text>
      </TouchableOpacity>

      <Text style={styles.sectionHeader}>Current Catalog</Text>

      {loading && courses.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#EC4899" />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No courses uploaded yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.courseItem}>
              <View style={styles.courseItemInfo}>
                <Text style={styles.courseItemTitle}>{item.title}</Text>
                <Text style={styles.courseItemMeta}>
                  ${item.fee.toFixed(2)} • {item.duration_days} days validity • {item.category}
                </Text>
              </View>
              <View style={styles.courseItemActions}>
                <TouchableOpacity 
                  style={styles.actionBtnEdit} 
                  onPress={() => handleEditOpen(item)}
                >
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionBtnDelete} 
                  onPress={() => handleDeleteCourse(item.id)}
                >
                  <Text style={styles.actionBtnTextDelete}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Return Button */}
      <TouchableOpacity 
        style={styles.btnSecondary} 
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.btnSecondaryText}>Return to Student Portal</Text>
      </TouchableOpacity>

      {/* ----------------------------------------- */}
      {/* PUBLISH COURSE MODAL */}
      {/* ----------------------------------------- */}
      <Modal visible={showUploadModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Publish New Course</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Course Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Master Security Closures"
                  placeholderTextColor="#6B7280"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, { height: 70 }]}
                  placeholder="What will students learn?"
                  placeholderTextColor="#6B7280"
                  multiline={true}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { width: '48%' }]}>
                  <Text style={styles.inputLabel}>Instructor *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Jane Doe"
                    placeholderTextColor="#6B7280"
                    value={instructor}
                    onChangeText={setInstructor}
                  />
                </View>
                <View style={[styles.inputGroup, { width: '48%' }]}>
                  <Text style={styles.inputLabel}>Category *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Development"
                    placeholderTextColor="#6B7280"
                    value={category}
                    onChangeText={setCategory}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { width: '48%' }]}>
                  <Text style={styles.inputLabel}>Fee ($) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="99.99"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={fee}
                    onChangeText={setFee}
                  />
                </View>
                <View style={[styles.inputGroup, { width: '48%' }]}>
                  <Text style={styles.inputLabel}>Validity (Days) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="30"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={duration}
                    onChangeText={setDuration}
                  />
                </View>
              </View>

              {/* Video Attachment Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Lecture Video File *</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={handlePickVideo}>
                  <Text style={styles.pickerButtonText}>
                    {selectedVideo ? "🎥 Change Video File" : "🎥 Select Lecture Video"}
                  </Text>
                </TouchableOpacity>
                {selectedVideo && (
                  <Text style={styles.pickerSelectedText} numberOfLines={1}>
                    Selected: {selectedVideo.name} ({Math.round(selectedVideo.size / (1024 * 1024) * 100) / 100} MB)
                  </Text>
                )}
              </View>

              {/* PDF Notes Attachment Picker */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes PDF File *</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={handlePickNotes}>
                  <Text style={styles.pickerButtonText}>
                    {selectedNotes ? "📄 Change PDF File" : "📄 Select Slide Notes (PDF)"}
                  </Text>
                </TouchableOpacity>
                {selectedNotes && (
                  <Text style={styles.pickerSelectedText} numberOfLines={1}>
                    Selected: {selectedNotes.name} ({Math.round(selectedNotes.size / 1024 * 10) / 10} KB)
                  </Text>
                )}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleCreateCourse}>
                  <Text style={styles.btnText}>Publish</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowUploadModal(false)}>
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ----------------------------------------- */}
      {/* EDIT COURSE DETAILS MODAL */}
      {/* ----------------------------------------- */}
      <Modal visible={showEditModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Edit Course Details</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Course Title *</Text>
                <TextInput
                  style={styles.input}
                  value={editTitle}
                  onChangeText={setEditTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, { height: 70 }]}
                  multiline={true}
                  value={editDescription}
                  onChangeText={setEditDescription}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { width: '48%' }]}>
                  <Text style={styles.inputLabel}>Instructor *</Text>
                  <TextInput
                    style={styles.input}
                    value={editInstructor}
                    onChangeText={setEditInstructor}
                  />
                </View>
                <View style={[styles.inputGroup, { width: '48%' }]}>
                  <Text style={styles.inputLabel}>Category *</Text>
                  <TextInput
                    style={styles.input}
                    value={editCategory}
                    onChangeText={setEditCategory}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { width: '48%' }]}>
                  <Text style={styles.inputLabel}>Fee ($) *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editFee}
                    onChangeText={setEditFee}
                  />
                </View>
                <View style={[styles.inputGroup, { width: '48%' }]}>
                  <Text style={styles.inputLabel}>Validity (Days) *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editDuration}
                    onChangeText={setEditDuration}
                  />
                </View>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleEditSubmit}>
                  <Text style={styles.btnText}>Save Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnSecondary} onPress={() => setShowEditModal(false)}>
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  subheader: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  metricBlue: {
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  metricPink: {
    borderColor: 'rgba(236, 72, 153, 0.35)',
  },
  metricIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  btnPrimary: {
    backgroundColor: '#EC4899',
    borderRadius: 12,
    height: 52,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C7D2FE',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 20,
  },
  courseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  courseItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  courseItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 4,
  },
  courseItemMeta: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  courseItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnEdit: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actionBtnText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  actionBtnTextDelete: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  btnSecondary: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: '#060608',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 10, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#0A0A0F',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
    width: '100%',
  },
  inputLabel: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    fontSize: 14,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  attachmentNotice: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 16,
    marginVertical: 12,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 12,
  },
  modalBtnPrimary: {
    flex: 1,
    backgroundColor: '#EC4899',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnSecondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerButtonText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
  },
  pickerSelectedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    paddingLeft: 4,
  },
});
