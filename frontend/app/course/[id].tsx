import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as WebBrowser from 'expo-web-browser';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as FileSystem from 'expo-file-system/legacy';
import { apiRequest, getCompletedLessons, toggleLessonComplete, getAuthSession, API_URL } from '../api';

const standardCurriculum = [
  "1. Lecture Overview & Platform Architecture",
  "2. Cryptographic Auth & Direct URL Shielding",
  "3. Verification Timelines & anti-recording mechanisms"
];

// Helper functions for offline caching of course details
const getLocalVideoPath = (id: number) => `${FileSystem.documentDirectory}offline_course_${id}.mp4`;
const getCacheMetadataPath = (id: number) => `${FileSystem.documentDirectory}cache_course_${id}.json`;

const cacheCourseMetadata = async (id: number, data: any) => {
  try {
    await FileSystem.writeAsStringAsync(getCacheMetadataPath(id), JSON.stringify(data));
  } catch (err) {
    console.log('Cache write error:', err);
  }
};

const getCachedCourseMetadata = async (id: number) => {
  try {
    const fileUri = getCacheMetadataPath(id);
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(fileUri);
      return JSON.parse(content);
    }
  } catch (err) {
    console.log('Cache read error:', err);
  }
  return null;
};

const clearCachedCourseMetadata = async (id: number) => {
  try {
    await FileSystem.deleteAsync(getCacheMetadataPath(id), { idempotent: true });
  } catch (err) {
    console.log('Cache clear error:', err);
  }
};

