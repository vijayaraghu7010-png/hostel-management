/* --- Utility Functions & Asynchronous Database Engine --- */

let USE_SUPABASE = true;

async function loadSupabaseScript() {
  if (typeof supabaseFetch !== 'undefined') return;
  return new Promise((resolve, reject) => {
    const rootPath = document.body.getAttribute('data-root-path') || '';
    const script = document.createElement('script');
    script.src = `${rootPath}js/supabase.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load supabase.js script dynamically'));
    document.head.appendChild(script);
  });
}

class HostelDB {
  static async checkConnection() {
    try {
      // Test table access
      await supabaseFetch('hms_users?limit=1', { method: 'GET' });
      USE_SUPABASE = true;
      console.log('HMS Cloud Connection: Supabase backend active.');
    } catch (e) {
      console.warn('HMS Cloud Connection: Tables not found or connection failed. Falling back to LocalStorage.', e);
      USE_SUPABASE = false;
    }
  }

  static async init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      try {
        await loadSupabaseScript();
      } catch (e) {
        console.warn('Could not load Supabase client library dynamically. Falling back to LocalStorage.', e);
        USE_SUPABASE = false;
      }

      // Perform connection check first
      await this.checkConnection();

      // 1. Initial LocalStorage Seeding (Always keep for fallback mode)
      if (!localStorage.getItem('hms_users')) {
        const defaultUsers = [
          { regNo: 'STU001', name: 'Rahul Sharma', email: 'rahul@gmail.com', password: 'password', role: 'student', dept: 'CSE', room: '', contact: '+91 98765 43210' },
          { name: 'Dr. K. Srinivasan', email: 'warden@gmail.com', password: 'password', role: 'warden' },
          { name: 'Prof. Animesh Sen', email: 'teacher@gmail.com', password: 'password', role: 'teacher', dept: 'CSE' },
          { name: 'Dr. Rajesh Kumar', email: 'hod@gmail.com', password: 'password', role: 'hod', dept: 'CSE' },
          { name: 'Vikas Malhotra', email: 'ao@gmail.com', password: 'password', role: 'ao' },
          { name: 'Dr. Sandeep Shastri', email: 'principal@gmail.com', password: 'password', role: 'principal' }
        ];
        localStorage.setItem('hms_users', JSON.stringify(defaultUsers));
      }

      if (!localStorage.getItem('hms_rooms')) {
        localStorage.setItem('hms_rooms', JSON.stringify([]));
      }

      if (!localStorage.getItem('hms_complaints')) {
        localStorage.setItem('hms_complaints', JSON.stringify([]));
      }

      if (!localStorage.getItem('hms_leaves')) {
        localStorage.setItem('hms_leaves', JSON.stringify([]));
      }

      if (!localStorage.getItem('hms_attendance')) {
        localStorage.setItem('hms_attendance', JSON.stringify({}));
      }

      if (!localStorage.getItem('hms_notifications')) {
        localStorage.setItem('hms_notifications', JSON.stringify([]));
      }

      if (!localStorage.getItem('hms_study_sessions')) {
        localStorage.setItem('hms_study_sessions', JSON.stringify([]));
      }

      if (!localStorage.getItem('hms_study_attendance')) {
        localStorage.setItem('hms_study_attendance', JSON.stringify([]));
      }

      if (!localStorage.getItem('hms_study_checks')) {
        localStorage.setItem('hms_study_checks', JSON.stringify([]));
      }

      if (!localStorage.getItem('hms_study_check_responses')) {
        localStorage.setItem('hms_study_check_responses', JSON.stringify([]));
      }

      if (!localStorage.getItem('hms_qr_tokens')) {
        localStorage.setItem('hms_qr_tokens', JSON.stringify([]));
      }

      if (!localStorage.getItem('hms_credit_ledger')) {
        localStorage.setItem('hms_credit_ledger', JSON.stringify([]));
      }

      if (!localStorage.getItem('hms_student_risk')) {
        localStorage.setItem('hms_student_risk', JSON.stringify([]));
      }

      if (!localStorage.getItem('hms_parent_alerts')) {
        localStorage.setItem('hms_parent_alerts', JSON.stringify([]));
      }

      if (!localStorage.getItem('hms_outing_requests')) {
        localStorage.setItem('hms_outing_requests', JSON.stringify([]));
      }

      if (!localStorage.getItem('hms_outpasses')) {
        localStorage.setItem('hms_outpasses', JSON.stringify([]));
      }

      // 2. Seeding Supabase database (if empty and connected)
      if (USE_SUPABASE) {
        try {
          const users = await supabaseFetch('hms_users', { method: 'GET' });
          if (users.length === 0) {
            console.log('HMS Cloud Connection: Seeding cloud database tables...');
            
            // Seed Users
            const localUsers = JSON.parse(localStorage.getItem('hms_users'));
            const bodyUsers = localUsers.map(u => ({
              reg_no: u.regNo || u.email, // fallback primary key
              name: u.name,
              email: u.email,
              password: u.password,
              role: u.role,
              dept: u.dept || '',
              room: u.room || '',
              contact: u.contact || ''
            }));
            await supabaseFetch('hms_users', { method: 'POST', body: JSON.stringify(bodyUsers) });

            // Seed Rooms
            const localRooms = JSON.parse(localStorage.getItem('hms_rooms'));
            const bodyRooms = localRooms.map(r => ({
              room_no: r.roomNo,
              capacity: r.capacity,
              occupied: r.occupied,
              wing: r.wing
            }));
            await supabaseFetch('hms_rooms', { method: 'POST', body: JSON.stringify(bodyRooms) });

            // Seed Complaints
            const localComplaints = JSON.parse(localStorage.getItem('hms_complaints'));
            const bodyComplaints = localComplaints.map(c => ({
              id: c.id,
              student_reg: c.studentReg,
              student_name: c.studentName,
              room: c.room,
              category: c.category,
              priority: c.priority,
              description: c.description,
              date: c.date,
              status: c.status,
              timeline: c.timeline,
              assigned_to: c.assignedTo,
              deadline: c.deadline
            }));
            await supabaseFetch('hms_complaints', { method: 'POST', body: JSON.stringify(bodyComplaints) });

            // Seed Leaves
            const localLeaves = JSON.parse(localStorage.getItem('hms_leaves'));
            const bodyLeaves = localLeaves.map(l => ({
              id: l.id,
              student_reg: l.studentReg,
              student_name: l.studentName,
              dept: l.dept,
              room: l.room,
              from_date: l.fromDate,
              to_date: l.toDate,
              reason: l.reason,
              status: l.status,
              date_raised: l.dateRaised,
              approved_by: l.approvedBy
            }));
            await supabaseFetch('hms_leaves', { method: 'POST', body: JSON.stringify(bodyLeaves) });

            // Seed Notifications
            const localNotifs = JSON.parse(localStorage.getItem('hms_notifications'));
            const bodyNotifs = localNotifs.map(n => ({
              title: n.title,
              text: n.text,
              time: n.time,
              read: n.read
            }));
            await supabaseFetch('hms_notifications', { method: 'POST', body: JSON.stringify(bodyNotifs) });
            console.log('HMS Cloud Connection: Seeding completed.');
          }
        } catch (e) {
          console.error('HMS Cloud Connection Seeding Failed:', e);
        }
      }
    })();
    return this._initPromise;
  }

  // --- CRUD Operations ---
  static getData(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
  }

  static setData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- Read-Write Methods ---
  static async getAllUsers() {
    if (USE_SUPABASE) {
      const data = await supabaseFetch('hms_users', { method: 'GET' });
      return data.map(u => ({
        regNo: u.reg_no,
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        dept: u.dept,
        room: u.room,
        contact: u.contact
      }));
    } else {
      return this.getData('hms_users');
    }
  }

  static async getStudents() {
    const currentUser = HMSAuth.getCurrentUser();
    let deptFilter = '';
    if (currentUser && (currentUser.role === 'teacher' || currentUser.role === 'hod')) {
      if (currentUser.dept) {
        deptFilter = `&dept=eq.${currentUser.dept}`;
      }
    }

    if (USE_SUPABASE) {
      const data = await supabaseFetch(`hms_users?role=eq.student${deptFilter}`, { method: 'GET' });
      return data.map(u => {
        let contactVal = u.contact || '';
        let parentPhone = '';
        let gender = '';
        let year = '';
        let hostelStatus = 'Active';
        let dob = '';
        let parentName = '';
        let address = '';
        let bedNo = '';
        
        if (contactVal.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(contactVal);
            contactVal = parsed.studentPhone || '';
            parentPhone = parsed.parentPhone || '';
            gender = parsed.gender || '';
            year = parsed.year || '';
            hostelStatus = parsed.status || 'Active';
            dob = parsed.dob || '';
            parentName = parsed.parentName || '';
            address = parsed.address || '';
            bedNo = parsed.bedNo || '';
          } catch (e) {
            console.error('Failed to parse contact JSON metadata:', e);
          }
        }
        
        return {
          regNo: u.reg_no,
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role,
          dept: u.dept,
          room: u.room,
          contact: contactVal,
          parentPhone,
          gender,
          year,
          hostelStatus,
          dob,
          parentName,
          address,
          bedNo
        };
      });
    } else {
      let list = this.getData('hms_users').filter(u => u.role === 'student');
      if (currentUser && (currentUser.role === 'teacher' || currentUser.role === 'hod')) {
        if (currentUser.dept) {
          list = list.filter(u => u.dept === currentUser.dept);
        }
      }
      return list.map(u => {
        let contactVal = u.contact || '';
        let parentPhone = u.parentPhone || '';
        let gender = u.gender || '';
        let year = u.year || '';
        let hostelStatus = u.hostelStatus || 'Active';
        let dob = u.dob || '';
        let parentName = u.parentName || '';
        let address = u.address || '';
        let bedNo = u.bedNo || '';
        
        if (contactVal.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(contactVal);
            contactVal = parsed.studentPhone || '';
            parentPhone = parsed.parentPhone || '';
            gender = parsed.gender || '';
            year = parsed.year || '';
            hostelStatus = parsed.status || 'Active';
            dob = parsed.dob || '';
            parentName = parsed.parentName || '';
            address = parsed.address || '';
            bedNo = parsed.bedNo || '';
          } catch (e) {
            console.error('Failed to parse local contact JSON metadata:', e);
          }
        }
        return {
          ...u,
          contact: contactVal,
          parentPhone,
          gender,
          year,
          hostelStatus,
          dob,
          parentName,
          address,
          bedNo
        };
      });
    }
  }

  static async addStudent(s) {
    if (USE_SUPABASE) {
      const body = {
        reg_no: s.regNo,
        name: s.name,
        email: s.email,
        password: s.password || 'password',
        role: 'student',
        dept: s.dept || '',
        room: s.room || '',
        contact: JSON.stringify({
          studentPhone: s.contact || '',
          parentPhone: s.parentPhone || '',
          gender: s.gender || '',
          year: s.year || '',
          status: s.hostelStatus || 'Active',
          dob: s.dob || '',
          parentName: s.parentName || '',
          address: s.address || '',
          bedNo: s.bedNo || ''
        })
      };
      await supabaseFetch('hms_users', { method: 'POST', body: JSON.stringify(body) });
    } else {
      const list = this.getData('hms_users');
      list.push({
        regNo: s.regNo,
        name: s.name,
        email: s.email,
        password: s.password || 'password',
        role: 'student',
        dept: s.dept || '',
        room: s.room || '',
        contact: s.contact || '',
        parentPhone: s.parentPhone || '',
        gender: s.gender || '',
        year: s.year || '',
        hostelStatus: s.hostelStatus || 'Active',
        dob: s.dob || '',
        parentName: s.parentName || '',
        address: s.address || '',
        bedNo: s.bedNo || ''
      });
      this.setData('hms_users', list);
    }
  }

  static async updateStudent(regNo, s) {
    if (USE_SUPABASE) {
      const body = {
        name: s.name,
        email: s.email,
        dept: s.dept || '',
        room: s.room || '',
        contact: JSON.stringify({
          studentPhone: s.contact || '',
          parentPhone: s.parentPhone || '',
          gender: s.gender || '',
          year: s.year || '',
          status: s.hostelStatus || 'Active',
          dob: s.dob || '',
          parentName: s.parentName || '',
          address: s.address || '',
          bedNo: s.bedNo || ''
        })
      };
      if (s.password) body.password = s.password;
      await supabaseFetch(`hms_users?reg_no=eq.${regNo}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    } else {
      const list = this.getData('hms_users');
      const updated = list.map(u => u.regNo === regNo ? { ...u, ...s } : u);
      this.setData('hms_users', updated);
    }
  }

  static async deleteStudent(regNo) {
    if (USE_SUPABASE) {
      await supabaseFetch(`hms_users?reg_no=eq.${regNo}`, { method: 'DELETE' });
    } else {
      const list = this.getData('hms_users');
      const filtered = list.filter(u => u.regNo !== regNo);
      this.setData('hms_users', filtered);
    }
  }

  static async getRooms() {
    if (USE_SUPABASE) {
      const data = await supabaseFetch('hms_rooms', { method: 'GET' });
      return data.map(r => {
        let wingVal = r.wing || '';
        let block = wingVal;
        let floor = '1';
        let roomType = 'Double';
        let description = '';
        let status = 'Available';

        if (wingVal.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(wingVal);
            wingVal = parsed.wing || '';
            block = parsed.block || '';
            floor = parsed.floor || '1';
            roomType = parsed.roomType || 'Double';
            description = parsed.description || '';
            status = parsed.status || 'Available';
          } catch (e) {
            console.error('Failed to parse wing JSON metadata:', e);
          }
        } else {
          if (r.capacity === 1) roomType = 'Single';
          else if (r.capacity === 2) roomType = 'Double';
          else if (r.capacity === 3) roomType = 'Triple';
          else if (r.capacity >= 4) roomType = 'Dormitory';

          if (r.occupied && r.occupied.length >= r.capacity) status = 'Full';
        }

        return {
          roomNo: r.room_no,
          capacity: r.capacity,
          occupied: r.occupied || [],
          wing: wingVal,
          block: block,
          floor: floor,
          roomType: roomType,
          description: description,
          status: status
        };
      });
    } else {
      return this.getData('hms_rooms').map(r => {
        let wingVal = r.wing || '';
        let block = r.block || r.wing || '';
        let floor = r.floor || '1';
        let roomType = r.roomType || 'Double';
        let description = r.description || '';
        let status = r.status || 'Available';

        if (wingVal.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(wingVal);
            wingVal = parsed.wing || '';
            block = parsed.block || '';
            floor = parsed.floor || '1';
            roomType = parsed.roomType || 'Double';
            description = parsed.description || '';
            status = parsed.status || 'Available';
          } catch (e) {
            console.error('Failed to parse local wing JSON metadata:', e);
          }
        }
        return {
          ...r,
          wing: wingVal,
          block: block,
          floor: floor,
          roomType: roomType,
          description: description,
          status: status
        };
      });
    }
  }

  static async addRoom(r) {
    if (USE_SUPABASE) {
      const body = {
        room_no: r.roomNo,
        capacity: parseInt(r.capacity),
        occupied: r.occupied || [],
        wing: JSON.stringify({
          wing: r.block || '',
          block: r.block || '',
          floor: r.floor || '1',
          roomType: r.roomType || 'Double',
          description: r.description || '',
          status: r.status || 'Available'
        })
      };
      await supabaseFetch('hms_rooms', { method: 'POST', body: JSON.stringify(body) });
    } else {
      const list = this.getData('hms_rooms');
      list.push({
        roomNo: r.roomNo,
        capacity: parseInt(r.capacity),
        occupied: r.occupied || [],
        wing: r.block || '',
        block: r.block || '',
        floor: r.floor || '1',
        roomType: r.roomType || 'Double',
        description: r.description || '',
        status: r.status || 'Available'
      });
      this.setData('hms_rooms', list);
    }
  }

  static async updateRoom(roomNo, r) {
    if (USE_SUPABASE) {
      const body = {
        capacity: parseInt(r.capacity),
        wing: JSON.stringify({
          wing: r.block || '',
          block: r.block || '',
          floor: r.floor || '1',
          roomType: r.roomType || 'Double',
          description: r.description || '',
          status: r.status || 'Available'
        })
      };
      if (r.occupied !== undefined) {
        body.occupied = r.occupied;
      }
      await supabaseFetch(`hms_rooms?room_no=eq.${roomNo}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    } else {
      const list = this.getData('hms_rooms');
      const updated = list.map(room => room.roomNo === roomNo ? { ...room, ...r } : room);
      this.setData('hms_rooms', updated);
    }
  }

  static async deleteRoom(roomNo) {
    if (USE_SUPABASE) {
      await supabaseFetch(`hms_rooms?room_no=eq.${roomNo}`, { method: 'DELETE' });
    } else {
      const list = this.getData('hms_rooms');
      const filtered = list.filter(r => r.roomNo !== roomNo);
      this.setData('hms_rooms', filtered);
    }
  }

  static async updateRoomAllocation(roomNo, occupiedArray) {
    if (USE_SUPABASE) {
      await supabaseFetch(`hms_rooms?room_no=eq.${roomNo}`, {
        method: 'PATCH',
        body: JSON.stringify({ occupied: occupiedArray })
      });
    } else {
      const list = this.getData('hms_rooms');
      const updated = list.map(r => r.roomNo === roomNo ? { ...r, occupied: occupiedArray } : r);
      this.setData('hms_rooms', updated);
    }
  }

  static async updateStudentRoom(regNo, roomNo) {
    if (USE_SUPABASE) {
      await supabaseFetch(`hms_users?reg_no=eq.${regNo}`, {
        method: 'PATCH',
        body: JSON.stringify({ room: roomNo })
      });
    } else {
      const list = this.getData('hms_users');
      const updated = list.map(u => u.regNo === regNo ? { ...u, room: roomNo } : u);
      this.setData('hms_users', updated);
    }
  }

  static async getComplaints() {
    const currentUser = HMSAuth.getCurrentUser();
    const isRestricted = currentUser && (currentUser.role === 'teacher' || currentUser.role === 'hod');
    
    let allowedRegs = null;
    if (isRestricted) {
      const students = await this.getStudents();
      allowedRegs = new Set(students.map(s => s.regNo));
    }

    if (USE_SUPABASE) {
      const data = await supabaseFetch('hms_complaints?order=date.desc', { method: 'GET' });
      const mapped = data.map(c => ({
        id: c.id,
        studentReg: c.student_reg,
        studentName: c.student_name,
        room: c.room,
        category: c.category,
        priority: c.priority,
        description: c.description,
        date: c.date,
        status: c.status,
        timeline: c.timeline || [],
        assignedTo: c.assigned_to,
        deadline: c.deadline
      }));
      if (allowedRegs) {
        return mapped.filter(c => allowedRegs.has(c.studentReg));
      }
      return mapped;
    } else {
      const list = this.getData('hms_complaints');
      if (allowedRegs) {
        return list.filter(c => allowedRegs.has(c.studentReg));
      }
      return list;
    }
  }

  static async addComplaint(c) {
    if (USE_SUPABASE) {
      const body = {
        id: c.id,
        student_reg: c.studentReg,
        student_name: c.studentName,
        room: c.room,
        category: c.category,
        priority: c.priority,
        description: c.description,
        date: c.date,
        status: c.status,
        timeline: c.timeline,
        assigned_to: c.assignedTo,
        deadline: c.deadline
      };
      await supabaseFetch('hms_complaints', { method: 'POST', body: JSON.stringify(body) });
    } else {
      const list = this.getData('hms_complaints');
      list.unshift(c);
      this.setData('hms_complaints', list);
    }
  }

  static async updateComplaint(id, updates) {
    if (USE_SUPABASE) {
      const body = {};
      if (updates.status !== undefined) body.status = updates.status;
      if (updates.timeline !== undefined) body.timeline = updates.timeline;
      if (updates.assignedTo !== undefined) body.assigned_to = updates.assignedTo;
      if (updates.deadline !== undefined) body.deadline = updates.deadline;

      await supabaseFetch(`hms_complaints?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    } else {
      const list = this.getData('hms_complaints');
      const updated = list.map(c => c.id === id ? { ...c, ...updates } : c);
      this.setData('hms_complaints', updated);
    }
  }

  static async getLeaves() {
    const currentUser = HMSAuth.getCurrentUser();
    let deptFilter = '';
    if (currentUser && (currentUser.role === 'teacher' || currentUser.role === 'hod')) {
      if (currentUser.dept) {
        deptFilter = `&dept=eq.${currentUser.dept}`;
      }
    }

    if (USE_SUPABASE) {
      const data = await supabaseFetch(`hms_leaves?order=date_raised.desc${deptFilter}`, { method: 'GET' });
      return data.map(l => {
        let reviewer = l.approved_by || '';
        let remarks = '';
        let reviewDate = '';
        
        if (reviewer.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(reviewer);
            reviewer = parsed.reviewer || '';
            remarks = parsed.remarks || '';
            reviewDate = parsed.reviewDate || '';
          } catch (e) {
            console.error('Failed to parse approved_by JSON:', e);
          }
        } else {
          if (l.status === 'Approved') {
            remarks = 'Approved by warden';
            reviewDate = l.date_raised;
          } else if (l.status === 'Rejected') {
            remarks = 'Request denied by warden';
            reviewDate = l.date_raised;
          } else if (l.status === 'Cancelled') {
            remarks = 'Cancelled by student';
            reviewDate = l.date_raised;
          } else {
            remarks = 'Awaiting review';
            reviewDate = 'Not Available';
          }
        }
        
        return {
          id: l.id,
          studentReg: l.student_reg,
          studentName: l.student_name,
          dept: l.dept,
          room: l.room,
          fromDate: l.from_date,
          toDate: l.to_date,
          reason: l.reason,
          status: l.status,
          dateRaised: l.date_raised,
          approvedBy: reviewer,
          remarks: remarks || (l.status === 'Pending' ? 'Awaiting review' : 'Processed'),
          reviewDate: reviewDate || 'Not Available'
        };
      });
    } else {
      let list = this.getData('hms_leaves');
      if (currentUser && (currentUser.role === 'teacher' || currentUser.role === 'hod')) {
        if (currentUser.dept) {
          list = list.filter(l => l.dept === currentUser.dept);
        }
      }
      return list.map(l => {
        let reviewer = l.approvedBy || '';
        let remarks = l.remarks || '';
        let reviewDate = l.reviewDate || '';
        
        if (reviewer.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(reviewer);
            reviewer = parsed.reviewer || '';
            remarks = parsed.remarks || '';
            reviewDate = parsed.reviewDate || '';
          } catch (e) {
            console.error('Failed to parse approvedBy JSON:', e);
          }
        } else {
          if (l.status === 'Approved') {
            remarks = remarks || 'Approved by warden';
            reviewDate = reviewDate || l.dateRaised;
          } else if (l.status === 'Rejected') {
            remarks = remarks || 'Request denied by warden';
            reviewDate = reviewDate || l.dateRaised;
          } else if (l.status === 'Cancelled') {
            remarks = remarks || 'Cancelled by student';
            reviewDate = reviewDate || l.dateRaised;
          } else {
            remarks = remarks || 'Awaiting review';
            reviewDate = 'Not Available';
          }
        }
        
        return {
          ...l,
          approvedBy: reviewer,
          remarks: remarks || (l.status === 'Pending' ? 'Awaiting review' : 'Processed'),
          reviewDate: reviewDate || 'Not Available'
        };
      });
    }
  }

  static async addLeave(l) {
    if (USE_SUPABASE) {
      const body = {
        id: l.id,
        student_reg: l.studentReg,
        student_name: l.studentName,
        dept: l.dept,
        room: l.room,
        from_date: l.fromDate,
        to_date: l.toDate,
        reason: l.reason,
        status: l.status,
        date_raised: l.dateRaised,
        approved_by: l.approvedBy
      };
      await supabaseFetch('hms_leaves', { method: 'POST', body: JSON.stringify(body) });
    } else {
      const list = this.getData('hms_leaves');
      list.unshift(l);
      this.setData('hms_leaves', list);
    }
  }

  static async updateLeave(id, updates) {
    if (USE_SUPABASE) {
      const body = {};
      if (updates.status !== undefined) body.status = updates.status;
      if (updates.approvedBy !== undefined) {
        const reviewDate = new Date().toISOString().split('T')[0];
        let remarks = 'Approved by warden';
        if (updates.status === 'Rejected') {
          remarks = 'Request denied by warden';
        } else if (updates.status === 'Cancelled') {
          remarks = 'Cancelled by student';
        }
        
        const approvedByObj = {
          reviewer: updates.approvedBy,
          remarks: updates.remarks || remarks,
          reviewDate: updates.reviewDate || reviewDate
        };
        body.approved_by = JSON.stringify(approvedByObj);
      }

      await supabaseFetch(`hms_leaves?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    } else {
      const list = this.getData('hms_leaves');
      const updated = list.map(l => {
        if (l.id === id) {
          const reviewDate = new Date().toISOString().split('T')[0];
          let remarks = 'Approved by warden';
          if (updates.status === 'Rejected') {
            remarks = 'Request denied by warden';
          } else if (updates.status === 'Cancelled') {
            remarks = 'Cancelled by student';
          }
          
          return {
            ...l,
            ...updates,
            remarks: updates.remarks || remarks,
            reviewDate: updates.reviewDate || reviewDate
          };
        }
        return l;
      });
      this.setData('hms_leaves', updated);
    }

    // Auto-generate Digital Outpass if leave is approved
    if (updates.status === 'Approved') {
      try {
        await this.createOrGetLeaveOutpass(id);
      } catch (err) {
        console.warn('Failed to auto-generate leave outpass:', err);
      }
    }
  }

  static async getAttendanceRecords() {
    const currentUser = HMSAuth.getCurrentUser();
    const isRestricted = currentUser && (currentUser.role === 'teacher' || currentUser.role === 'hod');
    
    let allowedRegs = null;
    if (isRestricted) {
      const students = await this.getStudents();
      allowedRegs = new Set(students.map(s => s.regNo));
    }

    if (USE_SUPABASE) {
      const data = await supabaseFetch('hms_attendance', { method: 'GET' });
      const records = {};
      data.forEach(r => {
        if (allowedRegs && !allowedRegs.has(r.student_reg)) return;
        if (!records[r.date]) records[r.date] = {};
        records[r.date][r.student_reg] = r.status;
      });
      return records;
    } else {
      const allRecords = JSON.parse(localStorage.getItem('hms_attendance')) || {};
      if (allowedRegs) {
        const filtered = {};
        for (const date in allRecords) {
          filtered[date] = {};
          for (const reg in allRecords[date]) {
            if (allowedRegs.has(reg)) {
              filtered[date][reg] = allRecords[date][reg];
            }
          }
        }
        return filtered;
      }
      return allRecords;
    }
  }

  static async saveAttendance(date, recordsForDate) {
    if (USE_SUPABASE) {
      const body = Object.keys(recordsForDate).map(regNo => ({
        date: date,
        student_reg: regNo,
        status: recordsForDate[regNo]
      }));

      // PostgREST upsert headers
      await supabaseFetch('hms_attendance', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(body)
      });
    } else {
      const attendance = JSON.parse(localStorage.getItem('hms_attendance')) || {};
      attendance[date] = recordsForDate;
      localStorage.setItem('hms_attendance', JSON.stringify(attendance));
    }
  }

  static async getNotifications() {
    if (USE_SUPABASE) {
      const data = await supabaseFetch('hms_notifications?order=id.desc&limit=10', { method: 'GET' });
      return data;
    } else {
      return this.getData('hms_notifications');
    }
  }

  static async addNotification(notif) {
    if (USE_SUPABASE) {
      const body = {
        title: notif.title,
        text: notif.text,
        time: notif.time,
        read: notif.read
      };
      await supabaseFetch('hms_notifications', { method: 'POST', body: JSON.stringify(body) });
    } else {
      const list = this.getData('hms_notifications');
      list.unshift(notif);
      if (list.length > 10) list.pop();
      this.setData('hms_notifications', list);
    }
  }

  static async markNotificationRead(id) {
    if (USE_SUPABASE) {
      await supabaseFetch(`hms_notifications?id=eq.${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ read: true })
      });
    } else {
      const list = this.getData('hms_notifications');
      const updated = list.map(n => n.id === id ? { ...n, read: true } : n);
      this.setData('hms_notifications', updated);
    }
  }

  static async getStaff() {
    if (USE_SUPABASE) {
      const data = await supabaseFetch('hms_users?role=in.(teacher,hod)', { method: 'GET' });
      return data.map(u => ({
        regNo: u.reg_no,
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        dept: u.dept,
        room: u.room || '',
        contact: u.contact || ''
      }));
    } else {
      return this.getData('hms_users').filter(u => u.role === 'teacher' || u.role === 'hod');
    }
  }

  static async addStaff(s) {
    if (USE_SUPABASE) {
      const body = {
        reg_no: s.regNo,
        name: s.name,
        email: s.email,
        password: s.password || 'password',
        role: s.role,
        dept: s.dept || '',
        room: '',
        contact: s.contact || ''
      };
      await supabaseFetch('hms_users', { method: 'POST', body: JSON.stringify(body) });
    } else {
      const list = this.getData('hms_users');
      list.push({
        regNo: s.regNo,
        name: s.name,
        email: s.email,
        password: s.password || 'password',
        role: s.role,
        dept: s.dept || '',
        room: '',
        contact: s.contact || ''
      });
      this.setData('hms_users', list);
    }
  }

  static async updateStaff(regNo, s) {
    if (USE_SUPABASE) {
      const body = {
        name: s.name,
        email: s.email,
        role: s.role,
        dept: s.dept || '',
        contact: s.contact || ''
      };
      if (s.password) body.password = s.password;
      await supabaseFetch(`hms_users?reg_no=eq.${regNo}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    } else {
      const list = this.getData('hms_users');
      const updated = list.map(u => u.regNo === regNo ? { ...u, ...s } : u);
      this.setData('hms_users', updated);
    }
  }

  static async deleteStaff(regNo) {
    if (USE_SUPABASE) {
      await supabaseFetch(`hms_users?reg_no=eq.${regNo}`, { method: 'DELETE' });
    } else {
      const list = this.getData('hms_users');
      const filtered = list.filter(u => u.regNo !== regNo);
      this.setData('hms_users', filtered);
    }
  }

  // --- STUDY HOUR MANAGEMENT & DISCIPLINE CREDIT MODULE ---

  static async getStudySessions() {
    if (USE_SUPABASE) {
      try {
        const data = await supabaseFetch('hms_study_sessions?order=created_at.desc', { method: 'GET' });
        return (data || []).map(s => ({
          id: s.id,
          sessionTitle: s.session_title,
          date: s.date,
          startTime: s.start_time,
          endTime: s.end_time,
          status: s.status,
          createdBy: s.created_by,
          createdAt: s.created_at,
          closedAt: s.closed_at,
          config: s.config || {}
        }));
      } catch (e) {
        console.warn('Supabase hms_study_sessions query failed (falling back to LocalStorage):', e.message);
        return this.getData('hms_study_sessions');
      }
    } else {
      return this.getData('hms_study_sessions');
    }
  }

  static async getActiveStudySession() {
    const sessions = await this.getStudySessions();
    return sessions.find(s => s.status === 'ACTIVE') || null;
  }

  static async createStudySession(sessionData) {
    const active = await this.getActiveStudySession();
    if (active) {
      throw new Error(`An active study session "${active.sessionTitle}" is already in progress.`);
    }

    const newSession = {
      id: generateID('SES'),
      session_title: sessionData.sessionTitle || 'Evening Study Session',
      date: sessionData.date || new Date().toISOString().split('T')[0],
      start_time: sessionData.startTime || '19:00',
      end_time: sessionData.endTime || '21:00',
      status: 'ACTIVE',
      created_by: sessionData.createdBy || 'Warden',
      created_at: new Date().toISOString(),
      closed_at: null,
      config: sessionData.config || { durationMinutes: 120, keywordWindowSeconds: 60 }
    };

    let savedInCloud = false;
    if (USE_SUPABASE) {
      try {
        await supabaseFetch('hms_study_sessions', {
          method: 'POST',
          body: JSON.stringify(newSession)
        });
        savedInCloud = true;
      } catch (e) {
        console.warn('Supabase createStudySession failed, falling back to LocalStorage:', e.message);
      }
    }

    // Always mirror or fallback to LocalStorage
    const list = this.getData('hms_study_sessions');
    list.unshift({
      id: newSession.id,
      sessionTitle: newSession.session_title,
      date: newSession.date,
      startTime: newSession.start_time,
      endTime: newSession.end_time,
      status: 'ACTIVE',
      createdBy: newSession.created_by,
      createdAt: newSession.created_at,
      closedAt: null,
      config: newSession.config
    });
    this.setData('hms_study_sessions', list);
    return newSession.id;
  }

  static async closeStudySession(sessionId) {
    const closedAt = new Date().toISOString();
    if (USE_SUPABASE) {
      try {
        await supabaseFetch(`hms_study_sessions?id=eq.${sessionId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'CLOSED', closed_at: closedAt })
        });
      } catch (e) {
        console.warn('Supabase closeStudySession failed, falling back to LocalStorage:', e.message);
      }
    }
    
    const list = this.getData('hms_study_sessions');
    const updated = list.map(s => s.id === sessionId ? { ...s, status: 'CLOSED', closedAt: closedAt } : s);
    this.setData('hms_study_sessions', updated);

    // Automatically trigger attendance finalization & credit engine
    await this.finalizeSessionAttendance(sessionId);
  }

  // --- DYNAMIC QR TOKENS & VERIFICATION ---
  static async generateStudentQRToken(studentReg, sessionId, purpose) {
    const tokenStr = `HMSQR_${purpose}_${sessionId}_${studentReg}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const qrRecord = {
      id: generateID('QRT'),
      token: tokenStr,
      session_id: sessionId,
      student_reg: studentReg,
      purpose: purpose,
      expires_at: expiresAt,
      used: false,
      used_at: null,
      created_at: new Date().toISOString()
    };

    if (USE_SUPABASE) {
      try {
        await supabaseFetch('hms_qr_tokens', {
          method: 'POST',
          body: JSON.stringify(qrRecord)
        });
      } catch (e) {
        console.warn('Supabase generateStudentQRToken failed, falling back to LocalStorage:', e.message);
      }
    }
    
    const list = this.getData('hms_qr_tokens');
    list.push({
      id: qrRecord.id,
      token: tokenStr,
      sessionId: sessionId,
      studentReg: studentReg,
      purpose: purpose,
      expiresAt: expiresAt,
      used: false,
      usedAt: null,
      createdAt: qrRecord.created_at
    });
    this.setData('hms_qr_tokens', list);

    return tokenStr;
  }

  static async verifyQRToken(tokenStr, purpose, sessionId, wardenReg) {
    let tokenData = null;

    if (USE_SUPABASE) {
      try {
        const res = await supabaseFetch(`hms_qr_tokens?token=eq.${encodeURIComponent(tokenStr)}`, { method: 'GET' });
        if (res && res.length > 0) tokenData = res[0];
      } catch (e) {
        console.warn('Supabase verifyQRToken fetch failed, checking LocalStorage:', e.message);
      }
    }
    
    if (!tokenData) {
      const list = this.getData('hms_qr_tokens');
      tokenData = list.find(t => t.token === tokenStr);
    }

    if (!tokenData) {
      return { success: false, message: 'Invalid QR token.' };
    }

    if (tokenData.used) {
      return { success: false, message: 'QR token has already been used (one-time protection).' };
    }

    const expiresAt = new Date(tokenData.expires_at || tokenData.expiresAt);
    if (new Date() > expiresAt) {
      return { success: false, message: 'QR token expired. Please refresh your QR code.' };
    }

    const tokenPurpose = tokenData.purpose || '';
    if (tokenPurpose.toUpperCase() !== purpose.toUpperCase()) {
      return { success: false, message: `Invalid QR token purpose. Expected ${purpose}.` };
    }

    // Mark token as used
    const usedAt = new Date().toISOString();
    if (USE_SUPABASE) {
      try {
        await supabaseFetch(`hms_qr_tokens?id=eq.${tokenData.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ used: true, used_at: usedAt })
        });
      } catch (e) {
        console.warn('Supabase mark token used failed, falling back to LocalStorage:', e.message);
      }
    }
    
    const list = this.getData('hms_qr_tokens');
    const updated = list.map(t => t.token === tokenStr ? { ...t, used: true, usedAt: usedAt } : t);
    this.setData('hms_qr_tokens', updated);

    // Get student details
    const studentReg = tokenData.student_reg || tokenData.studentReg;
    const session_Id = tokenData.session_id || tokenData.sessionId;
    const students = await this.getStudents();
    const student = students.find(s => s.regNo === studentReg);

    // Upsert study attendance for Entry or Exit
    const nowStr = new Date().toISOString();
    let attRecords = await this.getStudyAttendance(session_Id);
    let att = attRecords.find(a => a.studentReg === studentReg);

    if (!att) {
      att = {
        id: generateID('ATT'),
        sessionId: session_Id,
        studentReg: studentReg,
        studentName: student ? student.name : studentReg,
        dept: student ? student.dept : 'General',
        room: student ? student.room : '',
        entryStatus: purpose === 'ENTRY' ? 'PASS' : 'MISSED',
        entryTime: purpose === 'ENTRY' ? nowStr : null,
        exitStatus: purpose === 'EXIT' ? 'PASS' : 'MISSED',
        exitTime: purpose === 'EXIT' ? nowStr : null,
        finalStatus: 'REVIEW',
        notes: `QR ${purpose} Verified at ${new Date().toLocaleTimeString()}`
      };
    } else {
      if (purpose === 'ENTRY') {
        att.entryStatus = 'PASS';
        att.entryTime = nowStr;
      } else if (purpose === 'EXIT') {
        att.exitStatus = 'PASS';
        att.exitTime = nowStr;
      }
      att.notes = (att.notes || '') + ` | QR ${purpose} Verified at ${new Date().toLocaleTimeString()}`;
    }

    await this.upsertStudyAttendance(att);
    return { success: true, message: `${purpose} Verified for ${student ? student.name : studentReg}`, studentReg: studentReg, purpose: purpose };
  }

  // --- KEYWORD PRESENCE VERIFICATION ---
  static async createKeywordCheck(sessionId, keyword, durationSeconds = 60) {
    const now = new Date();
    const expires = new Date(now.getTime() + durationSeconds * 1000);
    const existing = await this.getKeywordChecks(sessionId);
    const roundNumber = existing.length + 1;

    const checkRecord = {
      id: generateID('CHK'),
      session_id: sessionId,
      keyword: keyword.trim().toUpperCase(),
      duration_seconds: durationSeconds,
      round_number: roundNumber,
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
      created_at: now.toISOString()
    };

    if (USE_SUPABASE) {
      try {
        await supabaseFetch('hms_study_checks', {
          method: 'POST',
          body: JSON.stringify(checkRecord)
        });
      } catch (e) {
        console.warn('Supabase createKeywordCheck failed, falling back to LocalStorage:', e.message);
      }
    }
    
    const list = this.getData('hms_study_checks');
    list.push({
      id: checkRecord.id,
      sessionId: sessionId,
      keyword: checkRecord.keyword,
      durationSeconds: durationSeconds,
      roundNumber: roundNumber,
      startedAt: checkRecord.started_at,
      expiresAt: checkRecord.expires_at,
      createdAt: checkRecord.created_at
    });
    this.setData('hms_study_checks', list);

    return checkRecord;
  }

  static async getKeywordChecks(sessionId) {
    if (USE_SUPABASE) {
      try {
        const data = await supabaseFetch(`hms_study_checks?session_id=eq.${sessionId}&order=round_number.asc`, { method: 'GET' });
        return (data || []).map(c => ({
          id: c.id,
          sessionId: c.session_id,
          keyword: c.keyword,
          durationSeconds: c.duration_seconds,
          roundNumber: c.round_number,
          startedAt: c.started_at,
          expiresAt: c.expires_at,
          createdAt: c.created_at
        }));
      } catch (e) {
        console.warn('Error fetching keyword checks from Supabase (falling back to LocalStorage):', e.message);
        return (this.getData('hms_study_checks') || []).filter(c => c.sessionId === sessionId);
      }
    } else {
      return (this.getData('hms_study_checks') || []).filter(c => c.sessionId === sessionId);
    }
  }

  static async submitKeywordResponse(checkId, sessionId, studentReg, submittedKeyword) {
    const checks = await this.getKeywordChecks(sessionId);
    const check = checks.find(c => c.id === checkId);
    if (!check) throw new Error('Verification round not found.');

    const now = new Date();
    const expires = new Date(check.expiresAt);
    if (now > expires) {
      throw new Error('Verification window has expired.');
    }

    const cleanInput = (submittedKeyword || '').trim().toUpperCase();
    const isCorrect = cleanInput === check.keyword;
    const status = isCorrect ? 'PASS' : 'FAIL';

    const respRecord = {
      id: generateID('RES'),
      check_id: checkId,
      session_id: sessionId,
      student_reg: studentReg,
      submitted_keyword: cleanInput,
      status: status,
      submitted_at: now.toISOString()
    };

    if (USE_SUPABASE) {
      try {
        await supabaseFetch('hms_study_check_responses', {
          method: 'POST',
          body: JSON.stringify(respRecord)
        });
      } catch (e) {
        console.warn('Supabase submitKeywordResponse failed, falling back to LocalStorage:', e.message);
      }
    }
    
    const list = this.getData('hms_study_check_responses');
    const filtered = list.filter(r => !(r.checkId === checkId && r.studentReg === studentReg));
    filtered.push({
      id: respRecord.id,
      checkId: checkId,
      sessionId: sessionId,
      studentReg: studentReg,
      submittedKeyword: cleanInput,
      status: status,
      submittedAt: respRecord.submitted_at
    });
    this.setData('hms_study_check_responses', filtered);

    return { success: isCorrect, status: status, message: isCorrect ? 'Presence verified successfully!' : 'Incorrect keyword.' };
  }

  static async getKeywordResponses(sessionId, checkId) {
    let query = `hms_study_check_responses?session_id=eq.${sessionId}`;
    if (checkId) query += `&check_id=eq.${checkId}`;

    if (USE_SUPABASE) {
      try {
        const data = await supabaseFetch(query, { method: 'GET' });
        return (data || []).map(r => ({
          id: r.id,
          checkId: r.check_id,
          sessionId: r.session_id,
          studentReg: r.student_reg,
          submittedKeyword: r.submitted_keyword,
          status: r.status,
          submittedAt: r.submitted_at
        }));
      } catch (e) {
        console.warn('Error fetching check responses from Supabase (falling back to LocalStorage):', e.message);
        let list = this.getData('hms_study_check_responses') || [];
        return list.filter(r => r.sessionId === sessionId && (!checkId || r.checkId === checkId));
      }
    } else {
      let list = this.getData('hms_study_check_responses') || [];
      return list.filter(r => r.sessionId === sessionId && (!checkId || r.checkId === checkId));
    }
  }

  // --- ATTENDANCE & ENGINE ---
  static async getStudyAttendance(sessionId, studentReg) {
    let query = `hms_study_attendance?session_id=eq.${sessionId}`;
    if (studentReg) query += `&student_reg=eq.${studentReg}`;

    if (USE_SUPABASE) {
      try {
        const data = await supabaseFetch(query, { method: 'GET' });
        return (data || []).map(a => ({
          id: a.id,
          sessionId: a.session_id,
          studentReg: a.student_reg,
          studentName: a.student_name,
          dept: a.dept,
          room: a.room,
          entryStatus: a.entry_status,
          entryTime: a.entry_time,
          exitStatus: a.exit_status,
          exitTime: a.exit_time,
          finalStatus: a.final_status,
          notes: a.notes,
          createdAt: a.created_at,
          updatedAt: a.updated_at
        }));
      } catch (e) {
        console.warn('Error fetching study attendance from Supabase (falling back to LocalStorage):', e.message);
        let list = this.getData('hms_study_attendance') || [];
        return list.filter(a => a.sessionId === sessionId && (!studentReg || a.studentReg === studentReg));
      }
    } else {
      let list = this.getData('hms_study_attendance') || [];
      return list.filter(a => a.sessionId === sessionId && (!studentReg || a.studentReg === studentReg));
    }
  }

  static async upsertStudyAttendance(att) {
    const record = {
      id: att.id || generateID('ATT'),
      session_id: att.sessionId,
      student_reg: att.studentReg,
      student_name: att.studentName,
      dept: att.dept,
      room: att.room || '',
      entry_status: att.entryStatus || 'MISSED',
      entry_time: att.entryTime || null,
      exit_status: att.exitStatus || 'MISSED',
      exit_time: att.exitTime || null,
      final_status: att.finalStatus || 'REVIEW',
      notes: att.notes || '',
      updated_at: new Date().toISOString()
    };

    if (USE_SUPABASE) {
      try {
        const existing = await supabaseFetch(`hms_study_attendance?session_id=eq.${att.sessionId}&student_reg=eq.${att.studentReg}`, { method: 'GET' });
        if (existing && existing.length > 0) {
          await supabaseFetch(`hms_study_attendance?id=eq.${existing[0].id}`, {
            method: 'PATCH',
            body: JSON.stringify(record)
          });
        } else {
          await supabaseFetch('hms_study_attendance', {
            method: 'POST',
            body: JSON.stringify(record)
          });
        }
      } catch (e) {
        console.warn('Supabase upsertStudyAttendance failed, falling back to LocalStorage:', e.message);
      }
    }
    
    let list = this.getData('hms_study_attendance') || [];
    const index = list.findIndex(a => a.sessionId === att.sessionId && a.studentReg === att.studentReg);
    if (index >= 0) {
      list[index] = { ...list[index], ...att, updatedAt: new Date().toISOString() };
    } else {
      list.push({ ...att, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.setData('hms_study_attendance', list);
  }

  static async finalizeSessionAttendance(sessionId) {
    const sessions = await this.getStudySessions();
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const students = await this.getStudents();
    const leaves = await this.getLeaves();
    const attRecords = await this.getStudyAttendance(sessionId);
    const checks = await this.getKeywordChecks(sessionId);
    const responses = await this.getKeywordResponses(sessionId);

    const sessionDate = session.date;

    for (const student of students) {
      const hasApprovedLeave = leaves.some(l => {
        if (l.studentReg !== student.regNo || l.status !== 'Approved') return false;
        return sessionDate >= l.fromDate && sessionDate <= l.toDate;
      });

      let att = attRecords.find(a => a.studentReg === student.regNo);
      if (!att) {
        att = {
          id: generateID('ATT'),
          sessionId: sessionId,
          studentReg: student.regNo,
          studentName: student.name,
          dept: student.dept,
          room: student.room || '',
          entryStatus: 'MISSED',
          entryTime: null,
          exitStatus: 'MISSED',
          exitTime: null,
          finalStatus: 'ABSENT',
          notes: ''
        };
      }

      let passedChecks = 0;
      if (checks.length > 0) {
        checks.forEach(c => {
          const resp = responses.find(r => r.checkId === c.id && r.studentReg === student.regNo);
          if (resp && resp.status === 'PASS') passedChecks++;
        });
      }

      if (hasApprovedLeave) {
        att.finalStatus = 'EXCUSED';
        att.notes = 'Approved Leave Verified. Discipline credit preserved.';
        await this.addCreditLedgerEntry(student.regNo, 0, 'Approved Leave - Excused from Study Session', 'APPROVED_LEAVE', sessionId);
      } else {
        const entryPass = att.entryStatus === 'PASS';
        const exitPass = att.exitStatus === 'PASS';
        const allChecksPass = checks.length === 0 || passedChecks === checks.length;
        const someChecksPass = passedChecks > 0;

        if (entryPass && exitPass && allChecksPass) {
          att.finalStatus = 'PRESENT';
          att.notes = 'Completed full study hour and keyword verification.';
          await this.addCreditLedgerEntry(student.regNo, 2, 'Full Study Hour Session Completed', 'STUDY_SESSION_PRESENT', sessionId);
        } else if (entryPass || exitPass || someChecksPass) {
          att.finalStatus = 'PARTIAL';
          att.notes = `Partial attendance (Entry: ${att.entryStatus}, Exit: ${att.exitStatus}, Keyword Passed: ${passedChecks}/${checks.length}).`;
          
          if (!allChecksPass && checks.length > 0) {
            await this.addCreditLedgerEntry(student.regNo, -3, `Missed keyword presence verification (${passedChecks}/${checks.length})`, 'KEYWORD_MISSED', sessionId);
          } else {
            await this.addCreditLedgerEntry(student.regNo, -3, 'Incomplete entry/exit scan during study hour', 'PARTIAL_ATTENDANCE', sessionId);
          }
        } else {
          att.finalStatus = 'ABSENT';
          att.notes = 'Unexcused absence during study session.';
          await this.addCreditLedgerEntry(student.regNo, -8, 'Unexcused absence during Study Hour session', 'STUDY_SESSION_ABSENT', sessionId);
        }
      }

      await this.upsertStudyAttendance(att);
      await this.evaluateStudentRisk(student.regNo);
    }
  }

  // --- DISCIPLINE CREDIT LEDGER ---
  static async getCreditLedger(studentReg) {
    let query = 'hms_credit_ledger?order=created_at.desc';
    if (studentReg) query = `hms_credit_ledger?student_reg=eq.${studentReg}&order=created_at.desc`;

    if (USE_SUPABASE) {
      try {
        const data = await supabaseFetch(query, { method: 'GET' });
        return (data || []).map(c => ({
          id: c.id,
          studentReg: c.student_reg,
          pointsChange: c.points_change,
          reason: c.reason,
          sourceEvent: c.source_event,
          sourceId: c.source_id,
          balanceAfter: c.balance_after,
          createdAt: c.created_at
        }));
      } catch (e) {
        console.warn('Error fetching credit ledger from Supabase (falling back to LocalStorage):', e.message);
        let list = this.getData('hms_credit_ledger') || [];
        return list.filter(c => !studentReg || c.studentReg === studentReg);
      }
    } else {
      let list = this.getData('hms_credit_ledger') || [];
      return list.filter(c => !studentReg || c.studentReg === studentReg);
    }
  }

  static async getCreditBalance(studentReg) {
    const ledger = await this.getCreditLedger(studentReg);
    if (!ledger || ledger.length === 0) return 1000;
    return ledger[0].balanceAfter;
  }

  static async addCreditLedgerEntry(studentReg, pointsChange, reason, sourceEvent, sourceId = '') {
    if (sourceId) {
      const ledger = await this.getCreditLedger(studentReg);
      const existing = ledger.find(l => l.sourceEvent === sourceEvent && l.sourceId === sourceId);
      if (existing) {
        return existing.balanceAfter;
      }
    }

    const currentBalance = await this.getCreditBalance(studentReg);
    const balanceAfter = Math.max(0, Math.min(1000, currentBalance + pointsChange));

    const entry = {
      id: generateID('CRD'),
      student_reg: studentReg,
      points_change: pointsChange,
      reason: reason,
      source_event: sourceEvent,
      source_id: sourceId,
      balance_after: balanceAfter,
      created_at: new Date().toISOString()
    };

    if (USE_SUPABASE) {
      try {
        await supabaseFetch('hms_credit_ledger', {
          method: 'POST',
          body: JSON.stringify(entry)
        });
      } catch (e) {
        console.warn('Supabase addCreditLedgerEntry failed, falling back to LocalStorage:', e.message);
      }
    }
    
    const list = this.getData('hms_credit_ledger') || [];
    list.unshift({
      id: entry.id,
      studentReg: studentReg,
      pointsChange: pointsChange,
      reason: reason,
      sourceEvent: sourceEvent,
      sourceId: sourceId,
      balanceAfter: balanceAfter,
      createdAt: entry.created_at
    });
    this.setData('hms_credit_ledger', list);

    return balanceAfter;
  }

  static evaluateRatingTier(score) {
    if (score >= 800) return { tier: 'EXCELLENT', color: 'var(--success)', badgeClass: 'badge-present' };
    if (score >= 650) return { tier: 'GOOD', color: 'var(--primary)', badgeClass: 'badge-primary' };
    if (score >= 500) return { tier: 'WATCH', color: 'var(--warning)', badgeClass: 'badge-pending' };
    if (score >= 350) return { tier: 'WARNING', color: '#ff9800', badgeClass: 'badge-warning' };
    return { tier: 'CRITICAL', color: 'var(--danger)', badgeClass: 'badge-absent' };
  }

  // --- RISK & PATTERN ANALYSIS ENGINE ---
  static async getStudentRiskProfile(studentReg) {
    if (USE_SUPABASE) {
      try {
        const data = await supabaseFetch(`hms_student_risk?student_reg=eq.${studentReg}`, { method: 'GET' });
        if (data && data.length > 0) {
          return {
            id: data[0].id,
            studentReg: data[0].student_reg,
            riskLevel: data[0].risk_level,
            riskScore: data[0].risk_score,
            evidence: data[0].evidence || [],
            updatedAt: data[0].updated_at
          };
        }
      } catch (e) {
        console.warn('Error fetching risk profile from Supabase (falling back to LocalStorage):', e.message);
      }
    }
    const list = this.getData('hms_student_risk') || [];
    const found = list.find(r => r.studentReg === studentReg);
    if (found) return found;

    return { studentReg: studentReg, riskLevel: 'NORMAL', riskScore: 0, evidence: [], updatedAt: new Date().toISOString() };
  }

  static async evaluateStudentRisk(studentReg) {
    const credit = await this.getCreditBalance(studentReg);
    const ledger = await this.getCreditLedger(studentReg);

    let riskLevel = 'NORMAL';
    let riskScore = 0;
    const evidence = [];

    if (credit < 350) {
      riskLevel = 'CRITICAL';
      riskScore += 50;
      evidence.push(`Critical discipline credit balance: ${credit}/1000`);
    } else if (credit < 500) {
      riskLevel = 'WARNING';
      riskScore += 30;
      evidence.push(`Warning tier credit balance: ${credit}/1000`);
    } else if (credit < 650) {
      riskLevel = 'WATCH';
      riskScore += 15;
      evidence.push(`Watch tier credit balance: ${credit}/1000`);
    }

    const recentAbsences = ledger.filter(l => l.sourceEvent === 'STUDY_SESSION_ABSENT').slice(0, 5);
    if (recentAbsences.length >= 3) {
      if (riskLevel !== 'CRITICAL') riskLevel = 'WARNING';
      evidence.push(`Repeated study hour absences (${recentAbsences.length} recent violations)`);
    }

    const recentKeywordMisses = ledger.filter(l => l.sourceEvent === 'KEYWORD_MISSED').slice(0, 5);
    if (recentKeywordMisses.length >= 2) {
      if (riskLevel === 'NORMAL') riskLevel = 'WATCH';
      evidence.push(`Multiple keyword presence misses (${recentKeywordMisses.length} occurrences)`);
    }

    const riskRecord = {
      id: generateID('RSK'),
      student_reg: studentReg,
      risk_level: riskLevel,
      risk_score: riskScore,
      evidence: evidence,
      updated_at: new Date().toISOString()
    };

    if (USE_SUPABASE) {
      try {
        const existing = await supabaseFetch(`hms_student_risk?student_reg=eq.${studentReg}`, { method: 'GET' });
        if (existing && existing.length > 0) {
          await supabaseFetch(`hms_student_risk?id=eq.${existing[0].id}`, {
            method: 'PATCH',
            body: JSON.stringify({ risk_level: riskLevel, risk_score: riskScore, evidence: evidence, updated_at: new Date().toISOString() })
          });
        } else {
          await supabaseFetch('hms_student_risk', {
            method: 'POST',
            body: JSON.stringify(riskRecord)
          });
        }
      } catch (e) {
        console.warn('Supabase evaluateStudentRisk failed, falling back to LocalStorage:', e.message);
      }
    }
    
    let list = this.getData('hms_student_risk') || [];
    const idx = list.findIndex(r => r.studentReg === studentReg);
    if (idx >= 0) {
      list[idx] = { ...list[idx], riskLevel: riskLevel, riskScore: riskScore, evidence: evidence, updatedAt: new Date().toISOString() };
    } else {
      list.push({ id: riskRecord.id, studentReg: studentReg, riskLevel: riskLevel, riskScore: riskScore, evidence: evidence, updatedAt: new Date().toISOString() });
    }
    this.setData('hms_student_risk', list);

    return riskRecord;
  }

  // --- PARENT ALERT & WHATSAPP ENGINE ---
  static async getParentAlerts(studentReg) {
    let query = 'hms_parent_alerts?order=created_at.desc';
    if (studentReg) query = `hms_parent_alerts?student_reg=eq.${studentReg}&order=created_at.desc`;

    if (USE_SUPABASE) {
      try {
        const data = await supabaseFetch(query, { method: 'GET' });
        return (data || []).map(a => ({
          id: a.id,
          studentReg: a.student_reg,
          alertType: a.alert_type,
          language: a.language,
          messageText: a.message_text,
          status: a.status,
          createdAt: a.created_at,
          sentAt: a.sent_at
        }));
      } catch (e) {
        console.warn('Error fetching parent alerts from Supabase (falling back to LocalStorage):', e.message);
        let list = this.getData('hms_parent_alerts') || [];
        return list.filter(a => !studentReg || a.studentReg === studentReg);
      }
    } else {
      let list = this.getData('hms_parent_alerts') || [];
      return list.filter(a => !studentReg || a.studentReg === studentReg);
    }
  }

  static async createParentAlert(alertData) {
    const record = {
      id: generateID('ALT'),
      student_reg: alertData.studentReg,
      alert_type: alertData.alertType || 'DISCIPLINE_WARNING',
      language: alertData.language || 'TAMIL_ENGLISH',
      message_text: alertData.messageText,
      status: alertData.status || 'PENDING',
      created_at: new Date().toISOString(),
      sent_at: null
    };

    if (USE_SUPABASE) {
      try {
        await supabaseFetch('hms_parent_alerts', {
          method: 'POST',
          body: JSON.stringify(record)
        });
      } catch (e) {
        console.warn('Supabase createParentAlert failed, falling back to LocalStorage:', e.message);
      }
    }
    
    let list = this.getData('hms_parent_alerts') || [];
    list.unshift({
      id: record.id,
      studentReg: alertData.studentReg,
      alertType: record.alert_type,
      language: record.language,
      messageText: record.message_text,
      status: record.status,
      createdAt: record.created_at,
      sentAt: null
    });
    this.setData('hms_parent_alerts', list);

    return record;
  }

  // ==========================================================================
  // SHORT OUTING REQUESTS & DIGITAL OUTPASS ENGINE
  // ==========================================================================

  static async getOutingRequests() {
    if (USE_SUPABASE) {
      try {
        const data = await supabaseFetch('hms_outing_requests?order=created_at.desc', { method: 'GET' });
        return data.map(o => ({
          id: o.id,
          studentReg: o.student_reg,
          outingDate: o.outing_date,
          requestedExitTime: o.requested_exit_time,
          expectedReturnTime: o.expected_return_time,
          destination: o.destination,
          reason: o.reason,
          emergencyContact: o.emergency_contact,
          status: o.status,
          parentApprovalStatus: o.parent_approval_status,
          parentToken: o.parent_token,
          parentTokenExpiresAt: o.parent_token_expires_at,
          parentDecisionAt: o.parent_decision_at,
          wardenApprovalStatus: o.warden_approval_status,
          wardenApprovedBy: o.warden_approved_by,
          wardenDecisionAt: o.warden_decision_at,
          wardenRemarks: o.warden_remarks,
          createdAt: o.created_at
        }));
      } catch (e) {
        console.warn('Supabase getOutingRequests failed, falling back to LocalStorage:', e.message);
      }
    }
    return this.getData('hms_outing_requests') || [];
  }

  static async getOutingRequestByToken(token) {
    if (!token) return null;
    const requests = await this.getOutingRequests();
    return requests.find(r => r.parentToken === token) || null;
  }

  static async addOutingRequest(req) {
    const id = req.id || ('OUT-' + Math.floor(100000 + Math.random() * 900000));
    const token = 'PAR-' + Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join('');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    const record = {
      id,
      student_reg: req.studentReg,
      outing_date: req.outingDate,
      requested_exit_time: req.requestedExitTime,
      expected_return_time: req.expectedReturnTime,
      destination: req.destination,
      reason: req.reason,
      emergency_contact: req.emergencyContact || '',
      status: 'Pending Parent',
      parent_approval_status: 'Pending',
      parent_token: token,
      parent_token_expires_at: expiresAt,
      parent_decision_at: null,
      warden_approval_status: 'Pending',
      warden_approved_by: null,
      warden_decision_at: null,
      warden_remarks: null,
      created_at: createdAt
    };

    if (USE_SUPABASE) {
      try {
        await supabaseFetch('hms_outing_requests', { method: 'POST', body: JSON.stringify(record) });
      } catch (e) {
        console.warn('Supabase addOutingRequest failed, falling back to LocalStorage:', e.message);
      }
    }

    let list = this.getData('hms_outing_requests') || [];
    const localRecord = {
      id,
      studentReg: req.studentReg,
      outingDate: req.outingDate,
      requestedExitTime: req.requestedExitTime,
      expectedReturnTime: req.expectedReturnTime,
      destination: req.destination,
      reason: req.reason,
      emergencyContact: req.emergencyContact || '',
      status: 'Pending Parent',
      parentApprovalStatus: 'Pending',
      parentToken: token,
      parentTokenExpiresAt: expiresAt,
      parentDecisionAt: null,
      wardenApprovalStatus: 'Pending',
      wardenApprovedBy: null,
      wardenDecisionAt: null,
      wardenRemarks: null,
      createdAt
    };
    list.unshift(localRecord);
    this.setData('hms_outing_requests', list);

    return localRecord;
  }

  static async updateOutingParentApproval(id, decision) {
    const decisionAt = new Date().toISOString();
    const newStatus = decision === 'Approved' ? 'Pending Warden' : 'Rejected';

    if (USE_SUPABASE) {
      try {
        await supabaseFetch(`hms_outing_requests?id=eq.${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            parent_approval_status: decision,
            parent_decision_at: decisionAt,
            status: newStatus
          })
        });
      } catch (e) {
        console.warn('Supabase updateOutingParentApproval failed:', e.message);
      }
    }

    let list = this.getData('hms_outing_requests') || [];
    list = list.map(r => r.id === id ? {
      ...r,
      parentApprovalStatus: decision,
      parentDecisionAt: decisionAt,
      status: newStatus
    } : r);
    this.setData('hms_outing_requests', list);
    return true;
  }

  static async updateOutingWardenApproval(id, decision, wardenName, remarks = '') {
    const decisionAt = new Date().toISOString();
    const newStatus = decision === 'Approved' ? 'Approved' : 'Rejected';

    if (USE_SUPABASE) {
      try {
        await supabaseFetch(`hms_outing_requests?id=eq.${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            warden_approval_status: decision,
            warden_approved_by: wardenName,
            warden_decision_at: decisionAt,
            warden_remarks: remarks,
            status: newStatus
          })
        });
      } catch (e) {
        console.warn('Supabase updateOutingWardenApproval failed:', e.message);
      }
    }

    let list = this.getData('hms_outing_requests') || [];
    list = list.map(r => r.id === id ? {
      ...r,
      wardenApprovalStatus: decision,
      wardenApprovedBy: wardenName,
      wardenDecisionAt: decisionAt,
      wardenRemarks: remarks,
      status: newStatus
    } : r);
    this.setData('hms_outing_requests', list);

    if (decision === 'Approved') {
      try {
        await this.createOrGetOutingOutpass(id);
      } catch (err) {
        console.warn('Failed to generate outpass for approved outing:', err);
      }
    }

    return true;
  }

  static async getOutpasses() {
    if (USE_SUPABASE) {
      try {
        const data = await supabaseFetch('hms_outpasses?order=generated_at.desc', { method: 'GET' });
        return data.map(p => ({
          id: p.id,
          passType: p.pass_type,
          sourceLeaveId: p.source_leave_id,
          sourceOutingId: p.source_outing_id,
          studentReg: p.student_reg,
          validFrom: p.valid_from,
          validUntil: p.valid_until,
          secureToken: p.secure_token,
          status: p.status,
          actualExitTime: p.actual_exit_time,
          actualReturnTime: p.actual_return_time,
          generatedAt: p.generated_at,
          revokedAt: p.revoked_at,
          revokedBy: p.revoked_by,
          revocationReason: p.revocation_reason
        }));
      } catch (e) {
        console.warn('Supabase getOutpasses failed, falling back to LocalStorage:', e.message);
      }
    }
    return this.getData('hms_outpasses') || [];
  }

  static async saveOutpass(pass) {
    const dbRecord = {
      id: pass.id,
      pass_type: pass.passType,
      source_leave_id: pass.sourceLeaveId,
      source_outing_id: pass.sourceOutingId,
      student_reg: pass.studentReg,
      valid_from: pass.validFrom,
      valid_until: pass.validUntil,
      secure_token: pass.secureToken,
      status: pass.status,
      actual_exit_time: pass.actualExitTime,
      actual_return_time: pass.actualReturnTime,
      generated_at: pass.generatedAt,
      revoked_at: pass.revokedAt,
      revoked_by: pass.revokedBy,
      revocation_reason: pass.revocationReason
    };

    if (USE_SUPABASE) {
      try {
        await supabaseFetch('hms_outpasses', { method: 'POST', body: JSON.stringify(dbRecord) });
      } catch (e) {
        console.warn('Supabase saveOutpass failed, falling back to LocalStorage:', e.message);
      }
    }

    let list = this.getData('hms_outpasses') || [];
    const idx = list.findIndex(p => p.id === pass.id);
    if (idx >= 0) {
      list[idx] = pass;
    } else {
      list.unshift(pass);
    }
    this.setData('hms_outpasses', list);
    return pass;
  }

  static async updateOutpass(id, updates) {
    const dbBody = {};
    if (updates.status !== undefined) dbBody.status = updates.status;
    if (updates.actualExitTime !== undefined) dbBody.actual_exit_time = updates.actualExitTime;
    if (updates.actualReturnTime !== undefined) dbBody.actual_return_time = updates.actualReturnTime;
    if (updates.revokedAt !== undefined) dbBody.revoked_at = updates.revokedAt;
    if (updates.revokedBy !== undefined) dbBody.revoked_by = updates.revokedBy;
    if (updates.revocationReason !== undefined) dbBody.revocation_reason = updates.revocationReason;

    if (USE_SUPABASE) {
      try {
        await supabaseFetch(`hms_outpasses?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(dbBody) });
      } catch (e) {
        console.warn('Supabase updateOutpass failed:', e.message);
      }
    }

    let list = this.getData('hms_outpasses') || [];
    list = list.map(p => p.id === id ? { ...p, ...updates } : p);
    this.setData('hms_outpasses', list);
    return true;
  }

  static async createOrGetLeaveOutpass(leaveId) {
    const leaves = await this.getLeaves();
    const leave = leaves.find(l => l.id === leaveId);
    if (!leave) return null;

    const existingPasses = await this.getOutpasses();
    const existing = existingPasses.find(p => p.sourceLeaveId === leaveId);
    if (existing) return existing;

    const passId = 'OP-L' + Math.floor(10000000 + Math.random() * 90000000);
    const secureToken = 'TK-' + Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join('');

    const now = new Date();
    const validFromDate = new Date(leave.fromDate + 'T00:00:00');
    const validUntilDate = new Date(leave.toDate + 'T23:59:59');

    let initialStatus = 'VALID';
    if (now < validFromDate) {
      initialStatus = 'NOT_YET_VALID';
    } else if (now > validUntilDate) {
      initialStatus = 'EXPIRED';
    }

    const pass = {
      id: passId,
      passType: 'HOME_LEAVE',
      sourceLeaveId: leaveId,
      sourceOutingId: null,
      studentReg: leave.studentReg,
      validFrom: leave.fromDate + ' 00:00',
      validUntil: leave.toDate + ' 23:59',
      secureToken: secureToken,
      status: initialStatus,
      actualExitTime: null,
      actualReturnTime: null,
      generatedAt: new Date().toISOString(),
      revokedAt: null,
      revokedBy: null,
      revocationReason: null
    };

    await this.saveOutpass(pass);
    return pass;
  }

  static async createOrGetOutingOutpass(outingId) {
    const outings = await this.getOutingRequests();
    const outing = outings.find(o => o.id === outingId);
    if (!outing) return null;

    const existingPasses = await this.getOutpasses();
    const existing = existingPasses.find(p => p.sourceOutingId === outingId);
    if (existing) return existing;

    const passId = 'OP-O' + Math.floor(10000000 + Math.random() * 90000000);
    const secureToken = 'TK-' + Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16)).join('');

    const validFromStr = `${outing.outingDate} ${outing.requestedExitTime}`;
    const validUntilStr = `${outing.outingDate} ${outing.expectedReturnTime}`;

    const pass = {
      id: passId,
      passType: 'SHORT_OUTING',
      sourceLeaveId: null,
      sourceOutingId: outingId,
      studentReg: outing.studentReg,
      validFrom: validFromStr,
      validUntil: validUntilStr,
      secureToken: secureToken,
      status: 'VALID',
      actualExitTime: null,
      actualReturnTime: null,
      generatedAt: new Date().toISOString(),
      revokedAt: null,
      revokedBy: null,
      revocationReason: null
    };

    await this.saveOutpass(pass);
    return pass;
  }

  static async validateOutpassQR(qrString) {
    let payload = null;
    try {
      payload = JSON.parse(qrString);
    } catch (e) {
      return { valid: false, message: 'INVALID QR: Corrupted or unparseable QR code format' };
    }

    if (!payload || !payload.op || !payload.tok) {
      return { valid: false, message: 'INVALID QR: Missing security token or pass reference' };
    }

    const passes = await this.getOutpasses();
    const pass = passes.find(p => p.id === payload.op && p.secureToken === payload.tok);
    if (!pass) {
      return { valid: false, message: 'INVALID QR: Pass token not found or revoked' };
    }

    // Fetch Student Info
    const students = await this.getStudents();
    const student = students.find(s => s.regNo === pass.studentReg) || { regNo: pass.studentReg, name: 'Student', dept: '', room: '', contact: '' };

    // Fetch Outing / Leave Details
    let details = {};
    if (pass.passType === 'SHORT_OUTING' && pass.sourceOutingId) {
      const outings = await this.getOutingRequests();
      details = outings.find(o => o.id === pass.sourceOutingId) || {};
    } else if (pass.passType === 'HOME_LEAVE' && pass.sourceLeaveId) {
      const leaves = await this.getLeaves();
      details = leaves.find(l => l.id === pass.sourceLeaveId) || {};
    }

    if (pass.status === 'REVOKED') {
      return { valid: false, message: `PASS REVOKED by ${pass.revokedBy || 'Warden'}: ${pass.revocationReason || 'Security measure'}`, pass, student, details };
    }

    if (pass.status === 'RETURNED') {
      return { valid: false, message: 'ALREADY RETURNED: Outpass usage completed', pass, student, details };
    }

    const now = new Date();
    let validFromDate, validUntilDate;
    try {
      validFromDate = new Date(pass.validFrom.includes('T') ? pass.validFrom : pass.validFrom.replace(' ', 'T'));
      validUntilDate = new Date(pass.validUntil.includes('T') ? pass.validUntil : pass.validUntil.replace(' ', 'T'));
    } catch (e) {
      validFromDate = new Date();
      validUntilDate = new Date();
    }

    if (now < validFromDate) {
      return { valid: false, message: `NOT YET VALID: Valid from ${pass.validFrom}`, pass, student, details };
    }

    if (now > validUntilDate && pass.status !== 'EXIT_RECORDED') {
      await this.updateOutpass(pass.id, { status: 'EXPIRED' });
      return { valid: false, message: `EXPIRED PASS: Expired at ${pass.validUntil}`, pass, student, details };
    }

    return {
      valid: true,
      message: '✓ VALID OUTPASS',
      pass,
      student,
      details
    };
  }

  static async recordOutpassExit(passId) {
    const exitTime = new Date().toISOString();
    const updates = {
      status: 'EXIT_RECORDED',
      actualExitTime: exitTime
    };

    await this.updateOutpass(passId, updates);
    return { success: true, actualExitTime: exitTime };
  }

  static async recordOutpassReturn(passId) {
    const passes = await this.getOutpasses();
    const pass = passes.find(p => p.id === passId);
    if (!pass) return { success: false, message: 'Pass not found' };

    const returnTime = new Date().toISOString();
    const updates = {
      status: 'RETURNED',
      actualReturnTime: returnTime
    };

    let isLate = false;
    let lateMinutes = 0;
    try {
      const returnDateObj = new Date(returnTime);
      const validUntilObj = new Date(pass.validUntil.includes('T') ? pass.validUntil : pass.validUntil.replace(' ', 'T'));
      if (returnDateObj > validUntilObj) {
        isLate = true;
        lateMinutes = Math.round((returnDateObj - validUntilObj) / (1000 * 60));
      }
    } catch (e) {
      console.warn('Failed to parse dates for late return check:', e);
    }

    await this.updateOutpass(passId, updates);

    if (isLate && lateMinutes > 0) {
      try {
        await this.addCreditLedgerEntry({
          studentReg: pass.studentReg,
          points: -50,
          type: 'DEDUCTION',
          reason: `Late return from Outpass (${pass.id}): ${lateMinutes} minutes overdue`,
          issuedBy: 'Gate Control System'
        });
      } catch (err) {
        console.warn('Credit deduction error:', err);
      }
    }

    return {
      success: true,
      pass: { ...pass, ...updates },
      isLate,
      lateMinutes
    };
  }

  static async revokeOutpass(passId, wardenName, reason) {
    const updates = {
      status: 'REVOKED',
      revokedAt: new Date().toISOString(),
      revokedBy: wardenName,
      revocationReason: reason
    };
    await this.updateOutpass(passId, updates);
    return true;
  }

  static async getOverdueOutings() {
    const passes = await this.getOutpasses();
    const now = new Date();
    const overduePasses = [];

    for (const p of passes) {
      if (p.status === 'EXIT_RECORDED') {
        try {
          const validUntilObj = new Date(p.validUntil.includes('T') ? p.validUntil : p.validUntil.replace(' ', 'T'));
          if (now > validUntilObj) {
            const overdueMins = Math.round((now - validUntilObj) / (1000 * 60));
            const students = await this.getStudents();
            const student = students.find(s => s.regNo === p.studentReg) || { name: 'Student', regNo: p.studentReg };
            overduePasses.push({
              pass: p,
              student,
              overdueMinutes: overdueMins
            });
          }
        } catch (e) {
          console.warn('Overdue check date parse error:', e);
        }
      }
    }
    return overduePasses;
  }

  static getParentPhone(student) {
    if (!student) return '';
    if (student.parentPhone && String(student.parentPhone).trim()) {
      return String(student.parentPhone).trim();
    }
    if (student.contact && typeof student.contact === 'string' && student.contact.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(student.contact);
        if (parsed.parentPhone && String(parsed.parentPhone).trim()) {
          return String(parsed.parentPhone).trim();
        }
      } catch (e) {}
    }
    if (student.parentContact && String(student.parentContact).trim()) {
      return String(student.parentContact).trim();
    }
    return '';
  }

  static getParentName(student) {
    if (!student) return 'Parent / Guardian';
    if (student.parentName && String(student.parentName).trim()) {
      return String(student.parentName).trim();
    }
    if (student.contact && typeof student.contact === 'string' && student.contact.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(student.contact);
        if (parsed.parentName && String(parsed.parentName).trim()) {
          return String(parsed.parentName).trim();
        }
      } catch (e) {}
    }
    return 'Parent / Guardian';
  }

  static normalizePhoneNumber(phoneStr) {
    if (!phoneStr) {
      return { valid: false, phone: '', error: "Parent phone number is not available. Please update the student's profile." };
    }
    const digitsOnly = String(phoneStr).replace(/[^0-9]/g, '');
    if (!digitsOnly || /^0+$/.test(digitsOnly)) {
      return { valid: false, phone: '', error: "Parent phone number is invalid. Please update the student's profile." };
    }

    let normalized = digitsOnly;
    if (digitsOnly.length === 10) {
      normalized = '91' + digitsOnly;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
      normalized = '91' + digitsOnly.slice(1);
    } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
      normalized = digitsOnly;
    } else if (digitsOnly.length < 10) {
      return { valid: false, phone: '', error: "Parent phone number must be at least 10 digits." };
    }

    return { valid: true, phone: normalized, error: null };
  }

  static maskPhoneNumber(phoneStr) {
    const raw = String(phoneStr || '').replace(/[^0-9]/g, '');
    if (!raw || raw.length < 4) return '••••••••';
    const last4 = raw.slice(-4);
    return '••••••' + last4;
  }

  static generateWhatsAppMessageTemplate(student, riskProfile, language = 'ENGLISH', creditBalance = 1000) {
    const studentName = student ? student.name : 'Student';
    const regNo = student ? student.regNo : '';
    const dept = student ? (student.dept || 'CSE') : '';
    const riskLevel = riskProfile ? (riskProfile.riskLevel || 'Normal') : 'Normal';
    
    let concernsStr = '• General Discipline & Attendance Review';
    if (riskProfile && riskProfile.evidence && riskProfile.evidence.length > 0) {
      concernsStr = riskProfile.evidence.map(e => `• ${e}`).join('\n');
    }

    if (language === 'TAMIL') {
      return `KVCET விடுதி ஒழுக்க எச்சரிக்கை\n\nமதிப்பிற்குரிய பெற்றோருக்கு,\n\nஉங்கள் பிள்ளையின் விடுதி ஒழுக்கம் மற்றும் ஆய்வு நேர வருகை பற்றிய தகவல்:\n\nமாணவர்: ${studentName}\nபதிவு எண்: ${regNo}\nதுறை: ${dept}\n\nதற்போதைய ஒழுக்க புள்ளி: ${creditBalance}/1000\nஒழுக்க நிலை: ${riskLevel}\n\nமுக்கிய காரணங்கள்:\n${concernsStr}\n\nமேலும் விவரங்களுக்கு விடுதி வார்டனைத் தொடர்பு கொள்ளவும்.\n\nKVCET விடுதி நிர்வாகம்`;
    } else if (language === 'TAMIL_ENGLISH') {
      return `KVCET HOSTEL DISCIPLINE ALERT / விடுதி ஒழுக்க எச்சரிக்கை\n\nDear Parent / மதிப்பிற்குரிய பெற்றோருக்கு,\n\nThis is to inform you regarding the recent hostel discipline/attendance status of your ward.\nஉங்கள் பிள்ளையின் விடுதி ஒழுக்கம் மற்றும் ஆய்வு நேர வருகை தகவல்:\n\nStudent / மாணவர்: ${studentName}\nRegister No / பதிவு எண்: ${regNo}\nDepartment / துறை: ${dept}\n\nCurrent Credit / தற்போதைய ஒழுக்க புள்ளி: ${creditBalance}/1000\nStatus / ஒழுக்க நிலை: ${riskLevel}\n\nPrimary Concerns / முக்கிய காரணங்கள்:\n${concernsStr}\n\nPlease contact Warden Office for guidance. / தயவுசெய்து விடுதி வார்டனைத் தொடர்பு கொள்ளவும்.\n\nKVCET Hostel Administration`;
    } else {
      // ENGLISH Default
      return `KVCET HOSTEL DISCIPLINE ALERT\n\nDear Parent,\n\nThis is to inform you regarding the recent hostel discipline/attendance status of your ward.\n\nStudent: ${studentName}\nRegister No: ${regNo}\nDepartment: ${dept}\n\nCurrent Credit: ${creditBalance}/1000\nStatus: ${riskLevel}\n\nPrimary Concerns:\n${concernsStr}\n\nPlease contact the hostel Warden for further information.\n\nKVCET Hostel Administration`;
    }
  }

  static generateWhatsAppLink(normalizedPhone, messageText) {
    const encoded = encodeURIComponent(messageText);
    return `https://wa.me/${normalizedPhone}?text=${encoded}`;
  }

  static async updateParentAlertStatus(alertId, newStatus, wardenName = 'Warden') {
    const sentAt = new Date().toISOString();
    if (USE_SUPABASE) {
      try {
        await supabaseFetch(`hms_parent_alerts?id=eq.${alertId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus, sent_at: sentAt })
        });
      } catch (e) {
        console.warn('Supabase updateParentAlertStatus failed:', e.message);
      }
    }

    let list = this.getData('hms_parent_alerts') || [];
    list = list.map(a => a.id === alertId ? { ...a, status: newStatus, sentAt, sentBy: wardenName } : a);
    this.setData('hms_parent_alerts', list);
    return true;
  }
}

// Ingest Database initially (run immediately on import)
HostelDB.init();

// --- Component Loader Utility ---
async function loadComponent(selector, filepath) {
  try {
    const response = await fetch(filepath);
    if (!response.ok) {
      throw new Error(`Failed to load component: ${filepath} (${response.status})`);
    }
    const html = await response.text();
    const container = document.querySelector(selector);
    if (container) {
      container.innerHTML = html;
    }
  } catch (error) {
    console.error('HMS Component Injection Error:', error);
  }
}

// --- Date Formatter ---
function formatDateString(dateStr) {
  if (!dateStr) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateStr).toLocaleDateString('en-US', options);
}

// --- UUID Generator ---
function generateID(prefix = 'ID') {
  return prefix + Math.floor(1000 + Math.random() * 9000);
}
