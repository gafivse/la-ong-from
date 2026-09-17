import { z } from "zod";
const text = z.string().trim().max(1000).optional().nullable();
const id = z.string().min(1);
const status = z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE");
const type = z.enum(["INCOME", "EXPENSE"]);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "วันที่ไม่ถูกต้อง",
  )
  .transform((v) => new Date(v));
const optionalNumber = z.preprocess(
  (v) => (v === "" || v == null ? null : v),
  z.coerce.number().finite().nonnegative().max(999999999).nullable(),
);
export const schemas = {
  farms: z.object({
    name: z.string().trim().min(1).max(150),
    description: text,
    cropTypeId: id.nullable().optional(),
    status,
  }),
  plots: z.object({
    name: z.string().trim().min(1).max(150),
    farmId: id,
    cropTypeId: id.nullable().optional(),
    code: text,
    treeCount: z.coerce.number().int().min(0).max(10000000),
    area: optionalNumber,
    areaUnit: text,
    plantedDate: date.nullable().optional(),
    plantedYear: z.coerce
      .number()
      .int()
      .min(1900)
      .max(2200)
      .nullable()
      .optional(),
    note: text,
    status,
    effectiveDate: date.optional(),
  }),
  categories: z.object({
    name: z.string().trim().min(1).max(150),
    code: z.string().trim().min(1).max(80),
    type,
    description: text,
    status,
  }),
  "crop-types": z.object({
    name: z.string().trim().min(1).max(150),
    code: z.string().trim().min(1).max(80),
    status,
  }),
  units: z.object({
    name: z.string().trim().min(1).max(100),
    code: z.string().trim().min(1).max(80),
    status,
  }),
  transactions: z.object({
    transactionDate: date,
    type,
    farmId: id,
    plotId: id.nullable().optional(),
    categoryId: id,
    unitId: id.nullable().optional(),
    unitPrice: optionalNumber,
    quantity: optionalNumber,
    amount: z.coerce
      .number()
      .finite()
      .positive()
      .max(999999999999)
      .refine(
        (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.001,
        "จำนวนเงินต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง",
      ),
    description: text,
    remark: text,
    referenceNo: text,
  }),
  users: z.object({
    email: z.email().max(200),
    name: z.string().trim().min(1).max(100),
    role: z.enum(["OWNER", "ADMIN", "STAFF", "VIEWER"]),
    password: z.string().min(10).max(100).optional(),
  }),
};
