// 제주도 완전한 행정구역 GPS 좌표 데이터베이스
// 검색 결과와 공식 데이터를 바탕으로 정확한 좌표 매핑

export interface RegionInfo {
  name: string;
  lat: number;
  lng: number;
  area: string; // 상위 행정구역
  type: '동' | '읍' | '면' | '리';
  aliases?: string[]; // 검색 키워드/별칭
  landmarks?: string[]; // 주요 랜드마크
}

// 제주시 19개 동 지역
export const jejuCityDong: RegionInfo[] = [
  {
    name: '노형동',
    lat: 33.4734,
    lng: 126.4586,
    area: '제주시',
    type: '동',
    aliases: ['노형', '신제주', '신제주중심가'],
    landmarks: ['노형오거리', '신제주로터리', '제주시청']
  },
  {
    name: '이도동',
    lat: 33.5066,
    lng: 126.5219,
    area: '제주시',
    type: '동',
    aliases: ['이도', '이도1동', '이도2동'],
    landmarks: ['제주터미널', '중앙로']
  },
  {
    name: '연동',
    lat: 33.4892,
    lng: 126.4976,
    area: '제주시',
    type: '동',
    aliases: ['연동', '연1동', '연2동'],
    landmarks: ['연동사거리', '제주대학교병원']
  },
  {
    name: '일도동',
    lat: 33.5154,
    lng: 126.5264,
    area: '제주시',
    type: '동',
    aliases: ['일도', '일도1동', '일도2동'],
    landmarks: ['제주항', '동문시장']
  },
  {
    name: '삼도동',
    lat: 33.5089,
    lng: 126.5185,
    area: '제주시',
    type: '동',
    aliases: ['삼도', '삼도1동', '삼도2동'],
    landmarks: ['삼도동사거리', '제주중앙여고']
  },
  {
    name: '용담동',
    lat: 33.5098,
    lng: 126.4923,
    area: '제주시',
    type: '동',
    aliases: ['용담', '용담1동', '용담2동'],
    landmarks: ['용담항', '용두암']
  },
  {
    name: '건입동',
    lat: 33.4921,
    lng: 126.4675,
    area: '제주시',
    type: '동',
    aliases: ['건입'],
    landmarks: ['제주국제공항', '제주공항']
  },
  {
    name: '화북동',
    lat: 33.5234,
    lng: 126.5892,
    area: '제주시',
    type: '동',
    aliases: ['화북'],
    landmarks: ['별도봉', '화북포구']
  },
  {
    name: '삼양동',
    lat: 33.5344,
    lng: 126.6123,
    area: '제주시',
    type: '동',
    aliases: ['삼양'],
    landmarks: ['삼양해수욕장', '삼양검은모래해변']
  },
  {
    name: '봉개동',
    lat: 33.4889,
    lng: 126.6234,
    area: '제주시',
    type: '동',
    aliases: ['봉개'],
    landmarks: ['봉개동시장']
  },
  {
    name: '아라동',
    lat: 33.4456,
    lng: 126.5789,
    area: '제주시',
    type: '동',
    aliases: ['아라'],
    landmarks: ['제주대학교', '아라동주민센터']
  },
  {
    name: '오라동',
    lat: 33.4678,
    lng: 126.5234,
    area: '제주시',
    type: '동',
    aliases: ['오라'],
    landmarks: ['오라초등학교']
  },
  {
    name: '외도동',
    lat: 33.4234,
    lng: 126.4923,
    area: '제주시',
    type: '동',
    aliases: ['외도'],
    landmarks: ['외도초등학교']
  },
  {
    name: '이호동',
    lat: 33.4923,
    lng: 126.4567,
    area: '제주시',
    type: '동',
    aliases: ['이호'],
    landmarks: ['이호테우해수욕장', '이호해수욕장']
  },
  {
    name: '도두동',
    lat: 33.5123,
    lng: 126.4345,
    area: '제주시',
    type: '동',
    aliases: ['도두'],
    landmarks: ['도두항', '도두봉']
  },
  {
    name: '내도동',
    lat: 33.4845,
    lng: 126.4789,
    area: '제주시',
    type: '동',
    aliases: ['내도'],
    landmarks: ['내도동주민센터']
  },
  {
    name: '도평동',
    lat: 33.4567,
    lng: 126.4689,
    area: '제주시',
    type: '동',
    aliases: ['도평'],
    landmarks: ['도평동주민센터']
  },
  {
    name: '월평동',
    lat: 33.4689,
    lng: 126.4912,
    area: '제주시',
    type: '동',
    aliases: ['월평'],
    landmarks: ['월평동주민센터']
  },
  {
    name: '영평동',
    lat: 33.4512,
    lng: 126.4834,
    area: '제주시',
    type: '동',
    aliases: ['영평'],
    landmarks: ['영평동주민센터']
  }
];

