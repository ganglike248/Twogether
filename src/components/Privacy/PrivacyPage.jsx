import React from 'react';
import './PrivacyPage.css';

const PrivacyPage = () => {
  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <header className="privacy-header">
          <div className="privacy-logo">우리두리</div>
          <h1>개인정보처리방침</h1>
          <p className="privacy-updated">최종 업데이트: 2026년 7월 1일</p>
        </header>

        <section>
          <p>
            우리두리(이하 "서비스")는 커플을 위한 일정·추억·여행 공유 앱입니다.
            본 방침은 서비스 이용 과정에서 수집되는 개인정보의 처리 방법을 안내합니다.
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
                <td>커플 공유 데이터<br />(일정, 추억, 여행 계획, 버킷리스트)</td>
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
          <h2>3. 개인정보 보존 기간</h2>
          <p>
            수집된 개인정보는 계정이 삭제될 때까지 보존됩니다.
            계정 삭제를 원하시면 아래 문의처로 연락해 주시면 모든 데이터를 삭제해 드립니다.
          </p>
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
          <p>위 권리 행사는 아래 문의처를 통해 요청하실 수 있습니다.</p>
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
