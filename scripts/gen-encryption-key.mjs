#!/usr/bin/env node
/**
 * 生成 ENCRYPTION_KEY（32 字节 base64）—— 上游 API Key 的 AES-256-GCM 加密密钥。
 * 输出直接可粘贴进 .env。★生成后请自行保管，丢失将无法解密已保存的上游密钥。
 */
import crypto from 'node:crypto';

console.log(crypto.randomBytes(32).toString('base64'));
