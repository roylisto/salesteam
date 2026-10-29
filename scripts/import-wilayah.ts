
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
    console.log('Reading SQL file...');
    const content = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon, but clean up each statement
    const statements = content.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const insertStatements = statements.filter(s => {
      // Remove comments to check if it's an INSERT
      const clean = s.replace(/--.*$/gm, '').trim();
      return clean.toUpperCase().startsWith('INSERT INTO WILAYAH');
    });

    console.log(`Found ${insertStatements.length} potential INSERT statements.`);
    
    if (insertStatements.length === 0) {
      console.log('Falling back to regex match for multiline INSERTs...');
      const matches = content.match(/INSERT INTO wilayah[\s\S]*?;/gi);
      if (matches) {
        insertStatements.push(...matches.map(m => m.trim()));
      }
    }

    console.log(`Final count: ${insertStatements.length} INSERT statements.`);

    if (insertStatements.length > 0) {
      console.log('Clearing existing wilayah data...');
      await sql`TRUNCATE TABLE wilayah CASCADE`;

      for (let i = 0; i < insertStatements.length; i++) {
        process.stdout.write(`Executing statement ${i + 1}/${insertStatements.length}...\r`);
        // Clean statement from MySQL specific things if any
        let stmt = insertStatements[i];
        // Ensure it ends with semicolon if we stripped it
        if (!stmt.endsWith(';')) stmt += ';';
        
        await sql.unsafe(stmt);
      }
      console.log('\nImport completed successfully!');
    } else {
      console.log('No INSERT statements found to execute.');
    }

  } catch (error) {
    console.error('\nImport failed:', error);
  } finally {
    await sql.end();
  }
}

main();
