import React, { useState } from 'react';
import Modal from './common/Modal';
import Input from './common/Input';
import Button from './common/Button';
import { findRegionByName, allJejuRegions } from '../data/jejuRegions';

interface GpsCoordinateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (latitude: number, longitude: number, keywords?: string) => void;
}

interface SearchResult {
  name: string;
  latitude: number;
  longitude: number;
  source: 'hardcoded' | 'google';
  keywords?: string[];
  landmarks?: string[];
}

const GpsCoordinateModal: React.FC<GpsCoordinateModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    console.log('=== handleSearch 함수 시작 ===');
    console.log('searchQuery:', searchQuery);

    if (!searchQuery.trim()) {
      setError('지역명을 입력해주세요.');
      return;
    }

    console.log('검색 시작, 로딩 상태 설정');
    setIsSearching(true);
    setError('');
    setSearchResults([]);
    setSelectedResult(null);

    try {
      console.log('results 배열 초기화');
      const results: SearchResult[] = [];

      // Google Geocoding API 요청 (메인)
      try {
        console.log('Google Maps API 검색 시작:', searchQuery);
        console.log('API 키 확인:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

        // Google Geocoding API URL 구성
        const address = `제주특별자치도 ${searchQuery}`;
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`;

        console.log('API 요청 URL:', geocodeUrl);

        const response = await fetch(geocodeUrl);
        console.log('fetch 응답 상태:', response.status, response.ok);

        const data = await response.json();
        console.log('Google API 응답:', data);
        console.log('API 상태:', data.status);
        console.log('결과 개수:', data.results?.length);

        if (data.status === 'OK' && data.results.length > 0) {
          for (const result of data.results) {
            const location = result.geometry.location;

            // 제주도 영역 내인지 확인 (대략적인 범위)
            if (location.lat >= 33.0 && location.lat <= 34.0 &&
                location.lng >= 126.0 && location.lng <= 127.0) {

              const formattedName = result.formatted_address
                .replace(/대한민국\s*/, '')
                .replace(/제주특별자치도\s*/, '')
                .trim();

              // 주요 지점이나 랜드마크 추출
              const landmarks = result.address_components
                .filter(comp =>
                  comp.types.includes('point_of_interest') ||
                  comp.types.includes('establishment') ||
                  comp.types.includes('sublocality')
                )
                .map(comp => comp.long_name);

              results.push({
                name: formattedName || searchQuery,
                latitude: parseFloat(location.lat.toFixed(6)),
                longitude: parseFloat(location.lng.toFixed(6)),
                source: 'google',
                landmarks: landmarks.length > 0 ? landmarks : undefined
              });

              console.log('Google API 결과 추가:', {
                name: formattedName,
                lat: location.lat,
                lng: location.lng
              });
            }
          }
        } else {
          console.log('Google API 결과 없음:', data.status);
        }
      } catch (googleError) {
        console.error('Google API 검색 실패:', googleError);
        // Google API 실패 시 하드코딩 데이터로 백업
        console.log('Google API 실패, 하드코딩 데이터 검색 중...');
        const foundRegion = findRegionByName(searchQuery);
        if (foundRegion) {
          results.push({
            name: `${foundRegion.name} (백업)`,
            latitude: foundRegion.lat,
            longitude: foundRegion.lng,
            source: 'hardcoded',
            keywords: foundRegion.aliases,
            landmarks: foundRegion.landmarks
          });
          console.log('하드코딩 백업 데이터 사용:', foundRegion.name);
        } else {
          setError('Google Maps API를 사용할 수 없고 해당 지역의 백업 데이터도 없습니다.');
        }
      }

      if (results.length === 0) {
        setError('해당 지역을 찾을 수 없습니다. 다른 지역명을 시도해보세요.');
      } else {
        setSearchResults(results);
        if (results.length === 1) {
          setSelectedResult(results[0]);
        }
      }
    } catch (error) {
      console.error('=== 검색 중 메인 오류 ===:', error);
      setError('검색 중 오류가 발생했습니다.');
    } finally {
      console.log('=== 검색 완료, 로딩 상태 해제 ===');
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedResult) {
      setError('결과를 선택해주세요.');
      return;
    }

    const keywords = [
      ...(selectedResult.keywords || []),
      ...(selectedResult.landmarks || [])
    ].join(', ');

    onConfirm(selectedResult.latitude, selectedResult.longitude, keywords);
    onClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedResult(null);
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="GPS 좌표 검색">
      <div className="space-y-4">
        <div>
          <Input
            label="지역명 검색"
            id="searchQuery"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="예: 성산읍, 노형동, 애월읍, 백록담"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button
            onClick={() => {
              console.log('🔍 검색 버튼 클릭됨!');
              console.log('searchQuery 값:', searchQuery);
              console.log('isSearching 상태:', isSearching);
              handleSearch();
            }}
            disabled={isSearching || !searchQuery.trim()}
            className="mt-2"
          >
            {isSearching ? '🔍 검색 중...' : '🔍 검색'}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {searchResults.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">검색 결과</h4>
            <div className="space-y-2">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedResult === result
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedResult(result)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{result.name}</p>
                      <p className="text-sm text-gray-600">
                        위도: {result.latitude}, 경도: {result.longitude}
                      </p>
                      {result.landmarks && result.landmarks.length > 0 && (
                        <p className="text-xs text-gray-500">
                          랜드마크: {result.landmarks.join(', ')}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      result.source === 'hardcoded'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {result.source === 'hardcoded' ? '정확' : 'Google'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button onClick={handleClose} variant="secondary">취소</Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedResult}
          >
            좌표 입력하기
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default GpsCoordinateModal;