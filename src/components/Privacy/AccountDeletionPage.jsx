import React from 'react';
import './AccountDeletionPage.css';

const AccountDeletionPage = () => {
  return (
    <div className="del-page">
      <div className="del-container">
        <header className="del-header">
          <div className="del-logo">우리두리 (Twogether)</div>
          <h1>계정 및 데이터 삭제 안내</h1>
          <p className="del-updated">최종 업데이트: 2026년 7월 10일</p>
        </header>

        <section>
          <p>
            우리두리(Twogether, 개발자: ganglike248)를 이용해 주셔서 감사합니다.
            본 페이지는 이용자가 계정 및 계정과 관련된 개인정보의 삭제를 요청하는 방법과,
            삭제 처리 시 발생하는 데이터 보관 정책을 안내합니다.
          </p>
        </section>

        <section>
          <h2>1. 삭제 요청 방법</h2>
          <ol className="del-steps">
            <li>
              가입 시 사용한 이메일 계정으로{' '}
              <a href="mailto:business9498@gmail.com?subject=%5B우리두리%5D%20계정%20삭제%20요청">
                business9498@gmail.com
              </a>
              으로 메일을 보내주세요.
            </li>
            <li>메일 제목에 <strong>"계정 삭제 요청"</strong>을 포함하고, 본문에 가입 시 사용한 이메일 주소를 남겨주세요.</li>
            <li>본인 확인 후 <strong>영업일 기준 7일 이내</strong>에 계정 및 개인 데이터를 삭제하고, 처리 완료를 이메일로 안내해 드립니다.</li>
          </ol>
          <p className="del-note">
            앱 내에서 직접 탈퇴할 수 있는 기능은 아직 제공되지 않아, 위 이메일 요청 방식으로만 처리됩니다.
          </p>
        </section>

        <section>
          <h2>2. 삭제되는 데이터 / 보관되는 데이터</h2>
          <table className="del-table">
            <thead>
              <tr>
                <th>데이터 항목</th>
                <th>처리 방식</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>이메일 주소, 비밀번호(Firebase Authentication 계정)</td>
                <td>요청 처리 즉시 영구 삭제</td>
              </tr>
              <tr>
                <td>닉네임, 홈 화면 사진</td>
                <td>요청 처리 즉시 영구 삭제</td>
              </tr>
              <tr>
                <td>개인 일정(나만 보던 비공개 일정)</td>
                <td>요청 처리 즉시 영구 삭제</td>
              </tr>
              <tr>
                <td>커플과 공유했던 일정·추억·여행 계획·버킷리스트</td>
                <td>
                  삭제 계정과의 연결(작성자 정보)만 제거되며, 파트너가 함께 만든 기록이라는 서비스 특성상
                  파트너 화면에는 계속 남아 있을 수 있습니다. 파트너 쪽 기록까지 함께 삭제를 원하시면
                  메일 본문에 별도로 요청해 주세요.
                </td>
              </tr>
            </tbody>
          </table>
          <p className="del-note">
            위 항목 외에 서비스가 별도로 장기 보관하는 개인정보는 없습니다. 단, 관계 법령상 보존 의무가 있는
            정보(예: 부정 이용 방지를 위한 접속 기록 등)가 있는 경우 해당 법령에서 정한 기간 동안만 예외적으로
            보관 후 파기합니다.
          </p>
        </section>

        <section>
          <h2>3. 문의처</h2>
          <p>삭제 요청 처리 현황이나 그 외 문의사항은 아래로 연락해 주세요.</p>
          <p className="del-contact">
            이메일: <a href="mailto:business9498@gmail.com">business9498@gmail.com</a>
          </p>
        </section>

        <footer className="del-footer">
          <p>
            개인정보 처리에 관한 전반적인 사항은{' '}
            <a href="/privacy">개인정보처리방침</a>을 함께 참고해 주세요.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default AccountDeletionPage;
