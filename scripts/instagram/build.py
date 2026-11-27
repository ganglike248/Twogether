# 인스타그램 게시물 슬라이드(HTML) 만들기 — 화면 그래픽은 ui.py(앱 화면을 본떠 다시 그린 조각)에서 가져와요.
# 사용: python scripts/instagram/build.py  → 각 post-XX/slides.html 생성 → node scripts/instagram/render.mjs post-XX
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import ui  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BASE = os.path.join(ROOT, 'marketing', 'instagram')
ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>'
HEAD = '''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>%s</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Jua&display=swap" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
<link rel="stylesheet" href="../base.css" />
<link rel="stylesheet" href="../app.css" />
</head>
<body>
'''
# 그래픽이 남는 높이보다 크면 그만큼 줄여서 맞춤
FIT = '''<script>
  document.fonts.ready.then(() => {
    document.querySelectorAll('.stage.fit').forEach((st) => {
      const el = st.firstElementChild;
      const room = st.clientHeight;
      const h = el ? el.getBoundingClientRect().height : 0;
      if (h > room) el.style.zoom = room / h;
    });
  });
</script>
'''


def slide(tag, h1, em, sub, graphic):
    subhtml = f'\n  <p class="sub">{sub}</p>' if sub else ''
    return f'''<section class="slide compact">
  <div class="top"><span class="brand">우리두리</span><span class="tag">{tag}</span></div>
  <h1>{h1}<br /><em>{em}</em></h1>{subhtml}
  <div class="stage fit">
<div class="fitbox">{graphic}</div>
  </div>
</section>
'''


def end(h2, send, nxt, pre='다음 글'):
    return f'''<section class="slide blush end">
  <div class="mascot"><img src="../../../assets/logo.png" alt="" /></div>
  <div class="name">우리두리</div>
  <h2>{h2}</h2>
  <div class="how">Google Play에서 <b>‘우리두리’</b> 검색</div>
  <div class="stores">안드로이드 · 무료 설치</div>
  <div class="next"><span>{send}</span><span>{pre} <b>{nxt}</b></span></div>
</section>
'''


def cover(bgc, hl, ink, tag, h, lead, art, top=64):
    return f'''<section class="slide cv" style="background:{bgc}">
  <div class="top"><span class="brand">우리두리</span><span class="tag" style="color:{ink};opacity:.55">{tag}</span></div>
  <div class="cover-h" style="margin-top:{top}px">{h[0]}<br /><span class="hl" style="background:linear-gradient(transparent 58%, {hl} 58%, {hl} 94%, transparent 94%)">{h[1]}</span></div>
  <p class="lead" style="color:{ink}">{lead}</p>
  {art}
  <span class="go" style="background:{ink};opacity:.9">{ARROW}</span>
</section>
'''


def art(html, left, top, rot, zoom=1.0):
    return f'<div class="art" style="left:{left}px;top:{top}px;transform:rotate({rot}deg)"><div style="zoom:{zoom}">{html}</div></div>'


def write(post, title, body):
    d = os.path.join(BASE, post)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, 'slides.html'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(HEAD % title + body + FIT + '</body>\n</html>\n')


# ── 1. 앱 소개 ── (표지·소개 장은 손으로 만든 것 그대로: post-01/intro.html)
intro = open(os.path.join(BASE, 'post-01', 'intro.html'), encoding='utf-8').read()
write('post-01', '우리두리 인스타그램 1 — 앱 소개', intro + ''.join([
    slide('01 공유 캘린더 ①', '“내일 어디 간다고 했지?”', '이제 안 물어봐도 돼요', '각자 적은 일정이 한 달력에. 누구 일정인지는 색으로 보여요.', ui.calendar()),
    slide('01 공유 캘린더 ②', '날짜만 누르면', '그날 둘의 일정이 한눈에', '누가 어디서 누굴 만나는지, 메모까지 같이 봐요.', ui.day_modal()),
    slide('02 여행 계획', '여행 계획,', '카톡방에 흩어지지 않게', '일정표, 숙소 후보, 준비물, 예산까지 여행 하나에.', ui.schedule(tabs=False, addr=False)),
    slide('03 하고 싶은 것 · 돌림판', '“아무거나” 대신,', '돌림판이 골라줘요', '하고 싶은 걸 적어 두고, 못 고르는 날엔 돌려요.', ui.wheel_modal()),
    slide('04 우리 이야기', '지나간 날도', '그냥 지나가지 않게', '다녀온 곳, 봉인 편지, 하고 싶은 것이 한곳에 쌓여요.', ui.story_cards()),
    end('내일 일정부터<br />같이 적어 볼까요?', '저장해 두고, 같이 쓸 사람에게 보내기', '공유 캘린더 자세히'),
]))

