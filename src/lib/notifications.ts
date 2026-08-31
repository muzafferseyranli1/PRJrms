// Sesli ve Görsel Bildirim Yöneticisi (Web Audio API & Browser Notifications)

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
}

/**
 * Temiz, modern 2 tonlu gelen mesaj / bildirim sesi çalar (Web Audio API)
 */
export function playNotificationSound(type: 'message' | 'task' = 'message') {
  if (typeof window === 'undefined') return;

  const isMuted = localStorage.getItem('prjrms_sound_muted') === 'true';
  if (isMuted) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'message') {
      // 🎶 WhatsApp tarzı neşeli 2 tonlu bildirim (F5 -> A5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(698.46, now); // F5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.1); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1046.5, now + 0.08); // C6

      osc1.connect(gainNode);
      osc2.connect(gainNode);

      osc1.start(now);
      osc1.stop(now + 0.35);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);
    } else {
      // 🌟 Görev oluşturuldu / tamamlandı sesi (D5 -> G5 -> B5 arpej)
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(783.99, now + 0.1); // G5
      osc.frequency.setValueAtTime(987.77, now + 0.2); // B5

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.5);
    }

    // Mobil titreşim (destekleyen cihazlarda)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(type === 'message' ? [80, 40, 80] : [120, 60, 120]);
    }
  } catch (err) {
    console.warn('Bildirim sesi çalınamadı:', err);
  }
}

/**
 * Tarayıcı Masaüstü / Mobil Bildirim İzni İster
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      return false;
    }
  }

  return false;
}

/**
 * Sistem Bildirimi Gösterir (Masaüstü ve Mobil)
 */
export function showDesktopNotification(
  title: string,
  body: string,
  iconUrl?: string,
  onClick?: () => void
) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        body,
        icon: iconUrl || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'prjrms-message',
        silent: true, // Sesi Web Audio API ile zaten çaldığımız için çakışmasın
      });

      if (onClick) {
        notification.onclick = () => {
          window.focus();
          onClick();
          notification.close();
        };
      }

      setTimeout(() => notification.close(), 6000);
    } catch (e) {
      console.warn('Notification gösterilemedi:', e);
    }
  }
}

// Sekme Başlığı Yanıp Sönme Yöneticisi
let originalTitle = typeof document !== 'undefined' ? document.title : 'PRJrms';
let titleFlashInterval: any = null;

export function flashTabTitle(text: string) {
  if (typeof document === 'undefined') return;

  if (titleFlashInterval) clearInterval(titleFlashInterval);
  if (!originalTitle || originalTitle.includes('💬')) {
    originalTitle = 'PRJrms - Ekip Sohbeti';
  }

  let isOriginal = false;
  titleFlashInterval = setInterval(() => {
    document.title = isOriginal ? originalTitle : text;
    isOriginal = !isOriginal;
  }, 1000);

  const resetOnFocus = () => {
    if (titleFlashInterval) {
      clearInterval(titleFlashInterval);
      titleFlashInterval = null;
    }
    document.title = originalTitle;
    window.removeEventListener('focus', resetOnFocus);
    window.removeEventListener('click', resetOnFocus);
  };

  window.addEventListener('focus', resetOnFocus);
  window.addEventListener('click', resetOnFocus);
}
