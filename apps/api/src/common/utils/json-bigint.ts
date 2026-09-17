/** Prisma BigInt 字段 JSON 序列化支持 */
(BigInt.prototype as unknown as { toJSON?: () => string }).toJSON = function toJSON() {
  return this.toString();
};
