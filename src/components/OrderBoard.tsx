/**
 * 바이브 카페 주문 게시판 (OrderBoard) 컴포넌트
 * 접수된 주문 목록을 카페 감성의 카드 및 영수증 형태로 확인
 */
import React from 'react';
import { OrderReceipt } from '../types';
import {
  Coffee,
  Clock,
  User,
  Phone,
  CheckCircle,
  Trash2,
  FileText,
  RotateCw,
  Database,
  Cloud,
} from 'lucide-react';

interface OrderBoardProps {
  orders: OrderReceipt[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onClearOrders: () => void;
  onDeleteOrder?: (id: string) => void;
  isSupabaseConnected?: boolean;
}

export const OrderBoard: React.FC<OrderBoardProps> = ({
  orders,
  isLoading = false,
  onRefresh,
  onClearOrders,
  onDeleteOrder,
  isSupabaseConnected = false,
}) => {
  return (
    <div className="w-full max-w-[520px] mx-auto space-y-4">
      {/* 주문 게시판 상단 툴바 */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#6b4226] text-sm sm:text-base">
            실시간 주문 접수 목록
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#6b4226] text-white">
            총 {orders.length}건
          </span>
          {isSupabaseConnected && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0369a1] bg-[#e0f2fe] px-2 py-0.5 rounded-full">
              <Cloud className="w-3 h-3" /> 클라우드 연동
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="text-xs text-[#6b4226] hover:text-[#855230] p-1.5 rounded-lg hover:bg-[#ede2d5] transition-colors cursor-pointer disabled:opacity-50"
              title="주문 목록 새로고침"
              aria-label="새로고침"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {orders.length > 0 && (
            <button
              onClick={onClearOrders}
              className="text-xs text-[#a08269] hover:text-[#dc2626] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>전체 비우기</span>
            </button>
          )}
        </div>
      </div>

      {/* 주문 목록이 비어있는 경우 */}
      {orders.length === 0 ? (
        <div className="bg-[#fffdfa] rounded-2xl cafe-card-shadow border border-[#ebdccf] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#f7efe4] flex items-center justify-center mx-auto mb-3 text-2xl text-[#8d6e53]">
            ☕
          </div>
          <h3 className="text-lg font-bold text-[#6b4226] mb-1">접수된 주문이 없습니다</h3>
          <p className="text-sm text-[#8d6e53] mb-4">
            주문서 탭에서 맛있는 음료를 주문해 보세요!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-[#fffdfa] rounded-xl cafe-card-shadow border border-[#ebdccf] p-4 transition-all hover:border-[#6b4226]/40 relative group"
            >
              {/* 주문 헤더: 번호, 상태, 출처, 시간 */}
              <div className="flex items-center justify-between border-b border-[#f3e7dc] pb-2 mb-2.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-[#6b4226] text-sm">
                    {order.orderNumber}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#edf7ed] text-[#1e4620]">
                    <CheckCircle className="w-3 h-3 text-[#2e7d32]" /> 접수완료
                  </span>
                  {order.source === 'supabase' ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-[#e0f2fe] text-[#0284c7] px-1.5 py-0.5 rounded">
                      <Database className="w-2.5 h-2.5" /> Supabase
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#8d6e53] bg-[#f5ede3] px-1.5 py-0.5 rounded">
                      로컬
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-[#8d6e53]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{order.orderedAt}</span>
                  </div>

                  {onDeleteOrder && (
                    <button
                      onClick={() => onDeleteOrder(order.id)}
                      className="text-[#bbaaa0] hover:text-[#dc2626] p-1 rounded transition-colors cursor-pointer"
                      title="이 주문 삭제"
                      aria-label="주문 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 주문자 정보 */}
              <div className="flex items-center justify-between text-xs text-[#55341d] mb-2 bg-[#faf6f0] p-2 rounded-lg">
                <div className="flex items-center gap-1 font-semibold">
                  <User className="w-3.5 h-3.5 text-[#8d6e53]" />
                  <span>{order.customerName} 고객님</span>
                </div>
                <div className="flex items-center gap-1 text-[#8d6e53]">
                  <Phone className="w-3 h-3" />
                  <span>{order.phone}</span>
                </div>
              </div>

              {/* 음료 및 옵션 내역 */}
              <div className="space-y-1 text-sm text-[#332211]">
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-1.5 text-[#6b4226]">
                    <Coffee className="w-4 h-4" />
                    <span>
                      {order.beverageName} ({order.sizeName}사이즈)
                    </span>
                  </div>
                  <span>{order.quantity}잔</span>
                </div>

                {order.selectedOptionsText && order.selectedOptionsText !== '없음' && (
                  <div className="text-xs text-[#8d6e53] pl-5.5">
                    추가 옵션: <span className="font-medium text-[#55341d]">{order.selectedOptionsText}</span>
                  </div>
                )}

                {order.requestNotes && order.requestNotes !== '요청사항 없음' && (
                  <div className="text-xs text-[#6b4226] bg-[#fbf6f0] p-2 rounded-md mt-1 border border-[#f0e4d7] flex items-start gap-1">
                    <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#8d6e53]" />
                    <span>{order.requestNotes}</span>
                  </div>
                )}
              </div>

              {/* 총 결제 금액 */}
              <div className="mt-3 pt-2 border-t border-[#f3e7dc] flex items-center justify-between">
                <span className="text-xs font-medium text-[#8d6e53]">결제 금액</span>
                <span className="text-base font-extrabold text-[#6b4226]">
                  {order.totalPrice.toLocaleString()}원
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
