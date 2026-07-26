import React, { useState, useEffect } from 'react';
import { AppData, User, HomeroomData, Student, AttendanceRecord } from '../types';
import { toast } from 'sonner';

interface Props {
  data: AppData;
  currentUser: User;
  onSave: (data: AppData) => Promise<void>;
}

export default function HomeroomView({ data, currentUser, onSave }: Props) {
  const classes = Array.from(new Set((data.students || []).map(s => s.className))).filter(Boolean).sort();
  const [selectedClass, setSelectedClass] = useState<string>(currentUser.homeroomName || (classes.length > 0 ? classes[0] : ''));

  const viewClass = currentUser.role === 'Admin' ? selectedClass : currentUser.homeroomName;
  const teacherForClass = data.users.find(u => u.isHomeroom && u.homeroomName === viewClass);
  const targetUserId = teacherForClass ? teacherForClass.id : currentUser.id;

  const hrData: HomeroomData = data.homeroomData[targetUserId] || {
    userId: targetUserId,
    term: '2026-2027',
    bhytPercent: 100,
    initialSize: 40,
    currentSize: 40,
    classRank: 1,
    rewardsAndDisciplines: []
  };

  const [form, setForm] = useState<HomeroomData>(hrData);
  
  useEffect(() => {
    setForm(hrData);
  }, [viewClass, targetUserId]);

  const [rdForm, setRdForm] = useState<{ type: 'Reward' | 'Discipline', rank: 1|2|3, date: string, note: string }>({
    type: 'Reward', rank: 1, date: '', note: ''
  });

  const students = (data.students || []).filter(s => s.className === viewClass);
  const attendanceRecords = data.attendanceRecords || [];

  const handleSaveMain = () => {
    const newData = { ...data };
    newData.homeroomData[targetUserId] = form;
    onSave(newData);
    toast.success('Đã lưu thông tin chủ nhiệm');
  };

  const handleAddRD = (e: React.FormEvent) => {
    e.preventDefault();
    const newData = { ...data };
    const updatedForm = { ...form, rewardsAndDisciplines: [...form.rewardsAndDisciplines, rdForm] };
    newData.homeroomData[targetUserId] = updatedForm;
    setForm(updatedForm);
    onSave(newData);
    setRdForm({ type: 'Reward', rank: 1, date: '', note: '' });
  };

  // Get today's attendance for a student
  const getTodayAttendance = (studentId: string) => {
    const today = new Date().toISOString().split('T')[0];
    return attendanceRecords.find(a => a.studentId === studentId && a.timestamp.startsWith(today));
  };

  const getAttendanceStatus = (attendance: AttendanceRecord | undefined, className: string) => {
    if (!attendance) return { label: 'Vắng', color: 'bg-red-100 text-red-700' };
    
    const attSettings = data.settings.attendanceSettings;
    const rules = attSettings?.rules;
    if (!rules || rules.length === 0) return { label: 'Có mặt', color: 'bg-green-100 text-green-700' };

    const gradeMatch = className.match(/^(\d+)/);
    const grade = gradeMatch ? gradeMatch[1] : '';
    const attTime = new Date(attendance.timestamp);
    const session = attTime.getHours() < 12 ? 'Sáng' : 'Chiều';

    let activeRule = rules.find(r => 
      r.session === session && 
      (r.grades.length === 0 || r.grades.includes(grade))
    );

    if (!activeRule) {
      activeRule = rules[0];
    }

    const { startTime, lateThresholdMins, absentThresholdMins } = activeRule;
    const [startHour, startMin] = startTime.split(':').map(Number);
    
    const startObj = new Date(attTime);
    startObj.setHours(startHour, startMin, 0, 0);

    const diffMins = (attTime.getTime() - startObj.getTime()) / 60000;

    if (diffMins > absentThresholdMins) {
      return { label: 'Vắng (Quá giờ)', color: 'bg-red-100 text-red-700' };
    } else if (diffMins > lateThresholdMins) {
      return { label: 'Trễ', color: 'bg-orange-100 text-orange-700' };
    }
    
    return { label: 'Có mặt', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="space-y-4">
      {currentUser.role === 'Admin' && (
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex items-center space-x-3">
          <label className="text-xs font-bold uppercase text-gray-700">Chọn lớp hiển thị:</label>
          <select 
            className="border border-gray-300 p-1.5 text-xs rounded font-medium"
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)}
          >
            <option value="">-- Chọn lớp --</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xs font-bold uppercase text-blue-800 mb-3">Chỉ số Chủ nhiệm {viewClass ? `(Lớp ${viewClass})` : ''}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tỷ lệ BHYT (%)</label>
              <input type="number" max="100" min="0" className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.bhytPercent} onChange={e => setForm({...form, bhytPercent: Number(e.target.value)})} />
              <p className="text-[9px] text-gray-400 mt-0.5 italic">100% được +10đ. Dưới 100% bị trừ 5đ.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Sĩ số đầu năm</label>
                <input type="number" className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.initialSize} onChange={e => setForm({...form, initialSize: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Sĩ số hiện tại</label>
                <input type="number" className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.currentSize} onChange={e => setForm({...form, currentSize: Number(e.target.value)})} />
              </div>
            </div>
            <p className="text-[9px] text-gray-400 italic mt-0">Giữ vững 100% được +5đ. Bỏ học trừ 1đ/HS.</p>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Xếp hạng thi đua lớp</label>
              <input type="number" min="1" className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.classRank} onChange={e => setForm({...form, classRank: Number(e.target.value)})} />
              <p className="text-[9px] text-gray-400 mt-0.5 italic">Hạng 1-4 được +4đ. Hạng chót trừ 4đ.</p>
            </div>

            <button onClick={handleSaveMain} className="w-full bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors">Lưu Thông Số</button>
          </div>

          <div className="md:border-l md:pl-4 border-gray-200">
            <h4 className="text-[10px] font-bold uppercase text-gray-700 mb-2">Khai báo Khen thưởng / Kỷ luật lớp</h4>
            <form onSubmit={handleAddRD} className="space-y-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Loại</label>
                <select className="w-full border border-gray-300 p-1.5 text-xs rounded" value={rdForm.type} onChange={e => setRdForm({...rdForm, type: e.target.value as any})}>
                  <option value="Reward">Khen thưởng thi đua tuần</option>
                  <option value="Discipline">Kỷ luật / Vi phạm</option>
                </select>
              </div>
              
              {rdForm.type === 'Reward' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Hạng đạt được</label>
                  <select className="w-full border border-gray-300 p-1.5 text-xs rounded" value={rdForm.rank} onChange={e => setRdForm({...rdForm, rank: Number(e.target.value) as any})}>
                    <option value={1}>Hạng 1 (+3đ)</option>
                    <option value={2}>Hạng 2 (+2đ)</option>
                    <option value={3}>Hạng 3 (+1đ)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Ngày</label>
                <input type="date" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={rdForm.date} onChange={e => setRdForm({...rdForm, date: e.target.value})} />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Ghi chú</label>
                <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" placeholder="Tuần 5..." value={rdForm.note} onChange={e => setRdForm({...rdForm, note: e.target.value})} />
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-white px-4 py-1.5 mt-2 rounded text-xs font-bold uppercase hover:bg-emerald-700 transition-colors">Thêm bản ghi</button>
            </form>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <h3 className="text-xs font-bold uppercase text-gray-700 p-3 bg-gray-50 border-b border-gray-200 m-0">Lịch sử Khen thưởng / Kỷ luật</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white text-gray-500 border-b border-gray-200">
              <tr>
                <th className="p-2 font-bold uppercase text-[10px]">Ngày</th>
                <th className="p-2 font-bold uppercase text-[10px]">Phân loại</th>
                <th className="p-2 font-bold uppercase text-[10px]">Ghi chú</th>
                <th className="p-2 font-bold uppercase text-[10px]">Điểm tác động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {form.rewardsAndDisciplines.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-gray-500 italic">Chưa có dữ liệu</td></tr>
              ) : (
                form.rewardsAndDisciplines.map((rd, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-2">{rd.date}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${rd.type === 'Reward' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {rd.type === 'Reward' ? `Khen thưởng (Hạng ${rd.rank})` : 'Kỷ luật'}
                      </span>
                    </td>
                    <td className="p-2">{rd.note}</td>
                    <td className="p-2 font-bold">
                      {rd.type === 'Reward' ? (rd.rank === 1 ? '+3' : rd.rank === 2 ? '+2' : '+1') : '-1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col mt-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
          <h3 className="text-xs font-bold uppercase text-gray-700 m-0">Điểm danh học sinh thông minh (Hôm nay)</h3>
          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">Lớp {currentUser.homeroomName || ''}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white text-gray-500 border-b border-gray-200">
              <tr>
                <th className="p-2 font-bold uppercase text-[10px]">STT</th>
                <th className="p-2 font-bold uppercase text-[10px]">Họ và tên</th>
                <th className="p-2 font-bold uppercase text-[10px]">Ngày sinh</th>
                <th className="p-2 font-bold uppercase text-[10px]">Mã thẻ</th>
                <th className="p-2 font-bold uppercase text-[10px]">Trạng thái</th>
                <th className="p-2 font-bold uppercase text-[10px]">Thời gian đến</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-gray-500 italic">Lớp chưa có học sinh nào</td></tr>
              ) : (
                students.map((student, idx) => {
                  const attendance = getTodayAttendance(student.id);
                  return (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="p-2">{idx + 1}</td>
                      <td className="p-2 font-medium text-gray-800">{student.name}</td>
                      <td className="p-2 text-gray-600">{student.dob ? new Date(student.dob).toLocaleDateString('vi-VN') : '-'}</td>
                      <td className="p-2 font-mono text-gray-500 text-[10px]">{student.rfidUid || '-'}</td>
                      <td className="p-2">
                        {(() => {
                          const status = getAttendanceStatus(attendance, student.className);
                          return (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${status.color}`}>
                              {status.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-2 font-mono text-gray-600 text-[10px]">
                        {attendance ? new Date(attendance.timestamp).toLocaleTimeString('vi-VN') : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
