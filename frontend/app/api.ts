export const API_URL = "http://192.168.29.2:8000/api";

let authToken: string | null = null;
let userEmail: string = "student@elearning.com";
let isAdminUser: boolean = false;

export function setAuthSession(token: string | null, email: string, isAdmin: boolean) {
  authToken = token;
  userEmail = email;
  isAdminUser = isAdmin;
}

export function getAuthSession() {
  return { token: authToken, email: userEmail, isAdmin: isAdminUser };
}

export async function apiRequest(endpoint: string, options: any = {}) {
  const headers: any = {
    ...(options.headers || {})
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }

  return data;
}

let progressCache: { [key: string]: number[] } = {};

export function getCompletedLessons(courseId: number): number[] {
  return progressCache[courseId.toString()] || [];
}

export function toggleLessonComplete(courseId: number, lessonIndex: number, isChecked: boolean) {
  const key = courseId.toString();
  if (!progressCache[key]) progressCache[key] = [];
  
  if (isChecked) {
    if (!progressCache[key].includes(lessonIndex)) {
      progressCache[key].push(lessonIndex);
    }
  } else {
    progressCache[key] = progressCache[key].filter(i => i !== lessonIndex);
  }
}
