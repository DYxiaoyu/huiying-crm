/**
 * 轻量 CSV 解析器（支持带引号字段、字段内含逗号/换行/引号转义）
 * 返回二维数组，第一行为表头
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  // 去掉 BOM
  const clean = text.replace(/^\uFEFF/, '');

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
      } else if (ch === '\r') {
        // 忽略 \r（兼容 CRLF）
      } else {
        field += ch;
      }
    }
  }
  // 最后一段
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // 去掉全空行
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

/** 把表头中文名映射到字段 key */
export function mapHeader(header: string): string {
  const h = header.trim();
  const map: Record<string, string> = {
    姓名: 'name',
    客户姓名: 'name',
    name: 'name',
    电话: 'phone',
    手机: 'phone',
    '手机号': 'phone',
    phone: 'phone',
    公司: 'company',
    公司名称: 'company',
    company: 'company',
    来源: 'source',
    source: 'source',
    阶段: 'stage',
    stage: 'stage',
    备注: 'remark',
    remark: 'remark',
    标签: 'tags',
    tags: 'tags',
    商品: 'productName',
    商品名称: 'productName',
    productName: 'productName',
    商品名: 'productName',
    供应商: 'supplierName',
    供应商名称: 'supplierName',
    supplierName: 'supplierName',
    分类: 'category',
    category: 'category',
    价格: 'price',
    price: 'price',
    单位: 'unit',
    unit: 'unit',
    规格: 'spec',
    型号: 'spec',
    spec: 'spec',
  };
  return map[h] ?? '';
}

/** 把 CSV 文本解析为对象数组（按表头映射字段） */
export function csvToObjects(text: string): Array<Record<string, string>> {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => mapHeader(h));
  const result: Array<Record<string, string>> = [];
  for (let i = 1; i < rows.length; i++) {
    const obj: Record<string, string> = {};
    let hasValue = false;
    rows[i].forEach((cell, idx) => {
      const key = headers[idx];
      if (key) {
        obj[key] = cell.trim();
        if (cell.trim()) hasValue = true;
      }
    });
    if (hasValue) result.push(obj);
  }
  return result;
}
