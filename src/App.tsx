/**
 * 바이브 카페 (Vibe Cafe) 메인 애플리케이션 컴포넌트
 * - 최대 너비 520px 가운데 정렬
 * - 베이지 (#faf6f0) 및 브라운 (#6b4226) 컬러 팔레트
 * - Supabase 데이터베이스 실시간 연동 (cafe_menu 테이블) 및 로컬스토리지 폴백
 * - Supabase API 설정 및 SQL Editor 쿼리 복사 모달 제공
 */
import { useState, useEffect, useCallback } from 'react';
import { OrderForm } from './components/OrderForm';
import { OrderBoard } from './components/OrderBoard';
import { SupabaseModal } from './components/SupabaseModal';
import { OrderReceipt } from './types';
import {
  isSupabaseConfigured,
  fetchOrdersFromSupabase,
  deleteOrderFromSupabase,
  clearAllOrdersFromSupabase,
  subscribeToOrders,
} from './lib/supabase';
import { Coffee, ClipboardList, Database, CloudCheck, CloudOff } from 'lucide-react';

// 초기 가짜 데이터 (로컬 테스트용 1건)
const INITIAL_MOCK_ORDER: OrderReceipt = {
  id: 'mock-1',
  orderNumber: 'ORD-1001',
  orderedAt: '오후 02:30',
  customerName: '홍길동',
  phone: '010-1234-5678',
  beverageName: '카페라떼',
  beveragePrice: 4000,
  sizeName: 'M',
  sizeExtraPrice: 500,
  selectedOptionsText: '샷 추가',
  optionsTotalPrice: 500,
  quantity: 1,
  requestNotes: '얼음 적게 텀블러에 담아주세요 ☕',
  totalPrice: 5000,
  confirmationMessage: '홍길동님, 카페라떼 M사이즈 (샷 추가) 1잔, 총 5,000원 주문이 접수되었습니다!',
  source: 'local',
};

