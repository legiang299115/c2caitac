import React, { useState } from 'react';
import { AppData, User } from '../types';
import { cn } from '../lib/utils';
import { Trash2, Edit2, Plus } from 'lucide-react';

interface Props {
  data: AppData;
  currentUser: User;
  onSave: (data: AppData) => void;
}

export function PersonnelView({ data, currentUser, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<User>>({});
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configForm, setConfigForm] = useState({
    superiorOrganization: data.settings.superiorOrganization || 'UBND XÃ ĐÔNG PHƯỚC',
    schoolName: data.settings.schoolName || 'THCS CÁI TẮC',
    schoolYear: data.settings.schoolYear || '2026-2027',
    zaloAccessToken: data.settings.zaloSettings?.accessToken || '',
    attRules: data.settings.attendanceSettings?.rules || [
      {
        id: 'rule-default',
        name: 'Mặc định (Sáng)',
        session: 'Sáng',
        grades: [],
        startTime: '07:00',
        lateThresholdMins: 10,
        absentThresholdMins: 20
      }
    ],
  });

  if (currentUser.role !== 'Admin' && currentUser.role !== 'Head') {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
        Bạn không có quyền truy cập phân hệ này.
      </div>
    );
  }

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...data,
      settings: {
        ...data.settings,
        superiorOrganization: configForm.superiorOrganization,
        schoolName: configForm.schoolName,
        schoolYear: configForm.schoolYear,
        zaloSettings: {
          ...data.settings.zaloSettings,
          accessToken: configForm.zaloAccessToken,
        },
        attendanceSettings: {
          rules: configForm.attRules,
        }
      }
    });
    setIsConfiguring(false);
  };

  const handleEdit = (u: User) => {
    setForm(u);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setForm({
      id: `u${Date.now()}`,
      name: '',
      group: 'A',
      role: 'Teacher',
      isHomeroom: false,
      hardLocks: { absences: 0, unauthorizedTutoring: false, conflict: false, discipline: null }
    });
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    let newUsers = [...data.users];
    const existingIndex = newUsers.findIndex(u => u.id === form.id);
    
    if (existingIndex >= 0) {
      newUsers[existingIndex] = form as User;
    } else {
      newUsers.push(form as User);
    }

    onSave({ ...data, users: newUsers });
    setIsEditing(false);
    setForm({});
  };

  const handleDelete = (id: string) => {
    setUserToDelete(id);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      onSave({ ...data, users: data.users.filter(u => u.id !== userToDelete) });
      setUserToDelete(null);
    }
  };

  const [activeTab, setActiveTab] = useState<'Users' | 'Departments'>('Users');
  const [isEditingDept, setIsEditingDept] = useState(false);
  const [deptForm, setDeptForm] = useState({ id: '', name: '' });

  const handleAddNewDept = () => {
    setDeptForm({ id: `dept_${Date.now()}`, name: '' });
    setIsEditingDept(true);
  };

  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name) return;
    const newDepts = [...(data.departments || [])];
    const existingIndex = newDepts.findIndex(d => d.id === deptForm.id);
    if (existingIndex >= 0) {
      newDepts[existingIndex] = deptForm;
    } else {
      newDepts.push(deptForm);
    }
    onSave({ ...data, departments: newDepts });
    setIsEditingDept(false);
  };

  const handleDeleteDept = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tổ chuyên môn này? Các thành viên trong tổ sẽ bị chuyển về trạng thái không thuộc tổ nào.')) {
      const newDepts = (data.departments || []).filter(d => d.id !== id);
      const newUsers = data.users.map(u => u.departmentId === id ? { ...u, departmentId: undefined } : u);
      onSave({ ...data, departments: newDepts, users: newUsers });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-xs font-bold uppercase text-gray-700">Quản trị Hệ thống & Nhân sự</h3>
          <p className="text-[10px] text-gray-500 italic">Thêm, sửa, xóa và phân công vai trò</p>
        </div>
        {!isEditing && !isConfiguring && !isEditingDept && (
          <div className="flex space-x-2">
            <button 
              onClick={() => setIsConfiguring(true)}
              className="flex items-center space-x-1 bg-gray-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-gray-700 transition-colors"
            >
              <span>Cấu hình Hệ thống</span>
            </button>
            {activeTab === 'Users' ? (
              <button 
                onClick={handleAddNew}
                className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm nhân sự</span>
              </button>
            ) : (
              <button 
                onClick={handleAddNewDept}
                className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm tổ</span>
              </button>
            )}
          </div>
        )}
      </div>

      {!isEditing && !isConfiguring && !isEditingDept && (
        <div className="flex space-x-2 border-b border-gray-200 pb-2">
          <button 
            onClick={() => setActiveTab('Users')}
            className={`px-4 py-2 text-xs font-bold uppercase rounded-t-lg ${activeTab === 'Users' ? 'bg-white border border-gray-200 border-b-white text-blue-600 -mb-[9px]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Nhân sự
          </button>
          <button 
            onClick={() => setActiveTab('Departments')}
            className={`px-4 py-2 text-xs font-bold uppercase rounded-t-lg ${activeTab === 'Departments' ? 'bg-white border border-gray-200 border-b-white text-blue-600 -mb-[9px]' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Tổ chuyên môn
          </button>
        </div>
      )}

      {isConfiguring && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
          <h4 className="text-xs font-bold uppercase text-gray-700 mb-3 border-b border-gray-200 pb-2">Cấu hình Hệ thống (Dùng cho In ấn / Báo cáo)</h4>
          <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Cơ quan quản lý cấp trên (Vd: UBND Xã...)</label>
              <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={configForm.superiorOrganization} onChange={e => setConfigForm({...configForm, superiorOrganization: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tên Cơ quan, Đơn vị (Trường)</label>
              <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={configForm.schoolName} onChange={e => setConfigForm({...configForm, schoolName: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Năm học</label>
              <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={configForm.schoolYear} onChange={e => setConfigForm({...configForm, schoolYear: e.target.value})} />
            </div>
            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Zalo OA Access Token (Dành cho việc gửi thông báo)</label>
              <input type="text" className="w-full border border-gray-300 p-1.5 text-xs rounded" value={configForm.zaloAccessToken} onChange={e => setConfigForm({...configForm, zaloAccessToken: e.target.value})} placeholder="Nhập Zalo Access Token..." />
            </div>
            <div className="md:col-span-3 border-t border-gray-200 mt-2 pt-4 pb-2">
              <div className="flex justify-between items-center mb-3">
                <h5 className="text-[11px] font-bold uppercase text-gray-700">Cấu hình Điểm danh Học sinh (Theo khối/buổi)</h5>
                <button type="button" onClick={() => {
                  const newRules = [...configForm.attRules, {
                    id: `rule-${Date.now()}`,
                    name: `Quy định mới`,
                    session: 'Sáng',
                    grades: [],
                    startTime: '07:00',
                    lateThresholdMins: 10,
                    absentThresholdMins: 20
                  }];
                  setConfigForm({...configForm, attRules: newRules as any});
                }} className="text-xs bg-gray-200 px-2 py-1 rounded font-medium flex items-center hover:bg-gray-300">
                  <Plus className="w-3 h-3 mr-1" /> Thêm quy định
                </button>
              </div>
              
              <div className="space-y-4">
                {configForm.attRules.map((rule, idx) => (
                  <div key={rule.id} className="bg-white p-3 border border-gray-200 rounded relative">
                    <button type="button" onClick={() => {
                      const newRules = configForm.attRules.filter((_, i) => i !== idx);
                      setConfigForm({...configForm, attRules: newRules});
                    }} className="absolute top-2 right-2 text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pr-8">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tên quy định</label>
                        <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={rule.name} onChange={e => {
                          const newRules = [...configForm.attRules];
                          newRules[idx].name = e.target.value;
                          setConfigForm({...configForm, attRules: newRules});
                        }} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Buổi</label>
                        <select className="w-full border border-gray-300 p-1.5 text-xs rounded" value={rule.session} onChange={e => {
                          const newRules = [...configForm.attRules];
                          newRules[idx].session = e.target.value as any;
                          setConfigForm({...configForm, attRules: newRules});
                        }}>
                          <option value="Sáng">Sáng</option>
                          <option value="Chiều">Chiều</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Khối lớp áp dụng (Cách nhau dấu phẩy, Vd: 6,7,8)</label>
                        <input type="text" className="w-full border border-gray-300 p-1.5 text-xs rounded" value={rule.grades.join(',')} onChange={e => {
                          const newRules = [...configForm.attRules];
                          newRules[idx].grades = e.target.value.split(',').map(g => g.trim()).filter(Boolean);
                          setConfigForm({...configForm, attRules: newRules});
                        }} placeholder="Bỏ trống nếu áp dụng toàn trường" />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Giờ vào học</label>
                        <input type="time" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={rule.startTime} onChange={e => {
                          const newRules = [...configForm.attRules];
                          newRules[idx].startTime = e.target.value;
                          setConfigForm({...configForm, attRules: newRules});
                        }} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Phút trễ</label>
                        <input type="number" min="0" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={rule.lateThresholdMins} onChange={e => {
                          const newRules = [...configForm.attRules];
                          newRules[idx].lateThresholdMins = Number(e.target.value);
                          setConfigForm({...configForm, attRules: newRules});
                        }} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Phút vắng</label>
                        <input type="number" min="0" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={rule.absentThresholdMins} onChange={e => {
                          const newRules = [...configForm.attRules];
                          newRules[idx].absentThresholdMins = Number(e.target.value);
                          setConfigForm({...configForm, attRules: newRules});
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
                {configForm.attRules.length === 0 && (
                  <div className="text-xs text-gray-500 italic p-2 bg-gray-100 rounded">Chưa có quy định điểm danh nào. Hệ thống sẽ tính có mặt cho tất cả học sinh quẹt thẻ.</div>
                )}
              </div>
            </div>
            
            <div className="md:col-span-3 flex space-x-2 justify-end mt-2">
              <button type="button" onClick={() => setIsConfiguring(false)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-gray-300 transition-colors">Hủy</button>
              <button type="submit" className="bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-emerald-700 transition-colors">Lưu cấu hình</button>
            </div>
          </form>
        </div>
      )}

      {isEditing && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Họ và tên</label>
              <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Số điện thoại</label>
              <input type="text" className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Vd: 0912345678" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Zalo ID (Tùy chọn)</label>
              <input type="text" className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.zaloId || ''} onChange={e => setForm({...form, zaloId: e.target.value})} placeholder="Vd: 123456789" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Nhóm (Bảng)</label>
              <select className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.group} onChange={e => setForm({...form, group: e.target.value as any})}>
                <option value="A">Nhóm A (Tổ trưởng)</option>
                <option value="B">Nhóm B (Giáo viên / GVCN)</option>
                <option value="C">Nhóm C (Nhân viên)</option>
                <option value="D">Nhóm D (Ban giám hiệu)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tổ chuyên môn</label>
              <select className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.departmentId || ''} onChange={e => setForm({...form, departmentId: e.target.value})}>
                <option value="">-- Không thuộc tổ nào --</option>
                {data.departments?.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Vai trò hệ thống</label>
              <select className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.role} onChange={e => setForm({...form, role: e.target.value as any})}>
                <option value="Teacher">Giáo viên / Nhân viên</option>
                <option value="Head">Tổ trưởng / Trưởng phòng</option>
                <option value="Admin">Ban Giám Hiệu / Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Chủ nhiệm lớp</label>
              <div className="mt-2 flex items-center">
                <input type="checkbox" id="isHomeroom" className="mr-2" checked={form.isHomeroom || false} onChange={e => setForm({...form, isHomeroom: e.target.checked, homeroomName: e.target.checked ? form.homeroomName : undefined})} />
                <label htmlFor="isHomeroom" className="text-xs">Là Giáo viên chủ nhiệm</label>
              </div>
            </div>
            {form.isHomeroom && (
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tên lớp chủ nhiệm</label>
                <input type="text" className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.homeroomName || ''} onChange={e => setForm({...form, homeroomName: e.target.value})} placeholder="Vd: 10A1" />
              </div>
            )}
            <div className="md:col-span-2 lg:col-span-4 flex space-x-2 justify-end mt-2">
              <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-gray-300 transition-colors">Hủy</button>
              <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors">Lưu thông tin</button>
            </div>
          </form>
        </div>
      )}

      {isEditingDept && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
          <form onSubmit={handleSaveDept} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tên Tổ / Phòng ban</label>
              <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={deptForm.name} onChange={e => setDeptForm({...deptForm, name: e.target.value})} />
            </div>
            <div className="flex space-x-2 justify-end items-end">
              <button type="button" onClick={() => setIsEditingDept(false)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-gray-300 transition-colors">Hủy</button>
              <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors">Lưu</button>
            </div>
          </form>
        </div>
      )}

      {!isEditing && !isConfiguring && !isEditingDept && activeTab === 'Users' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="p-2 font-bold uppercase text-[10px]">Họ và tên</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Nhóm</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Tổ chuyên môn</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Vai trò</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Chủ nhiệm</th>
                  <th className="p-2 font-bold uppercase text-[10px] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="p-2 font-medium text-gray-900">{u.name}</td>
                    <td className="p-2">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold">Nhóm {u.group}</span>
                    </td>
                    <td className="p-2">
                      {data.departments?.find(d => d.id === u.departmentId)?.name || <span className="text-gray-400 italic">Không có</span>}
                    </td>
                    <td className="p-2">
                      <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", 
                        u.role === 'Admin' ? 'bg-red-100 text-red-700' : 
                        u.role === 'Head' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      )}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-2">
                      {u.isHomeroom ? (
                        <span className="text-green-600 font-bold text-[10px] uppercase">Có {u.homeroomName ? `(${u.homeroomName})` : ''}</span>
                      ) : (
                        <span className="text-gray-400 text-[10px] uppercase">Không</span>
                      )}
                    </td>
                    <td className="p-2 flex justify-end space-x-1">
                      <button onClick={() => handleEdit(u)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Sửa">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Xóa" disabled={u.id === currentUser.id}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isEditing && !isConfiguring && !isEditingDept && activeTab === 'Departments' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="p-2 font-bold uppercase text-[10px]">Tên Tổ chuyên môn / Phòng ban</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Số lượng thành viên</th>
                  <th className="p-2 font-bold uppercase text-[10px] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.departments?.map(d => {
                  const membersCount = data.users.filter(u => u.departmentId === d.id).length;
                  return (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="p-2 font-medium text-gray-900">{d.name}</td>
                      <td className="p-2 text-gray-600 font-bold">{membersCount} người</td>
                      <td className="p-2 flex justify-end space-x-1">
                        <button onClick={() => { setDeptForm(d); setIsEditingDept(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Sửa">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteDept(d.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Xóa">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {(!data.departments || data.departments.length === 0) && (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-gray-500 italic">Chưa có tổ chuyên môn nào.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-800 uppercase">Xác nhận xóa</h3>
            </div>
            <div className="p-4 text-sm text-gray-700">
              Bạn có chắc chắn muốn xóa viên chức này?
            </div>
            <div className="p-3 bg-gray-50 flex justify-end space-x-2 border-t border-gray-200">
              <button 
                onClick={() => setUserToDelete(null)}
                className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs font-bold uppercase hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDelete}
                className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-bold uppercase hover:bg-red-700 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
