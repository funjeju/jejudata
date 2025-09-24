// 제주도 행정구역별 GPS 좌표 데이터
export interface JejuLocation {
  name: string;
  city: '제주시' | '서귀포시';
  type: '동' | '읍' | '면' | '산' | '관광지' | '섬' | '해수욕장' | '공항' | '항구' | '폭포';
  latitude: number;
  longitude: number;
}

export const JEJU_LOCATIONS: JejuLocation[] = [
  // 제주시 동
  { name: '일도1동', city: '제주시', type: '동', latitude: 33.5109, longitude: 126.5219 },
  { name: '일도2동', city: '제주시', type: '동', latitude: 33.5089, longitude: 126.5239 },
  { name: '이도1동', city: '제주시', type: '동', latitude: 33.4996, longitude: 126.5312 },
  { name: '이도2동', city: '제주시', type: '동', latitude: 33.4976, longitude: 126.5332 },
  { name: '삼도1동', city: '제주시', type: '동', latitude: 33.5156, longitude: 126.5286 },
  { name: '삼도2동', city: '제주시', type: '동', latitude: 33.5136, longitude: 126.5306 },
  { name: '용담1동', city: '제주시', type: '동', latitude: 33.5039, longitude: 126.5103 },
  { name: '용담2동', city: '제주시', type: '동', latitude: 33.5019, longitude: 126.5083 },
  { name: '건입동', city: '제주시', type: '동', latitude: 33.4889, longitude: 126.4997 },
  { name: '화북동', city: '제주시', type: '동', latitude: 33.5286, longitude: 126.5619 },
  { name: '삼양동', city: '제주시', type: '동', latitude: 33.5439, longitude: 126.5789 },
  { name: '봉개동', city: '제주시', type: '동', latitude: 33.4486, longitude: 126.5789 },
  { name: '아라동', city: '제주시', type: '동', latitude: 33.4719, longitude: 126.5319 },
  { name: '오라동', city: '제주시', type: '동', latitude: 33.4619, longitude: 126.5219 },
  { name: '연동', city: '제주시', type: '동', latitude: 33.4789, longitude: 126.4989 },
  { name: '노형동', city: '제주시', type: '동', latitude: 33.4689, longitude: 126.4789 },
  { name: '외도동', city: '제주시', type: '동', latitude: 33.4589, longitude: 126.4589 },
  { name: '이호동', city: '제주시', type: '동', latitude: 33.4986, longitude: 126.4586 },

  // 제주시 읍면
  { name: '한림읍', city: '제주시', type: '읍', latitude: 33.4139, longitude: 126.2689 },
  { name: '애월읍', city: '제주시', type: '읍', latitude: 33.4619, longitude: 126.3319 },
  { name: '구좌읍', city: '제주시', type: '읍', latitude: 33.5439, longitude: 126.6789 },
  { name: '조천읍', city: '제주시', type: '읍', latitude: 33.5286, longitude: 126.6119 },
  { name: '한경면', city: '제주시', type: '면', latitude: 33.3519, longitude: 126.2389 },
  { name: '추자면', city: '제주시', type: '면', latitude: 33.9519, longitude: 126.2989 },

  // 서귀포시 행정동
  { name: '송산동', city: '서귀포시', type: '동', latitude: 33.2439, longitude: 126.5589 },
  { name: '정방동', city: '서귀포시', type: '동', latitude: 33.2389, longitude: 126.5719 },
  { name: '중앙동', city: '서귀포시', type: '동', latitude: 33.2489, longitude: 126.5689 },
  { name: '천지동', city: '서귀포시', type: '동', latitude: 33.2539, longitude: 126.5589 },
  { name: '효돈동', city: '서귀포시', type: '동', latitude: 33.2439, longitude: 126.6089 },
  { name: '영천동', city: '서귀포시', type: '동', latitude: 33.2339, longitude: 126.6189 },
  { name: '동홍동', city: '서귀포시', type: '동', latitude: 33.2589, longitude: 126.5489 },
  { name: '서홍동', city: '서귀포시', type: '동', latitude: 33.2639, longitude: 126.5389 },
  { name: '대륜동', city: '서귀포시', type: '동', latitude: 33.2189, longitude: 126.5889 },
  { name: '대천동', city: '서귀포시', type: '동', latitude: 33.2289, longitude: 126.5789 },

  // 서귀포시 법정동 (대륜동 포함)
  { name: '법환동', city: '서귀포시', type: '동', latitude: 33.2089, longitude: 126.5889 },
  { name: '서호동', city: '서귀포시', type: '동', latitude: 33.2139, longitude: 126.5789 },
  { name: '호근동', city: '서귀포시', type: '동', latitude: 33.2239, longitude: 126.5689 },

  // 서귀포시 법정동 (대천동 포함)
  { name: '강정동', city: '서귀포시', type: '동', latitude: 33.2439, longitude: 126.4689 },
  { name: '도순동', city: '서귀포시', type: '동', latitude: 33.2389, longitude: 126.4789 },
  { name: '월평동', city: '서귀포시', type: '동', latitude: 33.2339, longitude: 126.4889 },

  // 서귀포시 법정동 (중문동 포함)
  { name: '대포동', city: '서귀포시', type: '동', latitude: 33.2289, longitude: 126.4189 },
  { name: '하원동', city: '서귀포시', type: '동', latitude: 33.2239, longitude: 126.4089 },
  { name: '회수동', city: '서귀포시', type: '동', latitude: 33.2189, longitude: 126.3989 },

  // 서귀포시 법정동 (예래동 포함)
  { name: '상예동', city: '서귀포시', type: '동', latitude: 33.2139, longitude: 126.3889 },
  { name: '하예동', city: '서귀포시', type: '동', latitude: 33.2089, longitude: 126.3789 },

  // 서귀포시 기타 법정동
  { name: '서귀동', city: '서귀포시', type: '동', latitude: 33.2489, longitude: 126.5519 },
  { name: '보목동', city: '서귀포시', type: '동', latitude: 33.2389, longitude: 126.6289 },
  { name: '토평동', city: '서귀포시', type: '동', latitude: 33.2589, longitude: 126.6189 },

  // 서귀포시 읍면
  { name: '중문동', city: '서귀포시', type: '동', latitude: 33.2389, longitude: 126.4189 },
  { name: '예래동', city: '서귀포시', type: '동', latitude: 33.2089, longitude: 126.3889 },
  { name: '남원읍', city: '서귀포시', type: '읍', latitude: 33.2639, longitude: 126.7089 },
  { name: '표선면', city: '서귀포시', type: '면', latitude: 33.3239, longitude: 126.8389 },
  { name: '성산읍', city: '서귀포시', type: '읍', latitude: 33.4539, longitude: 126.9189 },
  { name: '안덕면', city: '서귀포시', type: '면', latitude: 33.2839, longitude: 126.3189 },
  { name: '대정읍', city: '서귀포시', type: '읍', latitude: 33.2239, longitude: 126.2389 },

  // 주요 관광지 및 산
  { name: '한라산', city: '제주시', type: '산', latitude: 33.3617, longitude: 126.5292 },
  { name: '성산일출봉', city: '서귀포시', type: '관광지', latitude: 33.4588, longitude: 126.9421 },
  { name: '우도', city: '제주시', type: '섬', latitude: 33.5064, longitude: 126.9506 },
  { name: '마라도', city: '서귀포시', type: '섬', latitude: 33.1172, longitude: 126.2686 },
  { name: '추자도', city: '제주시', type: '섬', latitude: 33.9519, longitude: 126.2989 },
  { name: '중문관광단지', city: '서귀포시', type: '관광지', latitude: 33.2389, longitude: 126.4189 },
  { name: '협재해수욕장', city: '제주시', type: '해수욕장', latitude: 33.3939, longitude: 126.2439 },
  { name: '함덕해수욕장', city: '제주시', type: '해수욕장', latitude: 33.5439, longitude: 126.6689 },
  { name: '표선해수욕장', city: '서귀포시', type: '해수욕장', latitude: 33.3239, longitude: 126.8389 },
  { name: '곽지해수욕장', city: '제주시', type: '해수욕장', latitude: 33.4539, longitude: 126.3089 },
  { name: '제주국제공항', city: '제주시', type: '공항', latitude: 33.5067, longitude: 126.4927 },
  { name: '서귀포항', city: '서귀포시', type: '항구', latitude: 33.2389, longitude: 126.5719 },
  { name: '제주항', city: '제주시', type: '항구', latitude: 33.5219, longitude: 126.5419 },
  { name: '산방산', city: '서귀포시', type: '산', latitude: 33.2289, longitude: 126.3089 },
  { name: '천지연폭포', city: '서귀포시', type: '폭포', latitude: 33.2439, longitude: 126.5589 },
  { name: '정방폭포', city: '서귀포시', type: '폭포', latitude: 33.2389, longitude: 126.5719 },
  { name: '천제연폭포', city: '서귀포시', type: '폭포', latitude: 33.2539, longitude: 126.4189 }
];

// 지역명으로 GPS 좌표 검색
export const findLocationByName = (searchName: string): JejuLocation | null => {
  const normalizedSearch = searchName.replace(/\s+/g, '').toLowerCase();

  return JEJU_LOCATIONS.find(location => {
    const normalizedName = location.name.replace(/\s+/g, '').toLowerCase();
    return normalizedName.includes(normalizedSearch) ||
           searchName.includes(location.name) ||
           location.name.includes(searchName);
  }) || null;
};

// 모든 지역명 목록 반환
export const getAllLocationNames = (): string[] => {
  return JEJU_LOCATIONS.map(location => location.name).sort();
};

// 시/구분별 지역 목록
export const getLocationsByCity = (city: '제주시' | '서귀포시'): JejuLocation[] => {
  return JEJU_LOCATIONS.filter(location => location.city === city);
};

// 타입별 지역 목록
export const getLocationsByType = (type: '동' | '읍' | '면'): JejuLocation[] => {
  return JEJU_LOCATIONS.filter(location => location.type === type);
};