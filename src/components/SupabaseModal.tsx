/**
 * Supabase 연결 설정 및 SQL 쿼리 복사 모달 컴포넌트
 */
import React, { useState, useEffect } from 'react';
import { SUPABASE_SQL_SCRIPT } from '../data/cafeData';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
} from '../lib/supabase';
import {
  Copy,
  Check,
  Database,
  X,
  Terminal,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Trash2,
} from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged?: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const [tab, setTab] = useState<'config' | 'sql'>('config');
  const [copied, setCopied] = useState<boolean>(false);

  // 입력 폼 상태
  const [url, setUrl] = useState<string>('');
  const [anonKey, setAnonKey] = useState<string>('');
  const [isFromEnv, setIsFromEnv] = useState<boolean>(false);

  // 테스트 연결 상태
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // 모달 열릴 때 현재 설정 불러오기
  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrl(config.url);
      setAnonKey(config.anonKey);
      setIsFromEnv(config.isFromEnv);
      setTestResult(null);

      // 이미 URL과 Key가 있으면 자동으로 가벼운 연결 확인 수행
      if (config.url && config.anonKey) {
        testSupabaseConnection().then(setTestResult);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 클립보드에 SQL 복사
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
    }
  };

  // 설정 저장 및 연결 테스트
  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({
        success: false,
        message: 'Supabase URL과 Anon Key를 모두 입력해주세요.',
      });
      return;
    }

    saveSupabaseConfig(url, anonKey);
    setTesting(true);
    setTestResult(null);

    try {
      const result = await testSupabaseConnection();
      setTestResult(result);
      if (onConfigChanged) onConfigChanged();
    } finally {
      setTesting(false);
    }
  };

  // 설정 초기화
  const handleReset = () => {
    if (window.confirm('저장된 Supabase 연동 설정을 초기화하시겠습니까?')) {
      clearSupabaseConfig();
      const config = getSupabaseConfig();
      setUrl(config.url);
      setAnonKey(config.anonKey);
      setIsFromEnv(config.isFromEnv);
      setTestResult(null);
      if (onConfigChanged) onConfigChanged();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="supabase-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-[#fffdf9] w-full max-w-2xl rounded-2xl shadow-2xl border border-[#e8ded4] overflow-hidden flex flex-col max-h-[92vh]">
        {/* 모달 헤더 */}
        <div className="px-5 py-4 bg-[#6b4226] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#855230] rounded-xl shadow-inner">
              <Database className="w-5 h-5 text-[#fbf6f0]" />
            </div>
            <div>
              <h3 id="supabase-modal-title" className="font-bold text-base sm:text-lg leading-tight">
                Supabase 데이터베이스 연동 관리
              </h3>
              <p className="text-xs text-[#eedfd2]">
                실시간 주문 내역 저장 및 cafe_menu 테이블 연동
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-[#e8ded4] bg-[#f5ede3] px-5 pt-2 gap-2 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setTab('config')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === 'config'
                ? 'border-[#6b4226] text-[#6b4226]'
                : 'border-transparent text-[#8d6e53] hover:text-[#55341d]'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>API 연결 설정</span>
            {testResult?.success && (
              <span className="w-2 h-2 rounded-full bg-green-500" />
            )}
          </button>
          <button
            onClick={() => setTab('sql')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === 'sql'
                ? 'border-[#6b4226] text-[#6b4226]'
                : 'border-transparent text-[#8d6e53] hover:text-[#55341d]'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>SQL 테이블 생성 쿼리</span>
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4 text-xs sm:text-sm text-[#332211]">
          {tab === 'config' ? (
            <div className="space-y-4">
              {/* 현재 연결 상태 배너 */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-[#edf7ed] border-[#c8e6c9] text-[#1e4620]'
                      : 'bg-[#fff4e5] border-[#ffe0b2] text-[#663c00]'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-[#2e7d32] shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-[#f57c00] shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 text-xs sm:text-sm leading-relaxed">
                    <p className="font-bold">
                      {testResult.success ? '연결 성공' : '연결 확인 필요'}
                    </p>
                    <p className="mt-0.5">{testResult.message}</p>
                  </div>
                </div>
              )}

              {/* 안내 가이드 카드 */}
              <div className="bg-[#faf6f0] p-3.5 rounded-xl border border-[#ebdccf] text-xs text-[#6b4226] space-y-2">
                <p className="font-bold flex items-center gap-1.5 text-sm">
                  📌 Supabase 연동 방법 3단계
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-[#55341d]">
                  <li>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-semibold inline-flex items-center gap-0.5 text-[#855230] hover:text-[#6b4226]"
                    >
                      Supabase 대시보드 <ExternalLink className="w-3 h-3" />
                    </a>
                    에서 무료 프로젝트를 생성합니다.
                  </li>
                  <li>
                    상단의 <strong>[SQL 테이블 생성 쿼리]</strong> 탭에서 쿼리를 복사한 후, Supabase 대시보드의 <strong>SQL Editor</strong>에서 실행합니다.
                  </li>
                  <li>
                    Supabase <strong>Project Settings &gt; API</strong>에서 <strong>Project URL</strong>과 <strong>anon public API Key</strong>를 아래에 입력하고 [저장 및 연결 테스트]를 누릅니다. (또는 프로젝트 루트의 <code>.env</code> 파일에 입력)
                  </li>
                </ol>
              </div>

              {/* 입력 폼 */}
              <form onSubmit={handleSaveAndTest} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="supabase-url" className="font-bold text-[#55341d] text-xs sm:text-sm">
                      1. Supabase Project URL
                    </label>
                    {isFromEnv && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#ebdccf] text-[#6b4226] font-medium">
                        .env 적용 중
                      </span>
                    )}
                  </div>
                  <input
                    id="supabase-url"
                    type="url"
                    placeholder="https://abcdefghijklmn.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="cafe-input text-xs sm:text-sm font-mono"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="supabase-anon-key" className="block font-bold text-[#55341d] mb-1 text-xs sm:text-sm">
                    2. Supabase Anon (public) Key
                  </label>
                  <input
                    id="supabase-anon-key"
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    className="cafe-input text-xs sm:text-sm font-mono"
                    required
                  />
                  <p className="text-[11px] text-[#8d6e53] mt-1">
                    * 브라우저 클라이언트에서 안전하게 사용 가능한 <strong>anon public</strong> 키를 입력하세요.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={testing}
                    className="flex-1 py-2.5 px-4 bg-[#6b4226] hover:bg-[#855230] disabled:bg-[#a08269] text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    {testing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>연결 확인 중...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>저장 및 연결 테스트</span>
                      </>
                    )}
                  </button>

                  {(url || anonKey) && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="py-2.5 px-3 bg-[#f5ede3] hover:bg-[#ebdccf] text-[#855230] rounded-xl font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      title="저장소 설정 지우기"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">초기화</span>
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 쿼리 안내 및 복사 바 */}
              <div className="p-3 bg-[#f5ede3] rounded-xl border border-[#e8ded4] flex items-center justify-between gap-3 text-xs text-[#55341d]">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#6b4226] shrink-0" />
                  <span>
                    Supabase 대시보드 &gt; <strong>SQL Editor</strong> &gt; New query에 붙여넣고 <strong>Run</strong>을 누르세요.
                  </span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6b4226] hover:bg-[#855230] text-white rounded-lg font-medium shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-300" />
                      <span>복사 완료!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>SQL 복사하기</span>
                    </>
                  )}
                </button>
              </div>

              {/* SQL 코드 영역 */}
              <div className="p-4 rounded-xl bg-[#1e1e1e] text-[#d4d4d4] font-mono text-xs leading-relaxed max-h-[360px] overflow-y-auto selection:bg-[#6b4226] selection:text-white border border-[#333]">
                <pre className="whitespace-pre-wrap">{SUPABASE_SQL_SCRIPT}</pre>
              </div>
            </div>
          )}
        </div>

        {/* 모달 푸터 */}
        <div className="px-5 py-3 bg-[#faf6f0] border-t border-[#e8ded4] flex items-center justify-between text-xs text-[#7d6858]">
          <span>
            {tab === 'config' ? '💡 .env 파일이나 위 폼 중 편한 방식으로 연동 가능합니다.' : '💡 테이블명: cafe_menu'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#e8ded4] hover:bg-[#dacbc0] text-[#55341d] rounded-lg font-medium transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
