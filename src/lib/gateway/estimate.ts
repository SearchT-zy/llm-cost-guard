/**
 * ★兜底估算（误差声明）★
 *
 * 上游不返回 usage 字段时（个别自建网关），按字符数粗估 token：
 *   tokens ≈ ceil(ASCII 字符数 / asciiPerToken) + ceil(非 ASCII 字符数 / cjkPerToken)
 *
 * - 默认系数：英文 4 字符/token、中文 1 字符/token（偏保守）。
 * - 真实 tokenizer（BPE）结果因内容而异，误差可达 ±50%。
 * - 估算结果会打 tokensEstimated=true 标记（明细页可见"估算"徽章），
 *   仅用于兜底显示与预算预警参考，不作为精确对账依据。
 * - 系数可通过 ESTIMATE_ASCII_PER_TOKEN / ESTIMATE_CJK_PER_TOKEN 调整。
 * - 非 ASCII 字符（中日韩、emoji 等）一律按 1 字符 = 1 token 粗算，不做更细的区分。
 */

export interface CharKinds {
  ascii: number;
  cjk: number;
}

export function splitCharKinds(text: string): CharKinds {
  let ascii = 0;
  let cjk = 0;
  for (const ch of text) {
    // for...of 按 Unicode 码点迭代，代理对（emoji）计 1 个字符
    if ((ch.codePointAt(0) ?? 0) <= 0x7f) ascii++;
    else cjk++;
  }
  return { ascii, cjk };
}

export function estimateTokens(
  ascii: number,
  cjk: number,
  asciiPerToken = 4,
  cjkPerToken = 1,
): number {
  if (asciiPerToken <= 0 || cjkPerToken <= 0) {
    throw new Error('估算系数必须为正数（检查 ESTIMATE_ASCII_PER_TOKEN / ESTIMATE_CJK_PER_TOKEN）');
  }
  return Math.ceil(ascii / asciiPerToken) + Math.ceil(cjk / cjkPerToken);
}

export function estimateTokensFromText(
  text: string,
  asciiPerToken = 4,
  cjkPerToken = 1,
): number {
  const { ascii, cjk } = splitCharKinds(text);
  return estimateTokens(ascii, cjk, asciiPerToken, cjkPerToken);
}
