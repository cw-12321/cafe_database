/**
 * Supabase 클라이언트 초기화 및 DB 연동 헬퍼 모듈
 * - 환경 변수 (.env의 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) 또는 UI 입력값 지원
 * - cafe_menu 테이블에 대한 CRUD 및 Realtime 실시간 구독 지원
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CafeMenuRow, OrderReceipt } from '../types';

const STORAGE_KEY_URL = 'vibe_cafe_supabase_url';
const STORAGE_KEY_ANON = 'vibe_cafe_supabase_anon_key';

/**
 * 현재 설정된 Supabase URL 및 Anon Key 가져오기
 */
export const getSupabaseConfig = (): { url: string; anonKey: string; isFromEnv: boolean } => {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string)?.trim() || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string)?.trim() || '';

  if (envUrl && envKey && !envUrl.includes('your-project-id')) {
    return { url: envUrl, anonKey: envKey, isFromEnv: true };
  }

  // 환경 변수가 없거나 플레이스홀더인 경우 브라우저 저장소 확인
  const localUrl = localStorage.getItem(STORAGE_KEY_URL)?.trim() || '';
  const localKey = localStorage.getItem(STORAGE_KEY_ANON)?.trim() || '';

  return {
    url: localUrl || envUrl,
    anonKey: localKey || envKey,
    isFromEnv: false,
  };
};

/**
 * 브라우저 저장소에 Supabase 설정 저장
 */
export const saveSupabaseConfig = (url: string, anonKey: string): void => {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
  cachedClient = null; // 인스턴스 갱신을 위해 캐시 초기화
};

/**
 * 브라우저 저장소의 Supabase 설정 초기화
 */
export const clearSupabaseConfig = (): void => {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON);
  cachedClient = null;
};

/**
 * Supabase 연결 정보가 설정되어 있는지 여부
 */
export const isSupabaseConfigured = (): boolean => {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(
    url &&
    anonKey &&
    url.startsWith('https://') &&
    !url.includes('your-project-id') &&
    anonKey.length > 20
  );
};

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

/**
 * SupabaseClient 인스턴스 반환
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey || !url.startsWith('https://')) {
    return null;
  }

  if (cachedClient && lastUsedUrl === url && lastUsedKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
      },
    });
    lastUsedUrl = url;
    lastUsedKey = anonKey;
    return cachedClient;
  } catch (error) {
    console.error('Supabase 클라이언트 생성 실패:', error);
    return null;
  }
};

/**
 * Supabase cafe_menu DB 행(Row) 데이터를 UI 영수증(OrderReceipt) 모델로 변환
 */
