// src/services/record/recordExport.js
// "우리 기록" 파일 저장 — 연결 중인 커플(앱이 직접 읽음)과 해제 후 30일 안의 이전 커플(서버가 대신 읽음) 두 경로.
// 문서 생성은 recordHtml.js, 실제 저장(웹 다운로드/앱 공유 창)은 fileSave.js.
import { httpsCallable } from 'firebase/functions';
import { readBackupData } from '../backup/backupReader';
import { decodeValue } from '../backup/backupFormat';
import { buildRecordHtml, recordFileName } from './recordHtml';
import { saveTextFile } from '../fileSave';

const save = (html) => saveTextFile({ fileName: recordFileName(), content: html, mimeType: 'text/html' });

// 연결 중인 커플 — 해제·탈퇴 확인 화면, 데이터 백업 화면에서 사용
// members: 커플 문서 members 순서([boyfriend, girlfriend]), memberNames: { uid: 닉네임 }
export const exportCurrentRecord = async ({ db, coupleId, uid, members, memberNames, note, onProgress }) => {
  const data = await readBackupData({ db, coupleId, uid, includeSealedContent: true, onProgress });
  const html = buildRecordHtml({ members, memberNames, viewerUid: uid, couple: data.couple, data, note });
  return save(html);
};

// 해제된 이전 커플 — 규칙상 앱이 못 읽으므로 exportFormerCoupleRecord 콜러블이 공개 범위를 맞춰 대신 읽어줌.
// 응답의 Timestamp는 {"__ts":[s,ns]} 태그라 backupFormat.decodeValue로 되돌림
export const exportFormerRecord = async ({ functionsInstance, coupleId, uid, note }) => {
  const { data: res } = await httpsCallable(functionsInstance, 'exportFormerCoupleRecord')({ coupleId });
  const decodeItems = (list = []) => list.map((item) => ({
    ...item,
    data: decodeValue(item.data),
    ...(item.content !== undefined ? { content: item.content ? decodeValue(item.content) : null } : {}),
  }));
  const data = Object.fromEntries(Object.entries(res.collections).map(([k, v]) => [k, decodeItems(v)]));
  const html = buildRecordHtml({
    members: res.formerMembers,
    memberNames: res.memberNames,
    viewerUid: uid,
    couple: decodeValue(res.couple),
    data,
    note,
  });
  return save(html);
};
