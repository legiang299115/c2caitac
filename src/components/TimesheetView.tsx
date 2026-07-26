import React, { useState } from 'react';
import { AppData, User, TimesheetRequest, TimesheetCode } from '../types';
import { toast } from 'sonner';

interface Props {
  data: AppData;
  currentUser: User;
  onSave: (data: AppData) => Promise<void>;
}

export default function TimesheetView({ data, currentUser, onSave }: Props) {
  const [form, setForm] = useState<Partial<TimesheetRequest>>({
    date: '', type: 'NghiPhep', session: 'Sáng', period: '1,2', class: '', code: 'P0'
  });

  const myRequests = data.timesheets.filter(t => t.userId === currentUser.id);
  const pendingRequests = data.timesheets.filter(t => {
    if (t.status !== 'Pending') return false;
    if (currentUser.role === 'Admin') return true;
    if (currentUser.role === 'Head') {
      const u = data.users.find(x => x.id === t.userId);
      return u && u.departmentId === currentUser.departmentId;
    }
    return false;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newReq: TimesheetRequest = {
      ...form,
      id: Date.now().toString(),
      userId: currentUser.id,
      status: 'Pending',
    } as TimesheetRequest;
    onSave({ ...data, timesheets: [...data.timesheets, newReq] });
    setForm({ date: '', type: 'NghiPhep', session: 'Sáng', period: '1,2', class: '', code: 'P0' });
    toast.success('Đã gửi yêu cầu thành công!');
  };

  const handleApprove = (id: string, code: TimesheetCode) => {
    const newData = {
      ...data,
      timesheets: data.timesheets.map(t => t.id === id ? { ...t, status: 'Approved', code } : t)
    } as AppData;
    onSave(newData);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xs font-bold uppercase text-gray-700 mb-3">Khai báo Ngày/Giờ công (Nghỉ phép / Đi công tác / Dạy bù)</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Loại khai báo</label>
            <select className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
              <option value="NghiPhep">Nghỉ phép</option>
              <option value="CongTac">Đi công tác</option>
              <option value="DayBu">Dạy bù</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Ngày</label>
            <input type="date" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Buổi</label>
            <select className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.session} onChange={e => setForm({...form, session: e.target.value as any})}>
              <option value="Sáng">Sáng</option>
              <option value="Chiều">Chiều</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tiết (vd: 1,2,3)</label>
            <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.period} onChange={e => setForm({...form, period: e.target.value})} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Lớp</label>
            <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.class} onChange={e => setForm({...form, class: e.target.value})} />
          </div>
          <div className="md:col-span-2 lg:col-span-3 flex justify-end">
            <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 text-xs rounded font-bold uppercase hover:bg-blue-700 transition-colors">Gửi Phê Duyệt</button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <h3 className="text-xs font-bold uppercase text-gray-700 p-3 bg-gray-50 border-b border-gray-200 m-0">Lịch sử Khai báo của tôi</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white text-gray-500 border-b border-gray-200">
              <tr>
                <th className="p-2 font-bold uppercase text-[10px]">Ngày</th>
                <th className="p-2 font-bold uppercase text-[10px]">Loại</th>
                <th className="p-2 font-bold uppercase text-[10px]">Buổi</th>
                <th className="p-2 font-bold uppercase text-[10px]">Tiết</th>
                <th className="p-2 font-bold uppercase text-[10px]">Lớp</th>
                <th className="p-2 font-bold uppercase text-[10px]">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {myRequests.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="p-2">{r.date}</td>
                  <td className="p-2">{r.type}</td>
                  <td className="p-2">{r.session}</td>
                  <td className="p-2">{r.period}</td>
                  <td className="p-2">{r.class}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${r.status === 'Approved' ? 'bg-green-100 text-green-700' : r.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {(currentUser.role === 'Admin' || currentUser.role === 'Head') && (
        <div className="bg-white rounded-lg shadow-sm border border-red-200 overflow-hidden flex flex-col">
          <h3 className="text-xs font-bold uppercase text-red-700 p-3 bg-red-50 border-b border-red-200 m-0">Duyệt Yêu Cầu (Dành cho Quản lý)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-white text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="p-2 font-bold uppercase text-[10px]">Người gửi</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Ngày</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Loại</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Tiết</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingRequests.map(r => {
                  const u = data.users.find(x => x.id === r.userId);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="p-2 font-medium">{u?.name}</td>
                      <td className="p-2">{r.date}</td>
                      <td className="p-2">{r.type}</td>
                      <td className="p-2">{r.period}</td>
                      <td className="p-2 flex space-x-1">
                        <button onClick={() => handleApprove(r.id, 'P0')} className="bg-green-500 hover:bg-green-600 transition-colors text-white px-2 py-1 rounded text-[10px] font-bold uppercase">Duyệt (P0 - Có lương)</button>
                        <button onClick={() => handleApprove(r.id, 'P1')} className="bg-yellow-500 hover:bg-yellow-600 transition-colors text-white px-2 py-1 rounded text-[10px] font-bold uppercase">Duyệt (P1 - Trừ điểm)</button>
                        <button onClick={() => handleApprove(r.id, 'K')} className="bg-red-500 hover:bg-red-600 transition-colors text-white px-2 py-1 rounded text-[10px] font-bold uppercase">Vắng (K)</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
