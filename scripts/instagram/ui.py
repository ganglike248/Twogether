# 앱 화면을 본뜬 그래픽 조각들 — 실제 화면 캡처(marketing/instagram/shots)를 보고 같은 모양으로 다시 그린 것(app.css).
import math

X = '<span class="x">×</span>'


def _ico(path):
    return f'<svg viewBox="0 0 24 24">{path}</svg>'

I_MAP = _ico('<path d="M9 4.500L3.500 6.500v13L9 17.500l6 2 5.500-2v-13L15 6.500l-6-2zM9 4.500v13M15 6.500v13"/>')
I_LOCK = _ico('<rect x="5" y="10.500" width="14" height="10" rx="2.500"/><path d="M8 10.500V7.500a4 4 0 0 1 8 0v3"/>')
I_CHECK = _ico('<circle cx="12" cy="12" r="8.500"/><path d="M8.500 12.200l2.400 2.400 4.600-4.800"/>')
I_PLANE = _ico('<path d="M4 5l16 7-16 7 3-7zM7 12h13"/>')
I_CAL = _ico('<rect x="3.500" y="5" width="17" height="15.500" rx="3"/><path d="M3.500 10h17M8 3v4M16 3v4"/>')
I_STAR = _ico('<path d="M10 4l1.600 4.400L16 10l-4.400 1.600L10 16l-1.600-4.400L4 10l4.400-1.600zM18 14l.800 2.200L21 17l-2.200.800L18 20l-.800-2.200L15 17l2.200-.800z"/>')


def _sv(path, color):
    return f'<svg viewBox="0 0 24 24" stroke="{color}">{path}</svg>'

FORK = _sv('<path d="M7 3v8M4.500 3v4.500a2.500 2.500 0 0 0 5 0V3M7 11v10M17 3c-2 1.500-3 4-3 7h3zm0 7v11"/>', '#b58a2a')
CAM = _sv('<rect x="3.500" y="7" width="17" height="12.500" rx="3"/><circle cx="12" cy="13.200" r="3.200"/><path d="M8.500 7l1.200-2.500h4.600L15.500 7"/>', '#3f9d55')
CUP = _sv('<path d="M5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 10.500h1.500a2.500 2.500 0 0 1 0 5H17M8 3.500v2.500M12 3.500v2.500"/>', '#8a6a4f')
BED = _sv('<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 15h18M3 18v2M21 18v2M7 9V6.500A1.500 1.500 0 0 1 8.500 5h7A1.500 1.500 0 0 1 17 6.500V9"/>', '#7a5fc9')
TICKET = _sv('<path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4zM14 6v12"/>', '#4d8fd6')

# ── 달력 ──
EVENTS = {5: [('us', '전시회')], 9: [('you', '팀 회식'), ('me', '필라테스')], 12: [('you', '친구 결혼식')], 15: [('me', '출장')],
          18: [('trip w2', '강릉 1박 2일')], 24: [('us', '크리스마스')], 28: [('me', '송년회')], 31: [('us', '해돋이')]}

def calendar(rows=range(5), cell=112, ef=17, filt=True):
    """2026년 12월(1일 = 화요일). rows로 보여 줄 주만 고를 수 있어요."""
    cells = ''.join(f'<div class="dow{" sun" if i == 0 else " sat" if i == 6 else ""}">{d}</div>' for i, d in enumerate('일월화수목금토'))
    for r in rows:
        for c in range(7):
            day = r * 7 + c - 1
            dim = day < 1 or day > 31
            n = 30 + day if day < 1 else day - 31 if day > 31 else day
            cls = 'cell' + (' dim' if dim else '') + (' sun' if c == 0 else ' sat' if c == 6 else '')
            ev = '' if dim else ''.join(f'<span class="e {k}">{t}</span>' for k, t in EVENTS.get(day, []))
            cells += f'<div class="{cls}"><span class="n">{n}</span>{ev}</div>'
    return f'''<div class="ui page">
  <div class="cal-top"><span class="nav">‹</span><span class="nav">›</span><span class="ym">2026년 12월</span><span class="mini">오늘</span><span class="mini">수정기록</span></div>
  {'<div class="cal-filter"><span class="on">전체</span><span>개인</span><span>커플</span></div>' if filt else ''}
  <div class="cal-grid" style="--ch:{cell}px;--ef:{ef}px">{cells}</div>
</div>'''


def day_modal():
    return f'''<div class="ui sheet">
  <div class="row"><div><div class="t" style="font-size:42px">12월 9일 수요일</div><div class="sm mute" style="margin-top:8px">총 2개의 일정</div></div><span class="sp"></span>{X}</div>
  <div style="margin-top:26px">
    <div class="evt me"><b>필라테스</b><p>8시 수업 · 끝나고 통화하기</p><div class="who"><i class="blue"></i>하나</div></div>
    <div class="evt you"><b>팀 회식</b><p>저녁 7시 강남역 · 팀장님, 동기들이랑 · 늦을 수도</p><div class="who"><i class="peach"></i>두리</div></div>
  </div>
  <div class="row" style="margin-top:24px"><span class="sp"></span><span class="btn fill" style="flex:none;padding:18px 34px;border-radius:22px">+ 일정 추가</span></div>
</div>'''


