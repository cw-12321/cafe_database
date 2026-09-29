/**
 * 바이브 카페 주문서 (OrderForm) 컴포넌트
 * 요구사항:
 * - 실시간 금액 계산 (음료 + 사이즈 + 추가옵션) * 수량
 * - 모든 input에 label 연결 (id & htmlFor)
 * - 천 단위 콤마(toLocaleString) 적용
 * - 520px 최대 너비 및 베이지/브라운 테마 적용
 * - 한국어 주석 포함
 */
import React, { useState, useId } from 'react';
import { BEVERAGE_MENU, SIZE_OPTIONS, EXTRA_OPTIONS } from '../data/cafeData';
import { OrderFormData, OrderReceipt } from '../types';
import { insertOrderToSupabase, isSupabaseConfigured } from '../lib/supabase';
import {
  CheckCircle2,
  RotateCcw,
  Coffee,
  Sparkles,
  AlertCircle,
  ShoppingBag,
  Database,
  Loader2,
} from 'lucide-react';

interface OrderFormProps {
  onOrderSuccess: (receipt: OrderReceipt) => void;
  onOpenSupabaseModal?: () => void;
}

// 초기 주문 폼 기본값 설정 (사이즈: M 기본선택, 수량: 1 기본선택)
const INITIAL_FORM_STATE: OrderFormData = {
  customerName: '',
  phone: '',
  beverageId: '',
  size: 'M', // 기본 선택 M
  options: [],
  quantity: 1, // 기본값 1
  requestNotes: '',
};

