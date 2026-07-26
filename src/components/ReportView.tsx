import React, { useMemo } from 'react';
import { AppData, User } from '../types';
import { calculateScores } from '../lib/scoreCalculator';
import * as XLSX from 'xlsx';
import { Download, BarChart2, PieChart as PieChartIcon, FileSpreadsheet, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '../lib/utils';

interface Props {
  data: AppData;
  currentUser: User;
}

export function ReportView({ data, currentUser }: Props) {
  if (currentUser.role !== 'Admin' && currentUser.role !== 'Head') {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
        Bạn không có quyền truy cập phân hệ này.
      </div>
    );
  }

  const { userScores, groupStats, timesheetStats, taskStats, attStats } = useMemo(() => {
    const scores = data.users.map(u => {
      const uTimesheets = data.timesheets.filter(t => t.userId === u.id);
      const uHomeroom = data.homeroomData[u.id];
      const uComps = data.competitions.filter(c => c.userId === u.id);
      const evalData = data.evaluations[u.id];
      const calculated = calculateScores(u, uTimesheets, uHomeroom, uComps, evalData?.scores || {});
      return { user: u, calculated, timesheets: uTimesheets };
    });

    const groups = ['A', 'B', 'C', 'D'];
    const gStats = groups.map(g => {
      const groupUsers = scores.filter(s => s.user.group === g);
      const total = groupUsers.length;
      const xs = groupUsers.filter(s => s.calculated.ranking === 'Xuất sắc').length;
      const tot = groupUsers.filter(s => s.calculated.ranking === 'Tốt').length;
      const ht = groupUsers.filter(s => s.calculated.ranking === 'Hoàn thành').length;
      const cht = groupUsers.filter(s => s.calculated.ranking === 'Chưa hoàn thành').length;
      return { group: g, name: `Bảng ${g}`, total, xs, tot, ht, cht };
    }).filter(g => g.total > 0);

    const tStats = {
      pending: data.timesheets.filter(t => t.status === 'Pending').length,
      approved: data.timesheets.filter(t => t.status === 'Approved').length,
      total: data.timesheets.length
    };

    const taskD = data.taskDeclarations || [];
    const tskStats = {
      pending: taskD.filter(t => t.status === 'Pending').length,
      approved: taskD.filter(t => t.status === 'Approved').length,
      total: taskD.length
    };

    const students = data.students || [];
    const attRecords = data.attendanceRecords || [];
    const attSettings = data.settings.attendanceSettings;
    
    let attStats: Record<string, { total: number, present: number, late: number, absent: number }> = {};
    const today = new Date().toISOString().split('T')[0];

    students.forEach(s => {
      if (!attStats[s.className]) attStats[s.className] = { total: 0, present: 0, late: 0, absent: 0 };
      attStats[s.className].total += 1;
      
      const record = attRecords.find(r => r.studentId === s.id && r.timestamp.startsWith(today));
      if (!record) {
        attStats[s.className].absent += 1;
        return;
      }
      
      const rules = attSettings?.rules;
      if (!rules || rules.length === 0) {
        attStats[s.className].present += 1;
        return;
      }

      const gradeMatch = s.className.match(/^(\d+)/);
      const grade = gradeMatch ? gradeMatch[1] : '';
      const attTime = new Date(record.timestamp);
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
      if (diffMins > absentThresholdMins) attStats[s.className].absent += 1;
      else if (diffMins > lateThresholdMins) attStats[s.className].late += 1;
      else attStats[s.className].present += 1;
    });

    return { userScores: scores, groupStats: gStats, timesheetStats: tStats, taskStats: tskStats, attStats };
  }, [data]);

  const COLORS = {
    xs: '#10b981', // emerald-500
    tot: '#3b82f6', // blue-500
    ht: '#f59e0b', // amber-500
    cht: '#ef4444', // red-500
  };

  const handleExportEvaluation = () => {
    const exportData = userScores.map(row => ({
      'ID': row.user.id,
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

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, ws, "Ket_Qua_Danh_Gia");
    XLSX.writeFile(wb, `Tong_Hop_Thi_Dua_${Date.now()}.xlsx`);
  };

  const handleExportEvidence = () => {
    const compData = data.competitions.map(c => {
      const u = data.users.find(x => x.id === c.userId);
      return {
        'Loại': 'Hội thi',
        'Giáo viên': u?.name,
        'Nội dung': c.name,
        'Cấp / Chi tiết': c.level,
        'Thành tích / Trạng thái': c.prize,
        'Minh chứng': c.evidenceUrl
      };
    });

    const taskD = data.taskDeclarations || [];
    const taskData = taskD.map(t => {
      const u = data.users.find(x => x.id === t.userId);
      return {
        'Loại': 'Nhiệm vụ',
        'Giáo viên': u?.name,
        'Nội dung': t.taskName,
        'Cấp / Chi tiết': t.description,
        'Thành tích / Trạng thái': t.status,
        'Minh chứng': t.date
      };
    });

    const combined = [...compData, ...taskData];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(combined);
    XLSX.utils.book_append_sheet(wb, ws, "Minh_Chung_Hoi_Thi");
    XLSX.writeFile(wb, `Thong_Ke_Minh_Chung_${Date.now()}.xlsx`);
  };

  const handleExportTimesheets = () => {
    const tsData = data.timesheets.map(t => {
      const u = data.users.find(x => x.id === t.userId);
      return {
        'Giáo viên': u?.name,
        'Ngày': t.date,
        'Loại': t.type,
        'Buổi': t.session,
        'Tiết': t.period,
        'Lớp': t.class,
        'Trạng thái': t.status,
        'Mã chấm công': t.code
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(tsData);
    XLSX.utils.book_append_sheet(wb, ws, "Cham_Cong");
    XLSX.writeFile(wb, `Bao_Cao_Cham_Cong_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-xs font-bold uppercase text-gray-700 mb-1">Thống kê & Báo cáo</h3>
        <p className="text-[10px] text-gray-500 italic">Trích xuất dữ liệu tổng hợp phục vụ công tác xét duyệt thi đua</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Export Cards */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex flex-col items-center text-center justify-center space-y-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-900 uppercase">Tổng hợp Thi đua</h4>
            <p className="text-[9px] text-blue-700 mt-1">Kết quả 6 tiêu chí & xếp loại</p>
          </div>
          <button onClick={handleExportEvaluation} className="bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors flex items-center w-full justify-center">
            <Download className="w-3.5 h-3.5 mr-1" /> Tải Excel
          </button>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg flex flex-col items-center text-center justify-center space-y-3">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-900 uppercase">Minh chứng & Hội thi</h4>
            <p className="text-[9px] text-emerald-700 mt-1">Nhiệm vụ, SKKN, Giải thưởng</p>
          </div>
          <button onClick={handleExportEvidence} className="bg-emerald-600 text-white px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-emerald-700 transition-colors flex items-center w-full justify-center">
            <Download className="w-3.5 h-3.5 mr-1" /> Tải Excel
          </button>
        </div>

        <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg flex flex-col items-center text-center justify-center space-y-3">
          <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-purple-900 uppercase">Báo cáo Giờ công</h4>
            <p className="text-[9px] text-purple-700 mt-1">Nghỉ phép, đi trễ, dạy thay</p>
          </div>
          <button onClick={handleExportTimesheets} className="bg-purple-600 text-white px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-purple-700 transition-colors flex items-center w-full justify-center">
            <Download className="w-3.5 h-3.5 mr-1" /> Tải Excel
          </button>
        </div>
        <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex flex-col items-center text-center justify-center space-y-3">
          <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
            <PieChartIcon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-orange-900 uppercase">Điểm danh Học sinh</h4>
            <p className="text-[9px] text-orange-700 mt-1">Dữ liệu quẹt thẻ hôm nay</p>
          </div>
          <button onClick={() => {
            const attExport = Object.entries(attStats as Record<string, { total: number, present: number, late: number, absent: number }>).map(([className, stats]) => ({
              'Lớp': className,
              'Tổng số HS': stats.total,
              'Có mặt': stats.present,
              'Đi trễ': stats.late,
              'Vắng mặt': stats.absent
            }));
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(attExport);
            XLSX.utils.book_append_sheet(wb, ws, "Diem_Danh");
            XLSX.writeFile(wb, `Bao_Cao_Diem_Danh_${Date.now()}.xlsx`);
          }} className="bg-orange-600 text-white px-4 py-1.5 rounded text-xs font-bold uppercase hover:bg-orange-700 transition-colors flex items-center w-full justify-center">
            <Download className="w-3.5 h-3.5 mr-1" /> Tải Excel
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-4">
        <h3 className="text-xs font-bold uppercase text-gray-700 mb-4">Tình hình Điểm danh Toàn trường (Hôm nay)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="p-2 font-bold uppercase text-[10px]">Lớp</th>
                <th className="p-2 font-bold uppercase text-[10px] text-right">Tổng số HS</th>
                <th className="p-2 font-bold uppercase text-[10px] text-right text-green-600">Có mặt</th>
                <th className="p-2 font-bold uppercase text-[10px] text-right text-orange-600">Đi trễ</th>
                <th className="p-2 font-bold uppercase text-[10px] text-right text-red-600">Vắng mặt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.keys(attStats).length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-gray-500 italic">Chưa có dữ liệu học sinh</td></tr>
              ) : (
                Object.entries(attStats as Record<string, { total: number, present: number, late: number, absent: number }>).map(([className, stats]) => (
                  <tr key={className} className="hover:bg-gray-50">
                    <td className="p-2 font-bold text-gray-800">{className}</td>
                    <td className="p-2 text-right">{stats.total}</td>
                    <td className="p-2 text-right font-medium text-green-600">{stats.present}</td>
                    <td className="p-2 text-right font-medium text-orange-600">{stats.late}</td>
                    <td className="p-2 text-right font-medium text-red-600">{stats.absent}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xs font-bold uppercase text-gray-700 mb-4">Phân bổ Xếp loại theo Bảng thi đua</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupStats} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Bar dataKey="xs" name="Xuất sắc" stackId="a" fill={COLORS.xs} radius={[0, 0, 0, 0]} />
                <Bar dataKey="tot" name="Tốt" stackId="a" fill={COLORS.tot} />
                <Bar dataKey="ht" name="Hoàn thành" stackId="a" fill={COLORS.ht} />
                <Bar dataKey="cht" name="Chưa HT" stackId="a" fill={COLORS.cht} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xs font-bold uppercase text-gray-700 mb-4">Tổng quan Yêu cầu / Minh chứng</h3>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Yêu cầu Giờ công</p>
                <p className="text-sm font-bold text-gray-900 mt-1">{timesheetStats.total} <span className="text-[10px] text-gray-500 font-normal">tổng số</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-yellow-600 uppercase bg-yellow-100 px-2 py-0.5 rounded">{timesheetStats.pending} Chờ duyệt</p>
                <p className="text-[10px] font-bold text-green-600 uppercase bg-green-100 px-2 py-0.5 rounded mt-1">{timesheetStats.approved} Đã duyệt</p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Khai báo Nhiệm vụ</p>
                <p className="text-sm font-bold text-gray-900 mt-1">{taskStats.total} <span className="text-[10px] text-gray-500 font-normal">tổng số</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-yellow-600 uppercase bg-yellow-100 px-2 py-0.5 rounded">{taskStats.pending} Chờ duyệt</p>
                <p className="text-[10px] font-bold text-green-600 uppercase bg-green-100 px-2 py-0.5 rounded mt-1">{taskStats.approved} Đã duyệt</p>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 rounded border border-blue-100">
               <p className="text-xs font-bold text-blue-900 mb-1">Mẹo thống kê</p>
               <p className="text-[10px] text-blue-700 italic">Sử dụng các nút tải Excel ở trên để lấy file thô. Bạn có thể sử dụng Pivot Table trong Excel để phân tích sâu hơn theo từng tổ bộ môn hoặc theo tháng.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
