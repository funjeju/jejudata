// FIX: Removed self-import of types to resolve declaration conflicts.
// A virtual representation of Firestore's Geopoint
export interface Geopoint {
  latitude: number;
  longitude: number;
}

// 사용자 위치 정보 타입
export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

// A virtual representation of Firestore's Timestamp
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

export interface ImageInfo {
  url: string;
  caption: string;
  file?: File; // For local preview before upload
}

export interface Attributes {
  targetAudience: string[];
  recommendedSeasons: string[];
  withKids: string;
  withPets: string;
  parkingDifficulty: string;
  admissionFee: string;
  recommended_time_of_day?: string[];
  rainy_day_friendly?: boolean;
  is_hidden_gem?: boolean;
}

export interface CategorySpecificInfo {
  signatureMenu?: string;
  priceRange?: string;
  difficulty?: string;
}

// 숙소 전용 정보
export interface AccommodationInfo {
  accommodation_type: "호텔" | "리조트" | "게스트하우스" | "펜션" | "모텔" | "스테이" | "기타";
  price_range: "5만원 전후" | "10만원 전후" | "20만원 이상";
  view_type: "바다뷰" | "먼바다뷰" | "중산간";
  region: string; // 권역 정보
  kid_friendly: "가능" | "불가" | "연령제한";
  pet_friendly: "가능" | "불가" | "일부가능";
  breakfast_included: "제공" | "미제공" | "유료";
  check_in_time: string; // 예: "15:00"
  check_out_time: string; // 예: "11:00"
  google_maps_url?: string; // 구글 맵 링크
}

// 관심사 매핑을 위한 새로운 인터페이스들
export interface ViewInfo {
  ocean_view: boolean;
  mountain_view: boolean;
  city_view: boolean;
  nature_view: boolean;
}

export interface ShoppingInfo {
  has_souvenirs: boolean;
  has_local_products: boolean;
  has_fashion: boolean;
  shopping_type?: "대형몰" | "로컬샵" | "전통시장" | "아울렛" | "기타";
}

export interface CulturalInfo {
  historical_significance: boolean;
  cultural_experience: boolean;
  traditional_elements: boolean;
  modern_culture: boolean;
}

export interface ActivityInfo {
  activity_level: "휴식중심" | "가벼운활동" | "활동적" | "매우활동적";
  walking_required: boolean;
  physical_difficulty: "쉬움" | "보통" | "어려움";
  suitable_for_kids: boolean;
  suitable_for_elderly: boolean;
}

export interface TrendInfo {
  trend_status: "클래식" | "꾸준인기" | "요즘핫플" | "숨은명소";
  popularity_level: "한적함" | "보통" | "인기" | "매우인기";
  sns_hotspot: boolean;
  instagram_worthy: boolean;
}

export interface Comment {
  type: string;
  content: string;
}

export interface LinkedSpot {
  link_type: string;
  place_id: string;
  place_name: string;
}

export interface PublicInfo {
    operating_hours?: string;
    phone_number?: string;
    website_url?: string;
    closed_days?: string[];
    is_old_shop?: boolean;
}

export interface Suggestion {
  id: string;
  author: string;
  content: string;
  createdAt: Timestamp;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface EditLog {
    fieldPath: string;
    previousValue: any;
    newValue: any;
    acceptedBy: string;
    acceptedAt: Timestamp;
    suggestionId: string;
}


export interface Place {
  place_id: string;
  place_name: string;
  creator_id?: string;
  status: 'draft' | 'published' | 'rejected' | 'stub';
  categories?: string[];
  address?: string | null;
  region?: string | null;
  location?: Geopoint | null;
  images?: ImageInfo[];
  attributes?: Attributes | null;
  average_duration_minutes?: number | null;
  category_specific_info?: CategorySpecificInfo | null;
  expert_tip_raw?: string;
  expert_tip_final?: string | null;
  comments?: Comment[] | null;
  linked_spots?: LinkedSpot[];
  created_at?: Timestamp;
  updated_at?: Timestamp;
  public_info?: PublicInfo | null;
  tags?: string[] | null;
  import_url?: string;

  // 관심사 매핑을 위한 새로운 필드들
  interest_tags?: string[] | null; // ["자연", "오션뷰", "핫플", "쇼핑", "박물관", "역사", "액티비티", "걷기"]
  view_info?: ViewInfo | null;
  shopping_info?: ShoppingInfo | null;
  cultural_info?: CulturalInfo | null;
  activity_info?: ActivityInfo | null;
  trend_info?: TrendInfo | null;

  // 숙소 전용 정보
  accommodation_info?: AccommodationInfo | null;

  // For collaboration and versioning
  suggestions?: Record<string, Suggestion[]>;
  edit_history?: EditLog[];
}

export interface InitialFormData {
    categories: string[];
    spotName: string;
    spotDescription: string;
    importUrl: string;
}

export interface WeatherSource {
  id: string;
  youtubeUrl: string;
  title: string;
  apiKey: string;
  direction?: '동' | '서' | '남' | '북' | '중앙';
  keywords?: string[];
  latitude?: number;
  longitude?: number;
}

export interface WeatherCardData {
  status: 'analyzing' | 'capturing' | 'overlaying' | 'done';
  sourceTitle: string;
  imageUrl: string;
  youtubeUrl?: string; // 유튜브 영상 URL 추가
  // Dummy weather data for simulation
  weatherData: {
    temp: string;
    humidity: string;
    wind: string;
  };
}

// 오름 관련 타입들
export interface OroomImage {
  id: string;
  url: string;
  file?: File;
  description?: string;
}

export interface OroomData {
  id: string;
  name: string; // 오름이름
  address: string; // 주소
  latitude?: number; // GPS 위도
  longitude?: number; // GPS 경도
  difficulty: '쉬움' | '보통' | '어려움' | '매우어려움'; // 난이도
  mainSeasons: string[]; // 주요계절
  mainMonths: string[]; // 주요월
  roundTripTime: string; // 왕복소요시간
  summitView: '상' | '중' | '하'; // 정상뷰
  expertTip: string; // 전문가 팁 (등반 팁, 주의사항 등)
  nearbyAttractions: string[]; // 주변 가볼만한곳
  nameOrigin: string; // 이름유래

  // 사진 관련
  cardImage?: OroomImage; // 오름 카드 이미지 (세로형 카드, 1장)
  parkingImages: OroomImage[]; // 주차장 (최대 3장)
  entranceImages: OroomImage[]; // 탐방로입구 (최대 3장)
  trailImages: OroomImage[]; // 탐방로 (최대 5장)
  summitImages: OroomImage[]; // 정상뷰 (최대 3장)
  summitVideoUrl?: string; // 정상뷰 유튜브 영상

  // 메타데이터
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'published';
}

export interface OroomInitialFormData {
  description: string; // AI가 분석할 오름 설명 텍스트
}

// 여행일정 AI용 고정 스팟 타입
export interface FixedSpot {
  name: string;
  lat: number;
  lng: number;
  address: string;
  placeId: string;
  type: 'accommodation' | 'restaurant' | 'attraction';
}
