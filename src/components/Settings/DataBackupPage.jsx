// src/components/Settings/DataBackupPage.jsx
// 데이터 백업(/data-backup) — 커플 데이터 + 내 개인 일정을 JSON 파일로 내보내고, 같은 커플의 백업 파일에서
// 지금 없는 항목만 되살림. 실제 로직은 src/services/backup/ (형식/읽기/내보내기/복원 모듈 분리).
// 웹 전용: 네이티브 앱 웹뷰는 파일 다운로드를 못 해서(파일 저장 플러그인 미설치) 안내만 표시.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Capacitor } from '@capacitor/core';
import { HiArrowLeft } from 'react-icons/hi2';
import { db } from '../../firebase';
import { useAuthContext } from '../../contexts/AuthContext';
import { exportBackup } from '../../services/backup/backupExport';
import { parseBackupFile, BackupFileError } from '../../services/backup/backupFormat';
import {
  planRestore, executeRestore, RestoreError, SUMMARY_GROUPS,
} from '../../services/backup/backupRestore';
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import './DataBackupPage.css';

const WEB_URL = 'https://twogether-206fb.web.app/data-backup';

const toMessage = (error, fallback) => (
  error instanceof BackupFileError || error instanceof RestoreError
    ? error.message
    : getFriendlyErrorMessage(error, fallback)
);

