import { useEffect, useState } from 'react';

interface PageJumpProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

/** 输入页码跳转（大厂风格）：输入数字回车或点跳转，越界自动收敛 */
export function PageJump({ page, totalPages, onChange }: PageJumpProps) {
  const [input, setInput] = useState(String(page));

  useEffect(() => {
    setInput(String(page));
  }, [page]);

  const go = () => {
    const n = parseInt(input, 10);
    if (isNaN(n)) {
      setInput(String(page));
      return;
    }
    const target = Math.min(Math.max(1, n), totalPages);
    setInput(String(target));
    if (target !== page) onChange(target);
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[13px] text-[#98A2B3]">跳至</span>
      <input
        type="number"
        min={1}
        max={totalPages}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            go();
          }
        }}
        className="w-14 h-[30px] px-2 rounded-md border border-[#E4E7EC] bg-white text-[13px] text-[#1D2733] outline-none focus:border-primary text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="输入页码"
      />
      <span className="text-[13px] text-[#98A2B3]">/ {totalPages} 页</span>
      <button
        type="button"
        onClick={go}
        disabled={totalPages <= 1}
        className="px-3 py-[5px] text-[13px] text-[#5B6773] border border-[#E4E7EC] rounded-md bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F7F9FA] transition-colors"
      >
        跳转
      </button>
    </div>
  );
}

export default PageJump;