export const OrderForm: React.FC<OrderFormProps> = ({
  onOrderSuccess,
  onOpenSupabaseModal,
}) => {
  // 고유 ID 생성을 위한 useId 훅
  const formIdPrefix = useId();

  // 주문 폼 상태 관리
  const [formData, setFormData] = useState<OrderFormData>(INITIAL_FORM_STATE);

  // 주문 완료 확인 메시지 상태
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

  // 유효성 검사 에러/알림 메시지 상태 (iframe 환경에서 window.alert 대신 안전하게 동작하는 팝업/알림)
  const [validationAlert, setValidationAlert] = useState<string | null>(null);

  // 주문 제출 진행 중 상태
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 주문 결과 피드백 상태 (저장 위치 및 오류)
  const [submitFeedback, setSubmitFeedback] = useState<{
    storageType: 'supabase' | 'local';
    error?: string;
  } | null>(null);

  // 1. 실시간 예상 금액 계산 (음료 기본가 + 사이즈 추가금 + 옵션 추가금) * 수량
  const calculateEstimatedTotal = (): number => {
    // 선택된 음료 정보 찾기
    const selectedBeverage = BEVERAGE_MENU.find((b) => b.id === formData.beverageId);
    const beveragePrice = selectedBeverage ? selectedBeverage.price : 0;

    // 선택된 사이즈의 추가 금액 찾기
    const selectedSize = SIZE_OPTIONS.find((s) => s.id === formData.size);
    const sizeExtraPrice = selectedSize ? selectedSize.extraPrice : 0;

    // 선택된 추가 옵션들의 금액 합산
    const optionsExtraPrice = formData.options.reduce((sum, optId) => {
      const option = EXTRA_OPTIONS.find((o) => o.id === optId);
      return sum + (option ? option.extraPrice : 0);
    }, 0);

    // 1잔당 단가 = 음료 기본가 + 사이즈 추가금 + 옵션 합산
    const unitPrice = beveragePrice + sizeExtraPrice + optionsExtraPrice;

    // 최종 예상 금액 = 단가 * 수량 (음료 미선택 시 0원으로 표시하거나 선택 옵션만 계산되지 않도록 음료 기준)
    if (!formData.beverageId) {
      return 0;
    }

    return unitPrice * formData.quantity;
  };

  const estimatedTotal = calculateEstimatedTotal();

  // 2. 입력값 변경 핸들러
  // 이름 변경
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, customerName: e.target.value }));
    if (validationAlert) setValidationAlert(null);
  };

  // 전화번호 변경
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, phone: e.target.value }));
  };

  // 음료 드롭다운 변경
  const handleBeverageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, beverageId: e.target.value }));
    if (validationAlert) setValidationAlert(null);
  };

  // 사이즈 라디오 버튼 변경
  const handleSizeChange = (sizeId: 'S' | 'M' | 'L') => {
    setFormData((prev) => ({ ...prev, size: sizeId }));
  };

  // 추가 옵션 체크박스 토글
  const handleOptionToggle = (optionId: string) => {
    setFormData((prev) => {
      const exists = prev.options.includes(optionId);
      const updatedOptions = exists
        ? prev.options.filter((id) => id !== optionId)
        : [...prev.options, optionId];
      return { ...prev, options: updatedOptions };
    });
  };

  // 수량 변경 (최소 1, 최대 10)
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      setFormData((prev) => ({ ...prev, quantity: 1 }));
    } else {
      // 1 ~ 10 사이로 제한
      const clampedVal = Math.max(1, Math.min(10, val));
      setFormData((prev) => ({ ...prev, quantity: clampedVal }));
    }
  };

  // 요청사항 변경
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, requestNotes: e.target.value }));
  };

  // 3. 다시 작성 버튼 (초기화) 핸들러
  const handleReset = () => {
    setFormData(INITIAL_FORM_STATE);
    setConfirmationMessage(null);
    setValidationAlert(null);
    setSubmitFeedback(null);
  };

  // 4. 주문하기 버튼 클릭 핸들러
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1) 이름 유효성 검사 (필수)
    if (!formData.customerName.trim()) {
      const msg = '이름을 입력해주세요';
      setValidationAlert(msg);
      // 포커스 이동
      document.getElementById(`${formIdPrefix}-name`)?.focus();
      return;
    }

    // 2) 음료 선택 유효성 검사 (필수)
    if (!formData.beverageId) {
      const msg = '음료를 선택해주세요';
      setValidationAlert(msg);
      document.getElementById(`${formIdPrefix}-beverage`)?.focus();
      return;
    }

    // 선택된 음료 및 사이즈, 옵션 객체 조회
    const selectedBeverage = BEVERAGE_MENU.find((b) => b.id === formData.beverageId);
    const selectedSize = SIZE_OPTIONS.find((s) => s.id === formData.size);
    const selectedOptionObjects = EXTRA_OPTIONS.filter((opt) => formData.options.includes(opt.id));

    // 옵션 텍스트 구성 (예: "샷 추가", 또는 여러 개면 "샷 추가, 크림 추가")
    const optionNames = selectedOptionObjects.map((opt) => opt.name);
    const optionsTextFormatted = optionNames.length > 0 ? ` (${optionNames.join(', ')})` : '';

    const beverageName = selectedBeverage ? selectedBeverage.name : '';
    const sizeName = selectedSize ? selectedSize.name : 'M';
    const totalAmount = estimatedTotal;

    // 주문 확인 메시지 형식:
    // "홍길동님, 카페라떼 M사이즈 (샷 추가) 1잔, 총 5,000원 주문이 접수되었습니다!"
    const formattedConfirmMsg = `${formData.customerName.trim()}님, ${beverageName} ${sizeName}사이즈${optionsTextFormatted} ${formData.quantity}잔, 총 ${totalAmount.toLocaleString()}원 주문이 접수되었습니다!`;

    // 기본 영수증 객체 생성
    const receipt: OrderReceipt = {
      id: String(Date.now()),
      orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      orderedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      customerName: formData.customerName.trim(),
      phone: formData.phone.trim() || '미입력',
      beverageName,
      beveragePrice: selectedBeverage ? selectedBeverage.price : 0,
      sizeName,
      sizeExtraPrice: selectedSize ? selectedSize.extraPrice : 0,
      selectedOptionsText: optionNames.join(', ') || '없음',
      optionsTotalPrice: selectedOptionObjects.reduce((acc, cur) => acc + cur.extraPrice, 0),
      quantity: formData.quantity,
      requestNotes: formData.requestNotes.trim() || '요청사항 없음',
      totalPrice: totalAmount,
      confirmationMessage: formattedConfirmMsg,
      source: 'local',
    };

    setValidationAlert(null);

    // Supabase 연동 상태 확인 및 비동기 저장 처리
    if (isSupabaseConfigured()) {
      setIsSubmitting(true);
      try {
        const savedReceipt = await insertOrderToSupabase(receipt);
        setConfirmationMessage(savedReceipt.confirmationMessage);
        setSubmitFeedback({
          storageType: 'supabase',
        });
        onOrderSuccess(savedReceipt);
      } catch (err: unknown) {
        console.error('Supabase 주문 저장 실패:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setConfirmationMessage(formattedConfirmMsg);
        setSubmitFeedback({
          storageType: 'local',
          error: `Supabase 연결 오류 (${errMsg}) - 브라우저 로컬에 안전하게 저장되었습니다.`,
        });
        onOrderSuccess(receipt);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setConfirmationMessage(formattedConfirmMsg);
      setSubmitFeedback({
        storageType: 'local',
      });
      onOrderSuccess(receipt);
    }
  };

  return (
    <div className="w-full max-w-[520px] mx-auto">
      {/* 카드 메인 컨테이너: 따뜻한 베이지 배경, 부드러운 그림자, 둥근 모서리 */}
      <div className="bg-[#fffdfa] rounded-2xl cafe-card-shadow border border-[#ebdccf] overflow-hidden">
        {/* 상단 카페 브랜드 헤더 */}
        <header className="pt-8 pb-6 px-6 text-center border-b border-[#f0e4d7] bg-gradient-to-b from-[#f7efe4]/60 to-[#fffdfa]">
          <div className="inline-block p-3 rounded-full bg-[#f5ede3] mb-3 text-4xl shadow-inner">
            ☕
          </div>
          <h1 className="text-3xl font-extrabold text-[#6b4226] tracking-tight mb-1">
            바이브 카페
          </h1>
          <p className="text-sm font-medium text-[#8d6e53]">
            당신의 하루에 바이브를 더하다
          </p>

          <div className="mt-3 flex items-center justify-center">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#f3e7dc] text-[#6b4226]">
              <Sparkles className="w-3.5 h-3.5 text-[#b36b38]" /> 따뜻한 한 잔의 여유
            </span>
          </div>
        </header>

        {/* 유효성 검사 경고 알림 (이름/음료 미입력 시 표시) */}
        {validationAlert && (
          <div
            role="alert"
            className="mx-6 mt-5 p-3.5 bg-[#fef2f2] border border-[#fecaca] text-[#991b1b] rounded-lg text-sm flex items-center gap-2.5 animate-bounce-short shadow-xs"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-[#dc2626]" />
            <div className="flex-1 font-semibold">{validationAlert}</div>
            <button
              type="button"
              onClick={() => setValidationAlert(null)}
              className="text-[#991b1b] hover:text-[#7f1d1d] text-xs underline cursor-pointer"
            >
              확인
            </button>
          </div>
        )}

        {/* 주문서 폼 */}
        <form onSubmit={handleSubmitOrder} className="p-6 space-y-5">
          {/* 1. 이름 (필수, text) */}
          <div className="space-y-1.5">
            <label
              htmlFor={`${formIdPrefix}-name`}
              className="block text-sm font-bold text-[#55341d]"
            >
              1. 주문자 이름 <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              id={`${formIdPrefix}-name`}
              type="text"
              placeholder="주문자 성함을 입력해주세요 (예: 홍길동)"
              value={formData.customerName}
              onChange={handleNameChange}
              className="cafe-input"
              autoComplete="name"
            />
          </div>

          {/* 2. 전화번호 (tel) */}
          <div className="space-y-1.5">
            <label
              htmlFor={`${formIdPrefix}-phone`}
              className="block text-sm font-bold text-[#55341d]"
            >
              2. 전화번호
            </label>
            <input
              id={`${formIdPrefix}-phone`}
              type="tel"
              placeholder="전화번호를 입력해주세요 (예: 010-1234-5678)"
              value={formData.phone}
              onChange={handlePhoneChange}
              className="cafe-input"
              autoComplete="tel"
            />
          </div>

          {/* 3. 음료 선택 (드롭다운) */}
          <div className="space-y-1.5">
            <label
              htmlFor={`${formIdPrefix}-beverage`}
              className="block text-sm font-bold text-[#55341d]"
            >
              3. 음료 선택 <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="relative">
              <select
                id={`${formIdPrefix}-beverage`}
                value={formData.beverageId}
                onChange={handleBeverageChange}
                className="cafe-input appearance-none pr-10 cursor-pointer"
              >
                <option value="">-- 음료를 선택해주세요 --</option>
                {BEVERAGE_MENU.map((beverage) => (
                  <option key={beverage.id} value={beverage.id}>
                    {beverage.name} ({beverage.price.toLocaleString()}원)
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8d6e53] text-xs">
                ▼
              </div>
            </div>
            {formData.beverageId && (
              <p className="text-xs text-[#8d6e53] pl-1">
                선택 음료: {BEVERAGE_MENU.find((b) => b.id === formData.beverageId)?.description}
              </p>
            )}
          </div>

          {/* 4. 사이즈 (라디오 버튼, 가로 배치) */}
          <div className="space-y-2">
            <span id={`${formIdPrefix}-size-label`} className="block text-sm font-bold text-[#55341d]">
              4. 사이즈 선택
            </span>
            <div
              role="radiogroup"
              aria-labelledby={`${formIdPrefix}-size-label`}
              className="flex flex-row flex-wrap gap-4 items-center"
            >
              {SIZE_OPTIONS.map((size) => {
                const inputId = `${formIdPrefix}-size-${size.id}`;
                const isChecked = formData.size === size.id;
                return (
                  <div key={size.id} className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      id={inputId}
                      name="beverageSize"
                      value={size.id}
                      checked={isChecked}
                      onChange={() => handleSizeChange(size.id)}
                      className="w-4 h-4 accent-[#6b4226] cursor-pointer"
                    />
                    <label
                      htmlFor={inputId}
                      className={`text-sm cursor-pointer select-none ${
                        isChecked ? 'font-bold text-[#6b4226]' : 'text-[#55341d]'
                      }`}
                    >
                      {size.name} {size.extraPrice > 0 ? `+${size.extraPrice.toLocaleString()}원` : '+0원'}
                      {size.id === 'M' && <span className="text-[11px] text-[#8d6e53] ml-1">(기본)</span>}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. 추가 옵션 (체크박스, 가로 배치) */}
          <div className="space-y-2">
            <span id={`${formIdPrefix}-options-label`} className="block text-sm font-bold text-[#55341d]">
              5. 추가 옵션
            </span>
            <div
              role="group"
              aria-labelledby={`${formIdPrefix}-options-label`}
              className="flex flex-row flex-wrap gap-4 items-center"
            >
              {EXTRA_OPTIONS.map((option) => {
                const inputId = `${formIdPrefix}-option-${option.id}`;
                const isChecked = formData.options.includes(option.id);
                return (
                  <div key={option.id} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id={inputId}
                      checked={isChecked}
                      onChange={() => handleOptionToggle(option.id)}
                      className="w-4 h-4 accent-[#6b4226] rounded-sm cursor-pointer"
                    />
                    <label
                      htmlFor={inputId}
                      className={`text-sm cursor-pointer select-none ${
                        isChecked ? 'font-bold text-[#6b4226]' : 'text-[#55341d]'
                      }`}
                    >
                      {option.name} {option.extraPrice > 0 ? `+${option.extraPrice.toLocaleString()}원` : '+0원'}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. 수량 (number 타입, 최소 1, 최대 10, 기본값 1) */}
          <div className="space-y-1.5">
            <label
              htmlFor={`${formIdPrefix}-quantity`}
              className="block text-sm font-bold text-[#55341d]"
            >
              6. 수량 (1~10잔)
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`${formIdPrefix}-quantity`}
                type="number"
                min={1}
                max={10}
                value={formData.quantity}
                onChange={handleQuantityChange}
                className="cafe-input max-w-[120px] font-medium"
              />
              <span className="text-sm text-[#7d6858]">잔</span>
              <div className="flex gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, quantity: Math.max(1, p.quantity - 1) }))}
                  className="w-8 h-8 rounded-md bg-[#f0e4d7] hover:bg-[#e4d4c4] text-[#6b4226] font-bold flex items-center justify-center transition-colors"
                  aria-label="수량 감소"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, quantity: Math.min(10, p.quantity + 1) }))}
                  className="w-8 h-8 rounded-md bg-[#f0e4d7] hover:bg-[#e4d4c4] text-[#6b4226] font-bold flex items-center justify-center transition-colors"
                  aria-label="수량 증가"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* 7. 요청사항 (textarea) */}
          <div className="space-y-1.5">
            <label
              htmlFor={`${formIdPrefix}-notes`}
              className="block text-sm font-bold text-[#55341d]"
            >
              7. 요청사항
            </label>
            <textarea
              id={`${formIdPrefix}-notes`}
              rows={3}
              placeholder="요청사항이 있으시면 적어주세요 (예: 덜 달게 해주세요, 얼음 적게)"
              value={formData.requestNotes}
              onChange={handleNotesChange}
              className="cafe-input resize-none"
            />
          </div>

          {/* 8. 예상 금액 영역: 큰 글씨(24px), 갈색, 굵게, 가운데 정렬 (주문하기 버튼 바로 위) */}
          <div className="pt-3 pb-1 text-center border-t border-[#f0e4d7]">
            <div className="text-xs text-[#8d6e53] mb-1 font-medium">
              실시간 자동 계산
            </div>
            <div
              className="font-extrabold text-[#6b4226] text-[24px] tracking-tight"
              style={{ fontSize: '24px', color: '#6b4226' }}
            >
              예상 금액: {estimatedTotal.toLocaleString()}원
            </div>
            {!formData.beverageId && (
              <p className="text-xs text-[#a08269] mt-0.5">
                (음료를 선택하시면 금액이 계산됩니다)
              </p>
            )}
          </div>

          {/* 9. 버튼 영역: 주문하기 버튼 & 다시 작성 버튼 */}
          <div className="space-y-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-lg cafe-btn-primary font-bold text-base shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>주문 접수 및 저장 중...</span>
                </>
              ) : (
                <>
                  <Coffee className="w-5 h-5" />
                  <span>주문하기</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-lg cafe-btn-secondary font-medium text-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 text-[#8d6e53]" />
              <span>다시 작성</span>
            </button>
          </div>
        </form>

        {/* 10. 주문 확인 메시지: 연두색 배경, 초록 글씨, 둥근 모서리 */}
        {confirmationMessage && (
          <div className="p-6 pt-0 animate-in fade-in slide-in-from-top-2 duration-300">
            <div
              role="status"
              className="p-4 bg-[#edf7ed] border border-[#c8e6c9] text-[#1e4620] rounded-xl flex items-start gap-3 shadow-xs"
            >
              <CheckCircle2 className="w-6 h-6 text-[#2e7d32] shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <div className="font-bold text-sm text-[#1e4620]">
                    주문 접수가 성공적으로 완료되었습니다!
                  </div>
                  {submitFeedback?.storageType === 'supabase' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#c8e6c9] text-[#1e4620] px-2 py-0.5 rounded-full shadow-2xs">
                      <Database className="w-3 h-3 text-[#2e7d32]" />
                      Supabase DB 실시간 저장됨
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-[#f0e4d7] text-[#6b4226] px-2 py-0.5 rounded-full">
                      로컬 브라우저 임시 저장
                    </span>
                  )}
                </div>

                <div className="text-sm font-medium leading-relaxed text-[#27672a]">
                  {confirmationMessage}
                </div>

                {submitFeedback?.error && (
                  <div className="text-xs text-[#b45309] bg-[#fffbeb] p-2 rounded-md border border-[#fde68a]">
                    ⚠️ {submitFeedback.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 하단 카페 안내 바 */}
        <footer className="px-6 py-3.5 bg-[#f7efe4]/80 border-t border-[#f0e4d7] flex items-center justify-between text-xs text-[#8d6e53]">
          <span className="flex items-center gap-1.5 font-medium">
            <ShoppingBag className="w-3.5 h-3.5" /> 바이브 카페 실시간 주문 시스템
          </span>
          {onOpenSupabaseModal && (
            <button
              type="button"
              onClick={onOpenSupabaseModal}
              className="text-[#6b4226] hover:text-[#855230] font-semibold flex items-center gap-1 underline cursor-pointer"
            >
              <Database className="w-3.5 h-3.5" />
              <span>DB 설정</span>
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