def event_form():
    return f'''<div class="ui sheet">
  <div class="row"><span class="t">일정 수정</span><span class="sp"></span>{X}</div>
  <div class="inp j" style="margin-top:22px">친구 결혼식</div>
  <div class="types"><span class="us">데이트</span><span class="me">하나</span><span class="you sel">두리</span></div>
  <div class="memo">12시 반 강남 · 대학 동기들이랑 · 끝나고 연락할게</div>
  <div class="dates"><div><small>시작</small><b>2026-12-12</b></div><div><small>종료</small><b>2026-12-12</b></div></div>
  <div class="tg"><i></i>디데이로 표시</div>
  <div class="row" style="margin-top:30px"><span class="pill j" style="background:#ff7b7b;color:#fff;border-radius:18px;padding:14px 28px">삭제</span><span class="sp"></span><span class="pill j" style="background:#fff;box-shadow:inset 0 0 0 2.500px #ece2e4;border-radius:18px;padding:14px 28px">취소</span><span class="pill j" style="background:#ffb6c1;color:#fff;border-radius:18px;padding:14px 28px">저장</span></div>
</div>'''


def repeat_form():
    days = ''.join(f'<span class="day{" sel" if d in "화목" else ""}">{d}</span>' for d in '일월화수목금토')
    return f'''<div class="ui sheet">
  <div class="row"><span class="t">새 일정 추가</span><span class="sp"></span>{X}</div>
  <div class="inp j" style="margin-top:22px">필라테스</div>
  <div class="types" style="margin-bottom:6px"><span class="us">데이트</span><span class="me sel" style="box-shadow:0 0 0 4px #b9cdf6">하나</span><span class="you">두리</span></div>
  <div class="tg"><i class="on"></i>반복 일정으로 만들기</div>
  <div style="border-top:2.500px dashed #f0dfe2;margin-top:28px"></div>
  <div class="lbl">반복 주기</div>
  <div class="opts"><span>매일</span><span class="sel">매주</span><span>매월</span><span>매년</span></div>
  <div class="lbl">요일</div>
  <div class="opts">{days}</div>
</div>'''


def home_cards():
    def card(ico, head, main, sub, chip=''):
        return f'<div class="c hc"><div class="h">{ico}{head}</div><div class="row"><div><div class="m">{main}</div><div class="s">{sub}</div></div><span class="sp"></span>{chip}</div></div>'
    return f'''<div class="ui page">
  {card(I_PLANE, '다음 여행', '강릉 1박 2일', '강릉 · 12월 18일~12월 19일', '<span class="dchip">D-21</span>')}
  {card(I_CAL, '다음 일정', '보드게임 카페', '11월 28일 (토)', '<span class="mute">›</span>')}
  {card(I_STAR, '디데이', '크리스마스 데이트', '12월 24일 (목)', '<span class="dchip">D-27</span>')}
</div>'''


def story_cards():
    return f'''<div class="ui page">
  <div class="c hc"><div class="h">{I_MAP}우리 지도</div><div class="row"><div><div class="m">함께 가 본 곳 <span class="rose">4</span>/16</div><div class="s">누르면 시·군·구까지 볼 수 있어요</div></div><span class="sp"></span><span class="mute">›</span></div></div>
  <div class="c hc"><div class="h">{I_LOCK}봉인 편지함</div><div class="row"><div><div class="m">봉인된 편지 <span class="rose">1</span>통</div><div class="s">가장 빠른 편지 <span class="rose">12월 25일 (금) 00:00</span> 공개</div></div><span class="sp"></span><span class="dchip">D-28</span></div></div>
  <div class="row gap" style="align-items:stretch;gap:20px">
    <div class="c hc" style="flex:1.150;margin:0"><div class="h">{I_CHECK}하고 싶은 것</div><div class="m">보드게임 카페</div><div class="s rose">6개 담김 · 이룬 것 3</div></div>
    <div class="c hc" style="flex:1;margin:0;text-align:center;display:flex;flex-direction:column;justify-content:center"><div class="m rose" style="margin:0;font-size:30px">돌림판</div><div class="s">뭐 할까? 골라줘</div></div>
  </div>
</div>'''


# ── 여행 ──
def _tabs(on):
    names = ['Day별 일정', '선택 사항', '체크리스트<em>2</em>']
    return '<div class="tabs">' + ''.join(f'<span class="{"on" if i == on else ""}">{n}</span>' for i, n in enumerate(names)) + '</div>'


def schedule(tabs=True, addr=True):
    def it(tm, bg, ico, nm, ad='', co='', mv=''):
        return (f'<div class="it"><div class="tm">{tm}</div><div class="nm"><span class="ic" style="background:{bg}">{ico}</span>{nm}</div>'
                + (f'<span class="ad">{ad}</span>' if ad and addr else '') + (f'<div class="co">{co}</div>' if co else '') + '</div>'
                + (f'<div class="mv">{mv}</div>' if mv else ''))
    return f'''<div class="ui page">
  {_tabs(0) if tabs else ''}
  <div class="days"{'' if tabs else ' style="margin-top:0"'}><span class="on">Day 1<small>12.18 (금)</small></span><span>Day 2<small>12.19 (토)</small></span></div>
  <div class="c">
    <div class="row"><span class="t" style="font-size:28px">Day 1 일정</span><span class="sp"></span><span class="xs mute">남은 일정 4</span></div>
    <div class="tl">
      {it('11:30', '#fdf0c4', FORK, '초당 순두부', '강원특별자치도 강릉시 초당순두부길 77', '24,000원', '차로 12분')}
      {it('13:30', '#dff3df', CAM, '안목해변 산책', mv='걸어서 5분')}
      {it('15:00', '#efe3d6', CUP, '오션뷰 카페', co='14,000원', mv='차로 8분')}
      {it('17:00', '#e8defa', BED, '경포 오션뷰 호텔 체크인', '강원특별자치도 강릉시 창해로 307', '150,000원')}
    </div>
  </div>
</div>'''