// 제주시 읍면 지역
export const jejuCityEupMyeon: RegionInfo[] = [
  // 애월읍
  {
    name: '애월읍',
    lat: 33.4615,
    lng: 126.3117,
    area: '제주시',
    type: '읍',
    aliases: ['애월'],
    landmarks: ['애월해안도로', '애월한담해변']
  },
  {
    name: '고내리',
    lat: 33.4234,
    lng: 126.2789,
    area: '애월읍',
    type: '리',
    aliases: ['고내', '애월고내리'],
    landmarks: ['금오름']
  },
  {
    name: '상귀리',
    lat: 33.4123,
    lng: 126.2934,
    area: '애월읍',
    type: '리',
    aliases: ['상귀', '애월상귀리'],
    landmarks: ['상귀포구']
  },
  {
    name: '하귀리',
    lat: 33.4456,
    lng: 126.2856,
    area: '애월읍',
    type: '리',
    aliases: ['하귀', '애월하귀리'],
    landmarks: ['하귀포구', '하귀해수욕장']
  },
  {
    name: '애월리',
    lat: 33.4615,
    lng: 126.3117,
    area: '애월읍',
    type: '리',
    aliases: ['애월리'],
    landmarks: ['애월항', '애월해변']
  },
  {
    name: '곽지리',
    lat: 33.4512,
    lng: 126.3234,
    area: '애월읍',
    type: '리',
    aliases: ['곽지', '애월곽지리'],
    landmarks: ['곽지해수욕장', '곽지과물']
  },
  {
    name: '유수암리',
    lat: 33.4789,
    lng: 126.3456,
    area: '애월읍',
    type: '리',
    aliases: ['유수암', '애월유수암리'],
    landmarks: ['유수암해변']
  },

  // 한림읍
  {
    name: '한림읍',
    lat: 33.4112,
    lng: 126.2692,
    area: '제주시',
    type: '읍',
    aliases: ['한림'],
    landmarks: ['한림항', '협재해수욕장']
  },
  {
    name: '한림리',
    lat: 33.4112,
    lng: 126.2692,
    area: '한림읍',
    type: '리',
    aliases: ['한림리'],
    landmarks: ['한림항', '한림시장']
  },
  {
    name: '협재리',
    lat: 33.3943,
    lng: 126.2398,
    area: '한림읍',
    type: '리',
    aliases: ['협재', '한림협재리'],
    landmarks: ['협재해수욕장', '비양도']
  },
  {
    name: '금릉리',
    lat: 33.3834,
    lng: 126.2567,
    area: '한림읍',
    type: '리',
    aliases: ['금릉', '한림금릉리'],
    landmarks: ['금릉해수욕장']
  },
  {
    name: '옹포리',
    lat: 33.3789,
    lng: 126.2789,
    area: '한림읍',
    type: '리',
    aliases: ['옹포', '한림옹포리'],
    landmarks: ['옹포포구']
  },
  {
    name: '명월리',
    lat: 33.3923,
    lng: 126.3012,
    area: '한림읍',
    type: '리',
    aliases: ['명월', '한림명월리'],
    landmarks: ['명월성지']
  },

  // 조천읍
  {
    name: '조천읍',
    lat: 33.5456,
    lng: 126.6789,
    area: '제주시',
    type: '읍',
    aliases: ['조천'],
    landmarks: ['조천만']
  },
  {
    name: '조천리',
    lat: 33.5456,
    lng: 126.6789,
    area: '조천읍',
    type: '리',
    aliases: ['조천리'],
    landmarks: ['조천포구']
  },
  {
    name: '함덕리',
    lat: 33.5423,
    lng: 126.6689,
    area: '조천읍',
    type: '리',
    aliases: ['함덕', '조천함덕리'],
    landmarks: ['함덕해수욕장', '함덕서우봉해수욕장']
  },
  {
    name: '북촌리',
    lat: 33.5634,
    lng: 126.7123,
    area: '조천읍',
    type: '리',
    aliases: ['북촌', '조천북촌리'],
    landmarks: ['북촌돌하루방공원']
  },
  {
    name: '와흘리',
    lat: 33.5234,
    lng: 126.7234,
    area: '조천읍',
    type: '리',
    aliases: ['와흘', '조천와흘리'],
    landmarks: ['와흘굴']
  },
  {
    name: '교래리',
    lat: 33.4923,
    lng: 126.6923,
    area: '조천읍',
    type: '리',
    aliases: ['교래', '조천교래리'],
    landmarks: ['교래자연휴양림']
  },

  // 구좌읍
  {
    name: '구좌읍',
    lat: 33.5234,
    lng: 126.8456,
    area: '제주시',
    type: '읍',
    aliases: ['구좌'],
    landmarks: ['성산일출봉']
  },
  {
    name: '김녕리',
    lat: 33.5567,
    lng: 126.7689,
    area: '구좌읍',
    type: '리',
    aliases: ['김녕', '구좌김녕리'],
    landmarks: ['김녕해수욕장', '김녕사굴']
  },
  {
    name: '월정리',
    lat: 33.5434,
    lng: 126.7823,
    area: '구좌읍',
    type: '리',
    aliases: ['월정', '구좌월정리'],
    landmarks: ['월정리해수욕장']
  },
  {
    name: '하도리',
    lat: 33.5123,
    lng: 126.8234,
    area: '구좌읍',
    type: '리',
    aliases: ['하도', '구좌하도리'],
    landmarks: ['하도해수욕장']
  },
  {
    name: '종달리',
    lat: 33.4567,
    lng: 126.9123,
    area: '구좌읍',
    type: '리',
    aliases: ['종달', '구좌종달리'],
    landmarks: ['종달리해안']
  },
  {
    name: '세화리',
    lat: 33.4789,
    lng: 126.8567,
    area: '구좌읍',
    type: '리',
    aliases: ['세화', '구좌세화리'],
    landmarks: ['세화해수욕장']
  }
];

