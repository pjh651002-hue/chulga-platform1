# 대한불교조계종 출가 플랫폼 (시제품)

정적 파일 한 개(`index.html`)와 상담 응답 중계 함수(`api/ask.js`)로 이루어져 있습니다.
빌드 도구나 프레임워크가 없으므로 GitHub에 올리고 Vercel에 연결하면 그대로 배포됩니다.

## 파일 구성

```
index.html        앱 전체 (HTML·CSS·JS 단일 파일)
api/ask.js        출가상담 응답 중계 (Vercel 서버리스 함수)
vercel.json       배포 설정과 보안 헤더
.env.example      환경변수 예시
.gitignore
```

## 1. GitHub에 올리기

저장소는 **비공개(Private)** 로 만드시기를 권합니다. 종단 브랜드 자산과 연락처가
들어 있고, 아직 시제품이기 때문입니다.

```bash
cd 프로젝트폴더
git init
git add .
git commit -m "출가 플랫폼 시제품 - 2026.09.08 자료 기준"
git branch -M main
git remote add origin https://github.com/<계정>/<저장소>.git
git push -u origin main
```

## 2. Vercel에 연결하기

1. vercel.com 로그인 → **Add New → Project**
2. 방금 만든 저장소 선택 (조직 저장소면 Vercel에 접근 권한 부여 필요)
3. Framework Preset은 **Other**, Build Command와 Output Directory는 **비워 둡니다**
4. Deploy

이후에는 `main` 브랜치에 push할 때마다 자동으로 다시 배포됩니다.

## 3. 환경변수 설정

Vercel 프로젝트 → Settings → Environment Variables 에서 등록합니다.
Production, Preview, Development 세 곳 모두에 넣어야 미리보기에서도 동작합니다.

| 이름 | 필수 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 필수 | 상담 응답용 API 키 |
| `ANSWER_MODEL` | 선택 | 기본값 `claude-sonnet-5` |
| `ALLOWED_ORIGIN` | 선택 | 배포 도메인. 예: `https://chulga.example.or.kr` |

**API 키는 절대 `index.html`이나 저장소에 적지 마십시오.** 브라우저는 `/api/ask` 로만
질문을 보내고, 키는 Vercel 서버에만 남습니다. 키를 실수로 커밋했다면 즉시 폐기하고
새로 발급해야 합니다.

환경변수를 넣지 않아도 앱은 동작합니다. 이 경우 상담 화면에 전화번호 안내가 나옵니다.

## 4. 데이터 갱신 방법

출가학교 일정은 `index.html` 안의 `SCHOOLS` 배열과 `DATA_DATE` 상수에 있습니다.
접수 마감과 종료 여부는 `start`, `end`, `deadline` 값으로 자동 계산되므로
날짜만 정확히 넣으면 됩니다.

```js
{
  temple: "운문사",
  gi: "제2기",
  start: "2026-11-27",   // 수행 시작
  end:   "2026-12-06",   // 수행 종료
  deadline: "2026-11-10",// 접수 마감. 없으면 ""
  rolling: false,        // 상시 접수면 true
  src: "종단 출가 홈페이지 공지 2026.08.26"
}
```

코드를 직접 고치기 어려우실 때는 앱 화면 맨 아래 **운영자 통계** → **출가학교 데이터 갱신**
에서 JSON을 내보내고 붙여넣어 미리 확인하실 수 있습니다. 다만 그 화면에서 바꾼 값은
새로고침하면 사라지므로, 확정된 내용은 반드시 파일에 반영하고 push해야 합니다.

## 배포 전에 정리해야 할 것 (미결 사항)

- **운영자 통계 화면이 푸터 링크로 공개되어 있습니다.** 실제 운영 시에는 링크를 지우거나
  인증 뒤로 옮겨야 합니다.
- **매칭 결과 전송과 코드 발급은 동작하지 않습니다.** 실제로 사찰에 전달하려면
  수신 사찰 계정, 보관 기간, 파기 절차를 먼저 정해야 합니다.
- **개인정보처리방침과 이용약관 링크가 비어 있습니다.** 종교단체도 개인정보 보호법상
  개인정보처리자에 해당하므로, 상담 접수를 열기 전에 처리방침을 게시해야 합니다.
- **로고·서체·사진은 종단 브랜드 자산입니다.** 사용 승인을 받아야 합니다.
- **출가상담전화 1666-7987은 확인이 필요합니다.**
- 영상은 저작권자가 종단·사찰인 것만 연결하며, 방송사 제작물은 embed 하지 않습니다.

## 자료 확인일

2026년 9월 8일. 종단 출가 홈페이지(monk.buddhism.or.kr) 공지·언론보도 기준입니다.
