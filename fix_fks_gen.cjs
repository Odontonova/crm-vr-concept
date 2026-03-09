const fs = require('fs');

const path = 'C:/Users/Latitude/.gemini/antigravity/brain/069b2793-ee99-4675-aaa4-e4418973d75f/.system_generated/steps/47/output.txt';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

let foreignKeys = [];

for (const table of data.tables) {
    if (table.foreign_key_constraints) {
        for (const fk of table.foreign_key_constraints) {
            const sourceArr = fk.source.split('.');
            const sourceCol = sourceArr.pop();
            const sourceTable = sourceArr.join('.');

            const targetArr = fk.target.split('.');
            const targetCol = targetArr.pop();
            const targetTable = targetArr.join('.');

            foreignKeys.push(`DO $$ BEGIN\n  ALTER TABLE ${sourceTable} ADD CONSTRAINT ${fk.name} FOREIGN KEY (${sourceCol}) REFERENCES ${targetTable}(${targetCol}) ON DELETE CASCADE;\nEXCEPTION WHEN duplicate_object THEN NULL;\nEND $$;`);
        }
    }
}

let sql = '-- Fix Foreign Keys\n';
const uniqueFks = new Set();
for (const fkSql of foreignKeys) {
    if (!uniqueFks.has(fkSql)) {
        uniqueFks.add(fkSql);
        sql += fkSql + '\n';
    }
}

fs.writeFileSync('C:/Users/Latitude/Desktop/AntiGravity/crm-vrconcept/CRM-Moncao-v8/fix_fks.sql', sql);
