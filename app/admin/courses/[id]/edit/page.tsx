'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamically import the enhanced lesson editor
const EnhancedLessonEditor = dynamic(
  () => import('@/app/components/EnhancedLessonEditor'),
  { ssr: false }
);

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  content: string;
  xp_reward: number;
  order_index: number;
  duration_minutes: number;
  language?: string;
  starter_code?: string;
  solution_code?: string;
  hints?: string[];
  expected_output?: string;
  hints_enabled?: boolean;
  test_cases?: any[] | string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  lessons: Lesson[];
}

export default function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isNewLesson, setIsNewLesson] = useState(false);
  const [useEnhancedEditor, setUseEnhancedEditor] = useState(true);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    fetchCourse();
  }, [resolvedParams.id]);

  const handleCloneCourse = async () => {
    if (!course) return;
    
    const newTitle = prompt('Enter a title for the cloned course:', `${course.title} (Copy)`);
    if (!newTitle) return;
    
    setCloning(true);
    try {
      const response = await fetch(`/api/admin/courses/${course.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newTitle, includeAssessments: true }),
      });

      if (!response.ok) throw new Error('Failed to clone course');
      
      const data = await response.json();
      alert(`Course cloned successfully! ${data.clonedLessons} lessons copied.`);
      router.push(`/admin/courses/${data.course.id}/edit`);
    } catch (error) {
      console.error('Error cloning course:', error);
      alert('Failed to clone course');
    } finally {
      setCloning(false);
    }
  };

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${resolvedParams.id}`);
      if (!response.ok) throw new Error('Failed to fetch course');
      const data = await response.json();
      
      // The API returns { course, lessons, progress }
      // We need to structure it properly and ensure course.id exists
      const courseData = {
        ...data.course,
        id: data.course.id || resolvedParams.id, // Use course.id or fallback to URL param
        lessons: data.lessons || [],
      };
      
      setCourse(courseData);
    } catch (error) {
      console.error('Error fetching course:', error);
      alert('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!course) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: course.title,
          description: course.description,
          difficulty: course.difficulty,
        }),
      });

      if (!response.ok) throw new Error('Failed to update course');
      alert('Course updated successfully');
    } catch (error) {
      console.error('Error updating course:', error);
      alert('Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLesson = async () => {
    if (!editingLesson || !course) return;

    setSaving(true);
    try {
      const lessonData = {
        ...editingLesson,
        course_id: course.id,
        hints: editingLesson.hints || [],
        hints_enabled: editingLesson.hints_enabled !== false,
      };

      console.log('Saving lesson with data:', lessonData);
      console.log('Course ID:', course.id);

      const url = isNewLesson
        ? '/api/admin/lessons'
        : `/api/admin/lessons/${editingLesson.id}`;
      
      const method = isNewLesson ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lessonData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error('Failed to save lesson');
      }
      
      alert('Lesson saved successfully');
      setEditingLesson(null);
      setIsNewLesson(false);
      fetchCourse();
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
      const response = await fetch(`/api/admin/lessons/${lessonId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete lesson');
      
      alert('Lesson deleted successfully');
      fetchCourse();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Failed to delete lesson');
    }
  };

  const handleCodeEditorKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    field: 'starter_code' | 'solution_code'
  ) => {
    if (!editingLesson) return;

    const textarea = e.currentTarget;
    const value = textarea.value;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;

    // Auto-closing brackets
    if (e.key === '(' || e.key === '[' || e.key === '{' || e.key === '"' || e.key === "'") {
      e.preventDefault();
      const closingChar = 
        e.key === '(' ? ')' : 
        e.key === '[' ? ']' : 
        e.key === '{' ? '}' : 
        e.key;

      const newValue =
        value.slice(0, selectionStart) +
        e.key +
        closingChar +
        value.slice(selectionEnd);

      setEditingLesson({ ...editingLesson, [field]: newValue });

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);
      return;
    }

    // Tab indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const newValue =
        value.slice(0, selectionStart) +
        '  ' +
        value.slice(selectionEnd);

      setEditingLesson({ ...editingLesson, [field]: newValue });

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
      }, 0);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8f9fa',
        color: '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        Loading...
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#f8f9fa',
        color: '#333',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        Course not found
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      color: '#333',
      padding: '20px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
        }}>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#1a1a1a' }}>
            Edit Course
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCloneCourse}
              disabled={cloning}
              style={{
                padding: '10px 20px',
                background: '#28a745',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: cloning ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: cloning ? 0.6 : 1,
              }}
            >
              {cloning ? 'Cloning...' : '📋 Clone Course'}
            </button>
            <button
              onClick={() => router.push('/admin')}
              style={{
                padding: '10px 20px',
                background: '#fff',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                color: '#495057',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
          >
            ← Back to Admin
          </button>
          </div>
        </div>

        {/* Course Details */}
        <div style={{
          background: '#fff',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '30px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ marginTop: 0, fontSize: '20px', color: '#1a1a1a', marginBottom: '20px' }}>
            Course Information
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#495057', fontWeight: '500' }}>
                Title <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <input
                type="text"
                value={course.title}
                onChange={(e) => setCourse({ ...course, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#fff',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  color: '#212529',
                  fontSize: '14px',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#495057', fontWeight: '500' }}>
                Difficulty <span style={{ color: '#dc3545' }}>*</span>
              </label>
              <select
                value={course.difficulty}
                onChange={(e) => setCourse({ ...course, difficulty: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#fff',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  color: '#212529',
                  fontSize: '14px',
                }}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#495057', fontWeight: '500' }}>
              Description <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <textarea
              value={course.description}
              onChange={(e) => setCourse({ ...course, description: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#fff',
                border: '1px solid #ced4da',
                borderRadius: '6px',
                color: '#212529',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          <button
            onClick={handleSaveCourse}
            disabled={saving}
            style={{
              marginTop: '20px',
              padding: '10px 24px',
              background: '#007bff',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            {saving ? 'Saving...' : 'Save Course'}
          </button>
        </div>

        {/* Lessons */}
        <div style={{
          background: '#fff',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}>
            <h2 style={{ margin: 0, fontSize: '20px', color: '#1a1a1a' }}>
              Lessons ({course.lessons?.length || 0})
            </h2>
            <button
              onClick={() => {
                setEditingLesson({
                  id: '',
                  course_id: course.id,
                  title: '',
                  description: '',
                  content: '',
                  xp_reward: 50,
                  order_index: (course.lessons?.length || 0) + 1,
                  duration_minutes: 30,
                  language: 'javascript',
                  starter_code: '',
                  solution_code: '',
                  hints: [],
                  expected_output: '',
                  hints_enabled: true,
                });
                setIsNewLesson(true);
              }}
              style={{
                padding: '10px 20px',
                background: '#28a745',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              + Add Lesson
            </button>
          </div>

          {/* Lessons List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {course.lessons && course.lessons.length > 0 ? (
              course.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  style={{
                    background: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '12px',
                        color: '#6c757d',
                        fontWeight: '600',
                      }}>
                        #{lesson.order_index}
                      </span>
                      <h3 style={{ margin: 0, fontSize: '16px', color: '#212529', fontWeight: '600' }}>
                        {lesson.title}
                      </h3>
                      {lesson.language && (
                        <span style={{
                          fontSize: '11px',
                          padding: '3px 10px',
                          background: '#007bff',
                          color: '#fff',
                          borderRadius: '12px',
                          fontWeight: '600',
                        }}>
                          {lesson.language}
                        </span>
                      )}
                      {lesson.expected_output && (
                        <span style={{
                          fontSize: '11px',
                          padding: '3px 10px',
                          background: '#28a745',
                          color: '#fff',
                          borderRadius: '12px',
                          fontWeight: '600',
                        }}>
                          ✓ Validation
                        </span>
                      )}
                      {lesson.hints_enabled !== false && lesson.hints && lesson.hints.length > 0 && (
                        <span style={{
                          fontSize: '11px',
                          padding: '3px 10px',
                          background: '#ffc107',
                          color: '#000',
                          borderRadius: '12px',
                          fontWeight: '600',
                        }}>
                          💡 Hints
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                      {lesson.description || 'No description'}
                    </p>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#868e96' }}>
                      {lesson.xp_reward} XP • {lesson.duration_minutes} min
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setEditingLesson(lesson);
                        setIsNewLesson(false);
                      }}
                      style={{
                        padding: '8px 16px',
                        background: '#007bff',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      style={{
                        padding: '8px 16px',
                        background: '#dc3545',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>
                No lessons yet. Click "Add Lesson" to create one.
              </p>
            )}
          </div>
        </div>

        {/* Lesson Editor Modal */}
        {editingLesson && useEnhancedEditor && (
          <EnhancedLessonEditor
            lesson={editingLesson}
            isNew={isNewLesson}
            onSave={async (lessonData) => {
              setSaving(true);
              try {
                const url = isNewLesson
                  ? '/api/admin/lessons'
                  : `/api/admin/lessons/${lessonData.id}`;
                const method = isNewLesson ? 'POST' : 'PUT';
                
                const response = await fetch(url, {
                  method,
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...lessonData,
                    course_id: course?.id,
                  }),
                });

                if (!response.ok) throw new Error('Failed to save');
                
                alert('Lesson saved successfully');
                setEditingLesson(null);
                setIsNewLesson(false);
                fetchCourse();
              } catch (error) {
                console.error('Error saving lesson:', error);
                alert('Failed to save lesson');
              } finally {
                setSaving(false);
              }
            }}
            onCancel={() => {
              setEditingLesson(null);
              setIsNewLesson(false);
            }}
            saving={saving}
          />
        )}
        
        {/* Legacy Lesson Editor Modal */}
        {editingLesson && !useEnhancedEditor && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            overflow: 'auto',
          }}>
            <div style={{
              background: '#fff',
              border: '1px solid #dee2e6',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '24px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ marginTop: 0, fontSize: '20px', color: '#1a1a1a', margin: 0 }}>
                  {isNewLesson ? 'New Lesson' : 'Edit Lesson'}
                </h2>
                <button
                  onClick={() => {
                    setEditingLesson(null);
                    setIsNewLesson(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '24px',
                    color: '#6c757d',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    lineHeight: '1',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#000'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#6c757d'}
                >
                  ×
                </button>
              </div>

              {/* Basic Info */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', color: '#212529', marginBottom: '12px', fontWeight: '600' }}>
                  Basic Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#495057', fontWeight: '500' }}>
                      Title <span style={{ color: '#dc3545' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={editingLesson.title}
                      onChange={(e) => setEditingLesson({ ...editingLesson, title: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#fff',
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        color: '#212529',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#495057', fontWeight: '500' }}>
                      Language
                    </label>
                    <select
                      value={editingLesson.language || ''}
                      onChange={(e) => setEditingLesson({ ...editingLesson, language: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#fff',
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        color: '#212529',
                        fontSize: '13px',
                      }}
                    >
                      <option value="">None</option>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="typescript">TypeScript</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#495057', fontWeight: '500' }}>
                      XP Reward
                    </label>
                    <input
                      type="number"
                      value={editingLesson.xp_reward}
                      onChange={(e) => setEditingLesson({ ...editingLesson, xp_reward: parseInt(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#fff',
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        color: '#212529',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#495057', fontWeight: '500' }}>
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={editingLesson.duration_minutes}
                      onChange={(e) => setEditingLesson({ ...editingLesson, duration_minutes: parseInt(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#fff',
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        color: '#212529',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#495057', fontWeight: '500' }}>
                      Order Index
                    </label>
                    <input
                      type="number"
                      value={editingLesson.order_index}
                      onChange={(e) => setEditingLesson({ ...editingLesson, order_index: parseInt(e.target.value) })}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: '#fff',
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        color: '#212529',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#495057', fontWeight: '500' }}>
                    Description
                  </label>
                  <textarea
                    value={editingLesson.description}
                    onChange={(e) => setEditingLesson({ ...editingLesson, description: e.target.value })}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#fff',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      color: '#212529',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>

              {/* Content */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', color: '#212529', marginBottom: '12px', fontWeight: '600' }}>
                  Lesson Content
                </h3>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#495057', fontWeight: '500' }}>
                  Content (Markdown supported)
                </label>
                <textarea
                  value={editingLesson.content}
                  onChange={(e) => setEditingLesson({ ...editingLesson, content: e.target.value })}
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    background: '#fff',
                    border: '1px solid #ced4da',
                    borderRadius: '6px',
                    color: '#212529',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Code Editors */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', color: '#212529', marginBottom: '12px', fontWeight: '600' }}>
                  Code & Solution
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#495057', fontWeight: '500' }}>
                      Starter Code
                      <span style={{ color: '#6c757d', fontSize: '11px', marginLeft: '8px' }}>
                        (Auto-complete enabled: brackets, Tab)
                      </span>
                    </label>
                    <textarea
                      value={editingLesson.starter_code || ''}
                      onChange={(e) => setEditingLesson({ ...editingLesson, starter_code: e.target.value })}
                      onKeyDown={(e) => handleCodeEditorKeyDown(e, 'starter_code')}
                      rows={8}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#1e1e1e',
                        border: '1px solid #404040',
                        borderRadius: '4px',
                        color: '#d4d4d4',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#495057', fontWeight: '500' }}>
                      Solution Code
                      <span style={{ color: '#6c757d', fontSize: '11px', marginLeft: '8px' }}>
                        (Auto-complete enabled: brackets, Tab)
                      </span>
                    </label>
                    <textarea
                      value={editingLesson.solution_code || ''}
                      onChange={(e) => setEditingLesson({ ...editingLesson, solution_code: e.target.value })}
                      onKeyDown={(e) => handleCodeEditorKeyDown(e, 'solution_code')}
                      rows={8}
                      style={{
                        width: '100%',
                        padding: '8px',
                        background: '#1e1e1e',
                        border: '1px solid #404040',
                        borderRadius: '4px',
                        color: '#d4d4d4',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        resize: 'vertical',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Validation & Hints */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', color: '#212529', marginBottom: '12px', fontWeight: '600' }}>
                  Validation & Hints
                </h3>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#495057', fontWeight: '500' }}>
                    Expected Output
                    <span style={{ color: '#6c757d', fontSize: '11px', marginLeft: '8px' }}>
                      (For code validation - leave empty to disable validation)
                    </span>
                  </label>
                  <textarea
                    value={editingLesson.expected_output || ''}
                    onChange={(e) => setEditingLesson({ ...editingLesson, expected_output: e.target.value })}
                    rows={4}
                    placeholder="Expected console output..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#f8f9fa',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      color: '#212529',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '13px', cursor: 'pointer', color: '#495057' }}>
                    <input
                      type="checkbox"
                      checked={editingLesson.hints_enabled !== false}
                      onChange={(e) => setEditingLesson({ ...editingLesson, hints_enabled: e.target.checked })}
                      style={{ marginRight: '8px' }}
                    />
                    <span style={{ fontWeight: '500' }}>Enable Hints for Students</span>
                    <span style={{ color: '#6c757d', fontSize: '11px', marginLeft: '8px' }}>
                      (Teachers/admins can control hint availability)
                    </span>
                  </label>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#495057', fontWeight: '500' }}>
                    Hints
                    <span style={{ color: '#6c757d', fontSize: '11px', marginLeft: '8px' }}>
                      (One hint per line)
                    </span>
                  </label>
                  <textarea
                    value={(editingLesson.hints || []).join('\n')}
                    onChange={(e) => setEditingLesson({
                      ...editingLesson,
                      hints: e.target.value.split('\n').filter(h => h.trim())
                    })}
                    rows={4}
                    placeholder="Hint 1&#10;Hint 2&#10;Hint 3"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#fff',
                      border: '1px solid #ced4da',
                      borderRadius: '6px',
                      color: '#212529',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ marginTop: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#495057', fontWeight: '500' }}>
                    Test Cases (JSON)
                    <span style={{ color: '#6c757d', fontSize: '11px', marginLeft: '8px' }}>
                      (For interactive code challenges)
                    </span>
                  </label>
                  <textarea
                    value={
                      editingLesson.test_cases 
                        ? (typeof editingLesson.test_cases === 'string' 
                            ? editingLesson.test_cases 
                            : JSON.stringify(editingLesson.test_cases, null, 2))
                        : ''
                    }
                    onChange={(e) => {
                      try {
                        const parsed = e.target.value.trim() ? JSON.parse(e.target.value) : [];
                        setEditingLesson({ ...editingLesson, test_cases: parsed });
                      } catch {
                        setEditingLesson({ ...editingLesson, test_cases: e.target.value });
                      }
                    }}
                    rows={6}
                    placeholder={'[\n  {"input": "5", "expectedOutput": "25"},\n  {"input": "10", "expectedOutput": "100"}\n]'}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: '#1e1e1e',
                      border: '1px solid #404040',
                      borderRadius: '6px',
                      color: '#d4d4d4',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
                    💡 Example: {'[{"input": "5", "expectedOutput": "25"}, {"input": "10", "expectedOutput": "100"}]'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setEditingLesson(null);
                    setIsNewLesson(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#fff',
                    border: '1px solid #ced4da',
                    borderRadius: '8px',
                    color: '#495057',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveLesson}
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    background: '#007bff',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Lesson'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
