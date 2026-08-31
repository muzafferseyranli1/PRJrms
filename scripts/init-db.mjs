import pg from 'pg';

async function main() {
  const adminClient = new pg.Client({
    connectionString: 'postgresql://postgres:RMSv3_Local_Password_2026!@188.132.198.144:5432/railway'
  });

  try {
    await adminClient.connect();
    console.log('PostgreSQL sunucusuna bağlanıldı.');

    const res = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = 'prjrms_db'");
    if (res.rows.length === 0) {
      console.log('prjrms_db veritabanı bulunamadı, oluşturuluyor...');
      await adminClient.query('CREATE DATABASE prjrms_db');
      console.log('✅ prjrms_db veritabanı başarıyla oluşturuldu!');
    } else {
      console.log('ℹ️ prjrms_db veritabanı zaten mevcut.');
    }
    await adminClient.end();
  } catch (err) {
    console.error('Veritabanı hatası:', err.message);
    await adminClient.end();
  }
}

main();