export default function App() {
  // 탭 상태: 'order' (주문서 작성) | 'board' (주문 게시판)
  const [activeTab, setActiveTab] = useState<'order' | 'board'>('order');

  // Supabase 설정 모달 열림 여부
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);

  // Supabase 연결 설정 유효 여부
  const [isSupabaseReady, setIsSupabaseReady] = useState<boolean>(() => isSupabaseConfigured());

  // 주문 목록 로딩 상태
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);

  // 주문 내역 상태
  const [orders, setOrders] = useState<OrderReceipt[]>(() => {
    try {
      const saved = localStorage.getItem('vibe_cafe_orders');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // 로컬스토리지 접근 불가 시 기본 가짜 데이터 사용
    }
    return [INITIAL_MOCK_ORDER];
  });

  // Supabase 또는 로컬에서 주문 목록 불러오기
  const loadOrders = useCallback(async () => {
    if (isSupabaseConfigured()) {
      setIsLoadingOrders(true);
      try {
        const dbOrders = await fetchOrdersFromSupabase();
        setOrders(dbOrders);
        setIsSupabaseReady(true);
      } catch (err) {
        console.warn('Supabase 데이터 로드 실패, 로컬 데이터 유지:', err);
      } finally {
        setIsLoadingOrders(false);
      }
    } else {
      setIsSupabaseReady(false);
      try {
        const saved = localStorage.getItem('vibe_cafe_orders');
        if (saved) {
          setOrders(JSON.parse(saved));
        }
      } catch (err) {
        console.warn(err);
      }
    }
  }, []);

  // 초기 로드 및 실시간 구독 설정
  useEffect(() => {
    loadOrders();

    if (isSupabaseConfigured()) {
      const unsubscribe = subscribeToOrders(() => {
        // DB 변경 감지 시 주문 목록 재조회
        loadOrders();
      });
      return () => {
        unsubscribe();
      };
    }
  }, [loadOrders]);

  // 주문 내역이 변경되고 Supabase가 미설정된 경우에만 로컬스토리지에 백업
  useEffect(() => {
    if (!isSupabaseReady) {
      try {
        localStorage.setItem('vibe_cafe_orders', JSON.stringify(orders));
      } catch (err) {
        console.warn('LocalStorage 저장 실패:', err);
      }
    }
  }, [orders, isSupabaseReady]);

  // Supabase 설정이 모달에서 변경되었을 때 콜백
  const handleConfigChanged = () => {
    const configured = isSupabaseConfigured();
    setIsSupabaseReady(configured);
    loadOrders();
  };

  // 새로운 주문 접수 처리 핸들러
  const handleOrderSuccess = (newReceipt: OrderReceipt) => {
    // 실시간 목록에 즉각 반영
    setOrders((prev) => [newReceipt, ...prev.filter((o) => o.id !== newReceipt.id)]);
  };

  // 개별 주문 삭제 핸들러
  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('이 주문을 삭제하시겠습니까?')) return;

    if (isSupabaseReady) {
      try {
        await deleteOrderFromSupabase(id);
      } catch (err) {
        console.error('Supabase 주문 삭제 실패:', err);
      }
    }
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  // 주문 내역 전체 삭제
  const handleClearOrders = async () => {
    if (!window.confirm('모든 접수 내역을 삭제하시겠습니까?')) return;

    if (isSupabaseReady) {
      try {
        await clearAllOrdersFromSupabase();
      } catch (err) {
        console.error('Supabase 주문 전체 삭제 실패:', err);
      }
    }

    setOrders([]);
    try {
      localStorage.removeItem('vibe_cafe_orders');
    } catch (err) {
      console.warn(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf6f0] text-[#332211] py-6 px-3 sm:px-4 flex flex-col justify-between">
      <div className="w-full max-w-[520px] mx-auto mb-3">
        {/* Supabase 연동 상태 및 설정 버튼 바 */}
        <div className="flex items-center justify-between mb-3 px-1 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#6b4226]">
            <span className="text-base">☕</span>
            <span>바이브 카페 주문 관리</span>
          </div>

          <button
            onClick={() => setIsSupabaseModalOpen(true)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
              isSupabaseReady
                ? 'bg-[#edf7ed] border-[#c8e6c9] text-[#1e4620] hover:bg-[#e2f3e2]'
                : 'bg-[#fff4e5] border-[#ffe0b2] text-[#9a3412] hover:bg-[#ffedd5]'
            }`}
          >
            {isSupabaseReady ? (
              <>
                <CloudCheck className="w-3.5 h-3.5 text-[#2e7d32]" />
                <span>Supabase 연결됨</span>
              </>
            ) : (
              <>
                <CloudOff className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>Supabase 연결하기</span>
              </>
            )}
            <span className="text-[10px] text-gray-500 font-normal">| SQL/설정</span>
          </button>
        </div>

        {/* 상단 탭 네비게이션 */}
        <div className="flex items-center justify-between bg-[#ede2d5] p-1 rounded-xl shadow-xs border border-[#dfd0c1]">
          <div className="flex gap-1 w-full">
            <button
              onClick={() => setActiveTab('order')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'order'
                  ? 'bg-[#6b4226] text-white shadow-xs'
                  : 'text-[#6b4226] hover:bg-[#dfd0c1]/60'
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>주문서 작성</span>
            </button>
            <button
              onClick={() => setActiveTab('board')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'board'
                  ? 'bg-[#6b4226] text-white shadow-xs'
                  : 'text-[#6b4226] hover:bg-[#dfd0c1]/60'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>주문 게시판</span>
              {orders.length > 0 && (
                <span
                  className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                    activeTab === 'board' ? 'bg-[#855230] text-white' : 'bg-[#6b4226] text-white'
                  }`}
                >
                  {orders.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 영역 (최대 너비 520px, 가운데 정렬) */}
      <main className="w-full max-w-[520px] mx-auto flex-1">
        {activeTab === 'order' ? (
          <OrderForm
            onOrderSuccess={handleOrderSuccess}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          />
        ) : (
          <OrderBoard
            orders={orders}
            isLoading={isLoadingOrders}
            onRefresh={loadOrders}
            onClearOrders={handleClearOrders}
            onDeleteOrder={handleDeleteOrder}
            isSupabaseConnected={isSupabaseReady}
          />
        )}
      </main>

      {/* 하단 카피라이트 및 빠른 설정 바로가기 */}
      <footer className="w-full max-w-[520px] mx-auto mt-6 text-center text-xs text-[#8d6e53] pb-4 flex flex-col items-center gap-1.5">
        <p>© 2026 바이브 카페 (Vibe Cafe). 실시간 클라우드 DB 연동 지원</p>
        <button
          onClick={() => setIsSupabaseModalOpen(true)}
          className="text-[#6b4226] hover:underline inline-flex items-center gap-1 cursor-pointer"
        >
          <Database className="w-3 h-3" />
          <span>Supabase SQL 및 API 설정 관리</span>
        </button>
      </footer>

      {/* Supabase 설정 및 SQL 쿼리 모달 */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigChanged={handleConfigChanged}
      />
    </div>
  );
}