# ── 2. 공유 캘린더 ── 표지: 글 위, 기울인 달력 아래
write('post-02', '우리두리 인스타그램 2 — 공유 캘린더', ''.join([
    cover('#eef1fb', '#cdd5f3', '#4d5a96', '사용법 01 · 공유 캘린더', ('말 안 해도,', '서로의 일정이 보여요'), '우리두리 공유 캘린더, 하나씩 보여드릴게요', art(ui.calendar(), 120, 540, -4)),
    slide('① 한 캘린더', '누구 일정인지', '색만 봐도 알아요', '하나는 파랑, 두리는 초록, 데이트는 분홍.<br />색은 취향대로 바꿀 수 있어요.', ui.calendar(rows=range(1, 4), cell=150, ef=21, filt=False)),
    slide('② 날짜 누르기', '날짜만 누르면', '그날 일정이 한눈에', '누가 어디서 누굴 만나는지, 메모까지 같이 봐요.', ui.day_modal()),
    slide('③ 일정 적기', '제목이랑 날짜,', '그거면 끝이에요', '누구 일정인지 고르고, 메모는 적고 싶을 때만.', ui.event_form()),
    slide('④ 반복 일정', '매주 가는 필라테스,', '한 번만 적어요', '매일·매주·매월·매년 반복으로 만들 수 있어요.', ui.repeat_form()),
    slide('⑤ 디데이 · 알림', '기다리는 날은', '디데이로 표시해요', '홈에서 남은 날을 세어 주고, 3일 전·하루 전엔 알림이 와요.<br />내일 일정은 전날 저녁 9시에 알려 줘요.', ui.home_cards()),
    end('내일 일정부터<br />같이 적어 볼까요?', '저장해 두고, 같이 쓸 사람에게 보내기', '여행 계획 자세히'),
]))

# ── 3. 여행 계획 ── 표지: 그래픽 두 장 위, 글 아래
art3 = art(ui.schedule(tabs=False), 500, 150, 5, 0.6) + art(ui.decision(), 70, 290, -5, 0.52)
write('post-03', '우리두리 인스타그램 3 — 여행 계획', ''.join([
    cover('#f5eefa', '#e2cff0', '#7a4f95', '사용법 02 · 여행 계획', ('여행 준비,', '링크 찾다 끝난 적 있다면'), '숙소 후보부터 일정표, 준비물까지 여행 하나에', art3, top=830),
    slide('① 후보 비교', '숙소 어디로 할까?', '각자 점수로 말해요', '후보를 올리고 둘 다 점수를 매겨요. 마음이 모이면 확정.', ui.decision()),
    slide('② Day별 일정표', '그날 하루가', '한눈에 보여요', '시간, 장소, 이동 시간, 쓸 돈까지 Day별로 정리돼요.', ui.schedule(tabs=False)),
    slide('③ 준비물 · 예산', '“충전기 챙겼어?”', '이것도 안 물어봐도 돼요', '준비물은 같이 체크하고, 예산은 일정에 적은 비용으로 계산돼요.', ui.checklist()),
    slide('④ 여행 끝 기록', '다녀오면', '좋았던 순간을 골라요', '여행이 끝나면 기분과 좋았던 순간 TOP 3를 남겨요.', ui.review()),
    slide('⑤ 우리 지도', '다녀온 곳은', '지도에 하나씩 칠해져요', '함께 가 본 시·도가 색으로 채워져요.', ui.map_card()),
    end('다음 여행 계획부터<br />같이 세워 볼까요?', '저장해 두고, 같이 갈 사람에게 보내기', '하고 싶은 것 · 돌림판'),
]))