def decision():
    return '''<div class="ui page">
  <div class="c" style="padding:26px 30px"><div class="row"><span class="t">숙소</span><span class="sp"></span><span class="mute">︿</span></div><div class="sm mute" style="margin-top:6px">후보 3 · <span class="rose">확정 1</span> · 평가 다 했어요</div></div>
  <div class="opt gap">
    <div class="row"><span class="badge" style="background:#3f9d55;color:#fff">✓ 확정</span><span class="badge" style="background:#ffb6c1;color:#fff">1위</span><span class="sp"></span><span class="mute">☆</span></div>
    <div class="t" style="margin-top:18px">경포 오션뷰 호텔</div>
    <div class="rose" style="margin-top:6px">150,000원</div>
    <div class="row" style="margin-top:12px"><span class="chip" style="background:#e3ecfb;color:#5b84c9">Day 1 일정</span></div>
    <div class="sm mute" style="margin-top:12px">강원특별자치도 강릉시 창해로 307</div>
    <div style="border-top:2.500px dashed #f0dfe2;margin:20px 0 6px"></div>
    <div class="row sm"><span class="mute">점수</span><span class="sp"></span><span class="rose">17 / 20</span></div>
    <div class="sc"><span>하나</span><div class="bar"><i style="width:80%;background:#b4c8f2"></i></div><span>8</span></div>
    <div class="sc"><span>두리</span><div class="bar"><i style="width:90%;background:#a9dfb0"></i></div><span>9</span></div>
    <div class="sm" style="margin-top:16px;color:#6b5e62">두리 · “바다 보이는 방이면 무조건 여기”</div>
    <div class="row" style="margin-top:22px"><span class="btn line" style="border-radius:18px;padding:16px 0;font-size:24px">일정에 추가</span><span class="btn" style="border-radius:18px;padding:16px 0;font-size:24px;background:#e9f7ea;color:#3f9d55;box-shadow:inset 0 0 0 2.500px #9fd8a6">✓ 확정됨</span></div>
  </div>
</div>'''


def checklist():
    def ck(nm, done=False, extra=''):
        return f'<div class="c gap" style="padding:24px 28px"><div class="ck{" done" if done else ""}"><i class="{"on" if done else ""}"></i><div><div class="nm">{nm}</div></div><span class="sp"></span>{extra}</div></div>'
    return f'''<div class="ui page">
  <div class="c" style="padding:24px 30px"><div class="row"><span class="x" style="font-size:24px;font-family:Pretendard">₩</span><div style="flex:1"><div class="xs mute">예산</div><div style="font-size:28px">210,000원 / 400,000원</div><div class="prog"><i style="width:52%"></i></div></div></div></div>
  <div class="gap">{_tabs(2)}</div>
  <div class="c gap"><div class="row" style="gap:26px"><div class="ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="#ffe9ed" stroke-width="11"/><circle cx="50" cy="50" r="42" fill="none" stroke="#ff9bac" stroke-width="11" stroke-linecap="round" stroke-dasharray="158.300 263.900"/></svg><b>60%</b></div><div><div class="t" style="font-size:31px">5개 중 3개 준비 완료</div><div class="sm mute" style="margin-top:6px">중요한 준비 1개가 남았어요</div></div></div></div>
  <div class="sm" style="margin:24px 8px 0">남은 준비 2</div>
  {ck('렌터카 예약<div class="xs mute" style="font-family:Gowun Dodum;margin-top:4px">12.10까지</div>', extra='<span class="pr" style="background:#ffe3e3;color:#e06a6a">높음</span>')}
  {ck('필름 카메라', extra='<span class="pr" style="background:#fff3da;color:#b58a2a">중간</span>')}
  <div class="sm" style="margin:24px 8px 0">준비 완료 3</div>
  {ck('기차표 예매', True, '<span class="xs mute">하나</span>')}
</div>'''


def review():
    def it(bg, ico, nm, tm, n=''):
        mark = f'<i style="width:48px;height:48px;border-radius:50%;background:#ff9bac;color:#fff;display:grid;place-items:center;font-style:normal" class="j">{n}</i>' if n else '<i style="width:48px;height:48px;border-radius:50%;border:3px solid #f0e4e6"></i>'
        return f'<div class="c gap" style="padding:22px 26px"><div class="row" style="gap:22px"><span class="ic2" style="background:{bg}">{ico}</span><div><div class="j" style="font-size:30px">{nm}</div><div class="xs mute" style="font-family:Pretendard;margin-top:2px">{tm}</div></div><span class="sp"></span>{mark}</div></div>'
    return f'''<div class="ui page">
  <div class="row" style="padding:4px 6px"><span class="x" style="background:#fff;color:#4a3f42">←</span><span class="mute">제주 여행 기록</span></div>
  <div class="row" style="gap:10px;margin:22px 6px 0"><i style="flex:1;height:6px;border-radius:9px;background:#ff9bac"></i><i style="flex:1;height:6px;border-radius:9px;background:#ff9bac"></i><i style="flex:1;height:6px;border-radius:9px;background:#f6dfe3"></i></div>
  <div class="t" style="font-size:42px;margin:30px 6px 0">좋았던 순간 TOP 3</div>
  <div class="sm" style="margin:12px 6px 6px;color:#6b5e62">좋았던 순서대로 눌러 주세요 · 다시 누르면 빠져요</div>
  {it('#dff3df', CAM, '성산일출봉', '10:00', '2')}
  {it('#fdf0c4', FORK, '흑돼지 구이', '13:00', '1')}
  {it('#dcebfb', TICKET, '귤 따기 체험', '15:00')}
  {it('#dff3df', CAM, '협재 해변 노을', '17:30', '3')}
</div>'''


