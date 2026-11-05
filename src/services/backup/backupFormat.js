// src/services/backup/backupFormat.js
// 백업 파일(JSON) 형식 정의 — Firestore 값 ↔ JSON 변환과 파일 검증만 담당(Firebase 읽기/쓰기 없음).
// Firestore Timestamp는 JSON으로 그대로 직렬화하면 {seconds, nanoseconds} 일반 객체가 되어 복원 시
// 날짜가 아니라 맵으로 저장돼버리므로, {"__ts": [seconds, nanoseconds]} 태그로 감싸 구분한다.
import { Timestamp } from 'firebase/firestore';

export const BACKUP_FORMAT = 'twogether-backup';
export const BACKUP_VERSION = 1;

// 백업에 담기는 컬렉션 키 — 순서는 요약 화면 표시 순서와 무관(표시는 backupSummary.js가 결정)
export const BACKUP_COLLECTION_KEYS = [
  'events',
  'personal_events',
  'eventSeries',
  'trips',
  'tripSchedules',
  'travelTimes',
  'travelDecisions',
  'checklists',
  'bucketlists',
  'sealedMessages',
  'edit_logs',
];

const isPlainObject = (v) => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype;

export const encodeValue = (value) => {
  if (value instanceof Timestamp) return { __ts: [value.seconds, value.nanoseconds] };
  if (Array.isArray(value)) return value.map(encodeValue);
  if (isPlainObject(value)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = encodeValue(v);
    return out;
  }
  return value;
};

export const decodeValue = (value) => {
  if (Array.isArray(value)) return value.map(decodeValue);
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === '__ts' && Array.isArray(value.__ts)) {
      return new Timestamp(value.__ts[0], value.__ts[1]);
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = decodeValue(v);
    return out;
  }
  return value;
};

// 읽어 둔 데이터(backupReader의 결과)를 파일 객체로 — 각 문서 data는 인코딩해서 넣음
export const buildBackupFile = ({ data, coupleId, uid }) => {
  const collections = {};
  for (const key of BACKUP_COLLECTION_KEYS) {
    collections[key] = (data[key] || []).map((item) => ({
      ...item,
      data: encodeValue(item.data),
      ...(item.content !== undefined ? { content: encodeValue(item.content) } : {}),
    }));
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy: uid,
    coupleId,
    couple: encodeValue(data.couple || {}),
    collections,
  };
};

export class BackupFileError extends Error {}

// 파일 텍스트 → 검증 + 디코딩된 백업 객체. 사용자에게 보여줄 한글 메시지로 실패를 던짐.
export const parseBackupFile = (text) => {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new BackupFileError('백업 파일을 읽을 수 없어요. 우리두리에서 저장한 파일인지 확인해주세요.');
  }
  if (!raw || raw.format !== BACKUP_FORMAT || typeof raw.coupleId !== 'string' || !raw.collections) {
    throw new BackupFileError('우리두리 백업 파일이 아니에요.');
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    throw new BackupFileError('더 최신 버전 앱에서 만든 백업 파일이에요. 앱을 업데이트한 뒤 다시 시도해주세요.');
  }

  const collections = {};
  for (const key of BACKUP_COLLECTION_KEYS) {
    const list = raw.collections[key];
    if (list !== undefined && !Array.isArray(list)) {
      throw new BackupFileError('백업 파일이 손상됐어요.');
    }
    collections[key] = (list || [])
      .filter((item) => item && typeof item.id === 'string' && item.id && isPlainObject(item.data))
      .map((item) => ({
        ...item,
        data: decodeValue(item.data),
        ...(item.content !== undefined ? { content: decodeValue(item.content) } : {}),
      }));
  }

  return {
    exportedAt: raw.exportedAt || null,
    exportedBy: raw.exportedBy || null,
    coupleId: raw.coupleId,
    couple: decodeValue(raw.couple || {}),
    collections,
  };
};