# ── 4. 하고 싶은 것 · 돌림판 ── 표지: 크게 키운 돌림판
write('post-04', '우리두리 인스타그램 4 — 하고 싶은 것 · 돌림판', ''.join([
    cover('#fff5dc', '#fde3a0', '#8a6a1c', '사용법 03 · 하고 싶은 것', ('주말마다 나오는', '“아무거나”가 지겹다면'), '하고 싶은 걸 모아 두고, 못 고르는 날엔 돌림판으로', art(ui.wheel_svg(940), 300, 600, -8)),
    slide('① 적어 두기', '생각날 때', '한 줄로 적어 둬요', '한 번 해볼 것과 자주 할 것, 두 가지로 나눠 담아요.', ui.bucket_board()),
    slide('② 언제 할까?', '“언제 한번 가자”를', '진짜 날짜로', '날짜를 고르면 캘린더에 일정이 바로 생겨요.', ui.plan_sheet()),
    slide('③ 돌림판', '못 고르겠는 날엔', '두근두근 돌림판', '하고 싶은 것에서 담거나 직접 적어서 돌려요.', ui.wheel_modal()),
    slide('④ 했어요', '하고 나면', '한 줄씩 쌓여요', '날짜가 지나면 했는지 물어보고, 남긴 한 줄이 기록이 돼요.', ui.check_and_history()),
    slide('⑤ 이룬 것', '하나씩 지워 가는', '둘만의 목록', '해본 것은 ‘이룬 것’에 날짜와 함께 모여요.', ui.achieved()),
    end('이번 주말 할 일부터<br />같이 골라 볼까요?', '저장해 두고, 같이 할 사람에게 보내기', '봉인 편지 · 우리 이야기'),
]))
# ── 5. 봉인 편지 · 우리 이야기 ── 표지: 편지 두 통을 크게
write('post-05', '우리두리 인스타그램 5 — 봉인 편지 · 우리 이야기', ''.join([
    cover('#e9f7f1', '#bfe8d6', '#2f7a5f', '사용법 04 · 봉인 편지', ('오늘 쓴 편지가', '크리스마스에 열린다면'), '봉인 편지부터 한 달 요약까지, 둘의 이야기가 쌓여요', art(ui.letter_piece(), 60, 600, -5, 1.14)),
    slide('① 편지 봉인하기', '오늘 쓴 편지가', '정한 날에 열려요', '열리는 날과 시간을 정해서 봉인해요. 그때까지는 못 열어요.', ui.letter_write()),
    slide('② 봉인 편지함', '기다리는 편지,', '열린 편지가 한곳에', '봉인된 편지는 열리는 날만 보여요. 열리면 알림이 와요.', ui.letter_box()),
    slide('③ 그날의 우리', '작년 이맘때', '우리 뭐 했더라?', '1~3년 전 이맘때의 일정을 홈에서 꺼내 보여줘요.', ui.on_this_day()),
    slide('④ 월간 요약', '한 달이 끝나면', '둘의 한 달을 정리해 줘요', '함께한 일정, 여행, 이룬 것, 주고받은 편지까지.', ui.recap_stats()),
    slide('⑤ 다음 달 미리 보기', '다음 달엔', '이런 날이 기다려요', '기념일과 예정된 일정을 알려 주고, 이미지로 저장할 수도 있어요.', ui.recap_next()),
    end('오늘 쓴 편지,<br />언제 열어 볼까요?', '저장해 두고, 편지 받을 사람에게 보내기', '우리 지도 · 추억'),
]))
# ── 6. 우리 지도 · 추억 ── 표지: 화면 밖으로 넘치는 큰 지도
art6 = '<div class="cover-map" style="left:300px;top:470px;width:900px;transform:rotate(4deg)"><!--MAP:11,26,47,50,51--></div>'
write('post-06', '우리두리 인스타그램 6 — 우리 지도 · 추억', ''.join([
    cover('#ffeee3', '#ffd2b8', '#b5643c', '사용법 05 · 우리 지도', ('우리, 어디까지', '가 봤더라?'), '다녀온 곳은 지도에, 지난 날은 추억에 남아요', art6),
    slide('① 우리 지도', '다녀온 곳이', '하나씩 칠해져요', '여행을 다녀오면 그 지역이 지도에 색으로 남아요.', ui.map_full()),
    slide('② 지역 누르기', '지역을 누르면', '그때 여행이 나와요', '언제 몇 번 갔는지 보고, 또 갈 여행도 바로 만들어요.', ui.map_sheet()),
    slide('③ 시·군·구', '더 가까이 보면', '시·군·구까지', '강원 안에서도 가 본 곳만 칠해져요.', ui.map_sgg()),
    slide('④ 추억', '지난 일정은', '추억으로 모여요', '제목이나 내용으로 찾고, 누구 일정인지로 걸러 봐요.', ui.memories()),
    slide('⑤ 그날로 돌아가기', '눌러 보면', '그날 일정으로 돌아가요', '추억에서 바로 캘린더의 그 일정으로 이동해요.', ui.memory_modal()),
    end('다음엔 어디를<br />같이 칠해 볼까요?', '저장해 두고, 같이 갈 사람에게 보내기', '처음 시작하는 방법'),
]))
# ── 7. 처음 시작하는 방법 ── 표지: 연결 선택 카드
write('post-07', '우리두리 인스타그램 7 — 처음 시작하는 방법', ''.join([
    cover('#f1f6dc', '#dcea9f', '#6f7f2c', '사용법 06 · 시작하기', ('둘이 쓰려면', '코드 여섯 자리면 돼요'), '가입부터 연결까지, 순서대로 보여드릴게요', art(ui.ob_choice_piece(), 70, 620, -4, 1.08)),
    slide('① 가입', '구글이나 이메일로', '바로 시작해요', 'Google Play에서 ‘우리두리’를 설치하고 가입해요.', ui.ob_start()),
    slide('② 닉네임', '상대가 부를', '이름을 정해요', '상대 화면에 이 이름으로 보여요. 나중에 바꿀 수 있어요.', ui.ob_nickname()),
    slide('③ 연결 방법', '둘 중 한 명만', '초대하면 돼요', '한 사람이 초대 코드를 만들고, 다른 사람이 입력해요.', ui.ob_choice()),
    slide('④ 초대하는 사람', '처음 만난 날을 적고', '초대 코드를 만들어요', '이 날짜로 함께한 날과 기념일을 세어 줘요.', ui.ob_invite()),
    slide('⑤ 초대받은 사람', '받은 코드 여섯 자리,', '입력하면 연결 끝', '연결되면 그때부터 둘의 일정이 같이 보여요.', ui.ob_join()),
    end('둘이 쓰는 첫 캘린더,<br />오늘 시작해 볼까요?', '이 글을 같이 쓸 사람에게 보내 주세요', '', pre=''),
]))
print('ok')
