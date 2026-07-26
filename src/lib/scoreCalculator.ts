import { User, TimesheetRequest, HomeroomData, CompetitionData } from '../types';

export function calculateScores(
  user: User,
  timesheets: TimesheetRequest[],
  homeroomData: HomeroomData | undefined,
  competitions: CompetitionData[],
  manualScores: any // scores input by user for some subjective criteria
) {
  let political = 5;
  let ethics = 5;
  let manner = 5;
  let discipline = 5;
  let adminIT = 0; // Starts from 0 or base?
  let taskPerformance = 0; 
  
  // Base task performance depends on some basic input. Let's assume manual input handles base, we apply deductions/bonuses.

  // Timesheet deductions
  let timesheetDeduction = 0;
  let hasAbsence = false;
  let hasLate = false;
  let totalAbsenceDays = 0;

  timesheets.forEach(ts => {
    if (ts.status === 'Approved') {
      const periods = ts.period.split(',').length;
      if (ts.code === 'P1') { timesheetDeduction -= 0.25 * periods; hasAbsence = true; totalAbsenceDays += 0.5; }
      if (ts.code === 'K') { timesheetDeduction -= 1.0 * periods; hasAbsence = true; totalAbsenceDays += 0.5; }
      if (ts.code === 'T') { timesheetDeduction -= 0.25 * periods; hasLate = true; }
      if (ts.code === 'B') { timesheetDeduction -= 1.0 * periods; hasLate = true; totalAbsenceDays += 0.5; }
    }
  });

  let attendanceBonus = 0;
  if (!hasAbsence && !hasLate) attendanceBonus = 3;

  // Homeroom logic
  let homeroomBonus = 0;
  if (user.group === 'A' && homeroomData) {
    if (homeroomData.bhytPercent === 100) homeroomBonus += 10;
    else homeroomBonus -= 5;

    if (homeroomData.currentSize === homeroomData.initialSize) homeroomBonus += 5;
    else {
      const dropouts = homeroomData.initialSize - homeroomData.currentSize;
      if (dropouts > 0) homeroomBonus -= dropouts * 1;
    }

    if (homeroomData.classRank >= 1 && homeroomData.classRank <= 4) homeroomBonus += 4;
    // Assuming a threshold for last rank, let's say rank >= 20 is last, we'll just expose a manual toggle or check
    if (homeroomData.classRank >= 20) homeroomBonus -= 4; // example

    homeroomData.rewardsAndDisciplines?.forEach(rd => {
      if (rd.type === 'Reward') {
        if (rd.rank === 1) homeroomBonus += 3;
        if (rd.rank === 2) homeroomBonus += 2;
        if (rd.rank === 3) homeroomBonus += 1;
      } else if (rd.type === 'Discipline') {
        homeroomBonus -= 1;
      }
    });
  }

  // Competition points (Cải cách hành chính)
  let compBonus = 0;
  competitions.forEach(c => {
    let pts = 0;
    if (c.prize === 'Nhat') pts = 3;
    if (c.prize === 'Nhi') pts = 2;
    if (c.prize === 'Ba') pts = 1;
    
    if (c.level === 'Xa') pts *= 2;
    if (c.level === 'Huyen') pts *= 4; // Not specified but inferring
    if (c.level === 'Tinh') pts *= 4; // Thanh pho
    if (c.level === 'QuocGia') pts *= 8;

    compBonus += pts;
  });

  // Calculate final base scores combining manual input and auto bonuses
  political = Math.max(0, Math.min(5, (manualScores?.political ?? 5) /* add political deductions here */));
  ethics = Math.max(0, Math.min(5, (manualScores?.ethics ?? 5)));
  manner = Math.max(0, Math.min(5, (manualScores?.manner ?? 5)));
  discipline = Math.max(0, Math.min(5, (manualScores?.discipline ?? 5)));
  adminIT = Math.max(0, Math.min(10, (manualScores?.adminIT ?? 5) + compBonus));
  taskPerformance = Math.max(0, Math.min(70, (manualScores?.taskPerformance ?? 50) + homeroomBonus));

  let totalScore = political + ethics + manner + discipline + adminIT + taskPerformance + timesheetDeduction + attendanceBonus;
  totalScore = Math.max(0, Math.min(100, totalScore)); // Clamp to 100

  // Hard Locks
  let isHardLocked = false;
  if (totalAbsenceDays >= 7 || user.hardLocks?.unauthorizedTutoring || user.hardLocks?.conflict || user.hardLocks?.discipline) {
    isHardLocked = true;
  }

  // Ranking
  let ranking: 'Xuất sắc' | 'Tốt' | 'Hoàn thành' | 'Chưa hoàn thành' = 'Chưa hoàn thành';
  
  if (totalScore >= 90) ranking = 'Xuất sắc';
  else if (totalScore >= 70) ranking = 'Tốt';
  else if (totalScore >= 50) ranking = 'Hoàn thành';
  
  // Apply constraints
  if (political === 0 || ethics === 0 || manner === 0 || discipline === 0 || adminIT === 0 || taskPerformance === 0) {
    if (ranking === 'Xuất sắc' || ranking === 'Tốt') ranking = 'Hoàn thành';
  }

  if (isHardLocked && (ranking === 'Xuất sắc' || ranking === 'Tốt')) {
    ranking = 'Hoàn thành';
  }

  return {
    political, ethics, manner, discipline, adminIT, taskPerformance,
    totalScore, ranking, isHardLocked
  };
}
