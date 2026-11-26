# 릴스(1080x1920) 소개 영상 — 게시물과 별개로, 마스코트 둘(하나·두리)이 나오는 짧은 이야기.
# 사용: python scripts/instagram/reel.py → marketing/instagram/reel/reel.html
#       node scripts/instagram/reel.mjs   → 프레임을 찍어 marketing/instagram/reel/reel.mp4
# 이야기: 서로 일정을 헷갈려 계속 물어봄 → 한 달력에 같이 적음 → 안 물어봐도 보임 → 여행·뭐 할지·편지도 → 우리두리
import math
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'marketing', 'instagram', 'reel')
TOTAL = 26000  # 전체 길이(ms)

SOFT = 'cubic-bezier(.22,1,.36,1)'       # 부드럽게 멈춤
SPRING = 'cubic-bezier(.34,1.5,.64,1)'    # 살짝 튕김
INOUT = 'cubic-bezier(.65,0,.35,1)'       # 천천히 출발해 천천히 멈춤


def an(name, t, d=800, e=SOFT, fill='both'):
    return f'{name} {d}ms {e} {t}ms {fill}'


def show(t_in, t_out=None, name='pop', d=750, e=SPRING):
    """나타났다가(t_in) 사라지는(t_out) 요소의 animation 값."""
    out = f', bye 450ms ease {t_out}ms forwards' if t_out else ''
    return f'animation:{an(name, t_in, d, e)}{out}'


# ── 캐릭터 ──
def blob(main, shade, look):
    """look: 1이면 오른쪽(상대)을 봄, -1이면 왼쪽을 봄."""
    dx = 10 * look
    return f'''<svg viewBox="0 0 200 232" class="blob">
  <ellipse cx="100" cy="220" rx="64" ry="9" fill="rgba(90,70,80,.13)"/>
  <rect x="64" y="186" width="24" height="34" rx="11" fill="{shade}"/><rect x="114" y="186" width="24" height="34" rx="11" fill="{shade}"/>
  <ellipse cx="100" cy="108" rx="81" ry="93" fill="{shade}" transform="rotate({-5 * look} 100 108)"/>
  <ellipse cx="{100 + 4 * look}" cy="103" rx="76" ry="88" fill="{main}" transform="rotate({-5 * look} 100 108)"/>
  <ellipse cx="66" cy="50" rx="17" ry="8" fill="#fff" opacity=".42" transform="rotate(-30 66 50)"/>
  <g transform="translate({dx} 0)">
    <g class="eyes"><circle cx="80" cy="108" r="7.500" fill="#2b2b33"/><circle cx="122" cy="108" r="7.500" fill="#2b2b33"/></g>
    <path class="m-worry" d="M93 124q4-3 8 0t8 0" stroke="#2b2b33" stroke-width="4.500" fill="none" stroke-linecap="round"/>
    <path class="m-smile" d="M89 120q12 11 24 0" stroke="#2b2b33" stroke-width="4.500" fill="none" stroke-linecap="round"/>
    <ellipse class="cheek" cx="64" cy="124" rx="9" ry="5.500" fill="#ff8fa3"/><ellipse class="cheek" cx="138" cy="124" rx="9" ry="5.500" fill="#ff8fa3"/>
  </g>
</svg>'''

HANA = blob('#93b4cc', '#7c9fb9', 1)
DURI = blob('#f8b592', '#ef9f79', -1)
HOPS_H = [600, 4850, 6850, 9500, 10000, 13250, 15900, 17500, 19100, 20800, 21300]
HOPS_D = [1600, 5850, 9650, 10150, 16050, 17650, 19250, 20950, 21450]


def who(cls, svg, hops, left):
    hop = ', '.join(an('hop', t, 620, 'ease-in-out', 'none') for t in hops)
    return f'<div class="who {cls}" style="left:{left}px"><div class="hopper" style="animation:{hop}"><div class="sway">{svg}</div></div></div>'


HEART = '<svg viewBox="0 0 24 24"><path d="M12 20.500s-8-4.900-8-10.700A4.600 4.600 0 0 1 12 7a4.600 4.600 0 0 1 8 2.800c0 5.800-8 10.700-8 10.700z"/></svg>'


