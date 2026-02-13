// PDF Generator Utility for BitByBit Platform
// Uses jsPDF for client-side PDF generation

export interface StudentReportData {
  studentName: string;
  studentId: string;
  email: string;
  className: string;
  organizationName: string;
  generatedAt: Date;
  stats: {
    xp: number;
    level: number;
    lessonsCompleted: number;
    averageProgress: number;
    totalTimeSpent: string;
    streak: number;
  };
  courses: Array<{
    name: string;
    progress: number;
    lessonsCompleted: number;
    totalLessons: number;
    grade?: string;
  }>;
  assessments: Array<{
    name: string;
    type: string;
    score: number;
    maxScore: number;
    completedAt: string;
  }>;
  activitySummary: {
    lastActive: string;
    activeDays: number;
    averageSessionTime: string;
  };
}

export interface ClassReportData {
  className: string;
  classCode: string;
  teacherName: string;
  organizationName: string;
  semester: string;
  generatedAt: Date;
  stats: {
    totalStudents: number;
    activeStudents: number;
    averageProgress: number;
    averageGrade: number;
    completionRate: number;
  };
  students: Array<{
    name: string;
    studentId: string;
    progress: number;
    lessonsCompleted: number;
    grade?: string;
    status: 'active' | 'at-risk' | 'inactive';
  }>;
  coursePerformance: Array<{
    courseName: string;
    averageProgress: number;
    completionRate: number;
  }>;
}