export default function SecurePlayerScreen() {
  usePreventScreenCapture();
  const router = useRouter();
  const session = getAuthSession();
  const { id } = useLocalSearchParams();
  const courseId = parseInt(Array.isArray(id) ? id[0] : id || '0');

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState('⏳ Checking access...');
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timeout | null>(null);

  // Offline Download States
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(false);

  // Custom Fullscreen State & Handles
  const [isCustomFullscreen, setIsCustomFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    try {
      if (isCustomFullscreen) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        setIsCustomFullscreen(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsCustomFullscreen(true);
      }
    } catch (err) {
      console.log('Fullscreen orientation error:', err);
    }
  };

  // Check if offline video is available on disk
  const checkOfflineStatus = async () => {
    try {
      const localUri = getLocalVideoPath(courseId);
      const info = await FileSystem.getInfoAsync(localUri);
      setIsOfflineAvailable(info.exists);
    } catch (err) {
      console.log('Error checking offline status:', err);
    }
  };

  // Load from local file if offline is available, otherwise stream online
  const videoSourceUri = isOfflineAvailable
    ? getLocalVideoPath(courseId)
    : (course && course.video_url) 
      ? `${API_URL}/media/video/${encodeURIComponent(course.video_url.split("/").pop() || "")}?token=${session.token}`
      : '';

  // Initialize expo-video Player
  const player = useVideoPlayer(videoSourceUri, (playerInstance) => {
    playerInstance.loop = false;
  });

  const videoViewRef = useRef<any>(null);

  // Dynamically sync video source changes to the player
  useEffect(() => {
    if (videoSourceUri && player) {
      player.replace(videoSourceUri);
    }
  }, [videoSourceUri]);

  useEffect(() => {
    // 1. Add alert listener for screenshot gestures
    const subscription = ScreenCapture.addScreenshotListener(() => {
      Alert.alert(
        'Security Violation',
        'Screenshots and screen recordings are strictly prohibited by our copyright policies.'
      );
    });

    // 3. Configure Audio playback to work on iOS silent switch
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        });
      } catch (err) {
        console.log('Audio mode error:', err);
      }
    };
    configureAudio();

    // Web-specific security hardening (blocks right-clicks, Developer Tools shortcuts, print, and save)
    let handleKeyDown: (e: any) => void;
    let handleContextMenu: (e: any) => void;

    if (Platform.OS === 'web') {
      handleKeyDown = (e: any) => {
        if (
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c' || e.key === 'J' || e.key === 'j')) ||
          (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P'))
        ) {
          e.preventDefault();
          Alert.alert('Security Block', 'Developer shortcuts and printing are disabled for copyright protection.');
        }
      };

      handleContextMenu = (e: any) => {
        e.preventDefault();
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('contextmenu', handleContextMenu);
    }

    // Check offline status and fetch details
    checkOfflineStatus();
    fetchCourseDetail();

    // Clean up on unmount
    return () => {
      subscription.remove();
      if (activeTimer) clearInterval(activeTimer);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(() => {});
      if (Platform.OS === 'web') {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('contextmenu', handleContextMenu);
      }
    };
  }, [courseId]);

  const fetchCourseDetail = async () => {
    setLoading(true);
    try {
      // Try fetching from online API
      const data = await apiRequest(`/courses/${courseId}`);
      setCourse(data);
      
      // Update local metadata cache
      await cacheCourseMetadata(courseId, data);
      
      // Load progress
      setCompletedLessons(getCompletedLessons(courseId));
      
      // Start countdown
      const expiresAt = new Date(data.expires_at).getTime();
      setupTimer(expiresAt);
    } catch (err: any) {
      // Fallback to offline cached metadata if network fails
      const cached = await getCachedCourseMetadata(courseId);
      if (cached) {
        setCourse(cached);
        setCompletedLessons(getCompletedLessons(courseId));
        
        const expiresAt = new Date(cached.expires_at).getTime();
        setupTimer(expiresAt);
        Alert.alert("Offline Mode", "Viewing course contents from local offline storage.");
      } else {
        Alert.alert('Connection Error', 'Could not retrieve course details. No offline copy is available.');
        router.replace('/(tabs)');
      }
    } finally {
      setLoading(false);
    }
  };

  const setupTimer = (expiresAtTime: number) => {
    if (activeTimer) clearInterval(activeTimer);

    const updateTimer = () => {
      const now = Date.now();
      const diff = expiresAtTime - now;

      if (diff <= 0) {
        setTimeLeft('🔒 Access Locked');
        Alert.alert('Access Expired', 'Your validity window for this course has ended.');
        exitPlayer();
        return;
      }

      const seconds = Math.floor((diff / 1000) % 60);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (days > 0) {
        setTimeLeft(`⏳ ${days}d ${hours}h ${minutes}m left`);
      } else if (hours > 0) {
        setTimeLeft(`⏳ ${hours}h ${minutes}m ${seconds}s left`);
      } else {
        setTimeLeft(`⏳ ${minutes}m ${seconds}s left`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    setActiveTimer(interval);
  };

  const exitPlayer = () => {
    if (activeTimer) clearInterval(activeTimer);
    router.replace('/(tabs)');
  };

  const handleLessonToggle = (index: number, isChecked: boolean) => {
    toggleLessonComplete(courseId, index, isChecked);
    setCompletedLessons(getCompletedLessons(courseId));
  };

  const handleViewNotes = async () => {
    if (!course || !course.notes_path) return;
    const notesFilename = course.notes_path.split("/").pop() || "";
    const secureNotesUrl = `${API_URL}/media/notes/${encodeURIComponent(notesFilename)}?token=${session.token}`;
    
    try {
      await WebBrowser.openBrowserAsync(secureNotesUrl);
    } catch (err) {
      Alert.alert("Error", "Could not open document reader.");
    }
  };

  // -----------------------------------------
  // OFFLINE DOWNLOAD FUNCTIONS
  // -----------------------------------------

  const handleDownload = async () => {
    if (!course || !course.video_url) return;
    const videoFilename = course.video_url.split("/").pop() || "";
    const secureUrl = `${API_URL}/media/video/${encodeURIComponent(videoFilename)}?token=${session.token}`;
    const localUri = getLocalVideoPath(courseId);

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const downloadResumable = FileSystem.createDownloadResumable(
        secureUrl,
        localUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(Math.round(progress * 100));
        }
      );

      const result = await downloadResumable.downloadAsync();
      if (result) {
        // Cache metadata locally
        await cacheCourseMetadata(courseId, course);
        setIsOfflineAvailable(true);
        Alert.alert("Saved Offline", "The video has been saved to your device. You can now play it without internet!");
      }
    } catch (err: any) {
      Alert.alert("Download Failed", err.message || "Failed to download offline files.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteOffline = async () => {
    Alert.alert(
      "Delete Offline Copy",
      "Are you sure you want to remove the offline files from your device storage?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await FileSystem.deleteAsync(getLocalVideoPath(courseId), { idempotent: true });
              await clearCachedCourseMetadata(courseId);
              setIsOfflineAvailable(false);
              Alert.alert("Deleted", "Offline copy removed successfully.");
            } catch (err) {
              Alert.alert("Error", "Failed to clear local files.");
            }
          }
        }
      ]
    );
  };

  if (loading || !course) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#EC4899" />
        <Text style={styles.loaderText}>Checking secure credentials...</Text>
      </View>
    );
  }

  if (isCustomFullscreen && course && course.video_url) {
    return (
      <View style={styles.fullscreenContainer}>
        <VideoView
          ref={videoViewRef}
          player={player}
          allowsFullscreen={false}
          allowsPictureInPicture={true}
          style={styles.fullscreenVideoPlayer}
        />
        <TouchableOpacity style={styles.fullscreenExitBtn} onPress={toggleFullscreen}>
          <Text style={styles.fullscreenExitBtnText}>✕ Exit Fullscreen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Secure Video Player */}
      {course.video_url ? (
        <VideoView
          ref={videoViewRef}
          player={player}
          allowsFullscreen={false}
          allowsPictureInPicture={true}
          style={styles.videoPlayer}
        />
      ) : (
        <View style={styles.playerBox}>
          <Text style={styles.playerIcon}>▶️</Text>
          <Text style={styles.playerStatus}>No Video Available</Text>
        </View>
      )}

      {/* Control Buttons Row */}
      <View style={styles.controlsRow}>
        {course.video_url && (
          <TouchableOpacity 
            style={[styles.controlBtn, { flex: 1.2 }]} 
            onPress={toggleFullscreen}
          >
            <Text style={styles.controlBtnText}>📺 Full Screen</Text>
          </TouchableOpacity>
        )}

        {/* Download State Toggle Button */}
        {isDownloading ? (
          <View style={[styles.downloadingProgressBox, { flex: 1 }]}>
            <Text style={styles.downloadingProgressText}>📥 Downloading: {downloadProgress}%</Text>
          </View>
        ) : isOfflineAvailable ? (
          <TouchableOpacity 
            style={[styles.controlBtn, styles.btnDeleteOffline, { flex: 1 }]} 
            onPress={handleDeleteOffline}
          >
            <Text style={styles.btnDeleteOfflineText}>🗑️ Delete Offline</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.controlBtn, styles.btnDownload, { flex: 1 }]} 
            onPress={handleDownload}
          >
            <Text style={styles.btnDownloadText}>📥 Download Offline</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.details}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{course.title}</Text>
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>{timeLeft}</Text>
          </View>
        </View>

        {isOfflineAvailable && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>💾 Saved Offline • No Internet Needed</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>About this course</Text>
        <Text style={styles.description}>{course.description || 'No description provided.'}</Text>

        <View style={styles.divider} />

        {/* Curriculum list */}
        <Text style={styles.sectionTitle}>Course Curriculum</Text>
        <View style={styles.curriculumContainer}>
          {standardCurriculum.map((lesson, index) => {
            const isChecked = completedLessons.includes(index);
            return (
              <View key={index} style={styles.curriculumItem}>
                <View style={styles.curriculumLeft}>
                  <Text style={styles.lectureIndex}>0{index + 1}</Text>
                  <Text style={styles.lectureTitle}>{lesson}</Text>
                </View>
                <TouchableOpacity 
                  style={[styles.checkbox, isChecked && styles.checkboxChecked]}
                  onPress={() => handleLessonToggle(index, !isChecked)}
                >
                  {isChecked && <Text style={styles.checkboxCheckmark}>✓</Text>}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Protected Resources</Text>
        <TouchableOpacity style={styles.notesCard} onPress={handleViewNotes}>
          <Text style={styles.notesIcon}>📄</Text>
          <View style={styles.notesTextContainer}>
            <Text style={styles.notesTitle}>View Course Notes PDF</Text>
            <Text style={styles.notesSubtitle}>Protected from screen downloads</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.securityCard}>
          <Text style={styles.securityCardTitle}>🛡️ Security Policy In Effect</Text>
          <Text style={styles.securityCardText}>• Native screenshots will return black layouts.</Text>
          <Text style={styles.securityCardText}>• Screen mirroring, recording, or casting will disable video display.</Text>
          <Text style={styles.securityCardText}>• Offline files are sandboxed and hidden from external storage.</Text>
        </View>

        <TouchableOpacity style={styles.btnReturn} onPress={exitPlayer}>
          <Text style={styles.btnReturnText}>Return to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060608',
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: '#060608',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: '#9CA3AF',
    marginTop: 14,
    fontSize: 14,
  },
  playerBox: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#111115',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  playerStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playerWarning: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  videoPlayer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000000',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  controlBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
  },
  btnDownload: {
    backgroundColor: '#EC4899',
    borderColor: 'transparent',
  },
  btnDownloadText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  btnDeleteOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  btnDeleteOfflineText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },
  downloadingProgressBox: {
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadingProgressText: {
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: '700',
  },
  details: {
    padding: 20,
  },
  titleRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  timerBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  timerText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  offlineBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  offlineBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#C7D2FE',
    marginTop: 6,
    marginBottom: 10,
  },
  description: {
    fontSize: 13,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 18,
  },
  curriculumContainer: {
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.015)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 14,
  },
  curriculumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
  },
  curriculumLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  lectureIndex: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  lectureTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E5E7EB',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10B981',
    borderColor: 'transparent',
  },
  checkboxCheckmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  notesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
  },
  notesIcon: {
    fontSize: 20,
    marginRight: 14,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  notesTextContainer: {
    flexDirection: 'column',
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  notesSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  securityCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  securityCardTitle: {
    fontWeight: '600',
    color: '#F59E0B',
    fontSize: 13,
    marginBottom: 8,
  },
  securityCardText: {
    fontSize: 11,
    color: '#9CA3AF',
    lineHeight: 18,
    marginBottom: 4,
  },
  btnReturn: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnReturnText: {
    color: '#E5E7EB',
    fontSize: 15,
    fontWeight: '600',
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideoPlayer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  fullscreenExitBtn: {
    position: 'absolute',
    top: 24,
    right: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 99999,
  },
  fullscreenExitBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
