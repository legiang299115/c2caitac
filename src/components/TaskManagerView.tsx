import React, { useState } from 'react';
import { AppData, User, TaskDeclaration } from '../types';
import { Plus, Edit2, Trash2, Calendar, Bell } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface Props {
  data: AppData;
  currentUser: User;
  onSave: (data: AppData) => Promise<void>;
}

export function TaskManagerView({ data, currentUser, onSave }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<TaskDeclaration>>({});
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  if (currentUser.role !== 'Admin' && currentUser.role !== 'Head') {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
        Bạn không có quyền truy cập phân hệ này.
      </div>
    );
  }

  const isHead = currentUser.role === 'Head';
  const targetUsers = isHead 
    ? data.users.filter(u => u.departmentId === currentUser.departmentId)
    : data.users;
    
  const targetUserIds = new Set(targetUsers.map(u => u.id));
  const tasks = (data.taskDeclarations || []).filter(t => 
    isHead ? targetUserIds.has(t.userId) : true
  );

  const handleSendZaloNotification = async (t: TaskDeclaration) => {
    const user = data.users.find(u => u.id === t.userId);
    if (!user) return;
    if (!user.zaloId && !user.phone) {
      toast.error('Nhân sự này chưa cập nhật Zalo ID hoặc số điện thoại.');
      return;
    }
    
    if (!data.settings.zaloSettings?.accessToken) {
      toast.error('Chưa cấu hình Zalo Access Token trong hệ thống.');
      return;
    }

    try {
      const response = await fetch('/api/zalo/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zaloId: user.zaloId,
          phone: user.phone,
          message: `Nhắc nhở nhiệm vụ: ${t.taskName}\nChi tiết: ${t.description}\nHạn chót: ${t.deadline}`
        })
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success(`Đã gửi thông báo Zalo cho ${user.name}`);
      } else {
        toast.error(`Lỗi: ${result.error || 'Không thể gửi thông báo'}`);
      }
    } catch (error) {
      toast.error('Lỗi khi gửi thông báo Zalo.');
    }
  };

  const handleAddNew = () => {
    setForm({
      id: `task-${Date.now()}`,
      userId: '',
      taskName: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      deadline: new Date().toISOString().split('T')[0],
      status: 'Assigned'
    });
    setIsEditing(true);
  };

  const handleEdit = (t: TaskDeclaration) => {
    setForm(t);
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    setTaskToDelete(id);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      onSave({ ...data, taskDeclarations: (data.taskDeclarations || []).filter(t => t.id !== taskToDelete) });
      setTaskToDelete(null);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.taskName || !form.userId) return;

    let newTasks = [...(data.taskDeclarations || [])];
    
    if (form.userId === 'ALL') {
      targetUsers.forEach((u, idx) => {
        newTasks.push({
          ...form,
          id: `task-${Date.now()}-${idx}`,
          userId: u.id
        } as TaskDeclaration);
      });
    } else if (form.userId === 'ALL_TEACHERS') {
      targetUsers.filter(u => u.role === 'Teacher' || u.role === 'Head').forEach((u, idx) => {
        newTasks.push({
          ...form,
          id: `task-${Date.now()}-${idx}`,
          userId: u.id
        } as TaskDeclaration);
      });
    } else {
      const existingIndex = newTasks.findIndex(t => t.id === form.id);
      if (existingIndex >= 0) {
        newTasks[existingIndex] = form as TaskDeclaration;
      } else {
        newTasks.push(form as TaskDeclaration);
      }
    }

    onSave({ ...data, taskDeclarations: newTasks });
    setIsEditing(false);
    setForm({});
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex justify-between items-center">
        <div>
          <h3 className="text-xs font-bold uppercase text-gray-700">Quản lý Minh chứng & Nhiệm vụ</h3>
          <p className="text-[10px] text-gray-500 italic">Thêm mới, chỉnh sửa, phân công và đặt lịch hoàn thành</p>
        </div>
        {!isEditing && (
          <button 
            onClick={handleAddNew}
            className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm nhiệm vụ</span>
          </button>
        )}
      </div>

      {isEditing && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Giáo viên / Nhân viên</label>
              <select required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.userId || ''} onChange={e => setForm({...form, userId: e.target.value})}>
                <option value="">-- Chọn Giáo viên --</option>
                <option value="ALL">{isHead ? 'Tất cả thành viên trong tổ' : 'Tất cả Giáo viên / Nhân viên'}</option>
                <option value="ALL_TEACHERS">{isHead ? 'Tất cả giáo viên trong tổ' : 'Chỉ Giáo viên (bao gồm Tổ trưởng)'}</option>
                {targetUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tên công việc / Minh chứng</label>
              <input type="text" required placeholder="Vd: Soạn Kế hoạch bài dạy Tuần 1" className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.taskName || ''} onChange={e => setForm({...form, taskName: e.target.value})} />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Mô tả chi tiết</label>
              <input type="text" className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Lịch hoàn thành (Deadline)</label>
              <input type="date" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.deadline || ''} onChange={e => setForm({...form, deadline: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Trạng thái</label>
              <select className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.status || 'Assigned'} onChange={e => setForm({...form, status: e.target.value as any})}>
                <option value="Assigned">Đã giao (Chưa HT)</option>
                <option value="Pending">Chờ duyệt</option>
                <option value="Approved">Đã duyệt</option>
                <option value="Rejected">Từ chối</option>
              </select>
            </div>
            
            <div className="md:col-span-2 flex space-x-2 justify-end items-end">
              <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-gray-300 transition-colors">Hủy</button>
              <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors">Lưu nhiệm vụ</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="p-2 font-bold uppercase text-[10px]">Người được giao</th>
                <th className="p-2 font-bold uppercase text-[10px]">Công việc</th>
                <th className="p-2 font-bold uppercase text-[10px]">Thời hạn</th>
                <th className="p-2 font-bold uppercase text-[10px]">Trạng thái</th>
                <th className="p-2 font-bold uppercase text-[10px] text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500 italic">Chưa có nhiệm vụ nào</td></tr>
              ) : (
                tasks.map(t => {
                  const u = data.users.find(x => x.id === t.userId);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="p-2 font-bold text-gray-900">{u?.name}</td>
                      <td className="p-2">
                        <div className="font-medium">{t.taskName}</div>
                        <div className="text-[10px] text-gray-500">{t.description}</div>
                      </td>
                      <td className="p-2 text-[10px] font-bold text-gray-600 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {t.deadline || t.date}
                      </td>
                      <td className="p-2">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", 
                          t.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                          t.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          t.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                        )}>
                          {t.status === 'Assigned' ? 'Đã giao' : t.status === 'Pending' ? 'Chờ duyệt' : t.status === 'Approved' ? 'Đã duyệt' : 'Từ chối'}
                        </span>
                      </td>
                      <td className="p-2 flex justify-end space-x-1">
                        <button onClick={() => handleSendZaloNotification(t)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Nhắc nhở qua Zalo">
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleEdit(t)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Sửa">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Xóa">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {taskToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-800 uppercase">Xác nhận xóa</h3>
            </div>
            <div className="p-4 text-sm text-gray-700">
              Bạn có chắc chắn muốn xóa nhiệm vụ này?
            </div>
            <div className="p-3 bg-gray-50 flex justify-end space-x-2 border-t border-gray-200">
              <button 
                onClick={() => setTaskToDelete(null)}
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