def cap(t_in, t_out, l1, l2):
    return (f'<div class="cap"><div style="animation:{an("rise", t_in)}, bye 400ms ease {t_out}ms forwards">{l1}</div>'
            f'<div style="animation:{an("rise", t_in + 200)}, bye 400ms ease {t_out}ms forwards"><em>{l2}</em></div></div>')


def think(cls, t_in, t_out, text):
    return f'<div class="think {cls}" style="{show(t_in, t_out)}">{text}</div>'


def fly(cls, t, t_out, text, name):
    return f'<div class="fly {cls}" style="animation:{an(name, t, 900, INOUT)}, bye 400ms ease {t_out}ms forwards">{text}</div>'


# ── 달력(그림) ──
CHIPS = {3: ('h', '출장'), 5: ('u', '데이트'), 9: ('d', '회식'), 11: ('h', '필테'), 12: ('d', '결혼식'),
         18: ('u', '여행'), 19: ('u', '여행'), 24: ('u', '데이트'), 27: ('d', '모임')}

def calendar():
    cells = ''
    order = 0
    for i in range(28):
        day = i + 1
        chip = ''
        if day in CHIPS:
            k, label = CHIPS[day]
            src = {'h': 'chipL', 'd': 'chipR', 'u': 'chipC'}[k]
            chip = f'<b class="chip {k}" style="animation:{an(src, 10700 + order * 210, 900, SOFT)}">{label}</b>'
            order += 1
        ring = '<i class="ring"></i>' if day == 9 else ''
        cells += f'<div class="cell"><span>{day}</span>{chip}{ring}</div>'
    dows = ''.join(f'<span>{d}</span>' for d in '일월화수목금토')
    return f'''<div class="calwrap" style="{show(9500, 15350, 'pop', 950)}"><div class="cal">
  <div class="calhead"><b>12월</b><i>{HEART}</i><span>우리 달력</span></div>
  <div class="dows">{dows}</div>
  <div class="cells">{cells}</div>
</div></div>'''


# ── 기능 세 가지(그림) ──
def wheel():
    fills = ['#ffd6e0', '#fdebb8', '#c7ceea', '#b5ead7', '#e8d7f1', '#ffe3cf']
    step = 2 * math.pi / 6
    segs = ''
    for i, f in enumerate(fills):
        a0 = -math.pi / 2 - step / 2 + i * step
        a1 = a0 + step
        p = lambda a: f'{math.cos(a) * 100:.2f},{math.sin(a) * 100:.2f}'
        segs += f'<path d="M0,0L{p(a0)}A100,100 0 0 1 {p(a1)}Z" fill="{f}" stroke="#fff" stroke-width="3"/>'
    return (f'<div class="obj wheel" style="{show(17250, 18750)}"><i class="ptr"></i>'
            f'<svg viewBox="-112 -112 224 224"><circle r="110" fill="#fff"/><g class="wspin">{segs}</g><circle r="24" fill="#fff"/><circle r="14" fill="#ff9bac"/></svg></div>')

SUITCASE = f'''<div class="obj trip" style="{show(15650, 17150)}">
  <svg viewBox="0 0 420 420">
    <path class="route" d="M40 330 C 120 240, 200 380, 300 250 S 360 150 372 118" fill="none" stroke="#b79ad8" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 20"/>
    <g class="case">
      <path d="M150 120v-34a22 22 0 0 1 22-22h56a22 22 0 0 1 22 22v34" fill="none" stroke="#9c7fc4" stroke-width="14" stroke-linecap="round"/>
      <rect x="70" y="116" width="260" height="212" rx="34" fill="#d9c7ee"/>
      <rect x="70" y="116" width="260" height="212" rx="34" fill="none" stroke="#c4aee2" stroke-width="6"/>
      <rect x="126" y="116" width="20" height="212" fill="#c4aee2"/><rect x="254" y="116" width="20" height="212" fill="#c4aee2"/>
      <circle cx="120" cy="344" r="16" fill="#9c7fc4"/><circle cx="280" cy="344" r="16" fill="#9c7fc4"/>
      <g transform="translate(176 190) scale(2)"><path d="M12 20.500s-8-4.900-8-10.700A4.600 4.600 0 0 1 12 7a4.600 4.600 0 0 1 8 2.800c0 5.800-8 10.700-8 10.700z" fill="#fff"/></g>
    </g>
    <g class="pin"><path d="M372 132c-22-26-34-44-34-62a34 34 0 0 1 68 0c0 18-12 36-34 62z" fill="#ff8fa3"/><circle cx="372" cy="70" r="13" fill="#fff"/></g>
  </svg></div>'''

