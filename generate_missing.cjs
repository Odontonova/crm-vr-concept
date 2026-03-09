const fs = require('fs');

const path = 'C:/Users/Latitude/.gemini/antigravity/brain/069b2793-ee99-4675-aaa4-e4418973d75f/.system_generated/steps/47/output.txt';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

const existingTables = [
  'organizations', 'perfis', 'usuarios_papeis', 'configuracoes_clinica', 'etapas', 'fontes', 'tags',
  'criativos', 'leads', 'leads_tags', 'mensagens', 'message_attachments', 'vendas', 'marketing_expenses',
  'cadencias', 'cadencia_passos', 'lead_cadencias', 'cadencia_logs', 'internal_ai_chat_messages'
];

let sql = '';
let foreignKeys = [];

for (const table of data.tables) {
  const tableName = table.name.replace('public.', '');
  if (existingTables.includes(tableName)) continue;

  sql += `CREATE TABLE IF NOT EXISTS public.${tableName} (\n`;
  const columns = [];
  for (const col of table.columns) {
    let type = col.data_type === 'USER-DEFINED' ? (col.format || 'text') : col.data_type;
    
    let colDef = `    ${col.name} ${type}`;
    
    if (col.name === 'id' && type === 'integer' && col.default_value && col.default_value.includes('nextval')) {
      colDef = `    ${col.name} SERIAL PRIMARY KEY`;
    } else if (col.name === 'id' && type === 'bigint' && col.default_value && col.default_value.includes('nextval')) {
      colDef = `    ${col.name} BIGSERIAL PRIMARY KEY`;
    } else {
      if (col.default_value) {
        colDef += ` DEFAULT ${col.default_value}`;
      }
      if (!col.options.includes('nullable')) {
         colDef += ` NOT NULL`;
      }
      if (table.primary_keys && table.primary_keys.includes(col.name) && table.primary_keys.length === 1) {
         colDef += ` PRIMARY KEY`;
      }
      
      // Check constraints
      if (col.check) {
          colDef += ` CHECK (${col.check})`;
      }
    }
    columns.push(colDef);
  }
  
  if (table.primary_keys && table.primary_keys.length > 1) {
     columns.push(`    PRIMARY KEY (${table.primary_keys.join(', ')})`);
  }

  sql += columns.join(',\n') + '\n);\n\n';

  if (table.rls_enabled) {
    sql += `ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;\n\n`;
  }

  if (table.foreign_key_constraints) {
    for (const fk of table.foreign_key_constraints) {
      const sourceColArr = fk.source.split('.');
      const sourceCol = sourceColArr[sourceColArr.length - 1];
      const targetArr = fk.target.split('.');
      const targetCol = targetArr.pop();
      const targetTable = targetArr.join('.');
      
      foreignKeys.push(`DO $$ BEGIN\n  ALTER TABLE public.${tableName} ADD CONSTRAINT ${fk.name} FOREIGN KEY (${sourceCol}) REFERENCES ${targetTable}(${targetCol}) ON DELETE CASCADE;\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $$;`);
    }
  }
}

sql += '\n-- Foreign Keys\n';
for (const fkSql of foreignKeys) {
  sql += fkSql + '\n';
}

fs.writeFileSync('C:/Users/Latitude/Desktop/AntiGravity/crm-vrconcept/CRM-Moncao-v8/missing_tables.sql', sql);
