import React, { useState, useRef } from 'react';
import { AppData, Student, User, Device } from '../types';
import { Plus, Edit2, Trash2, Search, Cpu, Upload, Download } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Props {
  data: AppData;
  currentUser: User;
  onSave: (data: AppData) => void;
}

export default function StudentView({ data, currentUser, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<'students' | 'devices'>('students');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<Partial<Student>>({});
  const [isEditingDevice, setIsEditingDevice] = useState(false);
  const [deviceForm, setDeviceForm] = useState<Partial<Device>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const students = data.students || [];
  const devices = data.devices || [];

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.rfidUid && s.rfidUid.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.macAddress.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Họ và tên': 'Nguyễn Văn A',
        'Ngày sinh': '2005-05-15',
        'Lớp': '10A1',
        'Mã thẻ RFID': 'A1B2C3D4'
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    const wscols = [
      {wch: 25}, // Tên
      {wch: 15}, // Ngày sinh
      {wch: 10}, // Lớp
      {wch: 20}  // RFID
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Hoc_Sinh');
    XLSX.writeFile(wb, 'Mau_Nhap_Hoc_Sinh.xlsx');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const excelData = XLSX.utils.sheet_to_json(ws) as any[];

        const newStudents = [...students];
        let addedCount = 0;

        excelData.forEach(row => {
          if (row['Họ và tên'] && row['Lớp']) {
            newStudents.push({
              id: `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: row['Họ và tên'],
              dob: row['Ngày sinh'] || '',
              className: row['Lớp'],
              rfidUid: row['Mã thẻ RFID'] ? String(row['Mã thẻ RFID']) : ''
            });
            addedCount++;
          }
        });

        if (addedCount > 0) {
          onSave({ ...data, students: newStudents });
          toast.success(`Đã thêm thành công ${addedCount} học sinh`);
        } else {
          toast.error('Không tìm thấy dữ liệu hợp lệ trong file');
        }
      } catch (error) {
        toast.error('Có lỗi xảy ra khi đọc file Excel');
        console.error(error);
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleAddNew = () => {
    if (activeTab === 'students') {
      setForm({ id: `student-${Date.now()}`, name: '', dob: '', className: '', rfidUid: '' });
      setIsEditing(true);
    } else {
      setDeviceForm({ id: `device-${Date.now()}`, name: '', macAddress: '', className: '' });
      setIsEditingDevice(true);
    }
  };

  const handleEditDevice = (device: Device) => {
    setDeviceForm({ ...device });
    setIsEditingDevice(true);
  };

  const handleDeleteDevice = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) {
      const newDevices = devices.filter(d => d.id !== id);
      onSave({ ...data, devices: newDevices });
      toast.success('Đã xóa thiết bị');
    }
  };

  const handleSubmitDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceForm.name || !deviceForm.macAddress || !deviceForm.className) {
      toast.error('Vui lòng điền đầy đủ thông tin thiết bị');
      return;
    }

    const newDevices = [...devices];
    const existingIndex = newDevices.findIndex(d => d.id === deviceForm.id);
    
    if (existingIndex >= 0) {
      newDevices[existingIndex] = deviceForm as Device;
    } else {
      newDevices.push(deviceForm as Device);
    }

    onSave({ ...data, devices: newDevices });
    setIsEditingDevice(false);
    toast.success('Đã lưu thông tin thiết bị');
  };

  const handleEdit = (student: Student) => {
    setForm({ ...student });
    setIsEditing(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa học sinh này?')) {
      const newStudents = students.filter(s => s.id !== id);
      onSave({ ...data, students: newStudents });
      toast.success('Đã xóa học sinh');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.className) {
      toast.error('Vui lòng điền họ tên và lớp học');
      return;
    }

    const newStudents = [...students];
    const existingIndex = newStudents.findIndex(s => s.id === form.id);
    
    if (existingIndex >= 0) {
      newStudents[existingIndex] = form as Student;
    } else {
      newStudents.push(form as Student);
    }

    onSave({ ...data, students: newStudents });
    setIsEditing(false);
    toast.success('Đã lưu thông tin học sinh');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold uppercase text-gray-800">Quản lý Học sinh & Thiết bị</h2>
        <button onClick={handleAddNew} className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center hover:bg-blue-700 transition-colors">
          <Plus className="w-3.5 h-3.5 mr-1" /> {activeTab === 'students' ? 'Thêm học sinh' : 'Thêm thiết bị'}
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200 mb-4">
          <button
            className={cn("px-4 py-2 text-xs font-bold uppercase border-b-2 transition-colors", activeTab === 'students' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700")}
            onClick={() => setActiveTab('students')}
          >
            Danh sách học sinh
          </button>
          {currentUser.role === 'Admin' && (
            <button
              className={cn("px-4 py-2 text-xs font-bold uppercase border-b-2 transition-colors flex items-center", activeTab === 'devices' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700")}
              onClick={() => setActiveTab('devices')}
            >
              <Cpu className="w-3.5 h-3.5 mr-1" /> Thiết bị điểm danh
            </button>
          )}
        </div>

        <div className="flex space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-2.5 top-2 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'students' ? "Tìm kiếm theo tên, lớp hoặc mã thẻ RFID..." : "Tìm kiếm thiết bị, lớp, MAC..."}
              className="w-full border border-gray-300 pl-8 pr-3 py-1.5 text-xs rounded"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          {activeTab === 'students' && (
            <>
              <button 
                onClick={handleDownloadTemplate} 
                className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center hover:bg-gray-200 transition-colors border border-gray-300"
                title="Tải file Excel mẫu để nhập liệu"
              >
                <Download className="w-3.5 h-3.5 md:mr-1" /> <span className="hidden md:inline">Tải file mẫu</span>
              </button>
              <label className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center hover:bg-green-700 transition-colors cursor-pointer" title="Tải lên file Excel để thêm học sinh">
                <Upload className="w-3.5 h-3.5 md:mr-1" /> <span className="hidden md:inline">Import Excel</span>
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                  ref={fileInputRef}
                />
              </label>
            </>
          )}
        </div>

        {activeTab === 'students' && isEditing ? (
          <form onSubmit={handleSubmit} className="mb-6 p-4 border border-blue-200 bg-blue-50/50 rounded-lg">
            <h3 className="text-xs font-bold uppercase text-blue-800 mb-3">{form.id?.startsWith('student-') && form.name === '' ? 'Thêm mới' : 'Cập nhật'} Học sinh</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Họ và tên</label>
                <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.name || ''} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Ngày sinh (Tùy chọn)</label>
                <input type="date" className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.dob || ''} onChange={e => setForm({...form, dob: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Lớp học</label>
                <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.className || ''} onChange={e => setForm({...form, className: e.target.value})} placeholder="Vd: 10A1" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Mã thẻ RFID (Tùy chọn)</label>
                <input type="text" className="w-full border border-gray-300 p-1.5 text-xs rounded" value={form.rfidUid || ''} onChange={e => setForm({...form, rfidUid: e.target.value})} placeholder="Quẹt thẻ hoặc nhập mã" />
              </div>
            </div>
            <div className="flex space-x-2 justify-end mt-4">
              <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-gray-300 transition-colors">Hủy</button>
              <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors">Lưu</button>
            </div>
          </form>
        ) : null}

        {activeTab === 'devices' && isEditingDevice ? (
          <form onSubmit={handleSubmitDevice} className="mb-6 p-4 border border-blue-200 bg-blue-50/50 rounded-lg">
            <h3 className="text-xs font-bold uppercase text-blue-800 mb-3">{deviceForm.id?.startsWith('device-') && deviceForm.name === '' ? 'Thêm mới' : 'Cập nhật'} Thiết bị ESP32</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tên thiết bị</label>
                <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={deviceForm.name || ''} onChange={e => setDeviceForm({...deviceForm, name: e.target.value})} placeholder="Vd: Máy điểm danh 10A1" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Lớp được phép điểm danh</label>
                <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded" value={deviceForm.className || ''} onChange={e => setDeviceForm({...deviceForm, className: e.target.value})} placeholder="Vd: 10A1" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">MAC Address (Của mạch ESP32)</label>
                <input type="text" required className="w-full border border-gray-300 p-1.5 text-xs rounded font-mono" value={deviceForm.macAddress || ''} onChange={e => setDeviceForm({...deviceForm, macAddress: e.target.value})} placeholder="Vd: 24:6F:28:1A:4C:5D" />
                <p className="text-[10px] text-gray-500 mt-1 italic">Địa chỉ MAC giúp hệ thống định danh mạch ESP32. Chỉ mạch có MAC này mới điểm danh được cho lớp đã chọn.</p>
              </div>
            </div>
            <div className="flex space-x-2 justify-end mt-4">
              <button type="button" onClick={() => setIsEditingDevice(false)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-gray-300 transition-colors">Hủy</button>
              <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-blue-700 transition-colors">Lưu thiết bị</button>
            </div>
          </form>
        ) : null}

        {activeTab === 'students' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-2 text-left font-bold uppercase text-[10px] text-gray-500">STT</th>
                  <th className="p-2 text-left font-bold uppercase text-[10px] text-gray-500">Họ và tên</th>
                  <th className="p-2 text-left font-bold uppercase text-[10px] text-gray-500">Ngày sinh</th>
                  <th className="p-2 text-left font-bold uppercase text-[10px] text-gray-500">Lớp</th>
                  <th className="p-2 text-left font-bold uppercase text-[10px] text-gray-500">Mã thẻ RFID</th>
                  <th className="p-2 text-right font-bold uppercase text-[10px] text-gray-500">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? filteredStudents.map((s, idx) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-2 text-xs text-gray-500">{idx + 1}</td>
                    <td className="p-2 text-xs font-medium">{s.name}</td>
                    <td className="p-2 text-xs text-gray-600">{s.dob ? new Date(s.dob).toLocaleDateString('vi-VN') : '-'}</td>
                    <td className="p-2 text-xs font-medium text-blue-600">{s.className}</td>
                    <td className="p-2 text-xs text-gray-500 font-mono">{s.rfidUid || '-'}</td>
                    <td className="p-2 flex justify-end space-x-1">
                      <button onClick={() => handleEdit(s)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Sửa">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Xóa">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-xs text-gray-500">Chưa có dữ liệu học sinh</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-2 text-left font-bold uppercase text-[10px] text-gray-500">STT</th>
                  <th className="p-2 text-left font-bold uppercase text-[10px] text-gray-500">Tên thiết bị</th>
                  <th className="p-2 text-left font-bold uppercase text-[10px] text-gray-500">Lớp phân công</th>
                  <th className="p-2 text-left font-bold uppercase text-[10px] text-gray-500">MAC Address</th>
                  <th className="p-2 text-right font-bold uppercase text-[10px] text-gray-500">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.length > 0 ? filteredDevices.map((d, idx) => (
                  <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-2 text-xs text-gray-500">{idx + 1}</td>
                    <td className="p-2 text-xs font-medium">{d.name}</td>
                    <td className="p-2 text-xs font-medium text-blue-600">{d.className}</td>
                    <td className="p-2 text-xs text-gray-500 font-mono">{d.macAddress}</td>
                    <td className="p-2 flex justify-end space-x-1">
                      <button onClick={() => handleEditDevice(d)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Sửa">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteDevice(d.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Xóa">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-xs text-gray-500">Chưa có thiết bị nào được khai báo</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
