import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db } from './src/lib/firebase-config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Initialize data if not exists
const initialData = {
  users: [
    { id: 'u1', name: 'Nguyễn Văn A', group: 'A', role: 'Teacher', isHomeroom: true, hardLocks: { absences: 0, unauthorizedTutoring: false, conflict: false, discipline: null } },
    { id: 'u2', name: 'Trần Thị B', group: 'B', role: 'Teacher', isHomeroom: false, hardLocks: { absences: 0, unauthorizedTutoring: false, conflict: false, discipline: null } },
    { id: 'u3', name: 'Lê Văn C', group: 'C', role: 'Staff', isHomeroom: false, hardLocks: { absences: 0, unauthorizedTutoring: false, conflict: false, discipline: null } },
    { id: 'u4', name: 'Phạm Thị D', group: 'D', role: 'Head', isHomeroom: false, hardLocks: { absences: 0, unauthorizedTutoring: false, conflict: false, discipline: null } },
  ],
  evaluations: {},
  timesheets: [],
  competitions: [],
  homeroomData: {},
  evidences: [],
  taskDeclarations: [],
  settings: {
    maxExcellentPercent: 20
  }
};

const DATA_FILE = path.join(process.cwd(), 'data.json');

const readData = async () => {
  try {
    const docSnap = await getDoc(doc(db, "app_data", "main"));
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
  
  // Fallback to data.json if Firestore is empty or fails
  if (fs.existsSync(DATA_FILE)) {
    try {
      const localData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      // Migrate it to firestore
      await writeData(localData);
      return localData;
    } catch (e) {
      console.error("Error reading data.json:", e);
    }
  }

  return initialData;
};

const writeData = async (data: any) => {
  try {
    await setDoc(doc(db, "app_data", "main"), data);
  } catch (error) {
    console.error("Error writing data:", error);
  }
};

app.get('/api/data', async (req, res) => {
  const data = await readData();
  res.json(data);
});

app.post('/api/data', async (req, res) => {
  await writeData(req.body);
  res.json({ success: true });
});

app.post('/api/attendance/swipe', async (req, res) => {
  const { uid, macAddress } = req.body;
  if (!uid) return res.status(400).json({ error: 'UID is required' });
  if (!macAddress) return res.status(400).json({ error: 'Device MAC address is required' });

  const data: any = await readData();
  if (!data.students) data.students = [];
  if (!data.devices) data.devices = [];
  if (!data.attendanceRecords) data.attendanceRecords = [];

  const student = data.students.find((s: any) => s.rfidUid === uid);
  if (!student) {
    return res.status(404).json({ error: 'Student not found with this RFID' });
  }

  const device = data.devices.find((d: any) => d.macAddress === macAddress);
  if (!device) {
    return res.status(403).json({ error: 'Unregistered device. Please declare MAC address in Admin panel.' });
  }

  if (device.className !== student.className) {
    return res.status(403).json({ error: `Mismatch! Student is in ${student.className} but device is for ${device.className}` });
  }

  const today = new Date().toISOString().split('T')[0];
  const existing = data.attendanceRecords.find((a: any) => a.studentId === student.id && a.timestamp.startsWith(today));
  
  if (existing) {
    return res.json({ success: true, message: 'Already recorded today', studentName: student.name });
  }

  const newRecord = {
    id: `att-${Date.now()}`,
    studentId: student.id,
    timestamp: new Date().toISOString(),
  };

  data.attendanceRecords.push(newRecord);
  await writeData(data);
  
  res.json({ success: true, studentName: student.name, record: newRecord });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.post('/api/zalo/notify', async (req, res) => {
  try {
    const { zaloId, phone, message } = req.body;
    const data: any = await readData();
    const token = data.settings?.zaloSettings?.accessToken || process.env.ZALO_ACCESS_TOKEN;
    
    if (!token) {
      return res.status(400).json({ error: 'Zalo Access Token is not configured' });
    }

    if (!zaloId && !phone) {
      return res.status(400).json({ error: 'Target user does not have a Zalo ID or Phone Number' });
    }

    const recipient = zaloId ? { user_id: zaloId } : { phone: phone };

    const response = await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': token
      },
      body: JSON.stringify({
        recipient,
        message: { text: message }
      })
    });

    const result = await response.json();
    if (result.error) {
       return res.status(400).json({ error: result.message || 'Zalo API error', details: result });
    }

    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.use('/uploads', express.static(UPLOADS_DIR));

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
