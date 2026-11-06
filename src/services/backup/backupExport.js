// src/services/backup/backupExport.js
// 백업 파일(JSON) 생성 + 저장. 저장은 fileSave.saveTextFile — 웹은 브라우저 다운로드, 네이티브 앱은 공유 창
// (예전엔 웹 전용이었음: Capacitor 웹뷰가 Blob 다운로드를 못 해서. v1.0.20에서 파일 저장 플러그인 추가).
import { readBackupData } from './backupReader';
import { buildBackupFile } from './backupFormat';
import { getLocalDateStr } from '../../utils/dataUtils';
import { saveTextFile } from '../fileSave';

export const exportBackup = async ({ db, coupleId, uid, onProgress }) => {
  const data = await readBackupData({ db, coupleId, uid, includeSealedContent: true, onProgress });
  const file = buildBackupFile({ data, coupleId, uid });
  const result = await saveTextFile({
    fileName: `우리두리-백업-${getLocalDateStr()}.json`,
    content: JSON.stringify(file),
    mimeType: 'application/json',
  });
  return { file, ...result };
};