def map_card():
    return '''<div class="ui page">
  <div class="c"><div class="row"><span class="t">함께 가 본 곳 <span class="rose" style="font-size:46px">4</span>/16</span><span class="sp"></span><span class="sm mute">여행 4번</span></div><div class="prog"><i style="width:25%"></i></div><div class="xs mute" style="margin-top:14px">가장 최근 제주(10월 10일)</div></div>
  <div class="c gap" style="text-align:center;padding:26px"><div class="mapsvg" style="width:600px;margin:0 auto"><!--MAP--></div>
    <div class="row xs mute" style="justify-content:center;gap:22px;margin-top:10px"><span>○ 아직</span><span style="color:#ffb0bd">● 1번</span><span style="color:#ff8fa3">● 2번</span><span style="color:#e07a93">● 3번+</span></div></div>
</div>'''


# ── 하고 싶은 것 ──
def _suggest():
    return '''<div class="c gap" style="position:relative"><span class="tape"></span>
    <div class="row sm"><span class="rose">이번 주말 이거 어때요?</span><span class="sp"></span><span class="rose">↻ 다른 거</span></div>
    <div class="t" style="margin-top:16px;font-size:38px">보드게임 카페</div>
    <div class="row" style="margin-top:14px;gap:10px"><span class="chip rep">⇄ 자주 · 4번 함</span><span class="chip like">♥ 둘 다 하고 싶어요</span><span class="xs mute">마지막 · 11월 14일</span></div>
    <div class="row" style="margin-top:22px"><span class="btn line">언제 할까?</span><span class="btn fill">✓ 했어요</span></div>
  </div>'''


def bucket_board():
    return f'''<div class="ui page">
  <div class="add"><span class="ph">하고 싶은 걸 한 줄로 적어요</span><div class="seg"><span class="on">해보기</span><span>자주</span></div><span class="plus">+</span></div>
  <div class="pick gap">뭐 할까? 골라줘</div>
  {_suggest()}
</div>'''


def plan_sheet():
    return f'''<div class="ui sheet">
  <div style="width:70px;height:7px;border-radius:9px;background:#eadfe1;margin:-14px auto 22px"></div>
  <div class="t" style="font-size:42px">언제 할까요?</div>
  <div style="margin-top:12px;color:#6b5e62">겨울 바다 보러 가기</div>
  <div class="row" style="margin-top:24px;flex-wrap:wrap;gap:14px">
    <span class="pill" style="background:#fff3f5;color:#e88098;box-shadow:inset 0 0 0 3px #ffb6c1;border-radius:16px;padding:16px 26px;font-size:27px">이번 주말 11월 28일</span>
    <span class="pill" style="background:#fff;box-shadow:inset 0 0 0 2.500px #ece2e4;border-radius:16px;padding:16px 26px;font-size:27px">다음 주말 12월 5일</span>
    <span class="pill" style="background:#fff;box-shadow:inset 0 0 0 2.500px #ece2e4;border-radius:16px;padding:16px 26px;font-size:27px">날짜 고르기</span>
  </div>
  <div class="sm" style="background:#fff6f7;border-radius:16px;padding:20px 24px;margin-top:22px;color:#6b5e62;line-height:1.5">캘린더에 커플 일정으로 추가돼요. 그날이 지나면 “했어요?”로 물어볼게요.</div>
  <div class="btn fill" style="margin-top:22px;border-radius:22px;padding:24px 0;font-size:30px">일정 만들기</div>
</div>'''


WHEEL = [('맛집 탐방', '#ffe3cf'), ('겨울 바다', '#ffd6e0'), ('김장 해보기', '#dff3df'), ('보드게임 카페', '#dce9fb'), ('집에서 영화', '#fff0c4'), ('전시회 가기', '#e6dcf7')]

def wheel_svg(size=520):
    n, R = len(WHEEL), 100
    step = 2 * math.pi / n
    out = '<circle r="108" fill="#fff"/>'
    for i, (name, fill) in enumerate(WHEEL):
        a0 = -math.pi / 2 - step / 2 + i * step
        a1 = a0 + step
        p = lambda a: f'{math.cos(a) * R:.2f},{math.sin(a) * R:.2f}'
        out += f'<path d="M0,0L{p(a0)}A{R},{R} 0 0 1 {p(a1)}Z" fill="{fill}" stroke="#fff" stroke-width="2.500"/>'
        deg = math.degrees((a0 + a1) / 2)
        out += (f'<text transform="rotate({deg:.1f}) translate(66,0) rotate({90 if math.sin(math.radians(deg)) < 0.01 else -90})" text-anchor="middle" dominant-baseline="central" '
                f'font-size="11.500" fill="#5a4d51" font-family="Jua">{name}</text>')
    return (f'<div class="wheelbox" style="--wd:{size}px"><span class="ptr"></span><svg viewBox="-110 -110 220 220">{out}</svg>'
            f'<span class="hub">돌리기</span></div>')


