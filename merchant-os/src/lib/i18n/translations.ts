export type Locale = 'ar' | 'en';

export const LOCALE_COOKIE = 'waslak_locale';
export const DEFAULT_LOCALE: Locale = 'ar';

export interface Dictionary {
  common: {
    signIn: string;
    signingIn: string;
    email: string;
    emailOrPhone: string;
    phone: string;
    password: string;
    confirmPassword: string;
    continue: string;
    cancel: string;
    or: string;
    somethingWrong: string;
    loading: string;
  };
  login: {
    welcomeBack: string;
    subtitle: string;
    forgotPassword: string;
    invalidCredentials: string;
    noAccount: string;
    createMerchantAccount: string;
    areYouDistributor: string;
    registerHere: string;
  };
  register: {
    title: string;
    subtitle: string;
    businessType: string;
    businessName: string;
    businessNamePlaceholder: string;
    yourName: string;
    fullNamePlaceholder: string;
    phonePlaceholder: string;
    passwordsNoMatch: string;
    creatingStore: string;
    createAccount: string;
    alreadyHaveAccount: string;
    signIn: string;
    types: {
      RESTAURANT: string;
      CAFE: string;
      GROCERY: string;
      PHARMACY: string;
      RETAIL: string;
      OTHER: string;
    };
  };
  registerDistributor: {
    title: string;
    subtitle: string;
    distributorName: string;
    whatsappPhone: string;
    creatingAccount: string;
    alreadyHaveAccount: string;
    signIn: string;
  };
  otp: {
    title: string;
    subtitlePrefix: string;
    verificationCode: string;
    confirm: string;
    verifying: string;
    resend: string;
  };
  completeRegistration: {
    title: string;
    businessType: string;
    invalidLink: string;
  };
  forgotPassword: {
    title: string;
    subtitle: string;
    sendLink: string;
    sending: string;
    sentPrefix: string;
    sentSuffix: string;
    backToSignIn: string;
    remembered: string;
  };
  resetPassword: {
    title: string;
    subtitle: string;
    newPassword: string;
    confirmNewPassword: string;
    updatePassword: string;
    updating: string;
    updated: string;
    missingToken: string;
    backToSignIn: string;
  };
}

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    common: {
      signIn: 'Sign in',
      signingIn: 'Signing in...',
      email: 'Email',
      emailOrPhone: 'Email or Phone',
      phone: 'Phone',
      password: 'Password',
      confirmPassword: 'Confirm password',
      continue: 'Continue',
      cancel: 'Cancel',
      or: 'or',
      somethingWrong: 'Something went wrong. Please try again.',
      loading: 'Loading...',
    },
    login: {
      welcomeBack: 'Welcome back',
      subtitle: 'Sign in to your Waslak Merchant OS account',
      forgotPassword: 'Forgot password?',
      invalidCredentials: 'Invalid email/phone or password',
      noAccount: "Don't have an account?",
      createMerchantAccount: 'Create merchant account',
      areYouDistributor: 'Are you a distributor?',
      registerHere: 'Register here',
    },
    register: {
      title: 'Create your store',
      subtitle: 'Start selling online in minutes with Waslak',
      businessType: 'Business Type',
      businessName: 'Business Name',
      businessNamePlaceholder: 'Your Store Name',
      yourName: 'Your Name',
      fullNamePlaceholder: 'Full Name',
      phonePlaceholder: '+249 912 345 678',
      passwordsNoMatch: 'Passwords do not match',
      creatingStore: 'Creating your store...',
      createAccount: 'Create merchant account',
      alreadyHaveAccount: 'Already have an account?',
      signIn: 'Sign in',
      types: {
        RESTAURANT: '🍽️ Restaurant',
        CAFE: '☕ Cafe',
        GROCERY: '🛒 Grocery',
        PHARMACY: '💊 Pharmacy',
        RETAIL: '🏪 Retail Store',
        OTHER: '📦 Other',
      },
    },
    registerDistributor: {
      title: 'Register as a Distributor',
      subtitle: 'Create your distributor account with your phone number',
      distributorName: 'Distributor / Company name',
      whatsappPhone: 'Phone number (WhatsApp)',
      creatingAccount: 'Creating account...',
      alreadyHaveAccount: 'Already have an account?',
      signIn: 'Sign in',
    },
    otp: {
      title: 'Confirm your phone',
      subtitlePrefix: 'We sent a 6-digit code via WhatsApp to',
      verificationCode: 'Verification code',
      confirm: 'Confirm',
      verifying: 'Verifying...',
      resend: 'Resend code',
    },
    completeRegistration: {
      title: 'Complete your store setup',
      businessType: 'Business type',
      invalidLink: 'Invalid or already-used registration link',
    },
    forgotPassword: {
      title: 'Forgot password?',
      subtitle: "Enter your email and we'll send you a reset link",
      sendLink: 'Send reset link',
      sending: 'Sending...',
      sentPrefix: 'If an account exists for',
      sentSuffix: 'a reset link has been sent.',
      backToSignIn: 'Back to sign in',
      remembered: 'Remembered your password?',
    },
    resetPassword: {
      title: 'Reset your password',
      subtitle: 'Choose a new password for your account',
      newPassword: 'New password',
      confirmNewPassword: 'Confirm new password',
      updatePassword: 'Update password',
      updating: 'Updating...',
      updated: 'Password updated. Redirecting to sign in...',
      missingToken: 'This reset link is missing its token. Please request a new one.',
      backToSignIn: 'Back to sign in',
    },
  },
  ar: {
    common: {
      signIn: 'تسجيل الدخول',
      signingIn: 'جاري تسجيل الدخول...',
      email: 'البريد الإلكتروني',
      emailOrPhone: 'البريد الإلكتروني أو رقم الهاتف',
      phone: 'رقم الهاتف',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      continue: 'متابعة',
      cancel: 'إلغاء',
      or: 'أو',
      somethingWrong: 'حدث خطأ ما. حاول مرة أخرى.',
      loading: 'جاري التحميل...',
    },
    login: {
      welcomeBack: 'أهلاً بعودتك',
      subtitle: 'سجّل دخولك لحساب وصلك',
      forgotPassword: 'نسيت كلمة المرور؟',
      invalidCredentials: 'البريد/رقم الهاتف أو كلمة المرور غير صحيحة',
      noAccount: 'ليس لديك حساب؟',
      createMerchantAccount: 'إنشاء حساب تاجر',
      areYouDistributor: 'هل أنت موزّع؟',
      registerHere: 'سجّل من هنا',
    },
    register: {
      title: 'أنشئ متجرك',
      subtitle: 'ابدأ البيع أونلاين خلال دقائق مع وصلك',
      businessType: 'نوع النشاط',
      businessName: 'اسم النشاط التجاري',
      businessNamePlaceholder: 'اسم متجرك',
      yourName: 'اسمك',
      fullNamePlaceholder: 'الاسم الكامل',
      phonePlaceholder: '+249 912 345 678',
      passwordsNoMatch: 'كلمتا المرور غير متطابقتين',
      creatingStore: 'جاري إنشاء متجرك...',
      createAccount: 'إنشاء حساب تاجر',
      alreadyHaveAccount: 'لديك حساب بالفعل؟',
      signIn: 'تسجيل الدخول',
      types: {
        RESTAURANT: '🍽️ مطعم',
        CAFE: '☕ كافيه',
        GROCERY: '🛒 بقالة',
        PHARMACY: '💊 صيدلية',
        RETAIL: '🏪 متجر تجزئة',
        OTHER: '📦 أخرى',
      },
    },
    registerDistributor: {
      title: 'تسجيل موزّع جديد',
      subtitle: 'أنشئ حساب الموزّع الخاص بك برقم هاتفك',
      distributorName: 'اسم الموزّع / الشركة',
      whatsappPhone: 'رقم الهاتف (واتساب)',
      creatingAccount: 'جاري إنشاء الحساب...',
      alreadyHaveAccount: 'لديك حساب بالفعل؟',
      signIn: 'تسجيل الدخول',
    },
    otp: {
      title: 'أكّد رقم هاتفك',
      subtitlePrefix: 'أرسلنا كودًا من 6 أرقام عبر واتساب إلى',
      verificationCode: 'رمز التحقق',
      confirm: 'تأكيد',
      verifying: 'جاري التحقق...',
      resend: 'إعادة إرسال الرمز',
    },
    completeRegistration: {
      title: 'أكمل إعداد متجرك',
      businessType: 'نوع النشاط',
      invalidLink: 'رابط التسجيل غير صالح أو مستخدَم من قبل',
    },
    forgotPassword: {
      title: 'نسيت كلمة المرور؟',
      subtitle: 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين',
      sendLink: 'إرسال رابط إعادة التعيين',
      sending: 'جاري الإرسال...',
      sentPrefix: 'إذا كان يوجد حساب مرتبط بـ',
      sentSuffix: 'فقد تم إرسال رابط إعادة التعيين.',
      backToSignIn: 'العودة لتسجيل الدخول',
      remembered: 'تذكّرت كلمة المرور؟',
    },
    resetPassword: {
      title: 'إعادة تعيين كلمة المرور',
      subtitle: 'اختر كلمة مرور جديدة لحسابك',
      newPassword: 'كلمة المرور الجديدة',
      confirmNewPassword: 'تأكيد كلمة المرور الجديدة',
      updatePassword: 'تحديث كلمة المرور',
      updating: 'جاري التحديث...',
      updated: 'تم تحديث كلمة المرور. جاري التوجيه لتسجيل الدخول...',
      missingToken: 'رابط إعادة التعيين هذا ناقص الرمز. يرجى طلب رابط جديد.',
      backToSignIn: 'العودة لتسجيل الدخول',
    },
  },
};
