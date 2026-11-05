// src/services/backup/backupExport.js
// 백업 파일 생성 + 브라우저 다운로드. 웹 전용 — Capacitor 네이티브 웹뷰는 <a download>/Blob 다운로드를
// 처리하지 못해서(파일 저장 플러그인 필요) 화면(DataBackupPage)에서 네이티브일 땐 아예 안 부름.
import { readBackupData } from './backupReader';
import { buildBackupFile } from './backupFormat';
import { getLocalDateStr } from '../../utils/dataUtils';

const downloadJson = (obj, fileName) => {
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 클릭 직후 바로 revoke하면 일부 브라우저(Safari)에서 다운로드가 시작되기 전에 URL이 사라짐
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

export const exportBackup = async ({ db, coupleId, uid, onProgress }) => {
  const data = await readBackupData({ db, coupleId, uid, includeSealedContent: true, onProgress });
  const file = buildBackupFile({ data, coupleId, uid });
  downloadJson(file, `우리두리-백업-${getLocalDateStr()}.json`);
  return file;
};
