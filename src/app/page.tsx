import { redirect } from 'next/navigation';

/**
 * 根路径：直接进后台概览。
 * 未登录时由 middleware 拦截跳转 /login，这里无需重复判断。
 */
export default function Home() {
  redirect('/dashboard');
}
