/**
 * 바이브 카페 타입 정의 파일
 */

// 음료 메뉴 항목 타입
export interface BeverageItem {
  id: string;
  name: string;
  price: number;
  emoji: string;
  description: string;
}

// 사이즈 옵션 타입
export interface SizeOption {
  id: 'S' | 'M' | 'L';
  name: string;
  extraPrice: number;
}

// 추가 옵션 타입
export interface ExtraOption {
  id: string;
  name: string;
  extraPrice: number;
}

// 주문서 입력 데이터 타입
export interface OrderFormData {
  customerName: string;
  phone: string;
  beverageId: string;
  size: 'S' | 'M' | 'L';
  options: string[]; // 선택된 추가 옵션 ID 배열
  quantity: number;
  requestNotes: string;
}

// 완료된 주문 항목 타입 (UI 표시용)
export interface OrderReceipt {
  id: string;
  orderNumber: string;
  orderedAt: string;
  customerName: string;
  phone: string;
  beverageName: string;
  beveragePrice: number;
  sizeName: string;
  sizeExtraPrice: number;
  selectedOptionsText: string;
  optionsTotalPrice: number;
  quantity: number;
  requestNotes: string;
  totalPrice: number;
  confirmationMessage: string;
  source?: 'supabase' | 'local';
}

// Supabase cafe_menu 테이블 행(Row) 인터페이스
export interface CafeMenuRow {
  id?: number;
  created_at?: string;
  customer_name: string;
  phone?: string | null;
  beverage: string;
  beverage_price: number;
  cup_size: string;
  size_price: number;
  options?: string[] | null;
  options_price: number;
  quantity: number;
  request_notes?: string | null;
  total_price: number;
  order_status?: string | null;
}
