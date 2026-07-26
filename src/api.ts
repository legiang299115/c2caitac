import { AppData, User } from './types';

export const fetchData = async (): Promise<AppData> => {
  const res = await fetch('/api/data');
  return res.json();
};

export const saveData = async (data: AppData): Promise<void> => {
  await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  return data.url;
};
