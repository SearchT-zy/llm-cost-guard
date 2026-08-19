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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold">{title ?? '虚拟 API Key 已创建'}</h3>
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          ⚠️ 明文仅显示这一次，关闭后无法再查看（数据库只存哈希）。请立即复制保存到安全位置。
        </p>
        <code className="mt-3 block overflow-x-auto rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
          {apiKey}
        </code>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={copy}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            {copied ? '✓ 已复制' : '复制'}
          </button>
          <button
            onClick={onClose}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            我已保存，关闭
          </button>
        </div>
      </div>
    </div>
  );
}