def wheel_modal():
    return f'''<div class="ui sheet" style="background:#fff3f5">
  <div style="margin-top:26px">{wheel_svg(430)}</div>
  <div class="c" style="margin-top:34px;text-align:center;position:relative"><span class="tape" style="left:50%;margin-left:-60px"></span>
    <div class="sm" style="color:#6b5e62">오늘은 이거!</div><div class="t" style="font-size:46px;margin-top:8px">맛집 탐방</div><div class="xs mute" style="margin-top:8px">하고 싶은 것</div>
    <div class="row" style="margin-top:20px"><span class="btn line">언제 할까?</span><span class="btn fill">오늘 했어요</span></div>
  </div>
</div>'''


def check_and_history():
    return '''<div class="ui page">
  <div class="c" style="border:4px solid #ffb6c1">
    <div class="sm rose">어제 하기로 한 것</div>
    <div class="t" style="font-size:40px;margin-top:16px;line-height:1.35">전시회 가기,<br />했어요?</div>
    <div class="row" style="margin-top:24px"><span class="btn line">아직이에요</span><span class="btn fill">✓ 했어요</span></div>
  </div>
  <div class="c gap" style="background:#fff">
    <div class="row"><span class="t" style="font-size:38px">보드게임 카페</span><span class="sp"></span><span class="chip rep">⇄ 자주</span></div>
    <div class="sm" style="color:#6b5e62;margin-top:14px">함께한 기록 · 4번</div>
    <div class="hrow"><b>11월 14일</b><span>“하나가 3연승. 다음엔 안 봐줌”</span></div>
    <div class="hrow"><b>11월 3일</b><span>“새로 생긴 곳 가봤는데 넓고 좋았다”</span></div>
  </div>
</div>'''


def achieved():
    def dn(nm, dt):
        return f'<div class="dn"><i></i><div><div style="font-size:30px">{nm}</div><div class="xs mute" style="margin-top:4px">{dt}</div></div></div>'
    return f'''<div class="ui page">
  <div class="filt"><span>전체 <b>6</b></span><span>해보고 싶은 것 <b>3</b></span><span>자주 할 것 <b>3</b></span><span class="on">이룬 것 <b>3</b></span></div>
  <div class="sm" style="margin:18px 8px 0;color:#6b5e62;line-height:1.5">해보고 싶은 것 중 이룬 것들이에요. 누르면 날짜·한 줄을 고치거나 되돌릴 수 있어요</div>
  <div class="c gap" style="padding:16px 24px">
    {dn('한강에서 라면 먹기', '11월 7일')}
    {dn('커플 사진 찍기', '10월 30일')}
    {dn('놀이공원 교복 데이트', '10월 3일')}
  </div>
</div>'''


# ── 봉인 편지 · 우리 이야기 ──
LOCK = '<svg viewBox="0 0 24 24" stroke="#e88098"><rect x="5" y="10.500" width="14" height="10" rx="2.500" fill="#ffd0d9"/><path d="M8 10.500V7.500a4 4 0 0 1 8 0v3"/></svg>'
UNLOCK = '<svg viewBox="0 0 24 24" stroke="#9a86d6"><rect x="5" y="10.500" width="14" height="10" rx="2.500" fill="#ddd5f6"/><path d="M8 10.500V7.500a4 4 0 0 1 7.500-2"/></svg>'
PEN = '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.500 6.500l4 4"/></svg>'
MAIL = '<svg viewBox="0 0 24 24"><path d="M3.500 10l8.500-5 8.500 5v8.500a1.500 1.500 0 0 1-1.500 1.500H5a1.500 1.500 0 0 1-1.500-1.500zM3.500 10l8.500 5 8.500-5"/></svg>'
I_PHOTO = _ico('<rect x="3.500" y="5" width="17" height="14" rx="2.500"/><path d="M3.500 15l4.500-4 4 3.500 3-2.500 5.500 4.500"/><circle cx="9" cy="9.500" r="1.300"/>')


def _letters():
    return f"""<div class="letter"><span>{LOCK}</span><div><div class="nm"><span class="wh" style="background:#d8f3e6;color:#3f9d6d">두리</span>크리스마스에 열어 봐</div><div class="xs rose" style="margin-top:8px">2026.11.27 작성 · 2026.12.25 00:00에 열려요</div></div></div>
  <div class="letter mine gap"><span>{UNLOCK}</span><div><div class="nm"><span class="wh" style="background:#e3dcf8;color:#7d6ac4">나</span>600일 축하해</div><div class="xs rose" style="margin-top:8px">2026.10.18 작성 · 2026.11.4 공개됨</div></div><span class="sp"></span><span class="mute">›</span></div>"""


