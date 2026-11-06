import React from 'react';
import './AccountDeletionPage.css';

const AccountDeletionPage = () => {
  return (
    <div className="del-page">
      <div className="del-container">
        <header className="del-header">
          <div className="del-logo">우리두리 (Twogether)</div>
          <h1>계정 및 데이터 삭제 안내</h1>
          <p className="del-updated">최종 업데이트: 2026년 11월 6일</p>
        </header>

        <section>
          <p>
            우리두리(Twogether, 개발자: ganglike248)를 이용해 주셔서 감사합니다.
            본 페이지는 이용자가 계정 및 계정과 관련된 개인정보의 삭제를 요청하는 방법과,
            삭제 처리 시 발생하는 데이터 보관 정책을 안내합니다.
          </p>
        </section>

        <section>
          <h2>1. 앱에서 직접 탈퇴하기</h2>
          <ol className="del-steps">
            <li>우리두리 앱에서 <strong>프로필</strong> 화면 맨 아래의 <strong>회원 탈퇴</strong>를 누릅니다. 커플 연결 전이라면 커플 연결 화면 아래의 <strong>회원 탈퇴</strong>를 누릅니다.</li>
            <li>삭제되는 내용을 확인하고, 필요하면 <strong>기록 파일 저장</strong>으로 함께한 기록을 먼저 내려받습니다.</li>
            <li>비밀번호 또는 구글 계정으로 본인 확인을 하면 <strong>즉시</strong> 탈퇴가 처리됩니다.</li>
          </ol>
          <p className="del-note">
            앱에 로그인할 수 없는 경우에는 가입 시 사용한 이메일로{' '}
            <a href="mailto:business9498@gmail.com?subject=%5B우리두리%5D%20계정%20삭제%20요청">business9498@gmail.com</a>
            에 "계정 삭제 요청"이라는 제목으로 메일을 보내주세요. 본인 확인 후 영업일 기준 7일 이내에 삭제하고 결과를 안내해 드립니다.
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
                <td>이메일 주소, 비밀번호(로그인 계정)</td>
                <td>탈퇴 즉시 영구 삭제</td>
              </tr>
              <tr>
                <td>닉네임, 알림 설정 등 내 계정 정보</td>
                <td>탈퇴 즉시 영구 삭제</td>
              </tr>
              <tr>
                <td>개인 일정(나만 보던 비공개 일정)</td>
                <td>탈퇴 즉시 영구 삭제</td>
              </tr>
              <tr>
                <td>커플이 함께 만든 기록<br />(공유 일정·추억·여행 계획·버킷리스트·봉인 편지·홈 화면 사진)</td>
                <td>
                  커플 연결이 해제되고 <strong>30일간 보관된 뒤 영구 삭제</strong>됩니다. 보관 기간에는 두 사람 모두
                  앱에서 볼 수 없고, 남은 파트너가 지금까지의 기록을 파일로 저장하는 용도로만 쓰입니다.
                  두 사람이 모두 탈퇴하면 즉시 삭제됩니다.
                </td>
              </tr>
              <tr>
                <td>파트너와 연결되기 전에 혼자 만든 커플의 기록</td>
                <td>탈퇴 즉시 영구 삭제</td>
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
