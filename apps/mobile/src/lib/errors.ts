import { USERNAME_MESSAGES, type UsernameProblem } from '@quezby/config';
import { ApiError } from '@quezby/sdk';

/** Turkish copy for what went wrong — what happened, then what to do. */
export function messageFor(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Bir şeyler ters gitti. Tekrar dene.';
  }
  switch (error.code) {
    case 'network':
      return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.';
    case 'timeout':
      return 'Sunucu geç yanıt verdi. Birazdan tekrar dene.';
    case 'invalid_credentials':
      return 'E-posta ya da şifre hatalı.';
    case 'email_taken':
      return 'Bu e-posta başka bir hesaba bağlı.';
    case 'already_linked':
      return 'Bu hesaba zaten bağlı.';
    case 'identity_invalid':
      return 'Giriş doğrulanamadı. Tekrar dene.';
    case 'identity_taken':
      return 'Bu hesap başka bir Quezby oyuncusuna bağlı.';
    case 'last_sign_in_method':
      return 'Bu, hesabına girmenin tek yolu. Önce başka bir yol bağla.';
    case 'daily_already_played':
      return 'Günün akışını bugün oynadın. Yarın yeni akış seni bekliyor.';
    case 'cannot_follow_self':
      return 'Kendini takip edemezsin.';
    case 'follow_limit':
      return 'En fazla 500 oyuncu takip edebilirsin.';
    case 'username_taken':
      return USERNAME_MESSAGES.taken;
    case 'username_locked':
      return 'Kullanıcı adını zaten seçtin; seçilen ad değişmez.';
    case 'username_invalid': {
      const problem = error.fields.username?.[0] as UsernameProblem | undefined;
      return problem && problem in USERNAME_MESSAGES
        ? USERNAME_MESSAGES[problem]
        : 'Bu kullanıcı adı kullanılamaz.';
    }
    case 'too_many_requests':
      return 'Çok hızlı denedin. Bir dakika bekle.';
    case 'engine_outdated':
      return 'Oyunun yeni sürümü var. Güncellemeden skorun sıralamaya giremez.';
    case 'run_rejected':
      return 'Bu tur doğrulanamadı, skoru sıralamaya girmedi.';
    case 'run_expired':
      return 'Tur çok uzun sürdüğü için süresi doldu.';
    case 'validation_failed':
      return error.message || 'Girdiğin bilgileri kontrol et.';
    default:
      return error.message || 'Bir şeyler ters gitti. Tekrar dene.';
  }
}
