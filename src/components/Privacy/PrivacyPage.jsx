import React from 'react';
import './PrivacyPage.css';

const PrivacyPage = () => {
  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <header className="privacy-header">
          <div className="privacy-logo">우리두리</div>
          <h1>개인정보처리방침</h1>
          <p className="privacy-updated">최종 업데이트: 2026년 11월 6일</p>
        </header>

        <section>
          <p>
            우리두리(Twogether, 패키지명: com.wooridoori.twogether, 이하 "서비스")는
            Google Play 개발자 <strong>ganglike</strong>(계정 소유자: 손경락)가 제공하는
            커플을 위한 일정·추억·여행 공유 앱입니다.
            본 개인정보처리방침은 Google Play에 등록된 위 앱과 개발자에게 적용되며,
            서비스 이용 과정에서 수집되는 개인정보의 처리 방법을 안내합니다.
          </p>
        </section>

        <section>
          <h2>1. 수집하는 개인정보</h2>
          <table className="privacy-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>수집 목적</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>이메일 주소</td>
                <td>계정 생성 및 로그인 인증</td>
              </tr>
              <tr>
                <td>비밀번호</td>
                <td>계정 보안 (Firebase Authentication에서 암호화 처리, 서비스가 직접 저장하지 않음)</td>
              </tr>
              <tr>
                <td>닉네임</td>
                <td>앱 내 표시 이름</td>
              </tr>
              <tr>
                <td>커플 공유 데이터<br />(일정, 추억, 여행 계획, 버킷리스트, 봉인 편지)</td>
                <td>서비스 핵심 기능 제공</td>
              </tr>
              <tr>
                <td>개인 일정</td>
                <td>개인 전용 캘린더 기능 제공 (파트너에게 공개되지 않음)</td>
              </tr>
              <tr>
                <td>홈 화면 사진</td>
                <td>커플 홈 화면 배경 이미지 표시</td>
              </tr>
            </tbody>
          </table>
          <p className="privacy-note">
            위 항목 외에 민감정보(주민등록번호, 금융정보 등)는 수집하지 않습니다.
          </p>
        </section>

        <section>
          <h2>2. 개인정보 저장 및 처리</h2>
          <p>
            서비스는 Google Firebase(Firestore, Cloud Storage, Firebase Authentication, Google Analytics)를
            인프라로 사용합니다. 데이터는 Google의 클라우드 서버에 저장되며, 자세한 내용은{' '}
            <a
              href="https://firebase.google.com/support/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Firebase 개인정보 처리방침
            </a>
            을 참고하세요.
          </p>
        </section>

        <section>
          <h2>3. 개인정보 보존 기간 및 파기</h2>
          <p>
            수집된 개인정보는 계정이 삭제될 때까지 보존됩니다. 이용자는 앱의 <strong>프로필 → 회원 탈퇴</strong>
            (커플 연결 전에는 커플 연결 화면의 회원 탈퇴)에서 언제든 직접 계정을 삭제할 수 있습니다.
          </p>
          <ul>
            <li>회원 탈퇴 시 계정 정보(이메일, 닉네임, 알림 설정)와 개인 일정은 <strong>즉시 삭제</strong>됩니다.</li>
            <li>
              커플 연결을 해제하거나 커플 중 한 명이 탈퇴하면, 두 사람이 함께 만든 커플 공유 데이터(공유 일정, 추억,
              여행 계획, 버킷리스트, 봉인 편지, 홈 화면 사진)는 <strong>30일간 보관된 뒤 영구 삭제</strong>됩니다.
              보관 기간 동안에는 두 사람 모두 앱에서 열람할 수 없으며, 남은 이용자가 지금까지의 기록을 파일로
              저장하거나 연결을 해제한 이용자가 해제를 취소하는 용도로만 사용됩니다.
            </li>
            <li>두 사람이 모두 탈퇴했거나 파트너와 연결되기 전에 탈퇴한 경우에는 커플 공유 데이터도 즉시 삭제됩니다.</li>
          </ul>
        </section>

        <section>
          <h2>4. 제3자 제공</h2>
          <p>
            수집한 개인정보는 서비스 운영 목적 외에 제3자에게 제공하거나 공유하지 않습니다.
            단, 법령에 의해 요구되는 경우는 예외로 합니다.
          </p>
        </section>

        <section>
          <h2>5. 이용자의 권리</h2>
          <ul>
            <li>본인의 개인정보 열람, 수정, 삭제를 요청할 권리</li>
            <li>개인정보 처리에 대한 동의를 철회할 권리</li>
          </ul>
          <p>
            계정 삭제는 앱에서 직접 할 수 있고, 데이터 열람은 앱의 <strong>설정 → 데이터 백업</strong>에서 파일로
            내려받을 수 있습니다. 그 밖의 요청은 아래 문의처로 연락해 주세요.
          </p>
        </section>

        <section>
          <h2>6. 문의처</h2>
          <p>
            개인정보와 관련한 문의, 불만, 삭제 요청은 아래로 연락해 주세요.
          </p>
          <p className="privacy-contact">
            이메일:{' '}
            <a href="mailto:business9498@gmail.com">business9498@gmail.com</a>
          </p>
        </section>

        <footer className="privacy-footer">
          <p>본 방침은 법령 또는 서비스 정책 변경에 따라 업데이트될 수 있습니다.</p>
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPage;
