import React from 'react';

const UserHeader: React.FC = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-40">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* 로고 */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">🏝️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">가장 스마트한 제주여행챗봇</h1>
              <p className="text-xs text-gray-500">환각 X, 최신성 OK</p>
            </div>
          </div>

          {/* 우측 아이콘 (필요시 추가) */}
          <div className="flex items-center space-x-3">
            {/* 향후 알림, 프로필 등 추가 가능 */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default UserHeader;