LETTER = f'''<div class="obj letter" style="{show(18850, 20450)}">
  <svg viewBox="0 0 420 380">
    <rect x="40" y="90" width="340" height="240" rx="26" fill="#fff"/>
    <rect x="40" y="90" width="340" height="240" rx="26" fill="none" stroke="#ffc9d3" stroke-width="6"/>
    <path d="M46 318l122-110M374 318L252 208" stroke="#ffe3e8" stroke-width="6" stroke-linecap="round"/>
    <path class="flap" d="M44 112q0-22 26-22h280q26 0 26 22L226 232q-16 12-32 0z" fill="#ffe3e8" stroke="#ffc9d3" stroke-width="6" stroke-linejoin="round"/>
    <g class="seal" transform="translate(210 222)"><circle r="40" fill="#ff9bac"/><g transform="translate(-22 -23) scale(1.850)"><path d="M12 20.500s-8-4.900-8-10.700A4.600 4.600 0 0 1 12 7a4.600 4.600 0 0 1 8 2.800c0 5.800-8 10.700-8 10.700z" fill="#fff"/></g></g>
  </svg>
  <div class="when" style="animation:{an('pop', 19650, 700, SPRING)}">12월 25일에 열려요</div></div>'''


def word(t_in, t_out, text):
    return f'<div class="word" style="animation:{an("wordIn", t_in, 700, SPRING)}, bye 350ms ease {t_out}ms forwards">{text}</div>'


def hearts(t0):
    spots = [(110, 0, 56), (330, 1100, 34), (800, 500, 48), (930, 1700, 30), (560, 2300, 40), (220, 2900, 28)]
    return ''.join(f'<i class="heart" style="left:{x}px;width:{s}px;height:{s}px;animation:floatUp 5200ms linear {t0 + d}ms infinite">{HEART}</i>' for x, d, s in spots)


BODY = f'''
<!-- 배경: 처음엔 둘로 나뉜 화면 → 하나로 합쳐짐 → 기능마다 색 → 마무리 -->
<div class="bg half l"></div><div class="bg half r"></div>
<div class="bg seam" style="animation:bye 500ms ease 8900ms forwards"></div>
<div class="bg wipe" style="animation:{an('wipe', 8900, 1300, INOUT)}"></div>
<div class="bg" style="background:#f5eefa;animation:{an('fadeIn', 15450, 500, 'ease')}"></div>
<div class="bg" style="background:#fff5dc;animation:{an('fadeIn', 17100, 500, 'ease')}"></div>
<div class="bg" style="background:#e9f7f1;animation:{an('fadeIn', 18750, 500, 'ease')}"></div>
<div class="bg" style="background:#fce6e8;animation:{an('fadeIn', 20400, 600, 'ease')}"></div>

<!-- 1. 헷갈림 -->
{cap(300, 4300, '서로 일정,', '맨날 헷갈리죠?')}
{think('tl', 900, 4350, '내일…<br />뭐였더라?')}
{think('tr', 1900, 4350, '토요일에<br />뭐 있었지?')}
<div class="q ql" style="{show(650, 4350)}"><span>?</span></div>
<div class="q qr" style="{show(1650, 4350)}"><span>?</span></div>

<!-- 2. 물어보고 또 물어보고 -->
{cap(4650, 8500, '물어보고,', '또 물어보고')}
{fly('fl', 4950, 6000, '내일 어디 가?', 'flyR')}
{fly('fr', 5950, 7000, '회식! 어제 말했는데 ㅎㅎ', 'flyL')}
{fly('fl', 6950, 8500, '…그럼 토요일은?', 'flyR')}
<div class="count" style="{show(5200, 8500)}">오늘만 <span class="nums"><b style="animation:bye 250ms ease 6100ms forwards">1</b><b style="animation:{an('pop', 6150, 450, SPRING)}, bye 250ms ease 7100ms forwards">2</b><b style="animation:{an('pop', 7150, 450, SPRING)}">3</b></span>번째 질문</div>

<!-- 3. 한 달력에 같이 -->
{cap(9200, 13050, '이제 한 달력에', '같이 적어요')}
{calendar()}
{cap(13300, 15300, '안 물어봐도', '다 보여요')}
{think('aha', 13350, 15300, '아, 내일 회식이구나!')}

<!-- 4. 여행도, 뭐 할지도, 편지도 -->
{word(15650, 17100, '여행 계획도')}
{SUITCASE}
{word(17300, 18750, '오늘 뭐 할지도')}
{wheel()}
{word(18950, 20400, '아껴 둔 편지도')}
{LETTER}

<!-- 5. 마무리 -->
{hearts(20600)}
<div class="balloon" style="animation:{an('balloonUp', 21500, 1500, SOFT)}"><div class="bsway"><svg viewBox="0 0 120 300"><path d="M60 118q-14 60 6 100t-8 80" fill="none" stroke="#5b4a50" stroke-width="2.500"/><path d="M60 118c-34-22-52-44-52-70a30 30 0 0 1 52-20 30 30 0 0 1 52 20c0 26-18 48-52 70z" fill="#ee5d5f"/><ellipse cx="34" cy="38" rx="9" ry="5" fill="#fff" opacity=".5" transform="rotate(-35 34 38)"/></svg></div></div>
<div class="brand" style="animation:{an('pop', 22000, 900, SPRING)}">우리두리</div>
<div class="tag" style="animation:{an('rise', 22500)}">둘이 같이 쓰는 커플 캘린더</div>
<div class="store" style="animation:{an('pop', 23300, 850, SPRING)}">Google Play에서 <b>‘우리두리’</b> 검색</div>
<div class="free" style="animation:{an('fadeIn', 23900, 700, 'ease')}">안드로이드 · 무료 설치</div>

<!-- 주인공 둘(처음부터 끝까지) -->
{who('hana', HANA, HOPS_H, 120)}
{who('duri', DURI, HOPS_D, 660)}
'''