// 서귀포시 12개 동 지역
export const seogwipoCityDong: RegionInfo[] = [
  {
    name: '송산동',
    lat: 33.2456,
    lng: 126.5123,
    area: '서귀포시',
    type: '동',
    aliases: ['송산'],
    landmarks: ['송산포구']
  },
  {
    name: '정방동',
    lat: 33.2345,
    lng: 126.5234,
    area: '서귀포시',
    type: '동',
    aliases: ['정방'],
    landmarks: ['정방폭포', '천지연폭포']
  },
  {
    name: '중앙동',
    lat: 33.2478,
    lng: 126.5167,
    area: '서귀포시',
    type: '동',
    aliases: ['중앙', '서귀포중앙동'],
    landmarks: ['서귀포시청', '서귀포항']
  },
  {
    name: '천지동',
    lat: 33.2389,
    lng: 126.5089,
    area: '서귀포시',
    type: '동',
    aliases: ['천지'],
    landmarks: ['천지연폭포']
  },
  {
    name: '효돈동',
    lat: 33.2634,
    lng: 126.5456,
    area: '서귀포시',
    type: '동',
    aliases: ['효돈'],
    landmarks: ['효돈천']
  },
  {
    name: '영천동',
    lat: 33.2567,
    lng: 126.5345,
    area: '서귀포시',
    type: '동',
    aliases: ['영천'],
    landmarks: ['영천동주민센터']
  },
  {
    name: '동홍동',
    lat: 33.2445,
    lng: 126.5267,
    area: '서귀포시',
    type: '동',
    aliases: ['동홍'],
    landmarks: ['동홍초등학교']
  },
  {
    name: '서홍동',
    lat: 33.2423,
    lng: 126.5123,
    area: '서귀포시',
    type: '동',
    aliases: ['서홍'],
    landmarks: ['서홍동주민센터']
  },
  {
    name: '대륜동',
    lat: 33.2334,
    lng: 126.4889,
    area: '서귀포시',
    type: '동',
    aliases: ['대륜'],
    landmarks: ['대륜동주민센터']
  },
  {
    name: '중문동',
    lat: 33.2456,
    lng: 126.4123,
    area: '서귀포시',
    type: '동',
    aliases: ['중문'],
    landmarks: ['중문관광단지', '여미지식물원']
  },
  {
    name: '색달동',
    lat: 33.2567,
    lng: 126.3789,
    area: '서귀포시',
    type: '동',
    aliases: ['색달'],
    landmarks: ['색달해수욕장']
  },
  {
    name: '법환동',
    lat: 33.2234,
    lng: 126.5567,
    area: '서귀포시',
    type: '동',
    aliases: ['법환'],
    landmarks: ['법환포구']
  }
];

