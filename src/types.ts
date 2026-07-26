export type Role = 'Teacher' | 'Staff' | 'Head' | 'Admin';
export type Group = 'A' | 'B' | 'C' | 'D';

export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  zaloId?: string;
  photoURL?: string;
  group: Group;
  role: Role;
  isHomeroom: boolean;
  homeroomName?: string;
  departmentId?: string;
  hardLocks: {
    absences: number; // calculated from timesheets
    unauthorizedTutoring: boolean;
    conflict: boolean;
    discipline: 'khien_trach' | 'canh_cao' | 'buoc_thoi_viec' | null;
  };
}

export interface CriteriaScore {
  political: number; // max 5
  ethics: number; // max 5
  manner: number; // max 5
  discipline: number; // max 5
  adminIT: number; // max 10
  taskPerformance: number; // max 70
}

export interface Evaluation {
  userId: string;
  scores: CriteriaScore;
  totalScore: number;
  ranking: 'Xuất sắc' | 'Tốt' | 'Hoàn thành' | 'Chưa hoàn thành';
  term: string;
  formData?: {
    chinhTri: string;
    daoDuc: string;
    tacPhong: string;
    kyLuat: string;
    ketQua: string;
    thaiDo: string;
    nhanXet: string;
  };
}

export type TimesheetCode = 'P0' | 'P1' | 'K' | 'T' | 'B';

export interface TimesheetRequest {
  id: string;
  userId: string;
  date: string;
  type: 'NghiPhep' | 'CongTac' | 'DayBu';
  session: 'Sáng' | 'Chiều';
  period: string; // "1,2", "3,4,5"
  class: string;
  code: TimesheetCode;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface HomeroomData {
  userId: string;
  term: string;
  bhytPercent: number;
  initialSize: number;
  currentSize: number;
  classRank: number;
  rewardsAndDisciplines: { type: 'Reward' | 'Discipline', rank?: 1 | 2 | 3, date: string, note: string }[];
}

export interface CompetitionData {
  id: string;
  userId: string;
  name: string;
  level: 'Truong' | 'Xa' | 'Huyen' | 'Tinh' | 'QuocGia';
  prize: 'Nhat' | 'Nhi' | 'Ba' | 'KhuyenKhich';
  evidenceUrl?: string;
}

export interface Evidence {
  id: string;
  userId: string;
  criteriaKey: keyof CriteriaScore;
  name: string;
  url: string;
}

export interface TaskDeclaration {
  id: string;
  userId: string;
  taskName: string;
  description: string;
  date: string;
  deadline?: string;
  evidenceUrl?: string;
  status: 'Assigned' | 'Pending' | 'Approved' | 'Rejected';
}

export interface Department {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  name: string;
  dob: string;
  className: string;
  rfidUid?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  timestamp: string; // ISO format
}

export interface Device {
  id: string;
  macAddress: string;
  className: string;
  name: string;
}

export interface AppData {
  users: User[];
  departments?: Department[];
  students?: Student[];
  devices?: Device[];
  attendanceRecords?: AttendanceRecord[];
  evaluations: Record<string, Evaluation>;
  timesheets: TimesheetRequest[];
  competitions: CompetitionData[];
  homeroomData: Record<string, HomeroomData>;
  evidences: Evidence[];
  taskDeclarations?: TaskDeclaration[];
  settings: {
    maxExcellentPercent: number;
    superiorOrganization?: string;
    schoolName?: string;
    schoolYear?: string;
    zaloSettings?: {
      accessToken?: string;
      oaId?: string;
    };
    attendanceSettings?: {
      rules: AttendanceRule[];
    };
  };
}

export interface AttendanceRule {
  id: string;
  name: string;
  session: 'Sáng' | 'Chiều';
  grades: string[];
  startTime: string;
  lateThresholdMins: number;
  absentThresholdMins: number;
}
