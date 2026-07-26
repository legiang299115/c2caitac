import React, { useState, useEffect, useRef } from 'react';
import { AppData, User } from '../types';
import { calculateScores } from '../lib/scoreCalculator';
import { toast } from 'sonner';
import { Printer, FileText, Download } from 'lucide-react';

const AutoResizeTextarea = ({ value, onChange, placeholder, minHeight = "60px", className = "" }: any) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, parseInt(minHeight))}px`;
    }
  }, [value, minHeight]);

  return (
    <textarea
      ref={textareaRef}
      className={`w-full border border-gray-200 p-2 rounded resize-y outline-none focus:border-blue-300 print:border-none print:p-0 print:resize-none overflow-hidden ${className}`}
      style={{ minHeight }}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
};

interface Props {
  data: AppData;
  currentUser: User;
  onSave: (data: AppData) => Promise<void>;
}

export default function EvaluationView({ data, currentUser, onSave }: Props) {
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [activeTab, setActiveTab] = useState<'ChamDiem' | 'Phieu'>('ChamDiem');
  const printRef = useRef<HTMLDivElement>(null);

  // If Admin or Head, can select others, else only self
  const canEditOthers = currentUser.role === 'Admin' || currentUser.role === 'Head';
  
  const selectableUsers = currentUser.role === 'Head'
    ? data.users.filter(u => u.departmentId === currentUser.departmentId || u.id === currentUser.id)
    : data.users;

  const targetUser = data.users.find(u => u.id === selectedUserId) || currentUser;
  
  const existingEval = data.evaluations[targetUser.id];
  const [scores, setScores] = useState({
    political: existingEval?.scores.political ?? 5,
    ethics: existingEval?.scores.ethics ?? 5,
    manner: existingEval?.scores.manner ?? 5,
    discipline: existingEval?.scores.discipline ?? 5,
    adminIT: existingEval?.scores.adminIT ?? 5,
    taskPerformance: existingEval?.scores.taskPerformance ?? 50,
  });

  const [formData, setFormData] = useState({
    chinhTri: existingEval?.formData?.chinhTri ?? '',
    daoDuc: existingEval?.formData?.daoDuc ?? '',
    tacPhong: existingEval?.formData?.tacPhong ?? '',
    kyLuat: existingEval?.formData?.kyLuat ?? '',
    ketQua: existingEval?.formData?.ketQua ?? '',
    thaiDo: existingEval?.formData?.thaiDo ?? '',
    nhanXet: existingEval?.formData?.nhanXet ?? '',
  });

  useEffect(() => {
    const ev = data.evaluations[targetUser.id];
    setScores({
      political: ev?.scores.political ?? 5,
      ethics: ev?.scores.ethics ?? 5,
      manner: ev?.scores.manner ?? 5,
      discipline: ev?.scores.discipline ?? 5,
      adminIT: ev?.scores.adminIT ?? 5,
      taskPerformance: ev?.scores.taskPerformance ?? 50,
    });
    setFormData({
      chinhTri: ev?.formData?.chinhTri ?? '',
      daoDuc: ev?.formData?.daoDuc ?? '',
      tacPhong: ev?.formData?.tacPhong ?? '',
      kyLuat: ev?.formData?.kyLuat ?? '',
      ketQua: ev?.formData?.ketQua ?? '',
      thaiDo: ev?.formData?.thaiDo ?? '',
      nhanXet: ev?.formData?.nhanXet ?? '',
    });
  }, [selectedUserId, data.evaluations, targetUser.id]);

  const uTimesheets = data.timesheets.filter(t => t.userId === targetUser.id);
  const uHomeroom = data.homeroomData[targetUser.id];
  const uComps = data.competitions.filter(c => c.userId === targetUser.id);
  
  const calculated = calculateScores(targetUser, uTimesheets, uHomeroom, uComps, scores);

  const handleSave = () => {
    const newData = { ...data };
    newData.evaluations[targetUser.id] = {
      userId: targetUser.id,
      scores,
      totalScore: calculated.totalScore,
      ranking: calculated.ranking,
      term: '2025-2026',
      formData
    };
    onSave(newData);
    toast.success('Đã lưu kết quả đánh giá!');
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToWord = () => {
    if (!printRef.current) return;
    
    const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Phieu Xep Loai</title><style>body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; } h3, h4, p { margin: 0; padding: 0; padding-bottom: 8px; } .bold { font-weight: bold; } .center { text-align: center; } .right { text-align: right; } table { width: 100%; border-collapse: collapse; } td { padding: 4px; vertical-align: top; } .textarea-content { white-space: pre-wrap; margin-bottom: 8px; }</style></head><body>";
    const postHtml = "</body></html>";
    
    const clone = printRef.current.cloneNode(true) as HTMLElement;
    
    // Replace textareas
    const textareas = printRef.current.querySelectorAll('textarea');
    const cloneTextareas = clone.querySelectorAll('textarea');
    textareas.forEach((ta, index) => {
        const div = document.createElement('div');
        div.className = 'textarea-content';
        div.innerText = ta.value;
        cloneTextareas[index].parentNode?.replaceChild(div, cloneTextareas[index]);
    });
    
    // Remove elements that shouldn't be printed
    const noPrint = clone.querySelectorAll('.no-print');
    noPrint.forEach(el => el.remove());

    const html = preHtml + clone.innerHTML + postHtml;

    const blob = new Blob(['\ufeff', html], {
        type: 'application/msword'
    });
    
    const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    const filename = 'PhieuXepLoai_VienChuc.doc';
    
    const downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 no-print">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div>
            <h3 className="text-xs font-bold text-gray-800 uppercase">Phân Hệ Chấm Điểm</h3>
            <p className="text-[10px] text-gray-500">Giáo viên: <span className="font-bold text-gray-900">{targetUser.name}</span></p>
          </div>
          
          <div className="flex space-x-2 bg-gray-200 p-1 rounded">
            <button 
              onClick={() => setActiveTab('ChamDiem')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded ${activeTab === 'ChamDiem' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Bảng Chấm Điểm
            </button>
            <button 
              onClick={() => setActiveTab('Phieu')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded ${activeTab === 'Phieu' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Phiếu Đánh Giá
            </button>
          </div>
        </div>

        {canEditOthers && (
          <select 
            className="border border-gray-300 p-1.5 text-xs rounded bg-white font-medium min-w-[200px]"
            value={selectedUserId}
            onChange={e => setSelectedUserId(e.target.value)}
          >
            {selectableUsers.map(u => (
              <option key={u.id} value={u.id}>{u.name} (Nhóm {u.group})</option>
            ))}
          </select>
        )}
      </div>

      {activeTab === 'ChamDiem' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h4 className="text-xs font-bold text-blue-800 mb-3 border-b pb-2 uppercase">Tiêu chí tự chấm (Nhập liệu)</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-600">Chính trị tư tưởng (Max 5)</label>
                  <input type="number" max="5" min="0" step="0.25" className="border rounded w-16 p-1 text-center text-xs" value={scores.political} onChange={e => setScores({...scores, political: Number(e.target.value)})} />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-600">Đạo đức, lối sống (Max 5)</label>
                  <input type="number" max="5" min="0" step="0.25" className="border rounded w-16 p-1 text-center text-xs" value={scores.ethics} onChange={e => setScores({...scores, ethics: Number(e.target.value)})} />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-600">Tác phong, lề lối (Max 5)</label>
                  <input type="number" max="5" min="0" step="0.25" className="border rounded w-16 p-1 text-center text-xs" value={scores.manner} onChange={e => setScores({...scores, manner: Number(e.target.value)})} />
                </div>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-600">Ý thức kỷ luật (Max 5)</label>
                  <input type="number" max="5" min="0" step="0.25" className="border rounded w-16 p-1 text-center text-xs" value={scores.discipline} onChange={e => setScores({...scores, discipline: Number(e.target.value)})} />
                </div>
                
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-600">Cải cách HC & Ứng dụng CNTT (Gốc, Max 10)</label>
                  <input type="number" max="10" min="0" step="1" className="border rounded w-16 p-1 text-center text-xs" value={scores.adminIT} onChange={e => setScores({...scores, adminIT: Number(e.target.value)})} />
                </div>
                
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-gray-600">Kết quả nhiệm vụ (Gốc, Max 70)</label>
                  <input type="number" max="70" min="0" step="1" className="border rounded w-16 p-1 text-center text-xs" value={scores.taskPerformance} onChange={e => setScores({...scores, taskPerformance: Number(e.target.value)})} />
                </div>
              </div>
              
              <button onClick={handleSave} className="mt-4 w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 text-xs font-bold uppercase transition-colors">
                Lưu Điểm Tự Chấm
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#1a202c] p-4 rounded-lg shadow-sm text-white">
              <h4 className="text-xs font-bold text-gray-200 mb-3 border-b border-gray-700 pb-2 uppercase">Hệ Thống Tự Động Tính (Calculated Engine)</h4>
              
              <div className="space-y-1.5 text-xs text-gray-300">
                <div className="flex justify-between"><span className="text-gray-400">Chính trị:</span> <span className="font-medium text-white">{calculated.political.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Đạo đức:</span> <span className="font-medium text-white">{calculated.ethics.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Tác phong:</span> <span className="font-medium text-white">{calculated.manner.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Kỷ luật:</span> <span className="font-medium text-white">{calculated.discipline.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Cải cách HC & CNTT (Đã cộng giải):</span> <span className="font-medium text-white">{calculated.adminIT.toFixed(2)} / 10</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Kết quả nhiệm vụ (Đã cộng CN):</span> <span className="font-medium text-white">{calculated.taskPerformance.toFixed(2)} / 70</span></div>
                
                <div className="border-t border-gray-700 my-3 pt-3 flex justify-between font-bold text-sm text-white">
                  <span className="uppercase text-[10px] text-gray-400">Tổng Điểm (Sau trừ vắng):</span>
                  <span className={calculated.totalScore < 50 ? 'text-red-400' : 'text-emerald-400'}>{calculated.totalScore.toFixed(2)}</span>
                </div>

                {calculated.isHardLocked && (
                  <div className="bg-red-900/50 text-red-300 p-2 rounded mt-2 text-[10px] border border-red-800">
                    <span className="font-bold uppercase">Khóa Cứng:</span> Vi phạm ngày nghỉ hoặc kỷ luật. Bị hạ bậc thi đua.
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-gray-700 text-center">
                  <span className="block text-gray-500 text-[10px] uppercase mb-1">Xếp loại dự kiến</span>
                  <span className={`text-xl font-extrabold uppercase tracking-widest ${
                    calculated.ranking === 'Xuất sắc' ? 'text-yellow-400' :
                    calculated.ranking === 'Tốt' ? 'text-blue-400' :
                    calculated.ranking === 'Hoàn thành' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {calculated.ranking}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center no-print">
            <h4 className="text-xs font-bold text-gray-700 uppercase">Soạn thảo Phiếu Xếp Loại</h4>
            <div className="flex space-x-2">
              <button onClick={handleSave} className="flex items-center space-x-1 bg-emerald-600 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase hover:bg-emerald-700 transition-colors">
                Lưu nội dung
              </button>
              <button onClick={exportToWord} className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase hover:bg-blue-700 transition-colors">
                <FileText className="w-3.5 h-3.5" />
                <span>Xuất Word</span>
              </button>
              <button onClick={handlePrint} className="flex items-center space-x-1 bg-gray-600 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase hover:bg-gray-700 transition-colors">
                <Printer className="w-3.5 h-3.5" />
                <span>In / Xuất PDF</span>
              </button>
            </div>
          </div>
          
          <div className="p-8 overflow-auto print:p-0 print:overflow-visible">
            {/* The Document Area */}
            <div 
              ref={printRef}
              className="max-w-[800px] mx-auto bg-white print:max-w-none"
              style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '14pt', lineHeight: 1.5, color: 'black' }}
            >
              <table style={{ width: '100%', marginBottom: '24px' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '40%', textAlign: 'center', verticalAlign: 'top', textTransform: 'uppercase' }}>
                      <div style={{ fontWeight: 'bold' }}>{data.settings.superiorOrganization || 'UBND XÃ ĐÔNG PHƯỚC'}</div>
                      <div style={{ fontWeight: 'bold' }}>{data.settings.schoolName || 'THCS CÁI TẮC'}</div>
                      <div style={{ borderTop: '1px solid black', width: '100px', margin: '4px auto 0' }}></div>
                    </td>
                    <td style={{ width: '60%', textAlign: 'center', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 'bold' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div style={{ fontWeight: 'bold' }}>Độc lập - Tự do - Hạnh phúc</div>
                      <div style={{ borderTop: '1px solid black', width: '150px', margin: '4px auto 0' }}></div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, padding: 0, fontWeight: 'bold', fontSize: '14pt' }}>PHIẾU ĐÁNH GIÁ, XẾP LOẠI CHẤT LƯỢNG VIÊN CHỨC</h3>
                <p style={{ margin: 0, fontStyle: 'italic' }}>Năm học {data.settings.schoolYear || '2026 - 2027'}</p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ margin: '0 0 8px 0' }}>Họ và tên: <span style={{ fontWeight: 'bold' }}>{targetUser.name}</span></p>
                <p style={{ margin: '0 0 8px 0' }}>Chức danh nghề nghiệp: Giáo viên</p>
                <p style={{ margin: '0 0 8px 0' }}>Đơn vị công tác: {data.settings.schoolName || 'THCS Cái Tắc'}</p>
              </div>

              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>I. KẾT QUẢ TỰ ĐÁNH GIÁ</div>
              
              <div style={{ paddingLeft: '16px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>1. Chính trị tư tưởng:</div>
                <AutoResizeTextarea 
                  minHeight="60px"
                  value={formData.chinhTri}
                  onChange={(e: any) => setFormData({...formData, chinhTri: e.target.value})}
                  placeholder="Nhập nội dung đánh giá chính trị tư tưởng..."
                />

                <div style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '8px' }}>2. Đạo đức, lối sống:</div>
                <AutoResizeTextarea 
                  minHeight="60px"
                  value={formData.daoDuc}
                  onChange={(e: any) => setFormData({...formData, daoDuc: e.target.value})}
                  placeholder="Nhập nội dung đánh giá đạo đức, lối sống..."
                />

                <div style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '8px' }}>3. Tác phong, lề lối làm việc:</div>
                <AutoResizeTextarea 
                  minHeight="60px"
                  value={formData.tacPhong}
                  onChange={(e: any) => setFormData({...formData, tacPhong: e.target.value})}
                  placeholder="Nhập nội dung đánh giá tác phong, lề lối làm việc..."
                />

                <div style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '8px' }}>4. Ý thức tổ chức kỷ luật:</div>
                <AutoResizeTextarea 
                  minHeight="60px"
                  value={formData.kyLuat}
                  onChange={(e: any) => setFormData({...formData, kyLuat: e.target.value})}
                  placeholder="Nhập nội dung đánh giá ý thức tổ chức kỷ luật..."
                />

                <div style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '8px' }}>5. Kết quả thực hiện chức trách, nhiệm vụ được giao:</div>
                <AutoResizeTextarea 
                  minHeight="80px"
                  value={formData.ketQua}
                  onChange={(e: any) => setFormData({...formData, ketQua: e.target.value})}
                  placeholder="Nhập nội dung đánh giá kết quả thực hiện chức trách, nhiệm vụ được giao..."
                />

                <div style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '8px' }}>6. Thái độ phục vụ nhân dân, doanh nghiệp (đối với những vị trí tiếp xúc trực tiếp hoặc trực tiếp giải quyết công việc của người dân và doanh nghiệp):</div>
                <AutoResizeTextarea 
                  minHeight="60px"
                  value={formData.thaiDo}
                  onChange={(e: any) => setFormData({...formData, thaiDo: e.target.value})}
                  placeholder="Nhập nội dung đánh giá thái độ phục vụ..."
                />
              </div>

              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>II. TỰ ĐÁNH GIÁ, XẾP LOẠI CHẤT LƯỢNG</div>
              <div style={{ paddingLeft: '16px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>1. Nhận xét ưu, khuyết điểm:</div>
                <AutoResizeTextarea 
                  minHeight="80px"
                  value={formData.nhanXet}
                  onChange={(e: any) => setFormData({...formData, nhanXet: e.target.value})}
                  placeholder="Nhập nhận xét ưu, khuyết điểm..."
                />

                <div style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '8px' }}>2. Tự xếp loại chất lượng:</div>
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ margin: 0, paddingLeft: '16px' }}>
                    {calculated.ranking === 'Xuất sắc' ? '☒' : '☐'} Hoàn thành xuất sắc nhiệm vụ
                  </p>
                  <p style={{ margin: 0, paddingLeft: '16px' }}>
                    {calculated.ranking === 'Tốt' ? '☒' : '☐'} Hoàn thành tốt nhiệm vụ
                  </p>
                  <p style={{ margin: 0, paddingLeft: '16px' }}>
                    {calculated.ranking === 'Hoàn thành' ? '☒' : '☐'} Hoàn thành nhiệm vụ
                  </p>
                  <p style={{ margin: 0, paddingLeft: '16px' }}>
                    {calculated.ranking === 'Chưa hoàn thành' ? '☒' : '☐'} Không hoàn thành nhiệm vụ
                  </p>
                  <p className="text-[10px] text-gray-500 italic mt-2 no-print">(* Xếp loại được tự động đồng bộ từ Bảng Chấm Điểm)</p>
                </div>
              </div>

              <table style={{ width: '100%', marginTop: '32px' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '50%' }}></td>
                    <td style={{ width: '50%', textAlign: 'center' }}>
                      <div style={{ fontStyle: 'italic', marginBottom: '8px' }}>Ngày ..... tháng ..... năm ........</div>
                      <div style={{ fontWeight: 'bold', marginBottom: '80px' }}>NGƯỜI TỰ ĐÁNH GIÁ</div>
                      <div style={{ fontWeight: 'bold' }}>{targetUser.name}</div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ fontWeight: 'bold', marginBottom: '8px', marginTop: '32px' }}>III. Ý KIẾN CỦA TẬP THỂ ĐƠN VỊ VÀ LÃNH ĐẠO TRỰC TIẾP QUẢN LÝ</div>
              <div style={{ paddingLeft: '16px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>1. Ý kiến của tập thể đơn vị nơi viên chức công tác:</div>
                <p>.....................................................................................................................................</p>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '8px' }}>2. Nhận xét của lãnh đạo trực tiếp quản lý viên chức:</div>
                <p>.....................................................................................................................................</p>
              </div>

              <table style={{ width: '100%', marginTop: '32px' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '50%' }}></td>
                    <td style={{ width: '50%', textAlign: 'center' }}>
                      <div style={{ fontStyle: 'italic', marginBottom: '8px' }}>Ngày ..... tháng ..... năm ........</div>
                      <div style={{ fontWeight: 'bold', marginBottom: '80px' }}>LÃNH ĐẠO TRỰC TIẾP ĐÁNH GIÁ</div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ fontWeight: 'bold', marginBottom: '8px', marginTop: '32px' }}>IV. KẾT QUẢ ĐÁNH GIÁ, XẾP LOẠI CHẤT LƯỢNG CỦA CẤP CÓ THẨM QUYỀN</div>
              <div style={{ paddingLeft: '16px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>1. Nhận xét ưu, khuyết điểm:</div>
                <p>.....................................................................................................................................</p>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', marginTop: '8px' }}>2. Kết quả đánh giá, xếp loại chất lượng:</div>
                <p>.....................................................................................................................................</p>
              </div>

              <table style={{ width: '100%', marginTop: '32px' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '50%' }}></td>
                    <td style={{ width: '50%', textAlign: 'center' }}>
                      <div style={{ fontStyle: 'italic', marginBottom: '8px' }}>Ngày ..... tháng ..... năm ........</div>
                      <div style={{ fontWeight: 'bold', marginBottom: '80px' }}>NGƯỜI CÓ THẨM QUYỀN ĐÁNH GIÁ</div>
                    </td>
                  </tr>
                </tbody>
              </table>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