def letter_write():
    return f"""<div class="ui sheet">
  <div class="lhead">{PEN}<span class="t">편지 봉인하기</span><span class="sp"></span><span class="rose" style="font-size:34px">×</span></div>
  <div class="box j">크리스마스에 열어 봐</div>
  <div class="box gap" style="min-height:170px;line-height:1.6;color:#4a3f42">메리 크리스마스! 올해도 옆에 있어 줘서 고마워. 내년엔 우리 지도 절반은 칠해 보자.</div>
  <div class="j" style="margin-top:28px;font-size:26px">공개 방식</div>
  <div class="row" style="margin-top:14px"><span class="btn" style="border-radius:18px;background:#f0e8fb;color:#7d6ac4;box-shadow:inset 0 0 0 3px #cfc5f2;font-size:26px;padding:18px 0">시각 예약</span><span class="btn" style="border-radius:18px;background:#faf7f8;color:#e88098;box-shadow:inset 0 0 0 2.500px #ece2e4;font-size:26px;padding:18px 0">직접 공개</span></div>
  <div class="row" style="margin-top:16px;font-family:Pretendard"><span class="box" style="flex:1.600">2026-12-25</span><span class="box" style="flex:1">00시</span><span class="box" style="flex:1">00분</span></div>
  <div class="row" style="margin-top:28px"><span class="btn" style="border-radius:18px;background:#f4f1f2;color:#e88098">취소</span><span class="btn fill" style="border-radius:18px">봉인하기</span></div>
</div>"""


def letter_box():
    return f"""<div class="ui page">
  <div class="row" style="padding:4px 6px 22px"><span class="mute">←</span><span class="t" style="font-size:34px">봉인 편지함</span><span class="sp"></span><span class="btn fill" style="flex:none;padding:14px 26px;border-radius:18px;font-size:24px">+ 편지 쓰기</span></div>
  {_letters()}
  <div class="c gap" style="padding:0;overflow:hidden;background:#fff"><div class="lhead" style="margin:0;border-radius:0;padding:24px 30px">{MAIL}<span class="t">600일 축하해</span></div>
    <div style="padding:26px 30px 30px;line-height:1.6">벌써 600일이네. 같이 다닌 곳들이 지도에 하나씩 칠해지는 게 좋아. 다음 600일도 잘 부탁해.<div class="xs rose" style="margin-top:16px">2026.10.18 작성 · 2026.11.4 공개</div></div></div>
</div>"""


def letter_piece():
    return f'<div class="ui page">{_letters()}</div>'


def on_this_day():
    def r(nm, dt, ago):
        return f'<div class="otd"><div><div class="j" style="font-size:31px">{nm}</div><div class="xs mute" style="margin-top:4px">{dt}</div></div><span class="sp"></span><span class="agochip">{ago}</span></div>'
    return f"""<div class="ui page">
  <div class="c hc"><div class="h">{I_PHOTO}그날의 우리</div>
    <div style="margin-top:10px">
    {r('첫 제주 여행 둘째 날', '2025년 11월 27일 (목)', '1년 전')}
    {r('처음 같이 본 영화', '2024년 11월 28일 (목)', '2년 전')}
    {r('첫 제주 여행 첫째 날', '2025년 11월 26일 (수)', '1년 전')}
    </div></div>
  <div class="c hc"><div class="h">{I_MAP}우리 지도</div><div class="row"><div><div class="m">함께 가 본 곳 <span class="rose">4</span>/16</div><div class="s">누르면 시·군·구까지 볼 수 있어요</div></div><span class="sp"></span><span class="mute">›</span></div></div>
</div>"""


def _recap_head(n, title):
    bars = ''.join(f'<i class="{"on" if i < n else ""}"></i>' for i in range(4))
    return f'<div class="bars">{bars}</div><div class="row" style="margin-top:18px"><span class="sm">2026년 10월의 우리</span><span class="sp"></span><span style="font-size:34px">×</span></div><div class="t" style="font-size:42px;line-height:1.3;margin:18px 0 20px">{title}</div>'


def recap_stats():
    def tile(bg, st, path, n, lab, sub=''):
        return f'<div class="tile"><span class="ic3" style="background:{bg}"><svg viewBox="0 0 24 24" stroke="{st}">{path}</svg></span><b>{n}</b><span>{lab}</span>' + (f'<span class="xs mute" style="margin-top:4px">{sub}</span>' if sub else '') + '</div>'
    return f"""<div class="ui recap">
  {_recap_head(2, '숫자로 보는<br />이번 달 우리')}
  <div class="grid2">
    {tile('#ffe3e8', '#e0566f', '<rect x="4" y="5.500" width="16" height="14.500" rx="3"/><path d="M4 10h16M8.500 3.500v4M15.500 3.500v4"/>', 5, '함께한 일정')}
    {tile('#e8defa', '#7a5fc9', '<path d="M4 5l16 7-16 7 3-7zM7 12h13"/>', 1, '여행 · 제주도', '2박 3일')}
    {tile('#dcf3e3', '#3f9d6d', '<path d="M6 12.500l4 4 8-8.500"/>', 5, '이룬 버킷리스트', '남은 버킷 6개')}
    {tile('#fdf0c4', '#b58a2a', '<rect x="4" y="6.500" width="16" height="12" rx="2.500"/><path d="M4.500 8l7.500 5.500L19.500 8"/>', 1, '주고받은 편지')}
  </div>
</div>"""


