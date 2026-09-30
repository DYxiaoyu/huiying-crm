const p = require('postgres');
const d = p({
  host: 'dpg-dakfqvvqj5pc73b1eh3g-a.oregon-postgres.render.com',
  port: 5432,
  user: 'customer_crm_db_user',
  password: 'BX83BjVXrYwkSubO2GvEl0honNHFzvWC',
  database: 'customer_crm_db',
  ssl: { rejectUnauthorized: false },
  connect_timeout: 20,
  max: 1,
});
d.unsafe(
  "SELECT id, product_name, length(files) AS fl, files FROM supplier_products WHERE files IS NOT NULL AND files <> '[]'"
).then((r) => {
  let tot = 0;
  r.forEach((x) => { tot += x.fl; console.log(x.id.slice(0, 8), x.product_name.slice(0, 14), x.fl); });
  console.log('rows', r.length, 'totalBytes', tot);
  require('fs').writeFileSync(
    'C:/Users/Administrator/Doubao/chats/2026-09-15/new-chat/huiyingerp-repo/__render_files.json',
    JSON.stringify(r.map((x) => ({ id: x.id, name: x.product_name, files: JSON.parse(x.files) })))
  );
  process.exit(0);
}).catch((e) => { console.log('ERR', e.message.slice(0, 200)); process.exit(0); });