// Generate Student Progress Report HTML (for PDF conversion)
export function generateStudentReportHTML(data: StudentReportData): string {
  const progressColor = data.stats.averageProgress >= 70 ? '#22c55e' : data.stats.averageProgress >= 40 ? '#eab308' : '#ef4444';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Student Progress Report - ${data.studentName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; margin-bottom: 5px; }
    .header p { opacity: 0.9; }
    .logo { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .section { background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
    .section-title { font-size: 18px; font-weight: 600; color: #6366f1; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .stat-card { background: white; padding: 16px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-value { font-size: 28px; font-weight: bold; color: #6366f1; }
    .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
    .progress-bar { background: #e2e8f0; border-radius: 999px; height: 12px; overflow: hidden; margin-top: 8px; }
    .progress-fill { height: 100%; border-radius: 999px; transition: width 0.3s; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 500; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef9c3; color: #854d0e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .info-label { color: #64748b; }
    .info-value { font-weight: 500; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">BitByBit</div>
    <h1>Student Progress Report</h1>
    <p>${data.organizationName} • ${data.className}</p>
  </div>

  <div class="section">
    <div class="section-title">Student Information</div>
    <div class="info-row">
      <span class="info-label">Name</span>
      <span class="info-value">${data.studentName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Student ID</span>
      <span class="info-value">${data.studentId}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Email</span>
      <span class="info-value">${data.email}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Report Generated</span>
      <span class="info-value">${data.generatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Performance Overview</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${data.stats.xp.toLocaleString()}</div>
        <div class="stat-label">Total XP</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.stats.level}</div>
        <div class="stat-label">Level</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.stats.lessonsCompleted}</div>
        <div class="stat-label">Lessons Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.stats.averageProgress}%</div>
        <div class="stat-label">Avg Progress</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${data.stats.averageProgress}%; background: ${progressColor};"></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.stats.streak}</div>
        <div class="stat-label">Day Streak</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.stats.totalTimeSpent}</div>
        <div class="stat-label">Time Spent</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Course Progress</div>
    <table>
      <thead>
        <tr>
          <th>Course</th>
          <th>Progress</th>
          <th>Lessons</th>
          <th>Grade</th>
        </tr>
      </thead>
      <tbody>
        ${data.courses.map(course => `
        <tr>
          <td>${course.name}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span>${course.progress}%</span>
              <div class="progress-bar" style="flex: 1; height: 8px;">
                <div class="progress-fill" style="width: ${course.progress}%; background: ${course.progress >= 70 ? '#22c55e' : course.progress >= 40 ? '#eab308' : '#ef4444'};"></div>
              </div>
            </div>
          </td>
          <td>${course.lessonsCompleted}/${course.totalLessons}</td>
          <td>${course.grade || '-'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${data.assessments.length > 0 ? `
  <div class="section">
    <div class="section-title">Assessment Results</div>
    <table>
      <thead>
        <tr>
          <th>Assessment</th>
          <th>Type</th>
          <th>Score</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        ${data.assessments.map(assessment => `
        <tr>
          <td>${assessment.name}</td>
          <td><span class="badge badge-${assessment.type === 'quiz' ? 'success' : 'warning'}">${assessment.type}</span></td>
          <td>${assessment.score}/${assessment.maxScore} (${Math.round(assessment.score / assessment.maxScore * 100)}%)</td>
          <td>${assessment.completedAt}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Activity Summary</div>
    <div class="info-row">
      <span class="info-label">Last Active</span>
      <span class="info-value">${data.activitySummary.lastActive}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Active Days (Last 30)</span>
      <span class="info-value">${data.activitySummary.activeDays} days</span>
    </div>
    <div class="info-row">
      <span class="info-label">Average Session Time</span>
      <span class="info-value">${data.activitySummary.averageSessionTime}</span>
    </div>
  </div>

  <div class="footer">
    <p>Generated by BitByBit Learning Platform</p>
    <p>© ${new Date().getFullYear()} BitByBit. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

// Generate Class Report HTML
export function generateClassReportHTML(data: ClassReportData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Class Report - ${data.className}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
    .header h1 { font-size: 28px; margin-bottom: 5px; }
    .header p { opacity: 0.9; }
    .logo { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
    .section { background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 20px; }
    .section-title { font-size: 18px; font-weight: 600; color: #6366f1; margin-bottom: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
    .stat-card { background: white; padding: 16px; border-radius: 8px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-value { font-size: 24px; font-weight: bold; color: #6366f1; }
    .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 500; }
    .badge-active { background: #dcfce7; color: #166534; }
    .badge-at-risk { background: #fef9c3; color: #854d0e; }
    .badge-inactive { background: #fee2e2; color: #991b1b; }
    .progress-bar { background: #e2e8f0; border-radius: 999px; height: 8px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 999px; }
    .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
    .info-label { color: #64748b; }
    .info-value { font-weight: 500; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">BitByBit</div>
    <h1>Class Performance Report</h1>
    <p>${data.organizationName} • ${data.semester}</p>
  </div>

  <div class="section">
    <div class="section-title">Class Information</div>
    <div class="info-row">
      <span class="info-label">Class Name</span>
      <span class="info-value">${data.className}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Class Code</span>
      <span class="info-value">${data.classCode}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Teacher</span>
      <span class="info-value">${data.teacherName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Report Generated</span>
      <span class="info-value">${data.generatedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Class Overview</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${data.stats.totalStudents}</div>
        <div class="stat-label">Total Students</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.stats.activeStudents}</div>
        <div class="stat-label">Active Students</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.stats.averageProgress}%</div>
        <div class="stat-label">Avg Progress</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.stats.averageGrade}%</div>
        <div class="stat-label">Avg Grade</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${data.stats.completionRate}%</div>
        <div class="stat-label">Completion Rate</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Student Performance</div>
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Student ID</th>
          <th>Progress</th>
          <th>Lessons</th>
          <th>Grade</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${data.students.map(student => `
        <tr>
          <td>${student.name}</td>
          <td>${student.studentId}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>${student.progress}%</span>
              <div class="progress-bar" style="flex: 1;">
                <div class="progress-fill" style="width: ${student.progress}%; background: ${student.progress >= 70 ? '#22c55e' : student.progress >= 40 ? '#eab308' : '#ef4444'};"></div>
              </div>
            </div>
          </td>
          <td>${student.lessonsCompleted}</td>
          <td>${student.grade || '-'}</td>
          <td><span class="badge badge-${student.status}">${student.status.replace('-', ' ')}</span></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${data.coursePerformance.length > 0 ? `
  <div class="section">
    <div class="section-title">Course Performance</div>
    <table>
      <thead>
        <tr>
          <th>Course</th>
          <th>Average Progress</th>
          <th>Completion Rate</th>
        </tr>
      </thead>
      <tbody>
        ${data.coursePerformance.map(course => `
        <tr>
          <td>${course.courseName}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>${course.averageProgress}%</span>
              <div class="progress-bar" style="flex: 1;">
                <div class="progress-fill" style="width: ${course.averageProgress}%; background: #6366f1;"></div>
              </div>
            </div>
          </td>
          <td>${course.completionRate}%</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p>Generated by BitByBit Learning Platform</p>
    <p>© ${new Date().getFullYear()} BitByBit. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}
