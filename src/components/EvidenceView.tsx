import React, { useState } from 'react';
import { AppData, User, CompetitionData, TaskDeclaration } from '../types';
import { cn } from '../lib/utils';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';

interface Props {
  data: AppData;
  currentUser: User;
  onSave: (data: AppData) => Promise<void>;
}

export default function EvidenceView({ data, currentUser, onSave }: Props) {
  const [compForm, setCompForm] = useState<Partial<CompetitionData>>({
    name: '', level: 'Truong', prize: 'Nhat', evidenceUrl: ''
  });

  const [taskForm, setTaskForm] = useState<Partial<TaskDeclaration>>({
    taskName: 'NhapDiem', description: '', date: new Date().toISOString().split('T')[0]
  });

  const myComps = data.competitions.filter(c => c.userId === currentUser.id);
  const taskDeclarations = data.taskDeclarations || [];
  const myTasks = taskDeclarations.filter(t => t.userId === currentUser.id);
  const myAssignedTasks = myTasks.filter(t => t.status === 'Assigned');
  const myHistoryTasks = myTasks.filter(t => t.status !== 'Assigned');
  
  const pendingTasks = taskDeclarations.filter(t => {
    if (t.status !== 'Pending') return false;
    if (currentUser.role === 'Admin') return true;
    if (currentUser.role === 'Head') {
      const taskUser = data.users.find(u => u.id === t.userId);
      return taskUser && taskUser.departmentId === currentUser.departmentId;
    }
    return false;
  });

  const handleAddComp = (e: React.FormEvent) => {
    e.preventDefault();
    const newComp: CompetitionData = {
      ...compForm,
      id: Date.now().toString(),
      userId: currentUser.id,
    } as CompetitionData;
    onSave({ ...data, competitions: [...data.competitions, newComp] });
    setCompForm({ name: '', level: 'Truong', prize: 'Nhat', evidenceUrl: '' });
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const newTask: TaskDeclaration = {
      ...taskForm,
      id: `task-${Date.now()}`,
      userId: currentUser.id,
      status: 'Pending'
    } as TaskDeclaration;
    
    onSave({ ...data, taskDeclarations: [...taskDeclarations, newTask] });
    setTaskForm({ taskName: 'NhapDiem', description: '', date: new Date().toISOString().split('T')[0] });
  };

  const [selectedTaskToFulfill, setSelectedTaskToFulfill] = useState<TaskDeclaration | null>(null);
  const [fulfillDescription, setFulfillDescription] = useState('');
  const [fulfillImage, setFulfillImage] = useState('');

  const handleFulfillAssignedTaskClick = (t: TaskDeclaration) => {
    setSelectedTaskToFulfill(t);
    setFulfillDescription(t.description || '');
    setFulfillImage(t.evidenceUrl || '');
  };

  const handleImageUploadGen = (e: React.ChangeEvent<HTMLInputElement>, callback: (dataUrl: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        callback(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageUploadGen(e, setFulfillImage);
  };

  const handleSubmitFulfill = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTaskToFulfill) {
      const newTasks = taskDeclarations.map(x => x.id === selectedTaskToFulfill.id ? { ...x, description: fulfillDescription, evidenceUrl: fulfillImage, status: 'Pending' as const, date: new Date().toISOString().split('T')[0] } : x);
      onSave({ ...data, taskDeclarations: newTasks });
      setSelectedTaskToFulfill(null);
      setFulfillDescription('');
      setFulfillImage('');
    }
  };

  const handleApproveTask = (id: string, status: 'Approved' | 'Rejected') => {
    const newTasks = taskDeclarations.map(t => t.id === id ? { ...t, status } : t);
    onSave({ ...data, taskDeclarations: newTasks });
  };

  return (
    <div className="space-y-4">
      {/* Khai báo nhiệm vụ */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xs font-bold uppercase text-gray-700 mb-1">Khai báo Nhiệm vụ hoàn thành</h3>
        <p className="text-[10px] text-gray-500 mb-3 italic">Ghi nhận các công việc đã thực hiện để làm minh chứng thi đua.</p>
        
        <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tên công việc</label>
            <select className="w-full border border-gray-300 p-1.5 text-xs rounded" value={taskForm.taskName} onChange={e => setTaskForm({...taskForm, taskName: e.target.value as any})}>
              <option value="NhapDiem">Nhập điểm định kỳ</option>
              <option value="GiaoAn">Soạn kế hoạch bài dạy</option>
              <option value="Khac">Nhiệm vụ khác</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Ngày thực hiện</label>
            <input type="date" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={taskForm.date} onChange={e => setTaskForm({...taskForm, date: e.target.value})} />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Mô tả / Minh chứng</label>
            <div className="flex space-x-2">
              <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" placeholder="Đã hoàn thành nhập điểm lớp 9A1..." value={taskForm.description} onChange={e => setTaskForm({...taskForm, description: e.target.value})} />
              <button type="submit" className="bg-emerald-600 shrink-0 text-white px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-emerald-700 transition-colors">Gửi Khai báo</button>
            </div>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Nhiệm vụ được giao */}
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 overflow-hidden flex flex-col">
          <h3 className="text-xs font-bold uppercase text-blue-800 p-3 bg-blue-50 border-b border-blue-200 m-0">Nhiệm vụ được giao</h3>
          <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-white text-gray-500 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="p-2 font-bold uppercase text-[10px]">Thời hạn</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Công việc</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {myAssignedTasks.length === 0 ? (
                  <tr><td colSpan={3} className="p-4 text-center text-gray-500 italic">Không có nhiệm vụ nào</td></tr>
                ) : (
                  myAssignedTasks.map(t => (
                    <tr key={t.id} className="hover:bg-blue-50">
                      <td className="p-2 text-[10px] font-bold text-red-600">{t.deadline || t.date}</td>
                      <td className="p-2">
                        <div className="font-medium text-gray-800">{t.taskName === 'NhapDiem' ? 'Nhập điểm' : t.taskName === 'GiaoAn' ? 'Soạn Kế hoạch' : t.taskName === 'Khac' ? 'Khác' : t.taskName}</div>
                        <div className="text-[10px] text-gray-500">{t.description}</div>
                      </td>
                      <td className="p-2">
                        <button onClick={() => handleFulfillAssignedTaskClick(t)} className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-bold uppercase hover:bg-blue-700">
                          Khai báo
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lịch sử nhiệm vụ */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <h3 className="text-xs font-bold uppercase text-gray-700 p-3 bg-gray-50 border-b border-gray-200 m-0">Lịch sử khai báo nhiệm vụ</h3>
          <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-white text-gray-500 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="p-2 font-bold uppercase text-[10px]">Ngày</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Công việc</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Mô tả</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {myHistoryTasks.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-500 italic">Chưa có dữ liệu</td></tr>
                ) : (
                  myHistoryTasks.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="p-2">{t.date}</td>
                      <td className="p-2 font-medium">
                        {t.taskName === 'NhapDiem' ? 'Nhập điểm' : t.taskName === 'GiaoAn' ? 'Soạn Kế hoạch' : t.taskName === 'Khac' ? 'Khác' : t.taskName}
                      </td>
                      <td className="p-2 text-[10px]">
                        <div className="mb-1">{t.description}</div>
                        {t.evidenceUrl && (
                          <div className="mt-1">
                            <a href={t.evidenceUrl} target="_blank" rel="noopener noreferrer">
                              <img src={t.evidenceUrl} alt="Minh chứng" className="h-10 w-auto rounded border border-gray-200 hover:opacity-80 transition-opacity" />
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="p-2 flex items-center">
                        {t.status === 'Approved' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mr-1" /> :
                         t.status === 'Rejected' ? <XCircle className="w-3.5 h-3.5 text-red-500 mr-1" /> :
                         <Clock className="w-3.5 h-3.5 text-yellow-500 mr-1" />}
                        <span className={cn("text-[10px] font-bold uppercase",
                          t.status === 'Approved' ? 'text-green-700' :
                          t.status === 'Rejected' ? 'text-red-700' : 'text-yellow-700'
                        )}>{t.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Duyệt nhiệm vụ (Admin/Head) */}
        {(currentUser.role === 'Admin' || currentUser.role === 'Head') && (
          <div className="bg-white rounded-lg shadow-sm border border-emerald-200 overflow-hidden flex flex-col">
            <h3 className="text-xs font-bold uppercase text-emerald-800 p-3 bg-emerald-50 border-b border-emerald-200 m-0">Duyệt Nhiệm vụ (Quản lý)</h3>
            <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-white text-gray-500 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="p-2 font-bold uppercase text-[10px]">Người gửi</th>
                    <th className="p-2 font-bold uppercase text-[10px]">Công việc</th>
                    <th className="p-2 font-bold uppercase text-[10px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingTasks.length === 0 ? (
                    <tr><td colSpan={3} className="p-4 text-center text-gray-500 italic">Không có yêu cầu chờ duyệt</td></tr>
                  ) : (
                    pendingTasks.map(t => {
                      const u = data.users.find(x => x.id === t.userId);
                      return (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="p-2">
                            <div className="font-bold">{u?.name}</div>
                            <div className="text-[9px] text-gray-400">{t.date}</div>
                          </td>
                          <td className="p-2">
                            <div className="font-medium text-gray-700">
                              {t.taskName === 'NhapDiem' ? 'Nhập điểm' : t.taskName === 'GiaoAn' ? 'Soạn Kế hoạch' : t.taskName === 'Khac' ? 'Khác' : t.taskName}
                            </div>
                            <div className="text-[10px] text-gray-500 italic mb-1">{t.description}</div>
                            {t.evidenceUrl && (
                              <div className="mt-1">
                                <a href={t.evidenceUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={t.evidenceUrl} alt="Minh chứng" className="h-12 w-auto rounded border border-gray-200 hover:opacity-80 transition-opacity" />
                                </a>
                              </div>
                            )}
                          </td>
                          <td className="p-2">
                            <div className="flex space-x-1">
                              <button onClick={() => handleApproveTask(t.id, 'Approved')} className="bg-green-100 text-green-700 hover:bg-green-200 p-1 rounded" title="Duyệt">
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleApproveTask(t.id, 'Rejected')} className="bg-red-100 text-red-700 hover:bg-red-200 p-1 rounded" title="Từ chối">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xs font-bold uppercase text-gray-700 mb-1">Khai báo Phong trào / Hội thi</h3>
        <p className="text-[10px] text-gray-500 mb-3 italic">Tự động cộng điểm vào mục Cải cách hành chính & Ứng dụng CNTT (Gấp số nhân theo cấp).</p>
        
        <form onSubmit={handleAddComp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tên hội thi</label>
            <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={compForm.name} onChange={e => setCompForm({...compForm, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Cấp tổ chức</label>
            <select className="w-full border border-gray-300 p-1.5 text-xs rounded" value={compForm.level} onChange={e => setCompForm({...compForm, level: e.target.value as any})}>
              <option value="Truong">Cấp Trường</option>
              <option value="Xa">Cấp Xã (x2)</option>
              <option value="Huyen">Cấp Huyện (x4)</option>
              <option value="Tinh">Cấp Tỉnh/TP (x4)</option>
              <option value="QuocGia">Cấp Quốc gia (x8)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Giải đạt được</label>
            <select className="w-full border border-gray-300 p-1.5 text-xs rounded" value={compForm.prize} onChange={e => setCompForm({...compForm, prize: e.target.value as any})}>
              <option value="Nhat">Nhất (+3 điểm cơ sở)</option>
              <option value="Nhi">Nhì (+2 điểm cơ sở)</option>
              <option value="Ba">Ba (+1 điểm cơ sở)</option>
              <option value="KhuyenKhich">Khuyến Khích (+0)</option>
            </select>
          </div>
          <div className="lg:col-span-3">
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Minh chứng (Đường dẫn hoặc tải ảnh)</label>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <input type="text" required className="flex-1 border border-gray-300 p-1.5 text-xs rounded placeholder-gray-400" placeholder="https://... hoặc tải ảnh" value={compForm.evidenceUrl} onChange={e => setCompForm({...compForm, evidenceUrl: e.target.value})} />
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setCompForm({...compForm, evidenceUrl: 'Đang tải...'});
                  handleImageUploadGen(e, (dataUrl) => setCompForm({...compForm, evidenceUrl: dataUrl}));
                }
              }} className="w-full sm:w-56 text-xs border border-gray-300 p-1 rounded bg-white" />
            </div>
            {compForm.evidenceUrl && compForm.evidenceUrl.startsWith('data:image') && (
              <div className="mt-2 relative inline-block">
                <img src={compForm.evidenceUrl} alt="Minh chứng" className="h-16 w-auto rounded border border-gray-300" />
                <button type="button" onClick={() => setCompForm({...compForm, evidenceUrl: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow hover:bg-red-600">✕</button>
              </div>
            )}
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={compForm.evidenceUrl === 'Đang tải...'} className="w-full bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors disabled:opacity-50">Thêm Hội Thi</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <h3 className="text-xs font-bold uppercase text-gray-700 p-3 bg-gray-50 border-b border-gray-200 m-0">Danh sách Hội thi đã khai báo</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white text-gray-500 border-b border-gray-200">
              <tr>
                <th className="p-2 font-bold uppercase text-[10px]">Tên hội thi</th>
                <th className="p-2 font-bold uppercase text-[10px]">Cấp</th>
                <th className="p-2 font-bold uppercase text-[10px]">Giải</th>
                <th className="p-2 font-bold uppercase text-[10px]">Minh chứng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {myComps.length === 0 ? (
                <tr><td colSpan={4} className="p-4 text-center text-gray-500 italic">Chưa có dữ liệu</td></tr>
              ) : (
                myComps.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="p-2 font-medium text-gray-900">{c.name}</td>
                    <td className="p-2">{c.level}</td>
                    <td className="p-2">{c.prize}</td>
                    <td className="p-2">
                      {c.evidenceUrl?.startsWith('data:image') ? (
                        <a href={c.evidenceUrl} target="_blank" rel="noopener noreferrer">
                          <img src={c.evidenceUrl} alt="Minh chứng" className="h-10 w-auto rounded border border-gray-200 hover:opacity-80 transition-opacity" />
                        </a>
                      ) : (
                        <a href={c.evidenceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center font-bold">
                          Xem tệp <span className="ml-1">↗</span>
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTaskToFulfill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-600 text-white p-3 font-bold uppercase text-xs">
              Khai báo nhiệm vụ
            </div>
            <form onSubmit={handleSubmitFulfill} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tên công việc</label>
                <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">
                  {selectedTaskToFulfill.taskName === 'NhapDiem' ? 'Nhập điểm' : selectedTaskToFulfill.taskName === 'GiaoAn' ? 'Soạn Kế hoạch' : selectedTaskToFulfill.taskName === 'Khac' ? 'Khác' : selectedTaskToFulfill.taskName}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mô tả / Link minh chứng</label>
                <textarea
                  required
                  className="w-full border border-gray-300 p-2 text-sm rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows={3}
                  placeholder="Nhập mô tả hoặc link minh chứng cho công việc này..."
                  value={fulfillDescription}
                  onChange={e => setFulfillDescription(e.target.value)}
                ></textarea>
                
                <div className="mt-3">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ảnh minh chứng (nếu có)</label>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs" />
                  {fulfillImage && (
                    <div className="mt-2 relative inline-block">
                      <img src={fulfillImage} alt="Minh chứng" className="h-24 w-auto rounded border border-gray-300" />
                      <button type="button" onClick={() => setFulfillImage('')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow hover:bg-red-600">✕</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTaskToFulfill(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-xs font-bold uppercase hover:bg-gray-300 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
