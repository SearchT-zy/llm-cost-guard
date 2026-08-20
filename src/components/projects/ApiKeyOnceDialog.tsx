'use client';

import { useState } from 'react';

/**
 * ★安全约束 UI 落点：虚拟 key 明文只在这里显示一次。
 * 数据库只存 sha256 哈希，关闭本弹窗后任何页面都无法再查看明文。
 */
export function ApiKeyOnceDialog({
  apiKey,
  title,
  onClose,
}: {
  apiKey: string;
  title?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板权限被拒时让用户手动选择文本复制
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl shadow-slate-900/25">
        <h3 className="text-base font-semibold text-gray-900">{title ?? '虚拟 API Key 已创建'}</h3>
        <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm leading-relaxed text-red-700">
          ⚠️ 明文仅显示这一次，关闭后无法再查看（数据库只存哈希）。请立即复制保存到安全位置。
        </p>
        <code className="mt-4 block overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 font-mono text-sm text-gray-800 select-all">
          {apiKey}
        </code>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={copy} className="btn-primary">
            {copied ? '✓ 已复制' : '复制'}
          </button>
          <button onClick={onClose} className="btn-ghost">
            我已保存，关闭
          </button>
        </div>
      </div>
    </div>
  );
}