def recap_next():
    def nx(nm, sub, d):
        return f'<div class="nx"><div><div class="j" style="font-size:30px">{nm}</div><div class="xs" style="color:#6b5e62;margin-top:4px">{sub}</div></div><span class="sp"></span><span class="d">{d}</span></div>'
    return f"""<div class="ui recap">
  {_recap_head(4, '11월에는<br />이런 날이 기다려요')}
  {nx('600일', '11월 3일 · 기념일', 'D-3')}
  {nx('빼빼로데이', '11월 11일 · 이벤트데이', 'D-11')}
  {nx('예정된 일정 8개', '가장 가까운 일정 · 11월 7일 한강에서 라면 먹기', '8')}
  <div class="row" style="margin-top:30px"><span class="btn line">이미지로 저장</span><span class="btn fill">일정 추가하러 가기</span></div>
</div>"""


# ── 우리 지도 · 추억 ──
def map_full():
    return """<div class="ui page">
  <div class="c"><div class="row"><span class="t">함께 가 본 곳 <span class="rose" style="font-size:46px">5</span>/16</span><span class="sp"></span><span class="sm mute">여행 5번</span></div><div class="prog"><i style="width:31%"></i></div><div class="xs mute" style="margin-top:14px">가장 최근 강원(12월 18일)</div></div>
  <div class="c gap" style="text-align:center;padding:26px"><div class="mapsvg" style="width:500px;margin:0 auto"><!--MAP:11,26,47,50,51--></div>
    <div class="row xs mute" style="justify-content:center;gap:22px;margin-top:10px"><span>○ 아직</span><span style="color:#ffb0bd">● 1번</span><span style="color:#ff8fa3">● 2번</span><span style="color:#e07a93">● 3번+</span></div></div>
</div>"""


def map_sheet():
    def row(mon, nm, dt):
        return f'<div class="c gap" style="padding:22px 28px"><div class="row" style="gap:26px"><span class="j rose" style="font-size:27px;width:70px">{mon}</span><div><div style="font-size:29px">{nm}</div><div class="xs mute" style="margin-top:4px">{dt}</div></div><span class="sp"></span><span class="mute">›</span></div></div>'
    return f"""<div class="ui sheet">
  <div style="width:70px;height:7px;border-radius:9px;background:#eadfe1;margin:-14px auto 22px"></div>
  <div class="row"><div><div class="t" style="font-size:42px">강원특별자치도</div><div class="sm" style="color:#6b5e62;margin-top:8px">함께한 여행 1번 · 마지막 12월 18일</div></div><span class="sp"></span>{X}</div>
  {row('12월', '강릉 1박 2일', '12월 18일 – 19일')}
  <div class="row" style="margin-top:24px"><span class="btn fill">시·군·구 보기</span><span class="btn line">여기로 또 가기</span></div>
  <div class="j" style="margin-top:34px;font-size:27px">자주 간 곳 <span class="rose" style="font-family:Gowun Dodum;font-size:22px">5곳</span></div>
  {row('강원', '강원특별자치도', '여행 1번 · 마지막 12월 18일')}
</div>"""


def map_sgg():
    return """<div class="ui page">
  <div class="row" style="padding:4px 6px 20px"><span class="mute">←</span><span class="t" style="font-size:38px">강원</span></div>
  <div class="c"><div class="row"><span class="t">함께 가 본 곳 <span class="rose" style="font-size:46px">1</span>/18</span><span class="sp"></span><span class="sm mute">여행 1번</span></div><div class="prog"><i style="width:6%"></i></div><div class="xs mute" style="margin-top:14px">가장 최근 강릉 1박 2일(12월 18일)</div></div>
  <div class="c gap" style="text-align:center;padding:30px"><div class="mapsvg" style="width:470px;margin:0 auto"><!--SGG:51:51150--></div>
    <div class="row xs mute" style="justify-content:center;gap:22px;margin-top:14px"><span>○ 아직</span><span style="color:#ffb0bd">● 1번</span><span style="color:#ff8fa3">● 2번</span><span style="color:#e07a93">● 3번+</span></div></div>
</div>"""


def memories():
    def m(nm, dt, kind, lab, me=False):
        return f'<div class="c gap" style="padding:24px 28px"><div class="mem"><i class="av2{" me" if me else ""}"></i><div><div class="j" style="font-size:30px">{nm}</div><div class="xs mute" style="margin-top:6px">{dt}</div></div><span class="sp"></span><span class="tchip {kind}">{lab}</span></div></div>'
    return f"""<div class="ui page">
  <div class="search">제목이나 내용으로 검색…</div>
  <div class="filt gap"><span class="on">전체</span><span>개인</span><span>데이트</span><span>하나</span><span>두리</span></div>
  {m('저녁 같이 먹기', '2026년 11월 27일', 'us', '데이트')}
  {m('영화 보기', '2026년 11월 21일', 'us', '데이트')}
  {m('야근', '2026년 11월 18일', 'me', '하나', True)}
</div>"""


def memory_modal():
    return f"""<div class="ui sheet">
  <div class="row"><span class="t" style="font-size:40px">영화 보기</span><span class="sp"></span>{X}</div>
  <div class="row" style="margin-top:26px"><span class="mute">2026년 11월 21일</span><span class="sp"></span><span class="tchip us" style="font-size:23px;padding:6px 18px">데이트</span></div>
  <div style="border-top:2.500px dashed #f0dfe2;margin:34px 0 26px"></div>
  <div class="btn fill" style="border-radius:22px;padding:24px 0;font-size:30px">해당 일정으로 가기</div>
</div>"""


# ── 첫 실행(가입 → 닉네임 → 연결) ──
def _steps(n):
    return '<div class="steps">' + ''.join(f'<i class="{"on" if i < n else ""}"></i>' for i in range(3)) + '</div>'


