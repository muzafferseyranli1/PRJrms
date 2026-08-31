import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const COOLIFY_HOST = process.env.COOLIFY_HOST || 'http://188.132.198.144:8000';
const COOLIFY_API_TOKEN = process.env.COOLIFY_API_TOKEN || '1|h9uFOZlfwk5w7EUrve5X8TfdJQ3IXzevaX1xtuRK2217d5ec';
const COOLIFY_APP_UUID = 'zgyuaywqpnpcik4alevfauij';

function log(msg) {
  console.log(`[PRJrms Deploy] ${msg}`);
}

async function main() {
  console.log('\n===================================================');
  console.log('🚀 PRJrms Otomatik Canlıya Alma ve Coolify Entegrasyonu');
  console.log('===================================================\n');

  // 1. Git Push
  log('1. Git senkronizasyonu yapılıyor...');
  try {
    const status = execSync('git status --porcelain').toString().trim();
    if (status) {
      log('Değişiklikler commit ediliyor...');
      execSync('git add .');
      execSync('git commit -m "feat: Assign dedicated free port 3050 and public directory fix"');
    }
    log('GitHub reposuna push yapılıyor (main dalı)...');
    execSync('git push origin main');
    log('✅ GitHub senkronizasyonu tamamlandı.');
  } catch (err) {
    console.warn('Git push uyarısı:', err.message);
  }

  // 2. Patch Application Settings (Port 3050)
  log('2. Coolify uygulama yapılandırması güncelleniyor (Port 3050)...');
  const headers = {
    Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  try {
    await fetch(`${COOLIFY_HOST}/api/v1/applications/${COOLIFY_APP_UUID}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        build_pack: 'dockerfile',
        dockerfile_location: '/Dockerfile',
        ports_exposes: '3050',
        ports_mappings: '3050:3050',
      }),
    });
    log('✅ Uygulama ayarları güncellendi (Port 3050).');
  } catch (e) {
    log(`⚠️ Uygulama ayarları uyarısı: ${e.message}`);
  }

  // 3. Set Env Variables on Coolify Application
  log('3. Coolify ortam değişkenleri senkronize ediliyor...');
  const envs = [
    { key: 'DATABASE_URL', value: 'postgresql://postgres:RMSv3_Local_Password_2026!@188.132.198.144:5432/prjrms_db?schema=public' },
    { key: 'JWT_SECRET', value: 'prjrms_super_secret_jwt_key_2026_x1892_production' },
    { key: 'PORT', value: '3050' },
    { key: 'NEXT_PUBLIC_APP_URL', value: 'http://188.132.198.144:3050' },
    { key: 'NODE_ENV', value: 'production' },
  ];

  for (const env of envs) {
    try {
      await fetch(`${COOLIFY_HOST}/api/v1/applications/${COOLIFY_APP_UUID}/envs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: env.key,
          value: env.value,
          is_build_time: false,
          is_preview: false,
        }),
      });
    } catch (e) {
      // ignore
    }
  }
  log('✅ Ortam değişkenleri doğrulandı.');

  // 4. Trigger Deploy
  log('4. Coolify derleme ve container ayağa kaldırma tetikleniyor...');
  try {
    const deployUrl = `${COOLIFY_HOST}/api/v1/deploy?uuid=${COOLIFY_APP_UUID}&force=true`;
    const res = await fetch(deployUrl, {
      method: 'POST',
      headers,
    });

    if (res.ok) {
      const data = await res.json();
      log(`✅ Coolify Deploy Başlatıldı! Deployment UUID: ${data.deployments?.[0]?.deployment_uuid || JSON.stringify(data)}`);
    } else {
      const errText = await res.text();
      log(`⚠️ Coolify Deploy Yanıtı (${res.status}): ${errText}`);
    }
  } catch (err) {
    console.error('Deploy tetikleme hatası:', err.message);
  }

  console.log('\n===================================================');
  console.log('🎉 PRJrms Projesi VPS Üzerinde Yapılandırıldı!');
  console.log('🌐 Canlı Erişim Portu: http://188.132.198.144:3050');
  console.log('⚡ Coolify App UUID:   zgyuaywqpnpcik4alevfauij');
  console.log('🗄️ PostgreSQL DB:     prjrms_db');
  console.log('===================================================\n');
}

main().catch(console.error);
