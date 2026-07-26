import React, { useState } from 'react';
import { loginWithGoogle } from '../lib/firebase';
import { ShieldAlert, BookOpen, CheckCircle, Scale, GraduationCap } from 'lucide-react';

interface Props {
  onLoginSuccess: (user: any) => void;
}

export function LoginView({ onLoginSuccess }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = await loginWithGoogle();
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi đăng nhập.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4 font-sans text-gray-900 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-3xl -z-10"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-3xl -z-10"></div>

      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row z-10 border border-gray-100">
        
        {/* Left Side - Information */}
        <div className="md:w-3/5 bg-gradient-to-br from-blue-900 to-indigo-900 text-white p-10 flex flex-col justify-center relative overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-4 mb-8">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg p-2 shrink-0">
                <img src="/logo.png" alt="Logo Trường THCS Cái Tắc" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                <GraduationCap className="w-8 h-8 text-blue-900 hidden" />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-wider text-blue-200 uppercase mb-1">Trường THCS Cái Tắc</h2>
                <h1 className="text-2xl font-bold leading-tight shadow-sm">PHẦN MỀM ĐÁNH GIÁ VIÊN CHỨC</h1>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/10 p-5 rounded-xl border border-white/20 backdrop-blur-sm">
                <h3 className="text-lg font-bold mb-3 flex items-center">
                  <Scale className="w-5 h-5 mr-2 text-blue-300" />
                  Điểm nổi bật theo Nghị định 233/NĐ-CP
                </h3>
                <ul className="space-y-3 text-sm text-blue-50">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-400 shrink-0" />
                    <span>Đánh giá đa chiều, khách quan, minh bạch, có định lượng cụ thể.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-400 shrink-0" />
                    <span>Gắn kết quả đánh giá, xếp loại với công tác thi đua, khen thưởng và quy hoạch cán bộ.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-400 shrink-0" />
                    <span>Tăng cường vai trò giám sát, phản biện của tập thể và cá nhân có liên quan.</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-400 shrink-0" />
                    <span>Số hóa toàn bộ quy trình: Khai báo minh chứng, tự đánh giá, và phê duyệt.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login */}
        <div className="md:w-2/5 p-10 flex flex-col justify-center items-center bg-white relative">
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Đăng nhập</h2>
              <p className="text-sm text-gray-500">Sử dụng tài khoản nội bộ nhà trường</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm flex items-start border border-red-100 shadow-sm">
                <ShieldAlert className="w-5 h-5 mr-2 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-3 bg-white border-2 border-gray-200 text-gray-700 px-4 py-3.5 rounded-xl hover:bg-gray-50 hover:border-blue-300 transition-all focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-70 disabled:cursor-not-allowed font-semibold text-sm shadow-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Tiếp tục với Google</span>
                </>
              )}
            </button>
            
            <div className="text-center mt-6">
              <p className="text-xs text-gray-400 font-medium bg-gray-50 py-2 px-3 rounded-lg inline-block">Chỉ chấp nhận email @cantho.edu.vn</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-xs text-gray-500 font-medium">Bản quyền thuộc về Lê Trường Giang - Trường THCS Cái Tắc</p>
      </div>
    </div>
  );
}
