import React, { useEffect, useState, useRef } from 'react';
import { AppData, User } from './types';
import { fetchData, saveData } from './api';
import Dashboard from './components/Dashboard';
import TimesheetView from './components/TimesheetView';
import EvaluationView from './components/EvaluationView';
import EvidenceView from './components/EvidenceView';
import HomeroomView from './components/HomeroomView';
import StudentView from './components/StudentView';
import { PersonnelView } from './components/PersonnelView';
import { ReportView } from './components/ReportView';
import { TaskManagerView } from './components/TaskManagerView';
import { LoginView } from './components/LoginView';
import { logout } from './lib/firebase';
import { LayoutDashboard, Calendar, ClipboardCheck, FileText, Users, Settings, UserCog, BarChart4, ListTodo, LogOut } from 'lucide-react';
import { cn } from './lib/utils';
import { Toaster, toast } from 'sonner';

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<'Dashboard' | 'Timesheet' | 'Evaluation' | 'Evidence' | 'Homeroom' | 'Personnel' | 'Report' | 'TaskManager' | 'Students'>('Dashboard');
  const prevTasksRef = useRef<number>(0);

  useEffect(() => {
    fetchData().then(d => {
      setData(d);
    });
  }, []);

  useEffect(() => {
    if (data && currentUser && isAuthenticated) {
      const myAssignedTasks = (data.taskDeclarations || []).filter(t => t.userId === currentUser.id && t.status === 'Assigned');
      
      // If the number of assigned tasks increases, or on first load if there are assigned tasks
      if (myAssignedTasks.length > prevTasksRef.current) {
        const newTasksCount = myAssignedTasks.length - prevTasksRef.current;
        toast.info(`Bạn có ${newTasksCount} công việc mới được giao!`, {
          description: 'Vui lòng kiểm tra phân hệ Minh chứng & Thi đua.',
          duration: 5000,
        });
      }
      
      prevTasksRef.current = myAssignedTasks.length;
      
      // Check for approaching deadlines (e.g. today or tomorrow)
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      
      myAssignedTasks.forEach(t => {
        if (t.deadline === today) {
          toast.warning(`Công việc "${t.taskName}" cần hoàn thành trong hôm nay!`, {
            duration: 6000,
          });
        } else if (t.deadline === tomorrow) {
          toast.warning(`Công việc "${t.taskName}" cần hoàn thành vào ngày mai!`, {
            duration: 6000,
          });
        }
      });
    }
  }, [data?.taskDeclarations, currentUser, isAuthenticated]);

  if (!data) return <div className="flex h-screen items-center justify-center bg-gray-50">Đang tải dữ liệu...</div>;

  if (!isAuthenticated || !currentUser) {
    return <LoginView onLoginSuccess={async (firebaseUser) => {
      const existingUser = data.users.find(u => u.email === firebaseUser.email);
      let userToSet: User;

      if (!existingUser) {
        userToSet = {
          id: `user-${Date.now()}`,
          name: firebaseUser.displayName || 'Giáo viên mới',
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          group: 'A',
          role: firebaseUser.email === 'legiang299115@gmail.com' ? 'Admin' : 'Teacher',
          isHomeroom: false,
          hardLocks: {
            absences: 0,
            unauthorizedTutoring: false,
            conflict: false,
            discipline: null,
          }
        };
        const newData = { ...data, users: [...data.users, userToSet] };
        setData(newData);
        await saveData(newData);
      } else {
        const role = firebaseUser.email === 'legiang299115@gmail.com' ? 'Admin' : existingUser.role;
        const hardLocks = existingUser.hardLocks || {
          absences: 0,
          unauthorizedTutoring: false,
          conflict: false,
          discipline: null,
        };
        userToSet = { ...existingUser, email: firebaseUser.email, photoURL: firebaseUser.photoURL, name: firebaseUser.displayName || existingUser.name, role, hardLocks };
        const newData = { ...data, users: data.users.map(u => u.id === userToSet.id ? userToSet : u) };
        setData(newData);
        await saveData(newData);
      }

      setCurrentUser(userToSet);
      setIsAuthenticated(true);
    }} />;
  }

  const handleSave = async (newData: AppData) => {
    setData(newData);
    await saveData(newData);
  };

  const navItems = [
    { id: 'Dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'Evaluation', label: 'Chấm điểm', icon: ClipboardCheck },
    { id: 'Timesheet', label: 'Giờ công', icon: Calendar },
    { id: 'Evidence', label: 'Minh chứng & Thi đua', icon: FileText },
  ];

  if (currentUser.isHomeroom || currentUser.role === 'Admin') {
    navItems.push({ id: 'Homeroom', label: 'Chủ nhiệm', icon: Users });
  }

  if (currentUser.role === 'Admin') {
    navItems.push({ id: 'TaskManager', label: 'Quản lý Công việc', icon: ListTodo });
    navItems.push({ id: 'Personnel', label: 'Nhân sự', icon: UserCog });
    navItems.push({ id: 'Students', label: 'Học sinh', icon: Users });
    navItems.push({ id: 'Report', label: 'Thống kê & Báo cáo', icon: BarChart4 });
  }

  if (currentUser.role === 'Head') {
    navItems.push({ id: 'TaskManager', label: 'Quản lý Công việc', icon: ListTodo });
    navItems.push({ id: 'Students', label: 'Học sinh', icon: Users });
  }

  return (
    <div className="flex flex-col h-screen bg-[#f0f2f5] font-sans text-gray-900 overflow-hidden print:overflow-visible print:bg-white print:h-auto">
      <Toaster position="top-right" richColors />
      {/* Top Navigation Header */}
      <header className="bg-[#003366] text-white px-6 h-14 flex items-center justify-between shrink-0 shadow-md z-10 print:hidden">
        <div className="flex items-center space-x-4">
          <div className="bg-white p-1 rounded-full shrink-0">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 bg-blue-800 rounded-full flex items-center justify-center font-bold text-white text-xs text-center">THCS</div>
            )}
          </div>
          <div>
            <h1 className="text-sm font-bold leading-tight">{data.settings.schoolName || 'THCS THỊ TRẤN CÁI TẮC'}</h1>
            <p className="text-[10px] opacity-80 uppercase tracking-wider">Đánh giá Viên chức • Năm học {data.settings.schoolYear || '2026-2027'}</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-blue-900 px-3 py-1.5 rounded-md border border-blue-700 hidden md:flex">
            <span className="text-[10px] uppercase font-semibold text-blue-200 italic">Chế độ mô phỏng:</span>
            <select 
              className="bg-transparent text-xs font-bold outline-none cursor-pointer text-white max-w-[150px]"
              value={currentUser.id}
              onChange={(e) => {
                const u = data.users.find(x => x.id === e.target.value);
                if (u) setCurrentUser({...u, email: currentUser.email, photoURL: currentUser.photoURL});
                setCurrentView('Dashboard');
              }}
            >
              {data.users.map(u => (
                <option key={u.id} value={u.id} className="text-gray-900">{u.name} - Nhóm {u.group} ({u.role})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium">{currentUser.name}</p>
              <p className="text-[10px] text-blue-300">{currentUser.email || 'Hệ thống Full-stack'}</p>
            </div>
            <button 
              onClick={async () => {
                await logout();
                setIsAuthenticated(false);
                setCurrentUser(null);
              }}
              className="p-1.5 hover:bg-blue-800 rounded-md transition-colors group"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4 text-blue-200 group-hover:text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4 print:overflow-visible print:block print:p-0">
        {/* Sidebar Navigation */}
        <aside className="w-56 flex flex-col space-y-1 overflow-y-auto shrink-0 print:hidden">
          <div className="text-[10px] font-bold text-gray-500 uppercase px-3 py-2">Quản trị hệ thống</div>
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as any)}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 text-xs font-medium transition-colors",
                  isActive 
                    ? "bg-blue-50 text-blue-700 border-r-4 border-blue-700 font-semibold rounded-l-md" 
                    : "text-gray-600 hover:bg-gray-100 rounded-md"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </aside>

        {/* Data Section */}
        <section className="flex-1 flex flex-col overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200 print:border-none print:shadow-none print:rounded-none print:overflow-visible">
           <header className="p-3 border-b bg-gray-50 flex items-center justify-between shrink-0 print:hidden">
             <h2 className="text-xs font-bold text-gray-700 uppercase">
               {navItems.find(i => i.id === currentView)?.label}
             </h2>
           </header>
           <div className="flex-1 overflow-y-auto p-4 print:overflow-visible print:p-0">
             {currentView === 'Dashboard' && <Dashboard data={data} currentUser={currentUser} onSave={handleSave} />}
             {currentView === 'Evaluation' && <EvaluationView data={data} currentUser={currentUser} onSave={handleSave} />}
             {currentView === 'Timesheet' && <TimesheetView data={data} currentUser={currentUser} onSave={handleSave} />}
             {currentView === 'Evidence' && <EvidenceView data={data} currentUser={currentUser} onSave={handleSave} />}
             {currentView === 'Homeroom' && (currentUser.isHomeroom || currentUser.role === 'Admin') && <HomeroomView data={data} currentUser={currentUser} onSave={handleSave} />}
             {currentView === 'Personnel' && currentUser.role === 'Admin' && <PersonnelView data={data} currentUser={currentUser} onSave={handleSave} />}
             {currentView === 'Students' && (currentUser.role === 'Admin' || currentUser.role === 'Head') && <StudentView data={data} currentUser={currentUser} onSave={handleSave} />}
             {currentView === 'Report' && currentUser.role === 'Admin' && <ReportView data={data} currentUser={currentUser} />}
             {currentView === 'TaskManager' && (currentUser.role === 'Admin' || currentUser.role === 'Head') && <TaskManagerView data={data} currentUser={currentUser} onSave={handleSave} />}
           </div>
        </section>
      </main>
      
      {/* Footer Bar */}
      <footer className="h-8 bg-gray-200 border-t border-gray-300 px-4 flex items-center justify-between text-[10px] text-gray-500 italic shrink-0 print:hidden">
        <div className="flex space-x-4">
          <span>Kiến trúc: React + Express + Node.js</span>
          <span>Cơ sở dữ liệu: File-based Server (Bền vững)</span>
          <span className="text-blue-700 font-bold not-italic underline cursor-pointer">Quy trình Nghị định 233/2026/NĐ-CP</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span className="font-bold text-gray-600 not-italic">Hệ thống Sẵn sàng • {data.settings.schoolName || 'THCS Cái Tắc'}</span>
        </div>
      </footer>
    </div>
  );
}
