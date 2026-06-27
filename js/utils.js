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
