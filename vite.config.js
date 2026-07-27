import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  let entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyStaticAssetsPlugin() {
  return {
    name: 'copy-static-assets-plugin',
    closeBundle() {
      try {
        console.log('Copying static js/ and components/ folders to dist/...');
        const distJs = resolve(__dirname, 'dist/js');
        const srcJs = resolve(__dirname, 'js');
        copyDirSync(srcJs, distJs);

        const distComponents = resolve(__dirname, 'dist/components');
        const srcComponents = resolve(__dirname, 'components');
        copyDirSync(srcComponents, distComponents);
        console.log('Static folders copied successfully!');
      } catch (err) {
        console.error('Error copying static assets:', err);
      }
    }
  };
}

export default defineConfig({
  plugins: [copyStaticAssetsPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        // Student pages
        student_dashboard: resolve(__dirname, 'pages/student/dashboard.html'),
        student_complaints: resolve(__dirname, 'pages/student/complaints.html'),
        student_complaint_status: resolve(__dirname, 'pages/student/complaint-status.html'),
        student_leave_request: resolve(__dirname, 'pages/student/leave-request.html'),
        student_leave_status: resolve(__dirname, 'pages/student/leave-status.html'),
        student_my_credits: resolve(__dirname, 'pages/student/my-credits.html'),
        student_profile: resolve(__dirname, 'pages/student/profile.html'),
        student_outing_request: resolve(__dirname, 'pages/student/outing-request.html'),
        student_my_outpasses: resolve(__dirname, 'pages/student/my-outpasses.html'),
        parent_outpass_approval: resolve(__dirname, 'pages/parent/outpass-approval.html'),
        
        // Warden pages
        warden_dashboard: resolve(__dirname, 'pages/warden/dashboard.html'),
        warden_attendance: resolve(__dirname, 'pages/warden/attendance.html'),
        warden_room_allocation: resolve(__dirname, 'pages/warden/room-allocation.html'),
        warden_rooms: resolve(__dirname, 'pages/warden/rooms.html'),
        warden_students: resolve(__dirname, 'pages/warden/students.html'),
        warden_complaints: resolve(__dirname, 'pages/warden/complaints.html'),
        warden_leave_requests: resolve(__dirname, 'pages/warden/leave-requests.html'),
        warden_outing_requests: resolve(__dirname, 'pages/warden/outing-requests.html'),
        warden_gate_control: resolve(__dirname, 'pages/warden/gate-control.html'),
        warden_staff: resolve(__dirname, 'pages/warden/staff.html'),
        
        // Teacher pages
        teacher_dashboard: resolve(__dirname, 'pages/teacher/dashboard.html'),
        teacher_student_status: resolve(__dirname, 'pages/teacher/student-status.html'),
        teacher_leave_records: resolve(__dirname, 'pages/teacher/leave-records.html'),
        
        // HOD pages
        hod_dashboard: resolve(__dirname, 'pages/hod/dashboard.html'),
        hod_department_students: resolve(__dirname, 'pages/hod/department-students.html'),
        hod_leave_reports: resolve(__dirname, 'pages/hod/leave-reports.html'),
        hod_analytics: resolve(__dirname, 'pages/hod/analytics.html'),
        
        // AO pages
        ao_dashboard: resolve(__dirname, 'pages/ao/dashboard.html'),
        ao_complaints: resolve(__dirname, 'pages/ao/complaints.html'),
        ao_escalated_cases: resolve(__dirname, 'pages/ao/escalated-cases.html'),
        ao_reports: resolve(__dirname, 'pages/ao/reports.html'),
        
        // Principal pages
        principal_dashboard: resolve(__dirname, 'pages/principal/dashboard.html'),
        principal_student_analytics: resolve(__dirname, 'pages/principal/student-analytics.html'),
        principal_complaint_analytics: resolve(__dirname, 'pages/principal/complaint-analytics.html'),
        principal_leave_analytics: resolve(__dirname, 'pages/principal/leave-analytics.html'),
        principal_reports: resolve(__dirname, 'pages/principal/reports.html'),
      }
    }
  }
});
