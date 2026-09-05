'use client';

const COUNTRY_CODES = [
  ['+249', 'السودان'], ['+20', 'مصر'], ['+966', 'السعودية'], ['+971', 'الإمارات'],
  ['+974', 'قطر'], ['+965', 'الكويت'], ['+973', 'البحرين'], ['+968', 'عُمان'],
  ['+962', 'الأردن'], ['+961', 'لبنان'], ['+964', 'العراق'], ['+970', 'فلسطين'],
  ['+967', 'اليمن'], ['+218', 'ليبيا'], ['+216', 'تونس'], ['+213', 'الجزائر'],
  ['+212', 'المغرب'], ['+252', 'الصومال'], ['+251', 'إثيوبيا'], ['+254', 'كينيا'],
  ['+234', 'نيجيريا'], ['+27', 'جنوب أفريقيا'], ['+1', 'USA / Canada'], ['+44', 'UK'],
  ['+33', 'France'], ['+49', 'Germany'], ['+39', 'Italy'], ['+90', 'Türkiye'],
  ['+91', 'India'], ['+92', 'Pakistan'], ['+880', 'Bangladesh'], ['+62', 'Indonesia'],
  ['+60', 'Malaysia'], ['+86', 'China'], ['+81', 'Japan'], ['+61', 'Australia'],
] as const;

type Props = {
  countryCode: string;
  phone: string;
  onCountryCodeChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  id?: string;
  required?: boolean;
  disabled?: boolean;
};

export function InternationalPhoneInput({ countryCode, phone, onCountryCodeChange, onPhoneChange, id = 'phone', required, disabled }: Props) {
  const isCustom = !COUNTRY_CODES.some(([code]) => code === countryCode);
  return (
    <div className="grid grid-cols-[minmax(7rem,.75fr)_minmax(0,1.6fr)] gap-2" dir="ltr">
      {isCustom ? (
        <input aria-label="Country calling code" value={countryCode} onChange={(e) => onCountryCodeChange(e.target.value)}
          placeholder="+000" inputMode="tel" required={required} disabled={disabled}
          className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20" />
      ) : (
        <select aria-label="Country calling code" value={countryCode} onChange={(e) => onCountryCodeChange(e.target.value)} disabled={disabled}
          className="w-full rounded-lg border border-[var(--input)] bg-transparent px-2 py-2.5 text-sm outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20">
          {COUNTRY_CODES.map(([code, name]) => <option key={code} value={code}>{code} {name}</option>)}
          <option value="">+ مفتاح دولة آخر</option>
        </select>
      )}
      <input id={id} type="tel" value={phone} onChange={(e) => onPhoneChange(e.target.value)} required={required} disabled={disabled}
        inputMode="tel" autoComplete="tel-national" placeholder="912 345 678"
        className="w-full rounded-lg border border-[var(--input)] bg-transparent px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-[var(--muted-foreground)] focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20" />
    </div>
  );
}
