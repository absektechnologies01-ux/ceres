import api from './axios';
import type { User, School, Faculty, Department, Class, Course, TeacherAssignment } from '../types';

// ─── Users ────────────────────────────────────────────────────────────────────

export const adminApi = {
  // Users
  getUsers: () => api.get<User[]>('/admin/users').then(r => r.data),
  createUser: (body: { name: string; email: string; role: string; password: string }) =>
    api.post<User>('/admin/users', body).then(r => r.data),
  updateUser: (id: string, body: Partial<{ name: string; email: string; role: string; password: string }>) =>
    api.put<User>(`/admin/users/${id}`, body).then(r => r.data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),

  // Schools
  getSchools: () => api.get<School[]>('/admin/schools').then(r => r.data),
  createSchool: (body: { name: string }) => api.post<School>('/admin/schools', body).then(r => r.data),
  updateSchool: (id: string, body: { name: string }) => api.put<School>(`/admin/schools/${id}`, body).then(r => r.data),
  deleteSchool: (id: string) => api.delete(`/admin/schools/${id}`),

  // Faculties
  getFaculties: () => api.get<Faculty[]>('/admin/faculties').then(r => r.data),
  createFaculty: (body: { name: string; school_id: string }) =>
    api.post<Faculty>('/admin/faculties', body).then(r => r.data),
  updateFaculty: (id: string, body: { name: string; school_id: string }) =>
    api.put<Faculty>(`/admin/faculties/${id}`, body).then(r => r.data),
  deleteFaculty: (id: string) => api.delete(`/admin/faculties/${id}`),

  // Departments
  getDepartments: () => api.get<Department[]>('/admin/departments').then(r => r.data),
  createDepartment: (body: { name: string; faculty_id: string }) =>
    api.post<Department>('/admin/departments', body).then(r => r.data),
  updateDepartment: (id: string, body: { name: string; faculty_id: string }) =>
    api.put<Department>(`/admin/departments/${id}`, body).then(r => r.data),
  deleteDepartment: (id: string) => api.delete(`/admin/departments/${id}`),

  // Classes
  getClasses: () => api.get<Class[]>('/admin/classes').then(r => r.data),
  createClass: (body: { name: string; department_id: string; academic_year: string }) =>
    api.post<Class>('/admin/classes', body).then(r => r.data),
  updateClass: (id: string, body: { name: string; department_id: string; academic_year: string }) =>
    api.put<Class>(`/admin/classes/${id}`, body).then(r => r.data),
  deleteClass: (id: string) => api.delete(`/admin/classes/${id}`),

  // Courses
  getCourses: () => api.get<Course[]>('/admin/courses').then(r => r.data),
  createCourse: (body: { code: string; name: string; department_id: string }) =>
    api.post<Course>('/admin/courses', body).then(r => r.data),
  updateCourse: (id: string, body: { code: string; name: string; department_id: string }) =>
    api.put<Course>(`/admin/courses/${id}`, body).then(r => r.data),
  deleteCourse: (id: string) => api.delete(`/admin/courses/${id}`),

  // Assignments
  getAssignments: () => api.get<TeacherAssignment[]>('/admin/assignments').then(r => r.data),
  createAssignment: (body: { teacher_id: string; class_id: string; course_id: string }) =>
    api.post<TeacherAssignment>('/admin/assignments', body).then(r => r.data),
  deleteAssignment: (id: string) => api.delete(`/admin/assignments/${id}`),
};