def ob_start():
    g = '<svg viewBox="0 0 24 24" style="width:34px;height:34px"><path fill="#4285F4" d="M21.600 12.200c0-.700-.100-1.300-.200-2H12v3.800h5.400a4.600 4.600 0 0 1-2 3v2.500h3.200c1.900-1.700 3-4.300 3-7.300z"/><path fill="#34A853" d="M12 22c2.700 0 5-.900 6.600-2.400l-3.200-2.500c-.900.600-2 1-3.400 1-2.600 0-4.800-1.800-5.600-4.100H3.100v2.600A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.400 14c-.200-.600-.300-1.300-.300-2s.100-1.400.300-2V7.400H3.100a10 10 0 0 0 0 9.200z"/><path fill="#EA4335" d="M12 5.900c1.500 0 2.800.500 3.800 1.500l2.900-2.800A10 10 0 0 0 3.100 7.400L6.400 10c.800-2.300 3-4.100 5.600-4.100z"/></svg>'
    return f"""<div class="ui ob">
  <div class="row"><span class="rose" style="font-size:34px">♥</span><span class="j rose" style="font-size:44px">우리두리</span></div>
  <div class="obq" style="margin-top:44px">둘이 함께 쓰는<br />우리 다이어리</div>
  <div class="obd">일정도, 여행도, 하고 싶은 것도<br />한 곳에 같이 모아요.</div>
  <div class="big" style="background:#fff;box-shadow:inset 0 0 0 2.500px #f0e0e3;margin-top:44px;display:flex;justify-content:center;align-items:center;gap:14px">{g}구글로 시작하기</div>
  <div class="big j" style="background:#ffb6c1;color:#fff;margin-top:16px">이메일로 시작하기</div>
  <div class="sm" style="text-align:center;margin-top:28px">이미 계정이 있나요? <span class="rose" style="text-decoration:underline">로그인</span></div>
</div>"""


def ob_nickname():
    return f"""<div class="ui ob">
  {_steps(1)}
  <div class="obq">상대가 나를<br />뭐라고 부르면 좋을까요?</div>
  <div class="obd">짧고 부르기 쉬운 이름이면 좋아요.<br />나중에 프로필에서 바꿀 수 있어요.</div>
  <div class="lb">닉네임</div>
  <div class="field focus j">하나</div>
  <div class="xs mute" style="margin:30px 0 12px">상대 화면에서는 이렇게 보여요</div>
  <div class="c"><div class="xs mute">오늘 · 오후 7:00</div><div style="font-size:30px;margin-top:10px">성수동 저녁 약속</div><span class="chip" style="background:#dcf7dc;color:#3f9d55;margin-top:12px">하나님이 추가함</span></div>
  <div class="big j" style="background:#ffb6c1;color:#fff;margin-top:34px">다음</div>
</div>"""


def _choices():
    return """<div class="choice"><span class="ic4" style="background:#ffe3e8"><svg viewBox="0 0 24 24" stroke="#ff8fa3"><rect x="3" y="5.500" width="18" height="13.500" rx="2.500" fill="#ffb6c1" stroke="none"/><path d="M4 7.500l8 5.500 8-5.500" stroke="#fff"/></svg></span><div><b>내가 초대할게요</b><span>초대 코드를 만들어 상대에게 보내요</span></div><span class="sp"></span><span class="mute">›</span></div>
  <div class="choice"><span class="ic4" style="background:#dfeafc"><svg viewBox="0 0 24 24" stroke="#3d6fb5"><circle cx="8" cy="15.500" r="4"/><path d="M11 12.500l8.500-8.500M16 7.500l2.500 2.500M18.500 5l2 2"/></svg></span><div><b>초대 코드를 받았어요</b><span>받은 6자리 코드를 입력해요</span></div><span class="sp"></span><span class="mute">›</span></div>"""


def ob_choice():
    return f"""<div class="ui ob">
  {_steps(2)}
  <div class="obq">이제 상대와<br />연결해 볼까요?</div>
  <div class="obd">둘 중 한 명만 초대하면 돼요.</div>
  <div style="margin-top:14px">{_choices()}</div>
</div>"""


def ob_choice_piece():
    return f'<div class="ui ob" style="padding:26px 34px 34px">{_choices()}</div>'


def ob_invite():
    return """<div class="ui ob">
  <div class="obq">우리가 처음 만난 날은<br />언제인가요?</div>
  <div class="obd">홈에 함께한 날(D+day)과 기념일이 표시돼요.<br />나중에 커플 정보에서 바꿀 수 있어요.</div>
  <div class="lb">연애 시작일</div>
  <div class="field focus" style="font-family:Pretendard">2025-03-14<span class="sp"></span><span class="mute">▦</span></div>
  <div class="big j" style="background:#ffb6c1;color:#fff;margin-top:44px">초대 코드 만들기</div>
</div>"""


def ob_join():
    return """<div class="ui ob">
  <div class="obq">받은 초대 코드를<br />입력해 주세요</div>
  <div class="obd">상대가 보낸 메시지에 있는 6자리 코드예요.</div>
  <div class="lb">초대 코드</div>
  <div class="field focus j" style="font-size:44px;letter-spacing:.22em;justify-content:center;padding:26px">A7K2QM</div>
  <div class="big j" style="background:#ffb6c1;color:#fff;margin-top:44px">연결하기</div>
</div>"""
