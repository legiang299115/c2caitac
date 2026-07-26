import React, { useMemo } from 'react';
import { AppData, User } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '../lib/utils';
import { calculateScores } from '../lib/scoreCalculator';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

interface Props {
  data: AppData;
  currentUser: User;
  onSave: (data: AppData) => Promise<void>;
}

export default function Dashboard({ data, currentUser, onSave }: Props) {
  // Calculate current stats
  const stats = useMemo(() => {
    const userScores = data.users.map(u => {
      const uTimesheets = data.timesheets.filter(t => t.userId === u.id);
      const uHomeroom = data.homeroomData[u.id];
      const uComps = data.competitions.filter(c => c.userId === u.id);
      const evalData = data.evaluations[u.id];
      const calculated = calculateScores(u, uTimesheets, uHomeroom, uComps, evalData?.scores || {});
      return { user: u, calculated };
    });

    const counts = { 'Xuất sắc': 0, 'Tốt': 0, 'Hoàn thành': 0, 'Chưa hoàn thành': 0 };
    userScores.forEach(s => counts[s.calculated.ranking]++);
    return { counts, total: userScores.length, userScores };
  }, [data]);

  const pieData = Object.entries(stats.counts).map(([name, value]) => ({ name, value }));
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
  const percentExcellent = stats.total > 0 ? (stats.counts['Xuất sắc'] / stats.total) * 100 : 0;
  const isOverLimit = percentExcellent > data.settings.maxExcellentPercent;

  const handleExportExcel = () => {
    const exportData = stats.userScores.map(row => ({
      'Họ và tên': row.user.name,
      'Nhóm Bảng': row.user.group,
      'Chức vụ': row.user.role,
      'Điểm Chính trị': row.calculated.political,
      'Điểm Đạo đức': row.calculated.ethics,
      'Điểm Tác phong': row.calculated.manner,
      'Điểm Kỷ luật': row.calculated.discipline,
      'Điểm Hành chính & CNTT': row.calculated.adminIT,
      'Điểm Nhiệm vụ': row.calculated.taskPerformance,
      'Tổng Điểm': row.calculated.totalScore,
      'Xếp loại': row.calculated.ranking,
      'Khóa cứng': row.calculated.isHardLocked ? 'Có' : 'Không'
    }));

    const compData = data.competitions.map(c => {
      const u = data.users.find(x => x.id === c.userId);
      return {
        'Giáo viên': u?.name,
        'Hội thi': c.name,
        'Cấp': c.level,
        'Giải': c.prize,
        'Minh chứng': c.evidenceUrl
      };
    });

    const wb = XLSX.utils.book_new();
    const wsEval = XLSX.utils.json_to_sheet(exportData);
    const wsComp = XLSX.utils.json_to_sheet(compData);
    
    XLSX.utils.book_append_sheet(wb, wsEval, "Ket_Qua_Danh_Gia");
    XLSX.utils.book_append_sheet(wb, wsComp, "Thong_Ke_Hoi_Thi");
    
    XLSX.writeFile(wb, `Bao_Cao_Thi_Dua_${Date.now()}.xlsx`);
  };

  const isTeacherOrStaff = currentUser.role === 'Teacher' || currentUser.role === 'Staff';
  const isHead = currentUser.role === 'Head';

  const teacherTasks = useMemo(() => {
    if (!isTeacherOrStaff) return [];
    return (data.taskDeclarations || []).filter(t => t.userId === currentUser.id);
  }, [data.taskDeclarations, currentUser.id, isTeacherOrStaff]);

  const incompleteTasks = teacherTasks.filter(t => t.status === 'Assigned' || t.status === 'Pending');

  const departmentTasks = useMemo(() => {
    if (!isHead || !currentUser.departmentId) return [];
    const deptUsers = data.users.filter(u => u.departmentId === currentUser.departmentId);
    const userIds = new Set(deptUsers.map(u => u.id));
    return (data.taskDeclarations || []).filter(t => userIds.has(t.userId));
  }, [data.taskDeclarations, data.users, currentUser.id, currentUser.departmentId, isHead]);

  if (isTeacherOrStaff) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-900 uppercase">Tổng quan Nhiệm vụ</h2>
            <p className="text-xs text-gray-500 font-medium">Xin chào, {currentUser.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <p className="text-[10px] text-gray-500 uppercase font-bold">Tổng số nhiệm vụ</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{teacherTasks.length}</p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <p className="text-[10px] text-gray-500 uppercase font-bold">Nhiệm vụ chưa thực hiện</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{incompleteTasks.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-4 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase text-gray-700">Các nhiệm vụ chưa thực hiện</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="p-2 font-bold uppercase text-[10px]">Tên nhiệm vụ</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Chi tiết</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Hạn chót</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {incompleteTasks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500 italic">Bạn không có nhiệm vụ nào chưa thực hiện.</td>
                  </tr>
                ) : (
                  incompleteTasks.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="p-2 font-medium text-gray-900">{t.taskName}</td>
                      <td className="p-2 text-gray-600 max-w-xs truncate">{t.description || '-'}</td>
                      <td className="p-2">{t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : '-'}</td>
                      <td className="p-2">
                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase", 
                          t.status === 'Assigned' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                        )}>
                          {t.status === 'Assigned' ? 'Chưa nộp' : 'Chờ duyệt'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (isHead) {
    const deptName = data.departments?.find(d => d.id === currentUser.departmentId)?.name || 'Tổ chuyên môn';
    const deptPendingTasks = departmentTasks.filter(t => t.status === 'Pending');
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-black tracking-tight text-gray-900 uppercase">Tổng quan {deptName}</h2>
            <p className="text-xs text-gray-500 font-medium">Tổ trưởng: {currentUser.name}</p>
          </div>
          <button 
            onClick={handleExportExcel}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-3 py-1.5 rounded shadow-sm hover:bg-emerald-700 transition-colors text-xs font-bold uppercase"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất báo cáo Excel</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <p className="text-[10px] text-gray-500 uppercase font-bold">Tổng số nhiệm vụ của tổ</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{departmentTasks.length}</p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <p className="text-[10px] text-gray-500 uppercase font-bold">Nhiệm vụ đang chờ duyệt</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{deptPendingTasks.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-4 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase text-gray-700">Các nhiệm vụ đang chờ duyệt</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="p-2 font-bold uppercase text-[10px]">Giáo viên</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Tên nhiệm vụ</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Chi tiết</th>
                  <th className="p-2 font-bold uppercase text-[10px]">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {deptPendingTasks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-gray-500 italic">Không có nhiệm vụ nào đang chờ duyệt trong tổ.</td>
                  </tr>
                ) : (
                  deptPendingTasks.map(t => {
                    const u = data.users.find(x => x.id === t.userId);
                    return (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="p-2 font-medium text-gray-900">{u?.name || 'Không xác định'}</td>
                        <td className="p-2 font-medium text-gray-900">{t.taskName}</td>
                        <td className="p-2 text-gray-600 max-w-xs truncate">{t.description || '-'}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-100 text-yellow-700">
                            Chờ duyệt
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-gray-800 hidden">Tổng Quan Hệ Thống</h2>
        {(currentUser.role === 'Admin') && (
          <button 
            onClick={handleExportExcel}
            className="flex items-center space-x-2 bg-emerald-600 text-white px-3 py-1.5 rounded shadow-sm hover:bg-emerald-700 transition-colors text-xs font-bold uppercase"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất báo cáo Excel</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <p className="text-[10px] text-gray-500 uppercase font-bold">Tổng Viên Chức</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <p className="text-[10px] text-gray-500 uppercase font-bold">Đạt Xuất sắc</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.counts['Xuất sắc']}</p>
        </div>
        <div className={cn("p-3 rounded-lg shadow-sm border relative", isOverLimit ? "bg-orange-50 border-orange-200" : "bg-white border-gray-200")}>
          <p className={cn("text-[10px] uppercase font-bold", isOverLimit ? "text-orange-600" : "text-gray-500")}>Tỷ lệ Xuất sắc</p>
          <p className={cn("text-2xl font-bold mt-1", isOverLimit ? "text-orange-700" : "text-blue-900")}>
            {percentExcellent.toFixed(1)}%
          </p>
          <div className="absolute top-2 right-2 flex space-x-1 items-center">
            {isOverLimit && <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></div>}
            <span className={cn("text-[8px] font-bold uppercase", isOverLimit ? "text-orange-600" : "text-gray-400")}>Trần: {data.settings.maxExcellentPercent}%</span>
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
          <p className="text-[10px] text-gray-500 uppercase font-bold">Chưa hoàn thành</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.counts['Chưa hoàn thành']}</p>
        </div>
      </div>

      {isOverLimit && (currentUser.role === 'Admin' || currentUser.role === 'Head') && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs">
          <span className="font-bold">Cảnh báo:</span> Tỷ lệ Xuất sắc vượt quá hạn mức cấu hình ({data.settings.maxExcellentPercent}%). Vui lòng rà soát lại kết quả đánh giá.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {(currentUser.role === 'Admin' || currentUser.role === 'Head') && (
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-xs font-bold uppercase text-gray-500 mb-3">Cấu hình Hệ thống</h3>
              <div className="flex items-center space-x-4">
                <label className="text-xs font-medium">Trần Xuất Sắc (%):</label>
                <input 
                  type="number" 
                  className="border border-gray-300 rounded p-1.5 w-20 text-center text-xs"
                  value={data.settings.maxExcellentPercent}
                  onChange={e => onSave({ ...data, settings: { maxExcellentPercent: Number(e.target.value) } })}
                />
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-bold uppercase text-gray-500">Phân bổ xếp loại</h3>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-[#1a202c] text-white p-4 rounded-lg shadow-sm border border-gray-800">
          <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-3 flex justify-between">
            <span>Danh sách Viên chức</span>
          </h3>
          <div className="space-y-2 overflow-y-auto max-h-[400px]">
            {stats.userScores.map(score => (
               <div key={score.user.id} className={cn("p-2 rounded border-l-4 flex flex-col", 
                  score.calculated.ranking === 'Xuất sắc' ? 'bg-gray-800 border-green-500' :
                  score.calculated.ranking === 'Tốt' ? 'bg-gray-800 border-blue-500' :
                  score.calculated.ranking === 'Hoàn thành' ? 'bg-gray-800 border-yellow-500' :
                  'bg-gray-800 border-red-500 opacity-60'
               )}>
                 <span className="text-[10px] font-bold">{score.user.name}</span>
                 <span className="text-[9px] text-gray-400">Bảng {score.user.group} | {score.calculated.totalScore.toFixed(1)}đ</span>
                 <div className="mt-1 flex items-center justify-between">
                   <span className={cn("text-[8px] px-1 rounded",
                     score.calculated.ranking === 'Xuất sắc' ? 'bg-green-900 text-green-300' :
                     score.calculated.ranking === 'Tốt' ? 'bg-blue-900 text-blue-300' :
                     score.calculated.ranking === 'Hoàn thành' ? 'bg-yellow-900 text-yellow-300' :
                     'bg-red-900 text-red-300'
                   )}>{score.calculated.ranking}</span>
                 </div>
               </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