CSS = f'''
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{ background: #000; }}
#stage {{ width: 1080px; height: 1920px; position: relative; overflow: hidden; font-family: 'Pretendard', sans-serif; color: #2a2225; word-break: keep-all; }}
#stage > * {{ position: absolute; }}

@keyframes pop {{ from {{ opacity: 0; transform: scale(.5); }} 50% {{ opacity: 1; }} to {{ opacity: 1; transform: none; }} }}
@keyframes rise {{ from {{ opacity: 0; transform: translateY(70px); }} to {{ opacity: 1; transform: none; }} }}
@keyframes fadeIn {{ from {{ opacity: 0; }} to {{ opacity: 1; }} }}
@keyframes bye {{ to {{ opacity: 0; transform: scale(.94); }} }}
@keyframes wipe {{ from {{ clip-path: circle(0% at 50% 62%); }} to {{ clip-path: circle(150% at 50% 62%); }} }}
@keyframes hop {{ 0%, 100% {{ transform: none; }} 18% {{ transform: scale(1.070, .900); }} 50% {{ transform: translateY(-74px) scale(.960, 1.060); }} 82% {{ transform: scale(1.050, .930); }} }}
@keyframes sway {{ from {{ transform: rotate(-2.200deg); }} to {{ transform: rotate(2.200deg); }} }}
@keyframes blink {{ 0%, 92%, 100% {{ transform: scaleY(1); }} 96% {{ transform: scaleY(.1); }} }}
@keyframes wobble {{ from {{ transform: rotate(-9deg) translateY(0); }} to {{ transform: rotate(9deg) translateY(-12px); }} }}
@keyframes flyR {{ 0% {{ opacity: 0; transform: translate(0, 0) scale(.4); }} 18% {{ opacity: 1; }} 55% {{ transform: translate(250px, -150px) scale(1); }} 100% {{ opacity: 1; transform: translate(430px, -20px) scale(1); }} }}
@keyframes flyL {{ 0% {{ opacity: 0; transform: translate(0, 0) scale(.4); }} 18% {{ opacity: 1; }} 55% {{ transform: translate(-250px, -150px) scale(1); }} 100% {{ opacity: 1; transform: translate(-430px, -20px) scale(1); }} }}
@keyframes chipL {{ 0% {{ opacity: 0; transform: translate(-260px, 760px) scale(.3) rotate(-30deg); }} 25% {{ opacity: 1; }} 100% {{ opacity: 1; transform: none; }} }}
@keyframes chipR {{ 0% {{ opacity: 0; transform: translate(260px, 760px) scale(.3) rotate(30deg); }} 25% {{ opacity: 1; }} 100% {{ opacity: 1; transform: none; }} }}
@keyframes chipC {{ 0% {{ opacity: 0; transform: translate(0, 760px) scale(.3); }} 25% {{ opacity: 1; }} 100% {{ opacity: 1; transform: none; }} }}
@keyframes ringPulse {{ 0% {{ opacity: 0; transform: scale(.7); }} 30% {{ opacity: 1; }} 100% {{ opacity: 0; transform: scale(1.5); }} }}
@keyframes wordIn {{ from {{ opacity: 0; transform: translateY(60px) scale(.8) rotate(-3deg); }} to {{ opacity: 1; transform: none; }} }}
@keyframes spin {{ from {{ transform: rotate(0deg); }} to {{ transform: rotate(960deg); }} }}
@keyframes drop {{ 0% {{ opacity: 0; transform: translateY(-160px); }} 60% {{ opacity: 1; transform: translateY(0); }} 78% {{ transform: translateY(-22px); }} 100% {{ opacity: 1; transform: none; }} }}
@keyframes flapClose {{ from {{ transform: scaleY(-.7); }} to {{ transform: scaleY(1); }} }}
@keyframes floatUp {{ 0% {{ transform: translateY(0) rotate(-8deg); opacity: 0; }} 12% {{ opacity: .6; }} 80% {{ opacity: .35; }} 100% {{ transform: translateY(-950px) rotate(10deg); opacity: 0; }} }}
@keyframes balloonUp {{ from {{ opacity: 0; transform: translateY(520px); }} 20% {{ opacity: 1; }} to {{ opacity: 1; transform: none; }} }}
@keyframes hanaC {{ to {{ transform: translate(165px, 250px) scale(.840); }} }}
@keyframes duriC {{ to {{ transform: translate(-165px, 250px) scale(.840); }} }}
@keyframes hanaF {{ from {{ transform: translate(165px, 250px) scale(.840); }} to {{ transform: translate(122px, -170px) scale(1.120); }} }}
@keyframes duriF {{ from {{ transform: translate(-165px, 250px) scale(.840); }} to {{ transform: translate(-122px, -170px) scale(1.120); }} }}
@keyframes smileOn {{ to {{ opacity: 1; }} }}
@keyframes worryOff {{ to {{ opacity: 0; }} }}
@keyframes cheekOn {{ to {{ opacity: .55; }} }}

/* 배경 */
.bg {{ inset: 0; }}
.bg.half {{ width: 540px; }} .bg.half.l {{ left: 0; right: auto; background: #e1ecf5; }} .bg.half.r {{ left: 540px; background: #ffeadf; }}
.bg.seam {{ left: 537px; right: auto; width: 6px; background: repeating-linear-gradient(#fff 0 26px, transparent 26px 52px); opacity: .9; }}
.bg.wipe {{ background: #fff9f7; }}

/* 주인공 */
.who {{ top: 1060px; width: 300px; height: 348px; transform-origin: 50% 100%; }}
.who.hana {{ animation: {an('hanaC', 9300, 1300, INOUT)}, {an('hanaF', 20500, 1400, INOUT, 'forwards')}; }}
.who.duri {{ animation: {an('duriC', 9300, 1300, INOUT)}, {an('duriF', 20500, 1400, INOUT, 'forwards')}; }}
.hopper, .sway {{ width: 100%; height: 100%; transform-origin: 50% 96%; }}
.sway {{ animation: sway 2400ms ease-in-out infinite alternate; }}
.duri .sway {{ animation-duration: 2800ms; animation-delay: -900ms; }}
.blob {{ width: 100%; height: 100%; overflow: visible; }}
.blob .eyes {{ transform-box: fill-box; transform-origin: center; animation: blink 3400ms ease-in-out infinite; }}
.duri .blob .eyes {{ animation-delay: -1300ms; }}
.blob .m-smile {{ opacity: 0; animation: smileOn 300ms ease 9600ms forwards; }}
.blob .m-worry {{ animation: worryOff 300ms ease 9600ms forwards; }}
.blob .cheek {{ opacity: 0; animation: cheekOn 500ms ease 9800ms forwards; }}

/* 자막 */
.cap {{ left: 80px; right: 60px; top: 240px; font-size: 98px; line-height: 1.2; font-weight: 800; letter-spacing: -0.045em; }}
.cap em {{ font-style: normal; color: #e07a93; }}

/* 생각 풍선 · 물음표 */
.think {{ background: #fff; border-radius: 56px; padding: 34px 46px; font-size: 46px; font-weight: 700; line-height: 1.3; letter-spacing: -0.03em; text-align: center; box-shadow: 0 16px 40px rgba(90,70,90,.1); }}
.think::after, .think::before {{ content: ''; position: absolute; background: #fff; border-radius: 50%; }}
.think::after {{ width: 34px; height: 34px; bottom: -44px; }} .think::before {{ width: 18px; height: 18px; bottom: -74px; }}
.think.tl {{ left: 70px; top: 690px; transform-origin: 60% 130%; }} .think.tl::after {{ left: 170px; }} .think.tl::before {{ left: 196px; }}
.think.tr {{ left: 590px; top: 630px; transform-origin: 40% 130%; }} .think.tr::after {{ left: 190px; }} .think.tr::before {{ left: 178px; }}
.think.aha {{ left: 90px; top: 1150px; font-size: 44px; padding: 30px 42px; transform-origin: 50% 130%; }} .think.aha::after {{ left: 250px; bottom: -40px; }} .think.aha::before {{ left: 274px; bottom: -66px; }}
.q {{ font-family: 'Jua', sans-serif; font-size: 150px; color: #e07a93; line-height: 1; }}
.q span {{ display: block; animation: wobble 900ms ease-in-out infinite alternate; }}
.q.ql {{ left: 372px; top: 930px; }} .q.qr {{ left: 640px; top: 880px; }} .q.qr span {{ animation-delay: -400ms; }}

/* 오가는 말 */
.fly {{ background: #fff; border-radius: 48px; padding: 28px 40px; font-size: 42px; font-weight: 600; letter-spacing: -0.03em; white-space: nowrap; box-shadow: 0 14px 34px rgba(90,70,90,.1); }}
.fly.fl {{ left: 60px; top: 950px; border-bottom-left-radius: 12px; }}
.fly.fr {{ right: 60px; top: 930px; background: #ffb6c1; color: #4a2a33; border-bottom-right-radius: 12px; }}
.count {{ left: 80px; top: 520px; background: #fff; border-radius: 999px; padding: 18px 40px; font-size: 40px; font-weight: 700; color: #8d6f77; transform-origin: 20% 50%; }}
.nums {{ display: inline-block; position: relative; width: 44px; height: 54px; vertical-align: -12px; }}
.nums b {{ position: absolute; inset: 0; text-align: center; font-family: 'Jua', sans-serif; font-weight: 400; font-size: 56px; line-height: 54px; color: #e07a93; }}

/* 달력 */
.calwrap {{ left: 110px; top: 520px; width: 860px; }}
.cal {{ background: #fff; border-radius: 56px; padding: 40px 38px 42px; box-shadow: 0 30px 70px rgba(190,120,135,.2); }}
.calhead {{ display: flex; align-items: center; gap: 14px; padding: 0 10px 18px; }}
.calhead b {{ font-family: 'Jua', sans-serif; font-weight: 400; font-size: 72px; color: #e07a93; }}
.calhead i {{ width: 44px; height: 44px; }} .calhead i svg {{ width: 100%; height: 100%; fill: #ffb6c1; }}
.calhead span {{ margin-left: auto; font-size: 32px; font-weight: 700; color: #c9a9b0; }}
.dows {{ display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 28px; font-weight: 700; color: #c9bcc0; padding-bottom: 12px; }}
.dows span:first-child {{ color: #f3a0ae; }} .dows span:last-child {{ color: #8fc1ea; }}
.cells {{ display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }}
.cell {{ height: 118px; border-radius: 22px; background: #fff6f7; position: relative; padding: 10px 0 0 14px; }}
.cell span {{ font-size: 26px; font-weight: 600; color: #b9a9ad; }}
.chip {{ position: absolute; left: 6px; right: 6px; bottom: 10px; height: 50px; border-radius: 16px; font-size: 27px; font-weight: 700; line-height: 50px; text-align: center; letter-spacing: -0.04em; white-space: nowrap; }}
.chip.h {{ background: #c3d8ea; color: #3f6485; }} .chip.d {{ background: #ffd3bd; color: #a8582f; }} .chip.u {{ background: #ffc9d3; color: #b9506b; }}
.ring {{ position: absolute; inset: -8px; border-radius: 28px; border: 8px solid #ff9bac; opacity: 0; animation: ringPulse 1100ms ease-out 13300ms 2 both; }}

/* 기능 세 가지 */
.word {{ left: 0; right: 0; top: 330px; text-align: center; font-size: 132px; font-weight: 800; letter-spacing: -0.05em; }}
.obj {{ left: 0; right: 0; top: 590px; display: flex; flex-direction: column; align-items: center; }}
.obj svg {{ width: 620px; overflow: visible; filter: drop-shadow(0 26px 40px rgba(110,80,120,.16)); }}
.trip .pin {{ transform-box: fill-box; transform-origin: 50% 100%; animation: {an('drop', 16250, 700, 'ease-out')}; }}
.trip .route {{ animation: {an('fadeIn', 16000, 700, 'ease')}; }}
.trip .case {{ transform-box: fill-box; transform-origin: 50% 100%; animation: sway 1500ms ease-in-out infinite alternate; }}
.wheel {{ top: 620px; }} .wheel svg {{ width: 660px; }}
.wheel .wspin {{ animation: {an('spin', 17450, 1250, 'cubic-bezier(.15,.6,.15,1)')}; }}
.wheel .ptr {{ position: absolute; left: 50%; top: -22px; margin-left: -26px; border-left: 26px solid transparent; border-right: 26px solid transparent; border-top: 46px solid #ff8fa3; z-index: 2; }}
.letter .flap {{ transform-box: fill-box; transform-origin: 50% 0; animation: {an('flapClose', 19050, 600, SOFT)}; }}
.letter .seal {{ transform-box: fill-box; transform-origin: center; animation: {an('pop', 19450, 650, SPRING)}; }}
.when {{ margin-top: 18px; background: #fff; border-radius: 999px; padding: 20px 46px; font-size: 44px; font-weight: 700; color: #e07a93; }}

/* 마무리 */
.heart {{ bottom: 280px; opacity: 0; }} .heart svg {{ width: 100%; height: 100%; fill: #ffb6c1; }}
.balloon {{ left: 478px; top: 560px; width: 124px; height: 310px; }}
.bsway {{ width: 100%; height: 100%; transform-origin: 50% 100%; animation: sway 2200ms ease-in-out infinite alternate; }}
.brand {{ left: 0; right: 0; top: 1310px; text-align: center; font-family: 'Jua', sans-serif; font-size: 160px; color: #e07a93; line-height: 1; }}
.tag {{ left: 0; right: 0; top: 1490px; text-align: center; font-size: 50px; font-weight: 700; letter-spacing: -0.03em; color: #4a3f42; }}
.store {{ left: 190px; right: 190px; top: 320px; text-align: center; background: #fff; border-radius: 999px; padding: 36px 0; font-size: 42px; font-weight: 600; letter-spacing: -0.02em; box-shadow: 0 16px 40px rgba(224,122,147,.18); }}
.store b {{ color: #e07a93; font-weight: 800; }}
.free {{ left: 0; right: 0; top: 452px; text-align: center; font-size: 32px; color: #8d6f77; font-weight: 500; }}
'''

HTML = f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>우리두리 릴스 — 소개 영상</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&display=swap" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
<style>{CSS}</style>
</head>
<body data-total="{TOTAL}">
<div id="stage">{BODY}</div>
<script>
  window.__ready = document.fonts.ready.then(() => {{ document.getAnimations().forEach((x) => x.pause()); return true; }});
  window.__seek = (t) => document.getAnimations().forEach((x) => {{ x.currentTime = t; }});
</script>
</body>
</html>
'''

os.makedirs(OUT, exist_ok=True)
open(os.path.join(OUT, 'reel.html'), 'w', encoding='utf-8', newline='\n').write(HTML)
print('ok', TOTAL)