const formatExportedAt = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const DataBackupPage = () => {
  const navigate = useNavigate();
  const { user, coupleId } = useAuthContext();
  const isNative = Capacitor.isNativePlatform();
  const fileInputRef = useRef(null);

  const [exportStep, setExportStep] = useState(null); // null이면 대기 중
  // phase: idle | analyzing | ready | restoring
  const [importPhase, setImportPhase] = useState('idle');
  const [importStep, setImportStep] = useState('');
  const [plan, setPlan] = useState(null);
  const [backupMeta, setBackupMeta] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // 복원 중에 탭을 닫으면 일부만 복원됨(다시 실행하면 이어서 채워지긴 함) — 브라우저 기본 경고로 한 번 막음
  useEffect(() => {
    if (importPhase !== 'restoring') return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [importPhase]);

  const handleExport = async () => {
    if (exportStep) return;
    setExportStep('준비 중');
    try {
      await exportBackup({ db, coupleId, uid: user.uid, onProgress: setExportStep });
      toast.success('백업 파일을 저장했어요');
    } catch (error) {
      console.error('백업 내보내기 실패:', error);
      toast.error(toMessage(error, '백업 파일을 만들지 못했어요. 잠시 후 다시 시도해주세요.'));
    } finally {
      setExportStep(null);
    }
  };

  const resetImport = () => {
    setImportPhase('idle');
    setPlan(null);
    setBackupMeta(null);
    setProgress({ done: 0, total: 0 });
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일을 다시 골라도 onChange가 오도록
    if (!file) return;

    setImportPhase('analyzing');
    setImportStep('파일 읽는 중');
    try {
      const backup = parseBackupFile(await file.text());
      const nextPlan = await planRestore({
        db, backup, coupleId, uid: user.uid,
        onProgress: (label) => setImportStep(`지금 데이터와 비교 중 · ${label}`),
      });
      setBackupMeta({ fileName: file.name, exportedAt: formatExportedAt(backup.exportedAt) });
      setPlan(nextPlan);
      setImportPhase('ready');
    } catch (error) {
      console.error('백업 파일 분석 실패:', error);
      toast.error(toMessage(error, '백업 파일을 확인하지 못했어요. 잠시 후 다시 시도해주세요.'));
      resetImport();
    }
  };

  const handleRestore = async () => {
    if (!plan || importPhase === 'restoring') return;
    setImportPhase('restoring');
    setProgress({ done: 0, total: plan.totalWrites });
    try {
      const { added } = await executeRestore({
        db, plan, onProgress: (done, total) => setProgress({ done, total }),
      });
      toast.success(`${added}개 항목을 되살렸어요`);
      resetImport();
    } catch (error) {
      console.error('백업 복원 실패:', error);
      toast.error(toMessage(error, '복원 중 문제가 생겼어요. 같은 파일로 다시 가져오면 남은 항목만 이어서 복원돼요.'));
      setImportPhase('ready');
    }
  };

  const skippedNotes = plan ? [
    plan.skipped.partnerPersonal > 0 && `파트너의 개인 일정 ${plan.skipped.partnerPersonal}개는 본인만 복원할 수 있어서 건너뛰어요.`,
    plan.skipped.partnerLetters > 0 && `파트너가 쓴 봉인 편지 ${plan.skipped.partnerLetters}통은 쓴 사람만 복원할 수 있어서 건너뛰어요.`,
    plan.skipped.letterNoContent > 0 && `내가 쓴 편지 ${plan.skipped.letterNoContent}통은 이 파일에 내용이 없어서 건너뛰어요. 내가 저장한 백업 파일로 가져와주세요.`,
    plan.skipped.orphan > 0 && `여행이 없어진 세부 내용 ${plan.skipped.orphan}개는 복원할 수 없어요.`,
    plan.droppedImages > 0 && `원본 사진이 지워진 편지 ${plan.droppedImages}통은 사진 없이 복원돼요.`,
  ].filter(Boolean) : [];

  return (
    <div className="dbp-page">
      <div className="dbp-header">
        <button className="dbp-back-btn" onClick={() => navigate('/settings')} aria-label="뒤로">
          <HiArrowLeft />
        </button>
        <p className="profile-section-label" style={{ margin: 0 }}>데이터 백업</p>
      </div>

      {isNative ? (
        <div className="dbp-section">
          <div className="dbp-title">웹에서 이용해주세요</div>
          <p className="dbp-desc">
            백업 파일 저장·가져오기는 아직 앱에서는 지원하지 않아요. 컴퓨터나 휴대폰 브라우저에서
            같은 계정으로 로그인한 뒤 설정 → 데이터 백업에서 이용할 수 있어요.
          </p>
          {/* 네이티브 웹뷰에서 외부 도메인 링크는 Capacitor가 기기 기본 브라우저로 넘겨줌
              (PrivacyPage·여행 후보 링크와 같은 방식) — 브라우저에서 같은 계정으로 로그인하면 바로 이 페이지 */}
          <a className="btn btn-primary dbp-btn dbp-web-link" href={WEB_URL} target="_blank" rel="noopener noreferrer">
            웹에서 데이터 백업 열기
          </a>
          <p className="dbp-url">{WEB_URL}</p>
        </div>
      ) : (
        <>
          <div className="dbp-section">
            <div className="dbp-section-title">내보내기</div>
            <div className="dbp-title">백업 파일 저장</div>
            <p className="dbp-desc">
              우리 커플의 일정·여행·버킷리스트·봉인 편지·설정과 내 개인 일정을 파일 하나로 저장해요.
            </p>
            <ul className="dbp-notes">
              <li>파트너의 개인 일정과, 파트너가 쓴 아직 안 열린 편지의 내용은 포함되지 않아요.</li>
              <li>사진은 링크만 저장돼요. 원본 사진을 지우면 복원할 때 사진은 되살아나지 않아요.</li>
            </ul>
            <button
              type="button"
              className="btn btn-primary dbp-btn"
              onClick={handleExport}
              disabled={!!exportStep || importPhase === 'restoring'}
            >
              {exportStep ? `${exportStep} 불러오는 중…` : '백업 파일 저장'}
            </button>
          </div>

          <div className="dbp-section">
            <div className="dbp-section-title">가져오기</div>
            <div className="dbp-title">백업 파일에서 되살리기</div>
            <p className="dbp-desc">
              지금 없는 항목만 백업 파일에서 다시 추가해요. 이미 있는 항목은 건드리지 않으니
              여러 번 가져와도 중복되지 않아요.
            </p>
            <ul className="dbp-notes">
              <li>지금 연결된 커플에서 저장한 파일만 가져올 수 있어요.</li>
              <li>여행 일정표·체크리스트·선택 사항 주제는 통째로 없어진 경우에만 되살아나요.</li>
            </ul>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="dbp-file-input"
              onChange={handleFileSelected}
            />

            {importPhase === 'idle' && (
              <button
                type="button"
                className="btn btn-secondary dbp-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!exportStep}
              >
                백업 파일 선택
              </button>
            )}

            {importPhase === 'analyzing' && (
              <div className="dbp-status">{importStep}…</div>
            )}

            {(importPhase === 'ready' || importPhase === 'restoring') && plan && (
              <div className="dbp-plan">
                <div className="dbp-plan-file">
                  <span className="dbp-plan-file-name">{backupMeta?.fileName}</span>
                  {backupMeta?.exportedAt && <span className="dbp-plan-file-date">{backupMeta.exportedAt} 저장</span>}
                </div>

                {plan.totalAdd === 0 ? (
                  <p className="dbp-desc">백업 파일의 내용이 지금 모두 있어요. 되살릴 항목이 없어요.</p>
                ) : (
                  <ul className="dbp-plan-list">
                    {SUMMARY_GROUPS.filter((g) => plan.counts[g.key].add > 0).map((g) => (
                      <li key={g.key} className="dbp-plan-row">
                        <span className="dbp-plan-label">{g.label}</span>
                        <span className="dbp-plan-count"><span className="dbp-num">{plan.counts[g.key].add}</span>개</span>
                      </li>
                    ))}
                  </ul>
                )}

                {skippedNotes.length > 0 && (
                  <ul className="dbp-notes dbp-notes--muted">
                    {skippedNotes.map((note) => <li key={note}>{note}</li>)}
                  </ul>
                )}

                {importPhase === 'restoring' ? (
                  <div className="dbp-progress">
                    <div className="dbp-progress-bar">
                      <div
                        className="dbp-progress-fill"
                        style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }}
                      />
                    </div>
                    <div className="dbp-status">복원하는 중이에요. 이 화면을 닫지 말아주세요.</div>
                  </div>
                ) : (
                  <div className="dbp-plan-actions">
                    <button type="button" className="btn btn-secondary" onClick={resetImport}>
                      {plan.totalAdd === 0 ? '닫기' : '취소'}
                    </button>
                    {plan.totalAdd > 0 && (
                      <button type="button" className="btn btn-primary" onClick={handleRestore}>
                        {plan.totalAdd}개 되살리기
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DataBackupPage;
