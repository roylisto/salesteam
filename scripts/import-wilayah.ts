
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const ca = process.env.DB_SSL_CA?.replace(/\\n/g, '\n');

  if (!connectionString || !ca) {
    console.error('DATABASE_URL or DB_SSL_CA not found in .env');
    process.exit(1);
  }

  const sqlPath = path.join(process.cwd(), 'dbdata', 'wilayah.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`File not found: ${sqlPath}`);
    process.exit(1);
  }

  console.log('Connecting to database...');
  const sql = postgres(connectionString, {
    ssl: { ca, rejectUnauthorized: true },
  });

  try {
    const content = fs.readFileSync(sqlPath, 'utf8');
    const inserts = content.match(/^INSERT INTO wilayah \(kode, nama\)[\s\S]*?;[ \t]*$/gim);
    if (!inserts?.length) throw new Error('No wilayah rows found in the source file.');

    await sql.begin(async (tx) => {
      await tx`CREATE TEMP TABLE wilayah_import (kode varchar(13) PRIMARY KEY, nama varchar(100) NOT NULL) ON COMMIT DROP`;
      for (const insert of inserts) {
        await tx.unsafe(insert.replace(/^INSERT INTO wilayah/i, 'INSERT INTO wilayah_import'));
      }

      await tx`LOCK TABLE wilayah IN SHARE ROW EXCLUSIVE MODE`;
      await tx`
        INSERT INTO wilayah (kode, nama)
        SELECT kode, nama FROM wilayah_import
        ON CONFLICT (kode) DO UPDATE SET nama = EXCLUDED.nama, deleted_at = NULL
      `;
      await tx`
        UPDATE wilayah AS existing
        SET deleted_at = now()
        WHERE deleted_at IS NULL AND NOT EXISTS (
          SELECT 1 FROM wilayah_import AS imported WHERE imported.kode = existing.kode
        )
      `;
    });
    console.log('Wilayah import completed successfully.');
  } catch (error) {
    console.error('Wilayah import failed:', error);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