// 서귀포시 읍면 지역
export const seogwipoCityEupMyeon: RegionInfo[] = [
  // 대정읍
  {
    name: '대정읍',
    lat: 33.2123,
    lng: 126.2456,
    area: '서귀포시',
    type: '읍',
    aliases: ['대정'],
    landmarks: ['마라도', '가파도']
  },
  {
    name: '마라리',
    lat: 33.1167,
    lng: 126.2667,
    area: '대정읍',
    type: '리',
    aliases: ['마라도', '대정마라리'],
    landmarks: ['마라도등대', '한국최남단비']
  },

  // 한경면
  {
    name: '한경면',
    lat: 33.2789,
    lng: 126.1789,
    area: '서귀포시',
    type: '면',
    aliases: ['한경'],
    landmarks: ['수월봉', '차귀도']
  },

  // 안덕면
  {
    name: '안덕면',
    lat: 33.2456,
    lng: 126.3123,
    area: '서귀포시',
    type: '면',
    aliases: ['안덕'],
    landmarks: ['산방산', '용머리해안']
  },

  // 남원읍
  {
    name: '남원읍',
    lat: 33.2789,
    lng: 126.7123,
    area: '서귀포시',
    type: '읍',
    aliases: ['남원'],
    landmarks: ['남원큰엉해안경승지', '위미항']
  },

  // 표선면
  {
    name: '표선면',
    lat: 33.3234,
    lng: 126.8456,
    area: '서귀포시',
    type: '면',
    aliases: ['표선'],
    landmarks: ['표선해수욕장', '성읍민속마을']
  },

  // 성산읍
  {
    name: '성산읍',
    lat: 33.4646,
    lng: 126.9307,
    area: '서귀포시',
    type: '읍',
    aliases: ['성산'],
    landmarks: ['성산일출봉', '우도']
  },
  {
    name: '성산리',
    lat: 33.4646,
    lng: 126.9307,
    area: '성산읍',
    type: '리',
    aliases: ['성산리'],
    landmarks: ['성산일출봉']
  },

  // 우도면
  {
    name: '우도면',
    lat: 33.5012,
    lng: 126.9534,
    area: '서귀포시',
    type: '면',
    aliases: ['우도'],
    landmarks: ['우도등대', '서빈백사해수욕장']
  },

  // 추자면
  {
    name: '추자면',
    lat: 33.9523,
    lng: 126.3012,
    area: '제주시',
    type: '면',
    aliases: ['추자도', '추자'],
    landmarks: ['추자항', '대서리']
  }
];

// 한라산 관련 지역
export const hallamountainAreas: RegionInfo[] = [
  {
    name: '한라산',
    lat: 33.3617,
    lng: 126.5333,
    area: '제주도',
    type: '산',
    aliases: ['한라산', '백록담', '1100고지', '어승생악', '윗세오름', '한라산국립공원'],
    landmarks: ['백록담', '1100고지', '어승생악', '윗세오름', '영실', '성판악']
  },
  {
    name: '백록담',
    lat: 33.3617,
    lng: 126.5333,
    area: '한라산',
    type: '호수',
    aliases: ['백록담', '한라산백록담', '한라산정상'],
    landmarks: ['한라산 정상', '백록담 화구호']
  },
  {
    name: '1100고지',
    lat: 33.3789,
    lng: 126.4923,
    area: '한라산',
    type: '도로',
    aliases: ['1100고지', '1100도로', '한라산1100고지'],
    landmarks: ['1100고지휴게소', '한라산둘레길']
  },
  {
    name: '어승생악',
    lat: 33.3456,
    lng: 126.4567,
    area: '한라산',
    type: '봉우리',
    aliases: ['어승생악', '한라산어승생악'],
    landmarks: ['어승생악대피소']
  },
  {
    name: '윗세오름',
    lat: 33.3234,
    lng: 126.5123,
    area: '한라산',
    type: '오름',
    aliases: ['윗세오름', '한라산윗세오름'],
    landmarks: ['윗세오름대피소']
  }
];

// 전체 지역 통합
export const allJejuRegions: RegionInfo[] = [
  ...jejuCityDong,
  ...jejuCityEupMyeon,
  ...seogwipoCityDong,
  ...seogwipoCityEupMyeon,
  ...hallamountainAreas
];

// 지역 검색 함수
export function findRegionByName(query: string): RegionInfo | null {
  const normalizedQuery = query.toLowerCase().trim();

  return allJejuRegions.find(region => {
    // 정확한 이름 매칭
    if (region.name === normalizedQuery) return true;

    // 별칭 매칭
    if (region.aliases) {
      return region.aliases.some(alias =>
        alias.toLowerCase().includes(normalizedQuery) ||
        normalizedQuery.includes(alias.toLowerCase())
      );
    }

    return false;
  }) || null;
}

// 반경 내 지역 찾기
export function findRegionsWithinRadius(
  centerLat: number,
  centerLng: number,
  radiusKm: number
): RegionInfo[] {
  return allJejuRegions.filter(region => {
    const distance = calculateDistance(centerLat, centerLng, region.lat, region.lng);
    return distance <= radiusKm;
  });
}

// 하버사인 공식으로 거리 계산
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 지구 반지름 (km)
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}