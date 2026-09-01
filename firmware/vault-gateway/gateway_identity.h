#ifndef VAULT_GATEWAY_GATEWAY_IDENTITY_H
#define VAULT_GATEWAY_GATEWAY_IDENTITY_H

// ★★★ 설치자가 직접 편집해야 하는 값 ★★★
//
// 이 게이트웨이가 RS485에서 자기 자신을 밝힐 때 쓰는 ID는
//   {GATEWAY_GROUP_ID(2자)} + {DIP 스위치 8비트를 2자리 HEX로 인코딩}
// 로 조합된 4자리 문자열이다. DIP 스위치는 "같은 버스 안에서 이 장치를 구분"하는 값이고,
// GATEWAY_GROUP_ID는 "이게 어떤 하드웨어/펌웨어 배치인지"를 나타내는 값 — 서로 다른
// 배치(하드웨어 리비전, 호환 안 되는 펌웨어 버전 등)를 서버에서 구분하기 위한 것이다.
//
// 이 값은 컴파일 타임 상수라 DIP 스위치처럼 현장에서 바꿀 수 없다 — 배치가 다르면
// 이 값을 고쳐서 다시 컴파일/업로드해야 한다. 정확히 영숫자 2글자여야 한다(그 이상/이하면
// 컴파일이 실패하도록 아래에 static_assert를 걸어뒀다).
//
// "FF"는 RS485 브로드캐스트(전체 대상) 예약값이므로 그룹 ID로 쓰지 말 것 — 아래
// static_assert가 컴파일 타임에 이 값 하나는 막아준다(대문자 "FF"만 검사, 소문자 "ff"는
// 브로드캐스트 문자열("FFFF")과 대소문자가 달라 애초에 안 겹침).
constexpr char GATEWAY_GROUP_ID[] = "01";

static_assert(sizeof(GATEWAY_GROUP_ID) == 3, "GATEWAY_GROUP_ID는 정확히 2글자여야 합니다(문자열 끝의 널 문자 포함 3바이트).");
static_assert(!(GATEWAY_GROUP_ID[0] == 'F' && GATEWAY_GROUP_ID[1] == 'F'),
              "GATEWAY_GROUP_ID로 \"FF\"는 쓸 수 없습니다 — RS485 브로드캐스트 예약값과 충돌합니다.");

#endif
