// src/services/recurrenceService.js
// 반복 일정(eventSeries) CRUD — 개별 인스턴스는 그대로 events/personal_events 컬렉션에
// 독립 문서로 저장됨(캘린더 렌더링/검색/D-day/알림 등 기존 인프라를 그대로 재사용하기 위함).
// eventSeries 문서는 규칙 원본 기록 + "반복 일정 등록됨" 알림 트리거 앵커 역할만 함
// (실제 재생성 로직은 항상 호출 시점에 전달된 rule을 신뢰 — 문서 재조회 없이 동기적으로 동작).
import {
  collection, doc, getDoc, getDocs, query, where, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { generateOccurrenceDates } from '../utils/recurrenceRules';
import { getLocalDateStr } from '../utils/dataUtils';
import { saveEditLog } from './eventService';

const instanceCollectionName = (isPersonal) => (isPersonal ? 'personal_events' : 'events');

// rule 객체에서 CRUD 전반에 쓰이는 형태로 정규화 (undefined 필드가 Firestore에 안 들어가게)
const normalizeRule = (rule) => ({
  freq: rule.freq,
  interval: Math.max(1, Number(rule.interval) || 1),
  byWeekday: rule.freq === 'weekly' && rule.byWeekday?.length ? [...rule.byWeekday].sort((a, b) => a - b) : null,
  endType: rule.endType,
  until: rule.endType === 'date' ? (rule.until || null) : null,
  count: rule.endType === 'count' ? (Number(rule.count) || null) : null,
});

// template: { title, description, eventType, startDate('YYYY-MM-DD'), durationDays(정수, 0=당일) }
// isFirst: 이 인스턴스가 시리즈 전체에서 가장 이른(진짜 시작일) 문서인지 — EventModal이 "전체 수정"
// 범위를 이 인스턴스를 열었을 때만 보여줄지 판단하는 용도. 과거 인스턴스는 재생성 대상이 아니라서
// 한 번 찍히면 그 문서가 남아있는 한 안 바뀜(아래 updateRecurringEvent의 재계산 로직 참고).
const buildInstanceData = ({ template, dateStr, isPersonal, coupleId, seriesId, rule, isFirst = false }) => {
  const start = `${dateStr}T00:00:00`;
  const durationDays = template.durationDays || 0;
  let end;
  if (durationDays > 0) {
    const endDateObj = new Date(`${dateStr}T00:00:00`);
    endDateObj.setDate(endDateObj.getDate() + durationDays);
    end = `${getLocalDateStr(endDateObj)}T00:00:00`;
  } else {
    end = `${dateStr}T23:59:59`;
  }

  const base = {
    title: template.title,
    description: template.description || '',
    start,
    end,
    isDday: false, // 반복 일정은 디데이와 상호 배타 (EventModal에서도 UI로 강제)
    recurrence: { seriesId, isException: false, isFirst, ...rule },
  };

  if (isPersonal) {
    return { ...base, coupleId: coupleId || null };
  }
  return { ...base, eventType: template.eventType, coupleId };
};

/**
 * 새 반복 일정 생성 — eventSeries 문서 + 인스턴스 문서들을 한 번의 배치로 커밋.
 * generateOccurrenceDates가 50개 초과 시 RecurrenceLimitError를 던지므로 그대로 전파됨(저장 안 됨).
 */
export async function createRecurringEvent({ rule, template, userId, coupleId, isPersonal }) {
  const normalizedRule = normalizeRule(rule);
  const dates = generateOccurrenceDates(normalizedRule, template.startDate);
  if (dates.length === 0) {
    throw new Error('생성할 반복 일정이 없습니다. 종료 조건을 확인해주세요.');
  }

  const seriesRef = doc(collection(db, 'eventSeries'));
  const seriesId = seriesRef.id;

  const batch = writeBatch(db);
  batch.set(seriesRef, {
    isPersonal: !!isPersonal,
    coupleId: coupleId || null,
    userId: isPersonal ? userId : null,
    title: template.title,
    description: template.description || '',
    eventType: isPersonal ? null : template.eventType,
    durationDays: template.durationDays || 0,
    ...normalizedRule,
    occurrenceCount: dates.length,
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const collName = instanceCollectionName(isPersonal);
  dates.forEach((dateStr, idx) => {
    const instRef = doc(collection(db, collName));
    const data = buildInstanceData({ template, dateStr, isPersonal, coupleId, seriesId, rule: normalizedRule, isFirst: idx === 0 });
    batch.set(instRef, {
      ...data,
      ...(isPersonal ? { userId } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
    });
  });

  await batch.commit();
  if (!isPersonal) {
    // 인스턴스마다 개별 로그를 남기면 수정기록이 스팸이 되므로 시리즈 단위 요약 1건만 기록
    await saveEditLog(seriesId, { title: template.title, occurrenceCount: dates.length, ...normalizedRule }, 'recurrence_created', userId, coupleId);
  }
  return { seriesId, instanceCount: dates.length };
}

// 시리즈에 속한(예외 아닌) 인스턴스 중 dateStr 이후(cutDateStr 이상, cutDateStr=null이면 전체)인 것들 조회.
// ⚠ coupleId/userId where절을 반드시 같이 걸어야 함 — Firestore 보안 규칙(events/personal_events의
// allow read)이 resource.data.coupleId(또는 userId)를 참조하는데, list 쿼리는 결과에 포함될 모든
// 문서가 규칙을 통과한다는 걸 쿼리의 where절만으로 사전에 증명할 수 있어야 허용됨. seriesId만 걸면
// Firestore가 그걸 증명 못 해서 "Missing or insufficient permissions"로 통째로 거부함(실제로 재현된
// 버그) — 단건 get/delete("이 일정만")는 이 list 제약이 없어서 멀쩡했던 것과 대비됨.
async function fetchSeriesInstances(collName, seriesId, cutDateStr, isPersonal, coupleId, userId) {
  const ownerClause = isPersonal ? where('userId', '==', userId) : where('coupleId', '==', coupleId);
  const q = query(collection(db, collName), where('recurrence.seriesId', '==', seriesId), ownerClause);
  const snap = await getDocs(q);
  return snap.docs.filter((d) => {
    const data = d.data();
    if (data.recurrence?.isException) return false;
    if (!cutDateStr) return true;
    const dateOnly = (data.start || '').split('T')[0];
    return dateOnly >= cutDateStr;
  });
}

/**
 * 반복 일정 수정.
 * scope: 'this' — 이 인스턴스만 수정하고 시리즈에서 분리(예외 처리)
 *        'future' — 이 인스턴스 날짜부터 이후 것들을 지우고 새 규칙으로 재생성 (그 이전은 그대로)
 *        'all' — 이 인스턴스보다 이전 인스턴스는 내용(제목/설명/유형)만 갱신, 이 인스턴스부터는
 *                지우고 새 규칙으로 재생성 + 시리즈 문서 갱신. (재생성 기준점을 "오늘"이 아니라
 *                "클릭한 인스턴스 날짜"로 삼는 이유는 아래 코드 주석 참고 — 위상 어긋남 방지)
 */
export async function updateRecurringEvent({
  eventId, seriesId, scope, rule, template, isPersonal, userId, coupleId, instanceDateStr,
}) {
  const collName = instanceCollectionName(isPersonal);
  const seriesRef = doc(db, 'eventSeries', seriesId);

  if (scope === 'this') {
    const evRef = doc(db, collName, eventId);
    const snap = await getDoc(evRef);
    const oldData = snap.exists() ? snap.data() : {};
    const newFields = {
      title: template.title,
      description: template.description || '',
      start: template.start,
      end: template.end,
      ...(isPersonal ? {} : { eventType: template.eventType }),
    };
    const batch = writeBatch(db);
    batch.update(evRef, {
      ...newFields,
      isDday: false,
      recurrence: { ...(oldData.recurrence || { seriesId }), isException: true },
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });
    await batch.commit();
    if (!isPersonal) {
      const changes = {};
      Object.keys(newFields).forEach((k) => {
        if (oldData[k] !== newFields[k]) changes[k] = { from: oldData[k], to: newFields[k] };
      });
      await saveEditLog(eventId, changes, 'updated', userId, coupleId);
    }
    return { updatedCount: 1 };
  }

  const normalizedRule = normalizeRule(rule);

  if (scope === 'all') {
    // 재생성 기준점은 반드시 "클릭한 인스턴스 자신의 날짜"를 써야 함 — 그 날짜는 애초에 규칙대로
    // 생성됐던 지점이라 요일/일자 위상(phase)이 규칙과 항상 맞음. 만약 대신 "오늘" 같은 임의
    // 날짜를 기준점으로 삼으면 매월/매년 반복에서 "매월 1일"이 "매월 25일"처럼 위상이 밀려버리는
    // 버그가 생김(주별 반복만 우연히 무관함) — 그래서 'future' 범위와 동일한 기준점을 재사용함.
    const cutDateStr = instanceDateStr;
    const allDocs = await fetchSeriesInstances(collName, seriesId, null, isPersonal, coupleId, userId);
    const pastDocs = allDocs.filter((d) => (d.data().start || '').split('T')[0] < cutDateStr);
    const futureDocs = allDocs.filter((d) => (d.data().start || '').split('T')[0] >= cutDateStr);

    const dates = generateOccurrenceDates(normalizedRule, cutDateStr); // 50개 초과 시 여기서 throw (아직 아무 것도 안 지움)
    if (dates.length === 0) {
      // 종료 조건(날짜/횟수)이 재생성 시작점보다 앞서면 향후 일정이 통째로 사라져버리므로 미리 차단
      throw new Error('반복 종료 조건을 확인해주세요. 앞으로 생성될 일정이 없습니다.');
    }

    const batch = writeBatch(db);
    pastDocs.forEach((d) => {
      batch.update(d.ref, {
        title: template.title,
        description: template.description || '',
        ...(isPersonal ? {} : { eventType: template.eventType }),
        updatedAt: serverTimestamp(),
        updatedBy: userId,
      });
    });
    futureDocs.forEach((d) => batch.delete(d.ref));
    // pastDocs가 비어있어야만(=클릭한 인스턴스가 진짜 시작일) 새로 만드는 첫 문서가 isFirst를 이어받음.
    // 지금 UI는 "전체" 범위 자체를 진짜 첫 인스턴스를 열었을 때만 노출하므로 pastDocs는 항상 비어있어야
    // 정상이지만, 방어적으로 실제 조회 결과를 기준으로 판단함(가정에만 의존하지 않음).
    const regeneratingFromTrueStart = pastDocs.length === 0;
    dates.forEach((dateStr, idx) => {
      const instRef = doc(collection(db, collName));
      const data = buildInstanceData({
        template, dateStr, isPersonal, coupleId, seriesId, rule: normalizedRule,
        isFirst: regeneratingFromTrueStart && idx === 0,
      });
      batch.set(instRef, {
        ...data,
        ...(isPersonal ? { userId } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        updatedBy: userId,
      });
    });
    batch.update(seriesRef, {
      title: template.title,
      description: template.description || '',
      eventType: isPersonal ? null : template.eventType,
      durationDays: template.durationDays || 0,
      ...normalizedRule,
      occurrenceCount: pastDocs.length + dates.length,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    if (!isPersonal) {
      await saveEditLog(seriesId, { scope: 'all', title: template.title, ...normalizedRule }, 'recurrence_updated', userId, coupleId);
    }
    return { updatedCount: pastDocs.length + dates.length, regeneratedCount: dates.length };
  }

  // scope === 'future'
  const cutDateStr = instanceDateStr;
  // 전체 인스턴스를 조회해서(50개 상한이라 부담 없음) cutDateStr 이전에 남아있는 게 있는지 확인 —
  // 없으면(=클릭한 인스턴스가 진짜 시작일) 새로 만드는 첫 문서가 isFirst를 이어받아야 함.
  const allDocsForFuture = await fetchSeriesInstances(collName, seriesId, null, isPersonal, coupleId, userId);
  const futureDocs = allDocsForFuture.filter((d) => (d.data().start || '').split('T')[0] >= cutDateStr);
  const hasEarlierDocs = allDocsForFuture.some((d) => (d.data().start || '').split('T')[0] < cutDateStr);
  const dates = generateOccurrenceDates(normalizedRule, cutDateStr); // 50개 초과 시 여기서 throw
  if (dates.length === 0) {
    throw new Error('반복 종료 조건을 확인해주세요. 앞으로 생성될 일정이 없습니다.');
  }

  const batch = writeBatch(db);
  futureDocs.forEach((d) => batch.delete(d.ref));
  dates.forEach((dateStr, idx) => {
    const instRef = doc(collection(db, collName));
    const data = buildInstanceData({
      template, dateStr, isPersonal, coupleId, seriesId, rule: normalizedRule,
      isFirst: !hasEarlierDocs && idx === 0,
    });
    batch.set(instRef, {
      ...data,
      ...(isPersonal ? { userId } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      updatedBy: userId,
    });
  });
  await batch.commit();
  if (!isPersonal) {
    await saveEditLog(seriesId, { scope: 'future', from: cutDateStr, title: template.title, ...normalizedRule }, 'recurrence_updated', userId, coupleId);
  }
  return { updatedCount: dates.length, deletedCount: futureDocs.length };
}

/**
 * 반복 일정 삭제.
 * scope: 'this' — 이 인스턴스만 삭제
 *        'future' — 이 인스턴스 날짜부터 이후(예외 아닌) 것들 전부 삭제, 과거는 유지
 *        'all' — 시리즈 문서 + 예외 아닌 인스턴스 전부 삭제 (분리된 예외 인스턴스는 그대로 유지)
 */
export async function deleteRecurringEvent({ eventId, seriesId, scope, isPersonal, instanceDateStr, userId, coupleId }) {
  const collName = instanceCollectionName(isPersonal);
  const seriesRef = doc(db, 'eventSeries', seriesId);

  if (scope === 'this') {
    const evRef = doc(db, collName, eventId);
    const snap = await getDoc(evRef);
    const oldData = snap.exists() ? snap.data() : {};
    const batch = writeBatch(db);
    batch.delete(evRef);
    await batch.commit();
    if (!isPersonal) {
      await saveEditLog(eventId, oldData, 'deleted', userId, coupleId);
    }
    return { deletedCount: 1 };
  }

  const cutDateStr = scope === 'all' ? null : instanceDateStr;
  const toDelete = await fetchSeriesInstances(collName, seriesId, cutDateStr, isPersonal, coupleId, userId);

  const batch = writeBatch(db);
  toDelete.forEach((d) => batch.delete(d.ref));
  if (scope === 'all') {
    batch.delete(seriesRef);
  } else {
    // eventSeries의 규칙 필드는 참고용 기록일 뿐 재생성 로직이 다시 읽어들이지 않으므로,
    // until을 삭제 기준일(cutDateStr) 자체로 두는 근사치로도 충분함(그 날짜 포함 이후가 실제로 삭제됨).
    batch.update(seriesRef, { until: cutDateStr, endType: 'date', count: null, updatedAt: serverTimestamp() });
  }
  await batch.commit();
  if (!isPersonal) {
    await saveEditLog(seriesId, { scope, from: cutDateStr, deletedCount: toDelete.length }, 'recurrence_deleted', userId, coupleId);
  }
  return { deletedCount: toDelete.length };
}
