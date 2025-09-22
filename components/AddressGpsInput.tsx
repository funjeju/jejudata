import React, { useState, useEffect, useRef } from 'react';
import type { Geopoint } from '../types';
import Button from './common/Button';
import Input from './common/Input';

interface AddressGpsInputProps {
  address?: string;
  location?: Geopoint | null;
  onAddressChange: (address: string) => void;
  onLocationChange: (location: Geopoint | null) => void;
}

declare global {
  interface Window {
    kakao: any;
  }
}

const AddressGpsInput: React.FC<AddressGpsInputProps> = ({
  address = '',
  location,
  onAddressChange,
  onLocationChange
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [isMapVisible, setIsMapVisible] = useState(false);

  useEffect(() => {
    // 카카오맵 API 스크립트 로드
    if (!window.kakao) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=KAKAO_API_KEY&autoload=false&libraries=services`;
      document.head.appendChild(script);

      script.onload = () => {
        window.kakao.maps.load(() => {
          // API 로드 완료
        });
      };
    }
  }, []);

  useEffect(() => {
    if (map && location) {
      updateMapMarker(location);
    }
  }, [map, location]);

  const initializeMap = (container: HTMLDivElement) => {
    if (!window.kakao?.maps) return;

    const centerLat = location?.latitude || 33.499621;
    const centerLng = location?.longitude || 126.531188;

    const mapOptions = {
      center: new window.kakao.maps.LatLng(centerLat, centerLng),
      level: location ? 5 : 9
    };

    const newMap = new window.kakao.maps.Map(container, mapOptions);
    setMap(newMap);

    // 지도 클릭 이벤트
    window.kakao.maps.event.addListener(newMap, 'click', (mouseEvent: any) => {
      const latlng = mouseEvent.latLng;
      const newLocation: Geopoint = {
        latitude: latlng.getLat(),
        longitude: latlng.getLng()
      };

      onLocationChange(newLocation);
      updateMapMarker(newLocation);

      // 좌표를 주소로 변환
      convertCoordsToAddress(newLocation);
    });

    if (location) {
      updateMapMarker(location);
    }
  };

  const updateMapMarker = (geopoint: Geopoint) => {
    if (!map || !window.kakao?.maps) return;

    const position = new window.kakao.maps.LatLng(geopoint.latitude, geopoint.longitude);

    if (marker) {
      marker.setMap(null);
    }

    const newMarker = new window.kakao.maps.Marker({
      position: position
    });

    newMarker.setMap(map);
    setMarker(newMarker);
    map.setCenter(position);
  };

  const searchAddressToCoords = async () => {
    if (!address.trim() || !window.kakao?.maps?.services) {
      alert('주소를 입력해주세요.');
      return;
    }

    setIsLoading(true);

    const geocoder = new window.kakao.maps.services.Geocoder();

    geocoder.addressSearch(address, (result: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const coords = result[0];
        const newLocation: Geopoint = {
          latitude: parseFloat(coords.y),
          longitude: parseFloat(coords.x)
        };

        onLocationChange(newLocation);

        if (map) {
          updateMapMarker(newLocation);
        }

        alert(`GPS 좌표를 찾았습니다!\n위도: ${newLocation.latitude}\n경도: ${newLocation.longitude}`);
      } else {
        alert('주소를 찾을 수 없습니다. 다시 시도해주세요.');
      }
      setIsLoading(false);
    });
  };

  const convertCoordsToAddress = (geopoint: Geopoint) => {
    if (!window.kakao?.maps?.services) return;

    const geocoder = new window.kakao.maps.services.Geocoder();
    const coord = new window.kakao.maps.LatLng(geopoint.latitude, geopoint.longitude);

    geocoder.coord2Address(coord.getLng(), coord.getLat(), (result: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const detailAddr = result[0].road_address ? result[0].road_address.address_name : result[0].address.address_name;
        onAddressChange(detailAddr);
      }
    });
  };

  const toggleMap = () => {
    setIsMapVisible(!isMapVisible);

    // 지도를 새로 표시할 때 초기화
    if (!isMapVisible) {
      setTimeout(() => {
        const container = document.getElementById('address-map');
        if (container && window.kakao?.maps) {
          initializeMap(container as HTMLDivElement);
        }
      }, 100);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="주소를 입력하세요 (예: 제주특별자치도 제주시 첨단로 242)"
          />
        </div>
        <Button
          onClick={searchAddressToCoords}
          disabled={isLoading || !address.trim()}
          className="bg-blue-500 text-white hover:bg-blue-600"
        >
          {isLoading ? '검색 중...' : '🔍 GPS 찾기'}
        </Button>
        <Button
          onClick={toggleMap}
          variant="secondary"
        >
          {isMapVisible ? '🗺️ 지도 숨기기' : '🗺️ 지도 보기'}
        </Button>
      </div>

      {/* GPS 좌표 표시 */}
      {location && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-sm text-green-800">
            📍 GPS 좌표: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </div>
        </div>
      )}

      {/* 지도 영역 */}
      {isMapVisible && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 text-sm text-gray-600">
            💡 지도를 클릭하여 GPS 좌표를 설정할 수 있습니다
          </div>
          <div
            id="address-map"
            className="w-full h-64"
          />
        </div>
      )}

      {/* 사용법 안내 */}
      <div className="text-xs text-gray-500 space-y-1">
        <div>• 주소 입력 후 "GPS 찾기" 버튼으로 자동 좌표 검색</div>
        <div>• "지도 보기"로 직접 위치를 클릭하여 GPS 좌표 설정</div>
        <div>• 정확한 주소일수록 GPS 좌표를 더 정확히 찾을 수 있습니다</div>
      </div>
    </div>
  );
};

export default AddressGpsInput;