export const rowToOrderReceipt = (row: CafeMenuRow): OrderReceipt => {
  const optionsList = Array.isArray(row.options) ? row.options : [];
  const optionsText = optionsList.length > 0 ? optionsList.join(', ') : '없음';

  const orderTime = row.created_at
    ? new Date(row.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  const orderNum = row.id ? `ORD-${String(row.id).padStart(4, '0')}` : `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

  return {
    id: String(row.id || Date.now()),
    orderNumber: orderNum,
    orderedAt: orderTime,
    customerName: row.customer_name,
    phone: row.phone || '미입력',
    beverageName: row.beverage,
    beveragePrice: row.beverage_price,
    sizeName: (row.cup_size as 'S' | 'M' | 'L') || 'M',
    sizeExtraPrice: row.size_price || 0,
    selectedOptionsText: optionsText,
    optionsTotalPrice: row.options_price || 0,
    quantity: row.quantity,
    requestNotes: row.request_notes || '요청사항 없음',
    totalPrice: row.total_price,
    confirmationMessage: `${row.customer_name}님, ${row.beverage} ${row.cup_size}사이즈${
      optionsText !== '없음' ? ` (${optionsText})` : ''
    } ${row.quantity}잔, 총 ${row.total_price.toLocaleString()}원 주문이 접수되었습니다!`,
    source: 'supabase',
  };
};

/**
 * UI 영수증(OrderReceipt) 모델을 Supabase cafe_menu 테이블 행(Row)으로 변환
 */
export const orderReceiptToRow = (receipt: OrderReceipt): CafeMenuRow => {
  const optionsArray = receipt.selectedOptionsText && receipt.selectedOptionsText !== '없음'
    ? receipt.selectedOptionsText.split(', ').map(s => s.trim())
    : [];

  return {
    customer_name: receipt.customerName,
    phone: receipt.phone === '미입력' ? null : receipt.phone,
    beverage: receipt.beverageName,
    beverage_price: receipt.beveragePrice,
    cup_size: receipt.sizeName,
    size_price: receipt.sizeExtraPrice,
    options: optionsArray,
    options_price: receipt.optionsTotalPrice,
    quantity: receipt.quantity,
    request_notes: receipt.requestNotes === '요청사항 없음' ? null : receipt.requestNotes,
    total_price: receipt.totalPrice,
    order_status: '접수완료',
  };
};

/**
 * Supabase 연결 및 cafe_menu 테이블 존재 여부 테스트
 */
export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL과 Anon Key를 먼저 입력해주세요.',
    };
  }

  try {
    const { data, error } = await client
      .from('cafe_menu')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "cafe_menu" does not exist')) {
        return {
          success: false,
          message: 'Supabase 연결 성공! 단, cafe_menu 테이블이 아직 없습니다. [SQL 복사하기] 후 SQL Editor에서 실행해 주세요.',
        };
      }
      return {
        success: false,
        message: `Supabase 오류: ${error.message} (${error.code || '인증/권한 확인 필요'})`,
      };
    }

    return {
      success: true,
      message: `Supabase 정상 연결됨! (cafe_menu 테이블 확인 완료, 기존 주문: ${data?.length || 0}건 확인)`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `네트워크 연결 실패: ${msg}`,
    };
  }
};

/**
 * Supabase에서 주문 목록 조회 (최신순 정렬)
 */
export const fetchOrdersFromSupabase = async (): Promise<OrderReceipt[]> => {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('cafe_menu')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase 주문 목록 조회 실패:', error);
    throw error;
  }

  return (data || []).map(rowToOrderReceipt);
};

/**
 * Supabase cafe_menu에 신규 주문 등록
 */
export const insertOrderToSupabase = async (receipt: OrderReceipt): Promise<OrderReceipt> => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase 클라이언트가 구성되지 않았습니다.');
  }

  const row = orderReceiptToRow(receipt);

  const { data, error } = await client
    .from('cafe_menu')
    .insert([row])
    .select()
    .single();

  if (error) {
    console.error('Supabase 주문 등록 실패:', error);
    throw error;
  }

  return rowToOrderReceipt(data);
};

/**
 * Supabase cafe_menu에서 특정 주문 삭제
 */
export const deleteOrderFromSupabase = async (id: string): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  const numId = parseInt(id, 10);
  if (isNaN(numId)) return false;

  const { error } = await client
    .from('cafe_menu')
    .delete()
    .eq('id', numId);

  if (error) {
    console.error('Supabase 주문 삭제 실패:', error);
    return false;
  }
  return true;
};

/**
 * Supabase cafe_menu 모든 주문 삭제
 */
export const clearAllOrdersFromSupabase = async (): Promise<boolean> => {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('cafe_menu')
    .delete()
    .neq('id', 0); // 모든 행 삭제

  if (error) {
    console.error('Supabase 주문 전체 삭제 실패:', error);
    return false;
  }
  return true;
};

/**
 * Supabase Realtime을 통한 실시간 변경사항 구독
 */
export const subscribeToOrders = (onChange: () => void): (() => void) => {
  const client = getSupabaseClient();
  if (!client) return () => {};

  try {
    const channel = client
      .channel('cafe_menu_realtime_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cafe_menu' },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
};
