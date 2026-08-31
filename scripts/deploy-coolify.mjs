import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const COOLIFY_HOST = process.env.COOLIFY_HOST || 'http://188.132.198.144:8000';
const COOLIFY_API_TOKEN = process.env.COOLIFY_API_TOKEN || '1|h9uFOZlfwk5w7EUrve5X8TfdJQ3IXzevaX1xtuRK2217d5ec';

function log(msg) {
  console.log(`[PRJrms Deploy] ${msg}`);
}

async function main() {
  console.log('\n===================================================');
  console.log('🚀 PRJrms Otomatik Canlıya Alma ve Coolify Entegrasyonu');
  console.log('===================================================\n');

  // 1. Git Push Check
  log('1. Git senkronizasyonu kontrol ediliyor...');
  try {
    const status = execSync('git status --porcelain').toString().trim();
    if (status) {
      log('Değişiklikler commit ediliyor...');
      execSync('git add .');
      execSync('git commit -m "feat: PRJrms canlıya alma ve güncellemeler"');
    }
    log('GitHub reposuna push yapılıyor (https://github.com/muzafferseyranli1/PRJrms)...');
    execSync('git push origin main');
    log('✅ GitHub senkronizasyonu tamamlandı.');
  } catch (err) {
    console.error('Git push uyarısı/hatası:', err.message);
  }

  // 2. Coolify API Status
  log('2. Coolify sunucu durumu kontrol ediliyor...');
  try {
    const res = await fetch(`${COOLIFY_HOST}/api/v1/servers`, {
      headers: {
        Authorization: `Bearer ${COOLIFY_API_TOKEN}`,
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      log(`✅ Coolify API Bağlantısı Başarılı (${COOLIFY_HOST})`);
    } else {
      log(`⚠️ Coolify API Yanıt Kodu: ${res.status}`);
    }
  } catch (err) {
    console.error('Coolify API Hatası:', err.message);
  }

  console.log('\n===================================================');
  console.log('🎉 Dağıtım Süreci Hazır!');
  console.log('🌐 VPS Adresi: http://188.132.198.144:3005');
  console.log('===================================================\n');
}

main().catch(console.error);
